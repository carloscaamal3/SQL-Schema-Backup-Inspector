import {
  ParsedSQLBackup,
  TableSchema,
  FilterState,
  SQLDialect,
} from '../types/sql';
import { applyFilters } from './filterEngine';
import { generateProductionQueries } from './queryGenerator';

export function generateMarkdownReport(
  backup: ParsedSQLBackup,
  activeTableName: string,
  filters: FilterState,
  dialect: SQLDialect
): string {
  const activeTable = backup.tables[activeTableName] || Object.values(backup.tables)[0];
  const filterResult = activeTable ? applyFilters(activeTable, filters) : null;
  const queries = activeTable
    ? generateProductionQueries(activeTable, backup, filters, dialect)
    : [];

  let md = `# INFORME DE INSPECCIÓN Y ANÁLISIS DE RESPALDO SQL

**Archivo analizado:** \`${backup.fileName}\`  
**Tamaño del archivo:** ${(backup.fileSizeBytes / 1024).toFixed(2)} KB  
**Dialecto SQL detectado:** \`${backup.detectedDialect.toUpperCase()}\`  
**Total de tablas detectadas:** ${Object.keys(backup.tables).length}  
**Total de registros procesados:** ${backup.totalRecords.toLocaleString()}  
**Fecha de generación:** ${new Date().toISOString().replace('T', ' ').slice(0, 19)}

---

## 1. 📊 TABLAS Y REGISTROS

Resumen estructural de las tablas identificadas en las sentencias \`CREATE TABLE\` e \`INSERT INTO\`:

| Nombre de la Tabla | Total Registros | Clave Primaria (PK) | Campos Principales | Columnas Temporales |
| :--- | :--- | :--- | :--- | :--- |
`;

  for (const tableName of Object.keys(backup.tables)) {
    const tbl = backup.tables[tableName];
    const pkStr = tbl.primaryKeys.length > 0 ? tbl.primaryKeys.map((k) => `\`${k}\``).join(', ') : '*(Ninguna detectada)*';
    const mainCols = tbl.columns
      .slice(0, 5)
      .map((c) => `\`${c.name}\` (${c.type})`)
      .join(', ');
    const moreCount = tbl.columns.length > 5 ? ` *+${tbl.columns.length - 5} más*` : '';
    const dateCols = tbl.dateColumns.length > 0 ? tbl.dateColumns.map((d) => `\`${d}\``).join(', ') : '*(Sin fechas)*';

    md += `| **${tbl.name}** | ${tbl.rowCount.toLocaleString()} | ${pkStr} | ${mainCols}${moreCount} | ${dateCols} |\n`;
  }

  md += `\n---\n\n## 2. ⚙️ FUNCIONES Y PROCEDIMIENTOS ALMACENADOS\n\n`;

  if (backup.routines.length === 0) {
    md += `*No se detectaron rutinas (\`PROCEDURE\`, \`FUNCTION\`, \`TRIGGER\`, \`VIEW\`) en este archivo de respaldo.*\n\n`;
  } else {
    md += `Se detectaron **${backup.routines.length}** rutinas en el esquema:\n\n`;
    for (const routine of backup.routines) {
      md += `### 🔹 ${routine.type}: \`${routine.name}\`\n\n`;
      if (routine.returnType) {
        md += `- **Tipo de Retorno:** \`${routine.returnType}\`\n`;
      }
      md += `- **Tablas Involucradas:** ${routine.involvedTables.length > 0 ? routine.involvedTables.map((t) => `\`${t}\``).join(', ') : '*(Ninguna explícita)*'}\n`;
      md += `- **Parámetros:**\n`;
      if (routine.parameters.length === 0) {
        md += `  - *(Sin parámetros)*\n`;
      } else {
        for (const p of routine.parameters) {
          md += `  - \`${p.direction || 'IN'}\` \`${p.name}\`: \`${p.type}\`\n`;
        }
      }
      md += `\n\`\`\`sql\n${routine.definition.trim()}\n\`\`\`\n\n`;
    }
  }

  md += `---\n\n## 3. 🔗 RELACIONES (CLAVES PRIMARIAS Y FORÁNEAS)\n\n`;

  if (backup.foreignKeys.length === 0) {
    md += `*No se detectaron claves foráneas explícitas ni relaciones por convención de nombres en el respaldo.*\n\n`;
  } else {
    md += `| Tabla Origen | Columna FK | Tabla Destino | Columna PK Referenciada | Tipo Detección |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const fk of backup.foreignKeys) {
      const typeStr = fk.isInfered ? '🔍 Inferida por convención' : '🔒 Declarada (CONSTRAINT)';
      md += `| \`${fk.fromTable}\` | \`${fk.fromColumn}\` | \`${fk.toTable}\` | \`${fk.toColumn}\` | ${typeStr} |\n`;
    }
    md += `\n`;
  }

  // SENSITIVE DATA WARNINGS
  if (backup.sensitiveAlerts.length > 0) {
    md += `---\n\n## ⚠️ ALERTA DE SEGURIDAD: DATOS SENSIBLES DETECTADOS\n\n`;
    md += `> **ADVERTENCIA CRÍTICA:** Se identificaron **${backup.sensitiveAlerts.length}** campos que contienen o aparentan contener datos confidenciales, contraseñas o identificadores personales en texto claro o con cifrado en el respaldo.\n\n`;
    md += `| Severidad | Tabla | Columna | Causa / Hallazgo | Recomendación |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const alert of backup.sensitiveAlerts) {
      const sevBadge = alert.severity === 'ALTA' ? '🔴 ALTA' : alert.severity === 'MEDIA' ? '🟡 MEDIA' : '🟢 BAJA';
      md += `| ${sevBadge} | \`${alert.table}\` | \`${alert.column}\` | ${alert.reason} | ${alert.recommendation} |\n`;
    }
    md += `\n`;
  }

  // ACTIVE TABLE FILTERING & EXTRACTED DATA
  if (activeTable && filterResult) {
    md += `---\n\n## 4. 📋 VISUALIZACIÓN Y FILTRADO DINÁMICO DE REGISTROS\n\n`;
    md += `**Tabla seleccionada:** \`${activeTable.name}\`  \n`;
    md += `**Filtro aplicado:** ${filterResult.filterSummary}  \n`;
    md += `**Resumen de registros:** **${filterResult.filteredCount.toLocaleString()}** filas devueltas de un total de **${filterResult.totalCount.toLocaleString()}** (${((filterResult.filteredCount / (filterResult.totalCount || 1)) * 100).toFixed(1)}%).\n\n`;

    if (filterResult.filteredCount === 0) {
      md += `> ⚠️ **NOTIFICACIÓN DE CERO COINCIDENCIAS:** ${filterResult.unmatchedReason || 'Ningún registro del respaldo coincide con los filtros aplicados.'}\n\n`;
    } else {
      // Show sample table (up to 15 rows)
      const displayCols = activeTable.columns.slice(0, 7).map((c) => c.name);
      md += `### Muestra de registros filtrados (Primeras 15 filas):\n\n`;
      md += `| ${displayCols.join(' | ')} |\n`;
      md += `| ${displayCols.map(() => ':---').join(' | ')} |\n`;

      for (const row of filterResult.rows.slice(0, 15)) {
        const rowVals = displayCols.map((col) => {
          let val = row[col];
          if (val === null || val === undefined) return '*NULL*';
          if (typeof val === 'string' && val.length > 30) {
            val = val.slice(0, 27) + '...';
          }
          // Mask sensitive values
          if (activeTable.sensitiveColumns.includes(col)) {
            return '`[ENMASCARADO]`';
          }
          return `\`${String(val).replace(/\|/g, '\\|')}\``;
        });
        md += `| ${rowVals.join(' | ')} |\n`;
      }
      if (filterResult.rows.length > 15) {
        md += `\n*... y ${filterResult.rows.length - 15} filas adicionales no mostradas en el informe Markdown.*\n\n`;
      } else {
        md += `\n`;
      }
    }
  }

  // PRODUCTION SQL QUERIES
  if (queries.length > 0) {
    md += `---\n\n## 5. 💡 CONSULTAS SQL LISTAS PARA PRODUCCIÓN\n\n`;
    md += `Consultas estándar generadas a partir de las condiciones de filtrado y el análisis relacional (Dialecto: **${dialect.toUpperCase()}**):\n\n`;

    for (const q of queries) {
      md += `### ${q.title}\n\n`;
      md += `${q.description}\n\n`;
      if (q.optimizationNotes.length > 0) {
        md += `**Notas de Optimización:**\n`;
        for (const note of q.optimizationNotes) {
          md += `- ${note}\n`;
        }
        md += `\n`;
      }
      md += `\`\`\`sql\n${q.sql}\n\`\`\`\n\n`;
    }
  }

  return md;
}
