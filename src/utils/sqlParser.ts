import {
  ParsedSQLBackup,
  TableSchema,
  ColumnDefinition,
  ForeignKeyRelation,
  StoredRoutine,
  SensitiveDataAlert,
  SQLDialect,
} from '../types/sql';

// Helper to remove enclosing quotes (`name`, "name", [name])
export function cleanIdentifier(name: string): string {
  if (!name) return '';
  return name.trim().replace(/^[`"\[]|[`"\]]$/g, '').replace(/^[a-zA-Z0-9_]+\./, ''); // remove schema prefix if present
}

// Split SQL statements while respecting strings
export function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Check for comment starts/ends
    if (!inSingleQuote && !inDoubleQuote) {
      if (!inLineComment && !inBlockComment) {
        if (char === '-' && nextChar === '-') {
          inLineComment = true;
          i++;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          i++;
          continue;
        }
      } else if (inLineComment && (char === '\n' || char === '\r')) {
        inLineComment = false;
        continue;
      } else if (inBlockComment && char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
        continue;
      }
    }

    if (inLineComment || inBlockComment) {
      continue;
    }

    // Check quote states
    if (char === "'" && (i === 0 || sql[i - 1] !== '\\')) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }
    if (char === '"' && (i === 0 || sql[i - 1] !== '\\')) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    // Statement delimiter
    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += char;
    }
  }

  const lastTrimmed = current.trim();
  if (lastTrimmed) {
    statements.push(lastTrimmed);
  }

  return statements;
}

// Tokenize row values inside `(val1, val2, ...)`
export function parseRowValues(valuesTuple: string): any[] {
  // Strip outer parentheses
  let str = valuesTuple.trim();
  if (str.startsWith('(') && str.endsWith(')')) {
    str = str.slice(1, -1).trim();
  }

  const values: any[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];

    if (escaped) {
      current += c;
      escaped = false;
      continue;
    }

    if (c === '\\') {
      escaped = true;
      current += c;
      continue;
    }

    if (c === "'" && !inDoubleQuote) {
      // Check for doubled single quotes: ''
      if (inSingleQuote && str[i + 1] === "'") {
        current += "'";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (c === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (c === ',' && !inSingleQuote && !inDoubleQuote) {
      values.push(cleanRawValue(current));
      current = '';
    } else {
      current += c;
    }
  }

  values.push(cleanRawValue(current));
  return values;
}

function cleanRawValue(val: string): any {
  const trimmed = val.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;
  if (trimmed.toUpperCase() === 'TRUE') return true;
  if (trimmed.toUpperCase() === 'FALSE') return false;

  // If numeric
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  // String unescaping
  return trimmed
    .replace(/^'(.*)'$/s, '$1')
    .replace(/^"(.*)"$/s, '$1')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

// Split multiple rows in VALUES (...), (...)
export function splitValuesTuples(valuesBlock: string): string[] {
  const tuples: string[] = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < valuesBlock.length; i++) {
    const c = valuesBlock[i];

    if (escaped) {
      if (depth > 0) current += c;
      escaped = false;
      continue;
    }

    if (c === '\\') {
      escaped = true;
      if (depth > 0) current += c;
      continue;
    }

    if (c === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      if (depth > 0) current += c;
      continue;
    }

    if (c === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      if (depth > 0) current += c;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (c === '(') {
        if (depth === 0) {
          current = '(';
        } else {
          current += c;
        }
        depth++;
        continue;
      } else if (c === ')') {
        depth--;
        current += c;
        if (depth === 0) {
          tuples.push(current.trim());
          current = '';
        }
        continue;
      }
    }

    if (depth > 0) {
      current += c;
    }
  }

  return tuples;
}

// Detect dialect based on SQL keywords/functions
export function detectDialect(sql: string): SQLDialect {
  const lower = sql.toLowerCase();
  if (lower.includes('auto_increment') || lower.includes('engine=innodb') || lower.includes('`')) {
    return 'mysql';
  }
  if (
    lower.includes('serial') ||
    lower.includes('uuid_generate') ||
    lower.includes('bytea') ||
    lower.includes('plpgsql') ||
    lower.includes('jsonb')
  ) {
    return 'postgresql';
  }
  if (
    lower.includes('identity(') ||
    lower.includes('datetime2') ||
    lower.includes('nvarchar') ||
    lower.includes('getdate()')
  ) {
    return 'sqlserver';
  }
  if (
    lower.includes('varchar2') ||
    lower.includes('number(') ||
    lower.includes('sysdate') ||
    lower.includes('dual')
  ) {
    return 'oracle';
  }
  if (lower.includes('autoincrement') || lower.includes('sqlite_sequence')) {
    return 'sqlite';
  }
  return 'postgresql';
}

// Sensitive data detector
const SENSITIVE_COLUMN_PATTERNS = [
  /password/i,
  /pass(?:_hash|wd)?/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /credit[_-]?card/i,
  /tarjeta/i,
  /cvv/i,
  /pin/i,
  /private[_-]?key/i,
  /salt/i,
  /ssn/i,
  /dni/i,
  /cedula/i,
  /identificacion/i,
  /auth[_-]?key/i,
];

const BCRYPT_REGEX = /^\$2[abxy]?\$\d{2}\$[A-Za-z0-9./]{53}$/;
const MD5_REGEX = /^[a-f0-9]{32}$/i;
const JWT_REGEX = /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;

export function scanForSensitiveData(
  tables: Record<string, TableSchema>
): SensitiveDataAlert[] {
  const alerts: SensitiveDataAlert[] = [];

  for (const tableName of Object.keys(tables)) {
    const table = tables[tableName];
    for (const col of table.columns) {
      let isSensitive = false;
      let reason = '';
      let severity: 'ALTA' | 'MEDIA' | 'BAJA' = 'MEDIA';

      // 1. Column name check
      for (const pattern of SENSITIVE_COLUMN_PATTERNS) {
        if (pattern.test(col.name)) {
          isSensitive = true;
          if (/password|pass|secret|private[_-]?key|cvv|tarjeta|credit/i.test(col.name)) {
            severity = 'ALTA';
            reason = `Nombre de columna '${col.name}' sugiere credenciales críticas o datos financieros directos`;
          } else if (/token|api[_-]?key|salt/i.test(col.name)) {
            severity = 'ALTA';
            reason = `Nombre de columna '${col.name}' contiene tokens de autenticación o claves de acceso`;
          } else {
            severity = 'MEDIA';
            reason = `Nombre de columna '${col.name}' contiene información de identificación personal (PII)`;
          }
          break;
        }
      }

      // 2. Data value check
      if (table.rows.length > 0) {
        let bcryptMatches = 0;
        let jwtMatches = 0;
        let md5Matches = 0;

        for (const row of table.rows.slice(0, 50)) {
          const val = String(row[col.name] ?? '');
          if (BCRYPT_REGEX.test(val)) bcryptMatches++;
          if (JWT_REGEX.test(val)) jwtMatches++;
          if (MD5_REGEX.test(val)) md5Matches++;
        }

        if (bcryptMatches > 0) {
          isSensitive = true;
          severity = 'ALTA';
          reason = `Se detectaron ${bcryptMatches} hashes de contraseña en formato Bcrypt`;
        } else if (jwtMatches > 0) {
          isSensitive = true;
          severity = 'ALTA';
          reason = `Se detectaron tokens de sesión activos o credenciales JWT`;
        } else if (md5Matches > 0 && !isSensitive) {
          isSensitive = true;
          severity = 'MEDIA';
          reason = `Valores con patrón hash MD5 (posible contraseña o identificador encriptado débil)`;
        }
      }

      if (isSensitive) {
        col.isSensitive = true;
        col.sensitiveReason = reason;
        if (!table.sensitiveColumns.includes(col.name)) {
          table.sensitiveColumns.push(col.name);
        }

        alerts.push({
          table: tableName,
          column: col.name,
          reason,
          sampleCount: table.rowCount,
          severity,
          recommendation:
            severity === 'ALTA'
              ? `Asegurar que este campo no se envíe a entornos no seguros ni se exponga en consultas no autorizadas. En producción, usar variables de entorno o almacén de secretos (Vault).`
              : `Verificar cumplimiento con normativas de protección de datos (GDPR / Leyes locales de privacidad). Aplicar enmascaramiento en logs.`,
        });
      }
    }
  }

  return alerts;
}

// Main parser function
export function parseSQLDump(sqlContent: string, fileName: string = 'backup.sql'): ParsedSQLBackup {
  const fileSizeBytes = new Blob([sqlContent]).size;
  const detectedDialect = detectDialect(sqlContent);
  const statements = splitSQLStatements(sqlContent);

  const tables: Record<string, TableSchema> = {};
  const routines: StoredRoutine[] = [];
  const foreignKeys: ForeignKeyRelation[] = [];

  const rawStatementsCount = {
    creates: 0,
    inserts: 0,
    alters: 0,
    routines: 0,
    other: 0,
  };

  // Helper to ensure table exists
  const getOrCreateTable = (name: string): TableSchema => {
    const cleanName = cleanIdentifier(name);
    if (!tables[cleanName]) {
      tables[cleanName] = {
        name: cleanName,
        columns: [],
        primaryKeys: [],
        foreignKeys: [],
        rowCount: 0,
        rows: [],
        dateColumns: [],
        numericColumns: [],
        categoricalColumns: [],
        sensitiveColumns: [],
      };
    }
    return tables[cleanName];
  };

  // First pass: Process CREATE TABLE and ROUTINES
  for (const rawStmt of statements) {
    const stmt = rawStmt.trim();
    if (!stmt) continue;

    // --- CREATE TABLE ---
    const createTableMatch = stmt.match(
      /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([`"\[\w\.]+)[\s\n]*\(([\s\S]*)\)[^)]*$/i
    );

    if (createTableMatch) {
      rawStatementsCount.creates++;
      const tableName = cleanIdentifier(createTableMatch[1]);
      const table = getOrCreateTable(tableName);
      const body = createTableMatch[2];

      parseTableBody(body, table, foreignKeys);
      continue;
    }

    // --- ALTER TABLE ADD CONSTRAINT / FOREIGN KEY ---
    const alterTableMatch = stmt.match(/ALTER\s+TABLE\s+([`"\[\w\.]+)[\s\S]*$/i);
    if (alterTableMatch) {
      rawStatementsCount.alters++;
      const tableName = cleanIdentifier(alterTableMatch[1]);
      const table = getOrCreateTable(tableName);

      const fkMatch = stmt.match(
        /(?:ADD\s+CONSTRAINT\s+([`"\[\w\.]+)\s+)?FOREIGN\s+KEY\s*\(([`"\[\w\s,]+)\)\s*REFERENCES\s+([`"\[\w\.]+)\s*\(([`"\[\w\s,]+)\)/i
      );

      if (fkMatch) {
        const constraintName = fkMatch[1] ? cleanIdentifier(fkMatch[1]) : undefined;
        const fromCol = cleanIdentifier(fkMatch[2]);
        const toTable = cleanIdentifier(fkMatch[3]);
        const toCol = cleanIdentifier(fkMatch[4]);

        const fk: ForeignKeyRelation = {
          fromTable: tableName,
          fromColumn: fromCol,
          toTable,
          toColumn: toCol,
          constraintName,
          isInfered: false,
        };

        foreignKeys.push(fk);
        table.foreignKeys.push(fk);

        // Mark column as FK
        const colDef = table.columns.find((c) => c.name.toLowerCase() === fromCol.toLowerCase());
        if (colDef) {
          colDef.isForeignKey = true;
          colDef.references = { table: toTable, column: toCol };
        }
      }
      continue;
    }

    // --- ROUTINES: PROCEDURE, FUNCTION, TRIGGER, VIEW ---
    const routineMatch = stmt.match(
      /CREATE(?:\s+OR\s+REPLACE)?\s+(PROCEDURE|FUNCTION|TRIGGER|VIEW)\s+([`"\[\w\.]+)([\s\S]*)/i
    );

    if (routineMatch) {
      rawStatementsCount.routines++;
      const type = routineMatch[1].toUpperCase() as StoredRoutine['type'];
      const name = cleanIdentifier(routineMatch[2]);
      const remainder = routineMatch[3];

      const routine = parseRoutine(name, type, remainder, stmt);
      routines.push(routine);
      continue;
    }

    // --- INSERT INTO ---
    if (/^INSERT\s+INTO/i.test(stmt)) {
      rawStatementsCount.inserts++;
      parseInsertStatement(stmt, getOrCreateTable);
      continue;
    }

    rawStatementsCount.other++;
  }

  // Second pass: Classify column types (date, numeric, categorical)
  for (const tableName of Object.keys(tables)) {
    const table = tables[tableName];

    for (const col of table.columns) {
      const typeUpper = col.type.toUpperCase();

      // Check dates and fiscal exercise columns (SP_EJERCICIO, SP_EJERICIO, EJERCICIO, ANIO, etc.)
      const isDateOrExercise =
        typeUpper.includes('DATE') ||
        typeUpper.includes('TIME') ||
        typeUpper.includes('TIMESTAMP') ||
        /sp_?ejer[c]?icio|ejercicio|ejericio|periodo_anio|anio|año|fiscal_year|^year$/i.test(col.name) ||
        /^(created_at|updated_at|fecha|fecha_creacion|fecha_pedido|fecha_pago|fecha_registro|fecha_emision|fecha_apertura|fecha_transaccion|timestamp)$/i.test(col.name);

      if (isDateOrExercise) {
        if (!table.dateColumns.includes(col.name)) {
          if (/sp_?ejer[c]?icio|ejercicio|ejericio/i.test(col.name)) {
            table.dateColumns.unshift(col.name);
          } else {
            table.dateColumns.push(col.name);
          }
        }
      }
      
      // Check numeric
      if (
        typeUpper.includes('INT') ||
        typeUpper.includes('DECIMAL') ||
        typeUpper.includes('NUMERIC') ||
        typeUpper.includes('FLOAT') ||
        typeUpper.includes('DOUBLE') ||
        typeUpper.includes('MONEY') ||
        typeUpper.includes('REAL')
      ) {
        if (!table.numericColumns.includes(col.name)) {
          table.numericColumns.push(col.name);
        }
      }
      // Categorical / string
      else if (!isDateOrExercise) {
        if (!table.categoricalColumns.includes(col.name)) {
          table.categoricalColumns.push(col.name);
        }
      }
    }

    // Fallback: If table has rows but no schema definition was found in CREATE TABLE
    if (table.columns.length === 0 && table.rows.length > 0) {
      const firstRow = table.rows[0];
      for (const colName of Object.keys(firstRow)) {
        const val = firstRow[colName];
        let inferredType = 'VARCHAR(255)';
        if (typeof val === 'number') {
          inferredType = Number.isInteger(val) ? 'INTEGER' : 'DECIMAL(10,2)';
          table.numericColumns.push(colName);
          if (/sp_?ejer[c]?icio|ejercicio|ejericio|periodo_anio|anio|año|year/i.test(colName)) {
            table.dateColumns.unshift(colName);
          }
        } else if (
          typeof val === 'string' &&
          /^\d{4}-\d{2}-\d{2}/.test(val)
        ) {
          inferredType = val.includes('T') || val.includes(':') ? 'TIMESTAMP' : 'DATE';
          table.dateColumns.push(colName);
        } else if (/sp_?ejer[c]?icio|ejercicio|ejericio|periodo_anio|anio|año|year/i.test(colName)) {
          table.dateColumns.unshift(colName);
          table.categoricalColumns.push(colName);
        } else {
          table.categoricalColumns.push(colName);
        }

        const isPrimary = colName.toLowerCase() === 'id' || colName.toLowerCase() === `${tableName.toLowerCase()}_id`;
        if (isPrimary) {
          table.primaryKeys.push(colName);
        }

        table.columns.push({
          name: colName,
          type: inferredType,
          isPrimary,
          isNullable: true,
          isForeignKey: false,
        });
      }
    }
  }

  // Third pass: Infer missing Foreign Keys by naming conventions (e.g. cliente_id -> clientes.id)
  inferForeignKeys(tables, foreignKeys);

  // Fourth pass: Scan for sensitive data & credentials
  const sensitiveAlerts = scanForSensitiveData(tables);

  // Calculate total records
  let totalRecords = 0;
  for (const tbl of Object.values(tables)) {
    totalRecords += tbl.rowCount;
  }

  return {
    fileName,
    fileSizeBytes,
    detectedDialect,
    tables,
    routines,
    foreignKeys,
    totalRecords,
    sensitiveAlerts,
    rawStatementsCount,
  };
}

// Parse Table Body lines
function parseTableBody(body: string, table: TableSchema, foreignKeys: ForeignKeyRelation[]) {
  // Split lines inside parentheses
  const lines: string[] = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (c === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) {
        lines.push(current.trim());
        current = '';
        continue;
      }
    }
    current += c;
  }
  if (current.trim()) {
    lines.push(current.trim());
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check Table-level PRIMARY KEY (col1, col2)
    const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      const cols = pkMatch[1].split(',').map((c) => cleanIdentifier(c));
      for (const colName of cols) {
        if (!table.primaryKeys.includes(colName)) {
          table.primaryKeys.push(colName);
        }
        const found = table.columns.find((c) => c.name.toLowerCase() === colName.toLowerCase());
        if (found) found.isPrimary = true;
      }
      continue;
    }

    // Check Table-level FOREIGN KEY
    const fkMatch = trimmed.match(
      /^(?:CONSTRAINT\s+([`"\[\w\.]+)\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([`"\[\w\.]+)\s*\(([^)]+)\)/i
    );
    if (fkMatch) {
      const constraintName = fkMatch[1] ? cleanIdentifier(fkMatch[1]) : undefined;
      const fromCol = cleanIdentifier(fkMatch[2]);
      const toTable = cleanIdentifier(fkMatch[3]);
      const toCol = cleanIdentifier(fkMatch[4]);

      const fk: ForeignKeyRelation = {
        fromTable: table.name,
        fromColumn: fromCol,
        toTable,
        toColumn: toCol,
        constraintName,
        isInfered: false,
      };

      foreignKeys.push(fk);
      table.foreignKeys.push(fk);

      const colDef = table.columns.find((c) => c.name.toLowerCase() === fromCol.toLowerCase());
      if (colDef) {
        colDef.isForeignKey = true;
        colDef.references = { table: toTable, column: toCol };
      }
      continue;
    }

    // Check Indexes / Constraints / Keys that are not column definitions
    if (
      /^(KEY|INDEX|UNIQUE\s+KEY|CONSTRAINT|CHECK)\b/i.test(trimmed) &&
      !/PRIMARY\s+KEY/i.test(trimmed)
    ) {
      continue;
    }

    // Regular Column Definition: `name` TYPE [CONSTRAINTS...]
    const colMatch = trimmed.match(/^([`"\[\w\.]+)\s+([A-Za-z0-9_]+(?:\s*\([^)]*\))?)([\s\S]*)$/);
    if (colMatch) {
      const colName = cleanIdentifier(colMatch[1]);
      const colType = colMatch[2].trim();
      const colExtras = colMatch[3] || '';

      const isPrimary = /PRIMARY\s+KEY/i.test(colExtras);
      const isNullable = !/NOT\s+NULL/i.test(colExtras);

      // Check inline references
      let references: { table: string; column: string } | undefined;
      let isForeignKey = false;
      const inlineFkMatch = colExtras.match(/REFERENCES\s+([`"\[\w\.]+)\s*\(([^)]+)\)/i);
      if (inlineFkMatch) {
        isForeignKey = true;
        const toTable = cleanIdentifier(inlineFkMatch[1]);
        const toCol = cleanIdentifier(inlineFkMatch[2]);
        references = { table: toTable, column: toCol };

        const fk: ForeignKeyRelation = {
          fromTable: table.name,
          fromColumn: colName,
          toTable,
          toColumn: toCol,
          isInfered: false,
        };
        foreignKeys.push(fk);
        table.foreignKeys.push(fk);
      }

      if (isPrimary && !table.primaryKeys.includes(colName)) {
        table.primaryKeys.push(colName);
      }

      table.columns.push({
        name: colName,
        type: colType,
        isPrimary,
        isNullable,
        isForeignKey,
        references,
      });
    }
  }
}

// Parse INSERT INTO statement
function parseInsertStatement(
  stmt: string,
  getOrCreateTable: (name: string) => TableSchema
) {
  // Regex to extract table name, optional column list, and VALUES payload
  const insertMatch = stmt.match(
    /INSERT\s+INTO\s+([`"\[\w\.]+)(?:\s*\(([^)]+)\))?\s+VALUES\s*([\s\S]+)$/i
  );
  if (!insertMatch) return;

  const tableName = cleanIdentifier(insertMatch[1]);
  const table = getOrCreateTable(tableName);

  // Extract explicit column names if provided
  let explicitCols: string[] | null = null;
  if (insertMatch[2]) {
    explicitCols = insertMatch[2].split(',').map((c) => cleanIdentifier(c));
  }

  const valuesPayload = insertMatch[3].trim();
  const tuples = splitValuesTuples(valuesPayload);

  for (const tuple of tuples) {
    const rawValues = parseRowValues(tuple);
    const rowObj: Record<string, any> = {};

    if (explicitCols && explicitCols.length === rawValues.length) {
      for (let i = 0; i < explicitCols.length; i++) {
        rowObj[explicitCols[i]] = rawValues[i];
      }
    } else if (table.columns.length > 0) {
      for (let i = 0; i < rawValues.length; i++) {
        const colDef = table.columns[i];
        const colName = colDef ? colDef.name : `col_${i + 1}`;
        rowObj[colName] = rawValues[i];
      }
    } else {
      // No schema known yet, use generic column names
      for (let i = 0; i < rawValues.length; i++) {
        rowObj[`col_${i + 1}`] = rawValues[i];
      }
    }

    table.rows.push(rowObj);
    table.rowCount++;
  }
}

// Parse Procedures, Functions, Triggers, Views
function parseRoutine(
  name: string,
  type: StoredRoutine['type'],
  remainder: string,
  fullStmt: string
): StoredRoutine {
  const parameters: StoredRoutine['parameters'] = [];
  let returnType: string | undefined;

  // Extract parameters inside first ()
  const paramMatch = remainder.match(/^\s*\(([^)]*)\)/);
  if (paramMatch && paramMatch[1].trim()) {
    const paramsList = paramMatch[1].split(',');
    for (const p of paramsList) {
      const pTrimmed = p.trim();
      const parts = pTrimmed.split(/\s+/);
      let direction: 'IN' | 'OUT' | 'INOUT' = 'IN';
      let paramName = '';
      let paramType = '';

      if (['IN', 'OUT', 'INOUT'].includes(parts[0].toUpperCase())) {
        direction = parts[0].toUpperCase() as any;
        paramName = cleanIdentifier(parts[1] || 'param');
        paramType = parts.slice(2).join(' ') || 'VARCHAR';
      } else {
        paramName = cleanIdentifier(parts[0] || 'param');
        paramType = parts.slice(1).join(' ') || 'VARCHAR';
      }

      parameters.push({
        name: paramName,
        type: paramType,
        direction,
      });
    }
  }

  // Extract RETURNS for functions
  const returnsMatch = remainder.match(/RETURNS\s+([A-Za-z0-9_]+(?:\s*\([^)]*\))?)/i);
  if (returnsMatch) {
    returnType = returnsMatch[1].trim();
  }

  // Detect referenced tables by looking for FROM, JOIN, UPDATE, INTO in body
  const involvedTables: string[] = [];
  const tableRegex = /\b(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+([`"\[\w\.]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(fullStmt)) !== null) {
    const cleanTbl = cleanIdentifier(match[1]);
    if (
      cleanTbl &&
      !['select', 'where', 'set', 'values', 'new', 'old'].includes(cleanTbl.toLowerCase()) &&
      !involvedTables.includes(cleanTbl)
    ) {
      involvedTables.push(cleanTbl);
    }
  }

  return {
    name,
    type,
    parameters,
    returnType,
    involvedTables,
    definition: fullStmt,
    description: `Rutina ${type} con ${parameters.length} parámetros y ${involvedTables.length} tablas involucradas`,
  };
}

// Infer foreign keys based on common relational conventions
function inferForeignKeys(
  tables: Record<string, TableSchema>,
  foreignKeys: ForeignKeyRelation[]
) {
  const tableNames = Object.keys(tables);

  for (const tableName of tableNames) {
    const table = tables[tableName];

    for (const col of table.columns) {
      if (col.isForeignKey || col.isPrimary) continue;

      const colLower = col.name.toLowerCase();

      // Check pattern: <target_table>_id or id_<target_table>
      for (const targetName of tableNames) {
        if (targetName.toLowerCase() === tableName.toLowerCase()) continue;

        const targetTable = tables[targetName];
        const targetPk = targetTable.primaryKeys[0] || 'id';

        const possibleNames = [
          `${targetName.toLowerCase()}_id`,
          `${targetName.toLowerCase().replace(/s$/, '')}_id`,
          `id_${targetName.toLowerCase()}`,
          `id_${targetName.toLowerCase().replace(/s$/, '')}`,
        ];

        if (possibleNames.includes(colLower)) {
          // Check if already exists in foreignKeys
          const exists = foreignKeys.some(
            (fk) =>
              fk.fromTable.toLowerCase() === tableName.toLowerCase() &&
              fk.fromColumn.toLowerCase() === col.name.toLowerCase()
          );

          if (!exists) {
            const inferredFk: ForeignKeyRelation = {
              fromTable: tableName,
              fromColumn: col.name,
              toTable: targetName,
              toColumn: targetPk,
              constraintName: `fk_${tableName}_${col.name}_inferred`,
              isInfered: true,
            };

            foreignKeys.push(inferredFk);
            table.foreignKeys.push(inferredFk);
            col.isForeignKey = true;
            col.references = { table: targetName, column: targetPk };
          }
          break;
        }
      }
    }
  }
}
