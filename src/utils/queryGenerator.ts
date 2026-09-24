import {
  TableSchema,
  SQLDialect,
  FilterState,
  ParsedSQLBackup,
} from '../types/sql';

export interface GeneratedQuery {
  id: string;
  title: string;
  category: 'FILTRADA' | 'COMPORTAMIENTO' | 'RELACIONAL' | 'INTEGRIDAD' | 'WINDOW_FUNCTION';
  sql: string;
  description: string;
  optimizationNotes: string[];
  suggestedIndex?: string;
}

// Format identifiers per dialect
function formatIdentifier(name: string, dialect: SQLDialect): string {
  switch (dialect) {
    case 'mysql':
      return `\`${name}\``;
    case 'postgresql':
    case 'oracle':
      return `"${name}"`;
    case 'sqlserver':
      return `[${name}]`;
    case 'sqlite':
    default:
      return `"${name}"`;
  }
}

// Format date truncation per dialect
function formatDateTrunc(
  colName: string,
  period: 'month' | 'quarter' | 'year' | 'day',
  dialect: SQLDialect
): string {
  switch (dialect) {
    case 'postgresql':
      return `DATE_TRUNC('${period}', ${colName})`;
    case 'mysql':
      if (period === 'year') return `DATE_FORMAT(${colName}, '%Y')`;
      if (period === 'month') return `DATE_FORMAT(${colName}, '%Y-%m')`;
      if (period === 'quarter') return `CONCAT(YEAR(${colName}), '-Q', QUARTER(${colName}))`;
      return `DATE(${colName})`;
    case 'sqlserver':
      if (period === 'year') return `DATENAME(year, ${colName})`;
      if (period === 'month') return `FORMAT(${colName}, 'yyyy-MM')`;
      if (period === 'quarter') return `CONCAT(DATENAME(year, ${colName}), '-Q', DATEPART(quarter, ${colName}))`;
      return `CONVERT(date, ${colName})`;
    case 'oracle':
      if (period === 'year') return `TO_CHAR(${colName}, 'YYYY')`;
      if (period === 'month') return `TO_CHAR(${colName}, 'YYYY-MM')`;
      if (period === 'quarter') return `TO_CHAR(${colName}, 'YYYY-"Q"Q')`;
      return `TRUNC(${colName})`;
    case 'sqlite':
    default:
      if (period === 'year') return `strftime('%Y', ${colName})`;
      if (period === 'month') return `strftime('%Y-%m', ${colName})`;
      if (period === 'quarter') {
        return `printf('%s-Q%d', strftime('%Y', ${colName}), (cast(strftime('%m', ${colName}) as integer) + 2) / 3)`;
      }
      return `date(${colName})`;
  }
}

// Build WHERE clause based on filters
function buildWhereClause(
  table: TableSchema,
  filters: FilterState,
  dialect: SQLDialect,
  tableAlias: string = 't'
): { whereSql: string; conditionsList: string[]; indexColumns: string[] } {
  const conditions: string[] = [];
  const indexColumns: string[] = [];
  const { dateFilter, columnFilters, searchQuery } = filters;

  // 1. Date Filter
  if (dateFilter.enabled && dateFilter.column) {
    const colRef = `${tableAlias}.${formatIdentifier(dateFilter.column, dialect)}`;
    indexColumns.push(dateFilter.column);

    switch (dateFilter.periodType) {
      case 'year':
        if (dateFilter.year) {
          const targetColDef = table.columns.find((c) => c.name.toLowerCase() === dateFilter.column.toLowerCase());
          const isPureYearCol = targetColDef
            ? /sp_?ejer[c]?icio|ejercicio|ejericio|periodo_anio|anio|año|^year$/i.test(targetColDef.name) ||
              (/int|numeric|smallint|tinyint/i.test(targetColDef.type) && !/date|time/i.test(targetColDef.type))
            : /sp_?ejer[c]?icio|ejercicio|ejericio|anio/i.test(dateFilter.column);

          if (isPureYearCol) {
            conditions.push(`${colRef} = ${dateFilter.year}`);
          } else {
            conditions.push(
              `${colRef} >= '${dateFilter.year}-01-01' AND ${colRef} <= '${dateFilter.year}-12-31 23:59:59'`
            );
          }
        }
        break;
      case 'quarter':
        if (dateFilter.quarter) {
          const yr = dateFilter.year || 2025;
          const qStarts = ['', '01-01', '04-01', '07-01', '10-01'];
          const qEnds = ['', '03-31', '06-30', '09-30', '12-31'];
          conditions.push(
            `${colRef} >= '${yr}-${qStarts[dateFilter.quarter]}' AND ${colRef} <= '${yr}-${qEnds[dateFilter.quarter]} 23:59:59'`
          );
        }
        break;
      case 'month':
        if (dateFilter.month) {
          const yr = dateFilter.year || 2025;
          const mStr = String(dateFilter.month).padStart(2, '0');
          // Days in month
          const lastDay = new Date(yr, dateFilter.month, 0).getDate();
          conditions.push(
            `${colRef} >= '${yr}-${mStr}-01' AND ${colRef} <= '${yr}-${mStr}-${lastDay} 23:59:59'`
          );
        }
        break;
      case 'day':
        if (dateFilter.specificDate) {
          conditions.push(
            `${colRef} >= '${dateFilter.specificDate} 00:00:00' AND ${colRef} <= '${dateFilter.specificDate} 23:59:59'`
          );
        }
        break;
      case 'range':
        if (dateFilter.startDate && dateFilter.endDate) {
          conditions.push(
            `${colRef} >= '${dateFilter.startDate} 00:00:00' AND ${colRef} <= '${dateFilter.endDate} 23:59:59'`
          );
        } else if (dateFilter.startDate) {
          conditions.push(`${colRef} >= '${dateFilter.startDate} 00:00:00'`);
        } else if (dateFilter.endDate) {
          conditions.push(`${colRef} <= '${dateFilter.endDate} 23:59:59'`);
        }
        break;
    }
  }

  // 2. Column Filters
  for (const cf of columnFilters) {
    if (!cf.column) continue;
    const colRef = `${tableAlias}.${formatIdentifier(cf.column, dialect)}`;
    indexColumns.push(cf.column);

    if (cf.operator === 'IS NULL') {
      conditions.push(`${colRef} IS NULL`);
    } else if (cf.operator === 'IS NOT NULL') {
      conditions.push(`${colRef} IS NOT NULL`);
    } else if (cf.operator === 'LIKE') {
      conditions.push(`${colRef} LIKE '%${cf.value.replace(/'/g, "''")}%'`);
    } else if (cf.operator === 'NOT LIKE') {
      conditions.push(`${colRef} NOT LIKE '%${cf.value.replace(/'/g, "''")}%'`);
    } else if (cf.operator === 'BETWEEN') {
      const isNum = !isNaN(Number(cf.value)) && !isNaN(Number(cf.valueSecondary));
      if (isNum) {
        conditions.push(`${colRef} BETWEEN ${Number(cf.value)} AND ${Number(cf.valueSecondary)}`);
      } else {
        conditions.push(
          `${colRef} BETWEEN '${cf.value.replace(/'/g, "''")}' AND '${(cf.valueSecondary || '').replace(/'/g, "''")}'`
        );
      }
    } else if (cf.operator === 'IN') {
      const items = cf.value
        .split(',')
        .map((s) => `'${s.trim().replace(/^['"]|['"]$/g, '').replace(/'/g, "''")}'`)
        .filter(Boolean)
        .join(', ');
      conditions.push(`${colRef} IN (${items})`);
    } else {
      // Comparison =, !=, >, <, >=, <=
      const isNum = !isNaN(Number(cf.value)) && cf.value !== '';
      if (isNum) {
        conditions.push(`${colRef} ${cf.operator} ${Number(cf.value)}`);
      } else {
        conditions.push(`${colRef} ${cf.operator} '${cf.value.replace(/'/g, "''")}'`);
      }
    }
  }

  // 3. Search query
  if (searchQuery.trim()) {
    const term = searchQuery.trim().replace(/'/g, "''");
    const searchableCols = table.columns
      .filter((c) => !c.isSensitive && (table.categoricalColumns.includes(c.name) || c.type.includes('CHAR') || c.type.includes('TEXT')))
      .slice(0, 4);

    if (searchableCols.length > 0) {
      const searchOr = searchableCols
        .map((c) => `${tableAlias}.${formatIdentifier(c.name, dialect)} LIKE '%${term}%'`)
        .join(' OR ');
      conditions.push(`(${searchOr})`);
    }
  }

  const whereSql = conditions.length > 0 ? `WHERE\n    ${conditions.join('\n    AND ')}` : '';
  return { whereSql, conditionsList: conditions, indexColumns };
}

// Generate complete query catalog for the active table and context
export function generateProductionQueries(
  table: TableSchema,
  backup: ParsedSQLBackup,
  filters: FilterState,
  dialect: SQLDialect
): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const tableNameFormatted = formatIdentifier(table.name, dialect);
  const { whereSql, conditionsList, indexColumns } = buildWhereClause(table, filters, dialect, 't');

  // Columns to project (exclude highly sensitive columns or mask them)
  const projectedColumns = table.columns.map((c) => {
    const formatted = `t.${formatIdentifier(c.name, dialect)}`;
    if (c.isSensitive && /password|pass|secret|tarjeta|cvv|token/i.test(c.name)) {
      return `'[CONFIDENCIAL]' AS ${formatIdentifier(c.name, dialect)} -- Campo sensible enmascarado`;
    }
    return formatted;
  });

  const columnsListSql = projectedColumns.join(',\n    ');
  const primaryKey = table.primaryKeys[0] || table.columns[0]?.name || 'id';
  const orderCol = table.dateColumns[0] || primaryKey;

  // Pagination syntax per dialect
  let paginationSql = '';
  switch (dialect) {
    case 'sqlserver':
    case 'oracle':
      paginationSql = `ORDER BY t.${formatIdentifier(orderCol, dialect)} DESC\nOFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;`;
      break;
    case 'postgresql':
    case 'mysql':
    case 'sqlite':
    default:
      paginationSql = `ORDER BY t.${formatIdentifier(orderCol, dialect)} DESC\nLIMIT 50 OFFSET 0;`;
      break;
  }

  // Index recommendation
  let suggestedIndex = '';
  if (indexColumns.length > 0) {
    const uniqueCols = Array.from(new Set(indexColumns));
    const idxName = `idx_${table.name}_${uniqueCols.slice(0, 2).join('_')}`;
    const idxCols = uniqueCols.map((c) => formatIdentifier(c, dialect)).join(', ');
    suggestedIndex = `CREATE INDEX ${idxName} ON ${tableNameFormatted} (${idxCols});`;
  }

  // ==========================================
  // 1. CONSULTA FILTRADA DE PRODUCCIÓN
  // ==========================================
  const query1Sql = `-- =======================================================================
-- CONSULTA DE PRODUCCIÓN CON FILTRADO ÓPTIMO Y PAGINACIÓN
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- Lógica: Proyección explícita de campos sin 'SELECT *', evitando sobrecarga de I/O.
-- Seguridad: Enmascaramiento preventivo de datos sensibles identificados.
-- =======================================================================
SELECT
    ${columnsListSql}
FROM
    ${tableNameFormatted} AS t
${whereSql ? whereSql + '\n' : ''}${paginationSql}
${
  suggestedIndex
    ? `\n-- RECOMENDACIÓN DE RENDIMIENTO:
-- Cree el siguiente índice compuesto para acelerar los filtros de esta consulta:
-- ${suggestedIndex}`
    : ''
}`;

  queries.push({
    id: 'query-filtered',
    title: 'Extracción de Registros Filtrados (Paginada y Segura)',
    category: 'FILTRADA',
    sql: query1Sql,
    description: `Consulta optimizada que aplica los filtros actuales (${conditionsList.length} condiciones activas) con proyección explícita de columnas y ordenamiento indexable.`,
    optimizationNotes: [
      'Proyección explícita para evitar I/O innecesario de columnas LOB/TEXT.',
      'SARGable WHERE clause: no envuelve columnas indexadas en funciones dentro del predicado.',
      'Paginación determinista con ordenamiento por clave o timestamp.',
    ],
    suggestedIndex,
  });

  // ==========================================
  // 2. CONSULTA COMPORTAMENTAL / AGREGACIONES
  // ==========================================
  const dateCol = table.dateColumns[0];
  const numCol = table.numericColumns.find((c) => !table.primaryKeys.includes(c)) || table.numericColumns[0];
  const catCol = table.categoricalColumns.find((c) => !table.primaryKeys.includes(c)) || table.categoricalColumns[0];

  const dateGrouping = dateCol ? formatDateTrunc(`t.${formatIdentifier(dateCol, dialect)}`, 'month', dialect) : null;

  let aggSql = '';
  if (dateGrouping) {
    aggSql = `-- =======================================================================
-- CONSULTA COMPORTAMENTAL Y TENDENCIAS TEMPORALES
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- Métricas: Conteo de registros, métricas agregadas agrupadas por período.
-- =======================================================================
SELECT
    ${dateGrouping} AS periodo${catCol ? `,\n    t.${formatIdentifier(catCol, dialect)} AS ${formatIdentifier(catCol, dialect)}` : ''},
    COUNT(*) AS total_registros${
      numCol
        ? `,\n    ROUND(AVG(t.${formatIdentifier(numCol, dialect)}), 2) AS promedio_${numCol},\n    SUM(t.${formatIdentifier(numCol, dialect)}) AS suma_total_${numCol}`
        : ''
    }
FROM
    ${tableNameFormatted} AS t
${whereSql ? whereSql + '\n' : ''}GROUP BY
    ${dateGrouping}${catCol ? `,\n    t.${formatIdentifier(catCol, dialect)}` : ''}
HAVING
    COUNT(*) > 0
ORDER BY
    periodo DESC;`;
  } else {
    aggSql = `-- =======================================================================
-- CONSULTA COMPORTAMENTAL AGRUPADA POR CATEGORÍA
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
SELECT
    ${catCol ? `t.${formatIdentifier(catCol, dialect)} AS categoria,` : 'COUNT(*) AS total_general,'}
    COUNT(*) AS total_registros${
      numCol
        ? `,\n    ROUND(AVG(t.${formatIdentifier(numCol, dialect)}), 2) AS promedio_${numCol},\n    SUM(t.${formatIdentifier(numCol, dialect)}) AS suma_total_${numCol}`
        : ''
    }
FROM
    ${tableNameFormatted} AS t
${whereSql ? whereSql + '\n' : ''}${catCol ? `GROUP BY\n    t.${formatIdentifier(catCol, dialect)}\nORDER BY\n    total_registros DESC;` : ';'}`;
  }

  queries.push({
    id: 'query-behavioral',
    title: 'Análisis Comportamental y Métricas Agregadas',
    category: 'COMPORTAMIENTO',
    sql: aggSql,
    description: `Agrupación y agregación estadística por período temporal (${dateCol || 'fecha'}) o dimensión categórica, ideal para dashboards ejecutivos y detección de tendencias.`,
    optimizationNotes: [
      'Agrupación compatible con el estándar ANSI SQL del motor seleccionado.',
      'Uso de COUNT(*) optimizado que aprovecha metadatos o índices secundarios.',
      'Cálculo en motor relacional sin transferir millones de filas crudas al cliente.',
    ],
  });

  // ==========================================
  // 3. CONSULTA RELACIONAL CON JOINS
  // ==========================================
  const relevantFks = table.foreignKeys;
  // Also check if other tables reference this table
  const childFks = backup.foreignKeys.filter(
    (fk) => fk.toTable.toLowerCase() === table.name.toLowerCase()
  );

  let joinSql = '';
  if (relevantFks.length > 0) {
    const firstFk = relevantFks[0];
    const parentTable = backup.tables[firstFk.toTable];
    const parentNameFormatted = formatIdentifier(firstFk.toTable, dialect);
    const parentCols = parentTable
      ? parentTable.columns.slice(0, 3).map((c) => `p.${formatIdentifier(c.name, dialect)}`).join(', ')
      : `p.${formatIdentifier(firstFk.toColumn, dialect)}`;

    joinSql = `-- =======================================================================
-- CONSULTA RELACIONAL NORMALIZADA (INNER JOIN)
-- Conecta ${table.name} con tabla maestra ${firstFk.toTable} mediante FK
-- =======================================================================
SELECT
    t.${formatIdentifier(primaryKey, dialect)} AS id_origen,
    t.${formatIdentifier(firstFk.fromColumn, dialect)} AS fk_referencia,
    ${parentCols}
FROM
    ${tableNameFormatted} AS t
INNER JOIN ${parentNameFormatted} AS p
    ON t.${formatIdentifier(firstFk.fromColumn, dialect)} = p.${formatIdentifier(firstFk.toColumn, dialect)}
${whereSql ? whereSql + '\n' : ''}ORDER BY
    t.${formatIdentifier(primaryKey, dialect)} DESC
${dialect === 'sqlserver' || dialect === 'oracle' ? 'OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;' : 'LIMIT 50;'}`;
  } else if (childFks.length > 0) {
    const childFk = childFks[0];
    const childNameFormatted = formatIdentifier(childFk.fromTable, dialect);

    joinSql = `-- =======================================================================
-- CONSULTA MAESTRO-DETALLE (LEFT JOIN CON AGREGACIÓN)
-- Conecta la tabla maestra ${table.name} con su tabla dependiente ${childFk.fromTable}
-- =======================================================================
SELECT
    t.${formatIdentifier(primaryKey, dialect)} AS maestro_id,
    COUNT(c.${formatIdentifier(childFk.fromColumn, dialect)}) AS total_items_asociados
FROM
    ${tableNameFormatted} AS t
LEFT JOIN ${childNameFormatted} AS c
    ON t.${formatIdentifier(childFk.toColumn, dialect)} = c.${formatIdentifier(childFk.fromColumn, dialect)}
${whereSql ? whereSql + '\n' : ''}GROUP BY
    t.${formatIdentifier(primaryKey, dialect)}
ORDER BY
    total_items_asociados DESC
${dialect === 'sqlserver' || dialect === 'oracle' ? 'OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;' : 'LIMIT 50;'}`;
  } else {
    joinSql = `-- =======================================================================
-- CONSULTA DE AUTOCORRELACIÓN / MATRIZ
-- Nota: No se detectaron Foreign Keys explícitas para esta tabla.
-- =======================================================================
SELECT
    t.${formatIdentifier(primaryKey, dialect)},
    COUNT(*) OVER() AS total_universo_filtrado
FROM
    ${tableNameFormatted} AS t
${whereSql ? whereSql + '\n' : ''}${dialect === 'sqlserver' || dialect === 'oracle' ? 'OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY;' : 'LIMIT 50;'}`;
  }

  queries.push({
    id: 'query-relational',
    title: 'Consulta Relacional Multi-tabla (JOINs)',
    category: 'RELACIONAL',
    sql: joinSql,
    description: `Resolución de relaciones relacionales basada en claves foráneas (PK/FK) detectadas e inferidas en el esquema.`,
    optimizationNotes: [
      'Garantiza uso de índices de clave foránea para prevenir Sequential Scans.',
      'Evita duplicidad de filas mediante control de cardinalidad 1:N.',
    ],
  });

  // ==========================================
  // 4. CONSULTA DE INTEGRIDAD REFERENCIAL (REGISTROS HUÉRFANOS)
  // ==========================================
  if (relevantFks.length > 0) {
    const fk = relevantFks[0];
    const parentNameFormatted = formatIdentifier(fk.toTable, dialect);

    const integritySql = `-- =======================================================================
-- AUDITORÍA DE INTEGRIDAD REFERENCIAL (DETECCIÓN DE HUÉRFANOS)
-- Dialecto: ${dialect.toUpperCase()}
-- Identifica registros en '${table.name}' cuyo '${fk.fromColumn}' no existe en '${fk.toTable}'.
-- =======================================================================
SELECT
    t.${formatIdentifier(primaryKey, dialect)} AS registro_huerfano_id,
    t.${formatIdentifier(fk.fromColumn, dialect)} AS fk_invalida
FROM
    ${tableNameFormatted} AS t
LEFT JOIN ${parentNameFormatted} AS p
    ON t.${formatIdentifier(fk.fromColumn, dialect)} = p.${formatIdentifier(fk.toColumn, dialect)}
WHERE
    t.${formatIdentifier(fk.fromColumn, dialect)} IS NOT NULL
    AND p.${formatIdentifier(fk.toColumn, dialect)} IS NULL;`;

    queries.push({
      id: 'query-integrity',
      title: 'Auditoría de Integridad Referencial (Registros Huérfanos)',
      category: 'INTEGRIDAD',
      sql: integritySql,
      description: `Verifica si existen inconsistencias relacionales o registros sin correspondencia en la tabla padre referenciada '${fk.toTable}'.`,
      optimizationNotes: [
        'Utiliza el patrón Anti-Join (LEFT JOIN ... WHERE parent.id IS NULL) altamente optimizable por el planificador.',
        'Esencial antes de aplicar restricciones FOREIGN KEY en producción.',
      ],
    });
  }

  // ==========================================
  // 5. WINDOW FUNCTION / DEDUPLICACIÓN
  // ==========================================
  const partitionCol = catCol || (relevantFks[0]?.fromColumn) || primaryKey;
  const windowSql = `-- =======================================================================
-- VENTANA ANALÍTICA Y CONTROL DE DEDUPLICACIÓN
-- Asigna número de secuencia por partición para obtener el registro más reciente
-- =======================================================================
WITH RegistrosParticionados AS (
    SELECT
        t.*,
        ROW_NUMBER() OVER (
            PARTITION BY t.${formatIdentifier(partitionCol, dialect)}
            ORDER BY t.${formatIdentifier(orderCol, dialect)} DESC
        ) AS rank_secuencial
    FROM
        ${tableNameFormatted} AS t
    ${whereSql}
)
SELECT
    *
FROM
    RegistrosParticionados
WHERE
    rank_secuencial = 1
ORDER BY
    ${formatIdentifier(orderCol, dialect)} DESC;`;

  queries.push({
    id: 'query-window',
    title: 'Ventana Analítica y Último Estado por Partición (CTE)',
    category: 'WINDOW_FUNCTION',
    sql: windowSql,
    description: `Utiliza ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) para recuperar el estado más reciente o identificar duplicidades por segmento.`,
    optimizationNotes: [
      'Encapsulado en Common Table Expression (WITH) para legibilidad y optimización.',
      'Soportado en todos los motores modernos sin necesidad de subconsultas correlacionadas lentas.',
    ],
  });

  return queries;
}
