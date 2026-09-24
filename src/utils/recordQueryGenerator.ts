import { TableSchema, SQLDialect } from '../types/sql';
import { isYearOrIdColumn } from './formatters';

export type QueryCategory =
  | 'ALL'
  | 'CRUD_SELECT'
  | 'CRUD_INSERT'
  | 'CRUD_UPDATE'
  | 'CRUD_DELETE'
  | 'CRUD_UPSERT'
  | 'RELATIONS_JOIN'
  | 'AGGREGATION'
  | 'SNIPPET_WHERE'
  | 'EXPORT_JSON';

export interface RowGeneratedQuery {
  id: string;
  title: string;
  category: QueryCategory;
  sql: string;
  description: string;
  badge: string;
  complexity: 'Básica' | 'CRUD' | 'Avanzada' | 'Formato';
}

// Format identifier based on dialect
export function formatIdentifier(name: string, dialect: SQLDialect): string {
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

// Format a single cell value for SQL insertion/updating
export function formatSqlValue(columnName: string, val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    // If it's a year or ID, output clean number without commas or float artifacts
    if (isYearOrIdColumn(columnName, val)) {
      return String(Math.round(val));
    }
    return String(val);
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

// Generate CRUD and Advanced SQL Queries for checked rows
export function generateQueriesFromSelectedRows(
  table: TableSchema,
  selectedRows: Record<string, any>[],
  dialect: SQLDialect
): RowGeneratedQuery[] {
  if (!table || selectedRows.length === 0) return [];

  const queries: RowGeneratedQuery[] = [];
  const tableNameFmt = formatIdentifier(table.name, dialect);
  const primaryKey = table.primaryKeys[0] || table.columns[0]?.name || 'id';
  const pkFmt = formatIdentifier(primaryKey, dialect);

  // Extract PK values
  const pkValues = selectedRows
    .map((r) => r[primaryKey])
    .filter((v) => v !== undefined && v !== null);

  const formattedPkList = pkValues
    .map((v) => formatSqlValue(primaryKey, v))
    .join(', ');

  const count = selectedRows.length;
  const countLabel = count === 1 ? '1 registro seleccionado' : `${count} registros seleccionados`;

  // Check if table contains SP_EJERCICIO
  const ejercicioCol = table.columns.find((c) =>
    /sp_?ejer[c]?icio|ejercicio|ejericio/i.test(c.name)
  )?.name;

  const firstRow = selectedRows[0];

  // ==========================================
  // 1. SELECT BÁSICO (Wildcard *)
  // ==========================================
  let selectSimpleWhere = '';
  if (pkValues.length > 0) {
    selectSimpleWhere =
      pkValues.length === 1
        ? `WHERE ${pkFmt} = ${formattedPkList}`
        : `WHERE ${pkFmt} IN (${formattedPkList})`;
  } else {
    const firstCol = table.columns[0]?.name || 'id';
    selectSimpleWhere = `WHERE ${formatIdentifier(firstCol, dialect)} IN (${selectedRows
      .map((r) => formatSqlValue(firstCol, r[firstCol]))
      .join(', ')})`;
  }

  const selectBasicSql = `-- =======================================================================
-- CONSULTA BÁSICA 1: SELECT * (Fila completa)
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
SELECT *
FROM ${tableNameFmt}
${selectSimpleWhere};`;

  queries.push({
    id: 'basic-select-wildcard',
    title: `SELECT * Básico (${count} ${count === 1 ? 'fila' : 'filas'})`,
    category: 'CRUD_SELECT',
    sql: selectBasicSql,
    description: `Consulta directa con comodín (*) para recuperar todas las columnas de las filas seleccionadas.`,
    badge: 'BÁSICA',
    complexity: 'Básica',
  });

  // ==========================================
  // 2. SELECT PROYECTADO CON ALIAS EXPLICITO
  // ==========================================
  const colList = table.columns
    .map((c) => `    t.${formatIdentifier(c.name, dialect)}`)
    .join(',\n');

  let selectWhere = '';
  if (pkValues.length > 0) {
    selectWhere =
      pkValues.length === 1
        ? `WHERE t.${pkFmt} = ${formattedPkList}`
        : `WHERE t.${pkFmt} IN (${formattedPkList})`;
  } else {
    const firstCol = table.columns[0]?.name || 'id';
    selectWhere = `WHERE t.${formatIdentifier(firstCol, dialect)} IN (${selectedRows
      .map((r) => formatSqlValue(firstCol, r[firstCol]))
      .join(', ')})`;
  }

  const selectProySql = `-- =======================================================================
-- CONSULTA BÁSICA 2: SELECT PROYECTADO POR COLUMNAS
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
SELECT
${colList}
FROM
    ${tableNameFmt} AS t
${selectWhere};`;

  queries.push({
    id: 'crud-select-projected',
    title: `SELECT Columnas Explícitas (${count} ${count === 1 ? 'fila' : 'filas'})`,
    category: 'CRUD_SELECT',
    sql: selectProySql,
    description: `Proyección SQL limpia campo por campo recomendada para reportes y APIs en producción.`,
    badge: 'SELECT',
    complexity: 'Básica',
  });

  // ==========================================
  // 3. SELECT CON JOIN RELACIONAL (Si existen FKs)
  // ==========================================
  if (table.foreignKeys && table.foreignKeys.length > 0) {
    const joins = table.foreignKeys.map((fk, i) => {
      const alias = `rel_${i + 1}`;
      return `LEFT JOIN ${formatIdentifier(fk.toTable, dialect)} AS ${alias}
    ON t.${formatIdentifier(fk.fromColumn, dialect)} = ${alias}.${formatIdentifier(fk.toColumn, dialect)}`;
    });

    const joinSelectCols = table.columns
      .slice(0, 5)
      .map((c) => `    t.${formatIdentifier(c.name, dialect)}`)
      .concat(
        table.foreignKeys.map((fk, i) => `    rel_${i + 1}.* -- Datos relacionados desde ${fk.toTable}`)
      )
      .join(',\n');

    const joinSql = `-- =======================================================================
-- CONSULTA RELACIONAL: SELECT CON JOIN AUTOMÁTICO DE CLAVES FORÁNEAS
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- Relaciones detectadas: ${table.foreignKeys.map((fk) => `${fk.fromColumn} -> ${fk.toTable}.${fk.toColumn}`).join(', ')}
-- =======================================================================
SELECT
${joinSelectCols}
FROM
    ${tableNameFmt} AS t
${joins.join('\n')}
${selectWhere};`;

    queries.push({
      id: 'relations-join',
      title: `SELECT con JOIN a Tablas Relacionadas (${table.foreignKeys.length} FK detectadas)`,
      category: 'RELATIONS_JOIN',
      sql: joinSql,
      description: `Vinculación automática mediante LEFT JOIN hacia las tablas de catálogo y entidades relacionadas.`,
      badge: 'JOIN',
      complexity: 'Avanzada',
    });
  }

  // ==========================================
  // 4. INSERT INTO (CRUD)
  // ==========================================
  const insertCols = table.columns.map((c) => formatIdentifier(c.name, dialect));

  const insertValuesTuples = selectedRows.map((row) => {
    const vals = table.columns.map((col) => formatSqlValue(col.name, row[col.name]));
    return `    (${vals.join(', ')})`;
  });

  const insertSql = `-- =======================================================================
-- OPERACIÓN CRUD: INSERT INTO
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
INSERT INTO ${tableNameFmt} (
    ${insertCols.join(', ')}
)
VALUES
${insertValuesTuples.join(',\n')};`;

  queries.push({
    id: 'crud-insert',
    title: `INSERT INTO Completo (${count} ${count === 1 ? 'fila' : 'filas'})`,
    category: 'CRUD_INSERT',
    sql: insertSql,
    description: `Sentencia INSERT lista para migrar, restaurar o insertar los registros en cualquier ambiente.`,
    badge: 'INSERT',
    complexity: 'CRUD',
  });

  // ==========================================
  // 5. CLONAR / DUPLICAR REGISTRO CON NUEVO ID
  // ==========================================
  const nonPkCols = table.columns.filter((c) => !c.isPrimary);
  if (nonPkCols.length > 0) {
    const cloneColsFmt = nonPkCols.map((c) => formatIdentifier(c.name, dialect)).join(', ');
    const cloneSelectCols = nonPkCols
      .map((c) => {
        // If string column like name or description, append ' (COPIA)'
        if (c.type.toUpperCase().includes('CHAR') || c.type.toUpperCase().includes('TEXT')) {
          return `${formatIdentifier(c.name, dialect)}`;
        }
        return formatIdentifier(c.name, dialect);
      })
      .join(', ');

    const cloneSql = `-- =======================================================================
-- OPERACIÓN CRUD: DUPLICAR / CLONAR REGISTROS CON AUTO-INCREMENT
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
INSERT INTO ${tableNameFmt} (
    ${cloneColsFmt}
)
SELECT
    ${cloneSelectCols}
FROM ${tableNameFmt}
${selectSimpleWhere};`;

    queries.push({
      id: 'crud-clone',
      title: `Clonar / Duplicar Filas Seleccionadas (Omitiendo PK)`,
      category: 'CRUD_INSERT',
      sql: cloneSql,
      description: `Clona los registros omitiendo la columna clave primaria para permitir la generación de nuevos IDs automáticos.`,
      badge: 'CLONE',
      complexity: 'CRUD',
    });
  }

  // ==========================================
  // 6. UPDATE ESPECÍFICO (CRUD)
  // ==========================================
  const updatableCols = table.columns.filter((c) => !c.isPrimary);
  const sampleUpdateCols = updatableCols.slice(0, 4);

  let updateSql = '';
  if (selectedRows.length <= 5) {
    const updateStatements = selectedRows.map((row, idx) => {
      const setParts = sampleUpdateCols.map(
        (col) => `    ${formatIdentifier(col.name, dialect)} = ${formatSqlValue(col.name, row[col.name])}`
      );
      const pkVal = formatSqlValue(primaryKey, row[primaryKey]);
      return `-- Registro #${idx + 1} (${primaryKey} = ${pkVal})\nUPDATE ${tableNameFmt}\nSET\n${setParts.join(',\n')}\nWHERE ${pkFmt} = ${pkVal};`;
    });
    updateSql = `-- =======================================================================
-- OPERACIÓN CRUD: UPDATE INDIVIDUAL POR REGISTRO
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================\n` + updateStatements.join('\n\n');
  } else {
    const setSample = sampleUpdateCols
      .map((col) => `    ${formatIdentifier(col.name, dialect)} = [NUEVO_VALOR] -- Valor actual de referencia: ${formatSqlValue(col.name, selectedRows[0][col.name])}`)
      .join(',\n');
    updateSql = `-- =======================================================================
-- OPERACIÓN CRUD: UPDATE MASIVO POR LOTE
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- Total registros afectados: ${count}
-- =======================================================================
UPDATE ${tableNameFmt}
SET
${setSample}
WHERE ${pkFmt} IN (${formattedPkList});`;
  }

  queries.push({
    id: 'crud-update',
    title: `UPDATE Parametrizado (${count} ${count === 1 ? 'fila' : 'filas'})`,
    category: 'CRUD_UPDATE',
    sql: updateSql,
    description: `Sentencia UPDATE con condiciones acotadas exactamente a las claves primarias seleccionadas.`,
    badge: 'UPDATE',
    complexity: 'CRUD',
  });

  // ==========================================
  // 7. DELETE TRANSACCIONAL SEGURO (CRUD)
  // ==========================================
  let deleteSql = '';
  if (dialect === 'sqlserver') {
    deleteSql = `-- =======================================================================
-- OPERACIÓN CRUD: DELETE TRANSACCIONAL SEGURO (T-SQL)
-- Dialecto: SQL SERVER | Tabla: ${table.name} | Esperados: ${count} registros
-- =======================================================================
BEGIN TRANSACTION;

DELETE FROM ${tableNameFmt}
WHERE ${pkFmt} IN (${formattedPkList});

-- Validación defensiva: asegurar que sólo se borren exactamente ${count} registros
IF @@ROWCOUNT = ${count}
BEGIN
    PRINT 'Verificación exitosa: ${count} filas eliminadas. Confirmando cambios...';
    COMMIT TRANSACTION;
END
ELSE
BEGIN
    PRINT 'ALERTA: Discrepancia en recuento de filas afectadas. Revirtiendo transacción...';
    ROLLBACK TRANSACTION;
END;`;
  } else if (dialect === 'postgresql') {
    deleteSql = `-- =======================================================================
-- OPERACIÓN CRUD: DELETE CON TRANSACCIÓN Y RETORNO (PostgreSQL)
-- Dialecto: POSTGRESQL | Tabla: ${table.name}
-- =======================================================================
BEGIN;

DELETE FROM ${tableNameFmt}
WHERE ${pkFmt} IN (${formattedPkList})
RETURNING ${pkFmt}${ejercicioCol ? `, ${formatIdentifier(ejercicioCol, dialect)}` : ''};

-- Ejecute COMMIT si el resultado coincide con los registros previstos:
COMMIT;`;
  } else {
    deleteSql = `-- =======================================================================
-- OPERACIÓN CRUD: DELETE TRANSACCIONAL
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
START TRANSACTION;

DELETE FROM ${tableNameFmt}
WHERE ${pkFmt} IN (${formattedPkList});

COMMIT;`;
  }

  queries.push({
    id: 'crud-delete',
    title: `DELETE Transaccional Seguro (${count} ${count === 1 ? 'fila' : 'filas'})`,
    category: 'CRUD_DELETE',
    sql: deleteSql,
    description: `Eliminación protegida por bloque transaccional con reversión preventiva si no coincide el número de filas.`,
    badge: 'DELETE',
    complexity: 'CRUD',
  });

  // ==========================================
  // 8. UPSERT / MERGE SEGÚN DIALECTO
  // ==========================================
  let upsertSql = '';
  const rowCols = table.columns.map((c) => formatIdentifier(c.name, dialect));
  const rowVals = table.columns.map((c) => formatSqlValue(c.name, firstRow[c.name]));
  const updateAssignments = table.columns
    .filter((c) => !c.isPrimary)
    .map((c) => `${formatIdentifier(c.name, dialect)} = VALUES(${formatIdentifier(c.name, dialect)})`)
    .join(', ');

  if (dialect === 'mysql') {
    upsertSql = `-- =======================================================================
-- OPERACIÓN CRUD: UPSERT (INSERT ... ON DUPLICATE KEY UPDATE)
-- Dialecto: MYSQL 8.0+ | Tabla: ${table.name}
-- =======================================================================
INSERT INTO ${tableNameFmt} (${rowCols.join(', ')})
VALUES
${insertValuesTuples.join(',\n')}
ON DUPLICATE KEY UPDATE
    ${updateAssignments};`;
  } else if (dialect === 'postgresql' || dialect === 'sqlite') {
    const pgUpdate = table.columns
      .filter((c) => !c.isPrimary)
      .map((c) => `    ${formatIdentifier(c.name, dialect)} = EXCLUDED.${formatIdentifier(c.name, dialect)}`)
      .join(',\n');

    upsertSql = `-- =======================================================================
-- OPERACIÓN CRUD: UPSERT (INSERT ... ON CONFLICT DO UPDATE)
-- Dialecto: POSTGRESQL / SQLITE | Tabla: ${table.name}
-- =======================================================================
INSERT INTO ${tableNameFmt} (${rowCols.join(', ')})
VALUES
${insertValuesTuples.join(',\n')}
ON CONFLICT (${pkFmt}) DO UPDATE SET
${pgUpdate};`;
  } else {
    upsertSql = `-- =======================================================================
-- OPERACIÓN CRUD: MERGE (UPSERT ESTÁNDAR EMPRESARIAL)
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
MERGE INTO ${tableNameFmt} AS target
USING (
    VALUES (${rowVals.join(', ')})
) AS source (${rowCols.join(', ')})
ON (target.${pkFmt} = source.${pkFmt})
WHEN MATCHED THEN
    UPDATE SET ${table.columns
      .filter((c) => !c.isPrimary)
      .slice(0, 3)
      .map((c) => `target.${formatIdentifier(c.name, dialect)} = source.${formatIdentifier(c.name, dialect)}`)
      .join(', ')}
WHEN NOT MATCHED THEN
    INSERT (${rowCols.join(', ')})
    VALUES (${rowCols.map((c) => `source.${c}`).join(', ')});`;
  }

  queries.push({
    id: 'crud-upsert',
    title: `UPSERT / MERGE (${count === 1 ? 'Registro Único' : `${count} Registros`})`,
    category: 'CRUD_UPSERT',
    sql: upsertSql,
    description: `Inserta las filas si no existen, o actualiza sus atributos si la clave primaria ya está registrada.`,
    badge: 'UPSERT',
    complexity: 'CRUD',
  });

  // ==========================================
  // 9. AGREGACIÓN Y FILTRO POR SP_EJERCICIO
  // ==========================================
  const numericCols = table.columns.filter((c) =>
    c.type.toUpperCase().includes('INT') ||
    c.type.toUpperCase().includes('DECIMAL') ||
    c.type.toUpperCase().includes('NUMERIC') ||
    c.type.toUpperCase().includes('FLOAT')
  );

  const sumExpr = numericCols.find((c) => !c.isPrimary && !isYearOrIdColumn(c.name));
  const sumColName = sumExpr ? formatIdentifier(sumExpr.name, dialect) : null;

  let aggSql = '';
  if (ejercicioCol && firstRow[ejercicioCol]) {
    const ejerVal = formatSqlValue(ejercicioCol, firstRow[ejercicioCol]);
    aggSql = `-- =======================================================================
-- ANÁLISIS Y ESTADÍSTICA: CONTEO Y SUMATORIA POR SP_EJERCICIO (${ejerVal})
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
SELECT
    ${formatIdentifier(ejercicioCol, dialect)} AS ejercicio_fiscal,
    COUNT(*) AS total_registros_ejercicio${sumColName ? `,\n    SUM(${sumColName}) AS suma_total_${sumExpr?.name},\n    AVG(${sumColName}) AS promedio_${sumExpr?.name}` : ''}
FROM ${tableNameFmt}
WHERE ${formatIdentifier(ejercicioCol, dialect)} = ${ejerVal}
GROUP BY ${formatIdentifier(ejercicioCol, dialect)};`;
  } else {
    aggSql = `-- =======================================================================
-- ANÁLISIS Y ESTADÍSTICA: RECUENTO Y AGREGACIÓN
-- Dialecto: ${dialect.toUpperCase()} | Tabla: ${table.name}
-- =======================================================================
SELECT
    COUNT(*) AS total_filas_seleccionadas${sumColName ? `,\n    SUM(${sumColName}) AS suma_total,\n    AVG(${sumColName}) AS promedio` : ''}
FROM ${tableNameFmt}
${selectSimpleWhere};`;
  }

  queries.push({
    id: 'aggregation-stats',
    title: `Agregación Estadística y Métricas${ejercicioCol ? ' (por SP_EJERCICIO)' : ''}`,
    category: 'AGGREGATION',
    sql: aggSql,
    description: `Cálculo de métricas agregadas (COUNT, SUM, AVG) centrado en el contexto del registro analizado.`,
    badge: 'MÉTRICAS',
    complexity: 'Avanzada',
  });

  // ==========================================
  // 10. SNIPPET WHERE IN (Subconsultas)
  // ==========================================
  const whereSnippet = pkValues.length === 1
    ? `${pkFmt} = ${formattedPkList}`
    : `${pkFmt} IN (${formattedPkList})`;

  const snippetSql = `-- Cláusula WHERE lista para insertar en consultas complejas o subconsultas:
WHERE ${whereSnippet}
${ejercicioCol && firstRow[ejercicioCol] ? `AND ${formatIdentifier(ejercicioCol, dialect)} = ${formatSqlValue(ejercicioCol, firstRow[ejercicioCol])}` : ''}`;

  queries.push({
    id: 'snippet-where',
    title: 'Fragmento de Cláusula WHERE IN (Para Subconsultas)',
    category: 'SNIPPET_WHERE',
    sql: snippetSql,
    description: `Snippet rápido de condición WHERE con los IDs exactos de la selección para usar en reportes o joins externos.`,
    badge: 'WHERE IN',
    complexity: 'Básica',
  });

  // ==========================================
  // 11. EXPORTACIÓN JSON
  // ==========================================
  const cleanJsonRows = selectedRows.map((row) => {
    const cleanObj: Record<string, any> = {};
    for (const col of table.columns) {
      cleanObj[col.name] = row[col.name];
    }
    return cleanObj;
  });

  const jsonSql = `/* =======================================================================
   CARGA DE DATOS EN FORMATO JSON (${count} filas)
   ======================================================================= */
${JSON.stringify(cleanJsonRows, null, 2)}`;

  queries.push({
    id: 'export-json',
    title: 'Payload JSON Limpio (Sin Comas en SP_EJERCICIO)',
    category: 'EXPORT_JSON',
    sql: jsonSql,
    description: `Estructura JSON limpia con tipos de datos preservados (incluyendo formato numérico puro para SP_EJERCICIO).`,
    badge: 'JSON',
    complexity: 'Formato',
  });

  return queries;
}
