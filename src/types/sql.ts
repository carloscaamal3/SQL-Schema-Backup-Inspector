export type SQLDialect = 'postgresql' | 'mysql' | 'sqlserver' | 'oracle' | 'sqlite';

export interface ColumnDefinition {
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
  defaultValue?: string;
  isSensitive?: boolean;
  sensitiveReason?: string;
}

export interface ForeignKeyRelation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName?: string;
  isInfered?: boolean;
}

export interface StoredRoutine {
  name: string;
  type: 'PROCEDURE' | 'FUNCTION' | 'TRIGGER' | 'VIEW';
  parameters: {
    name: string;
    type: string;
    direction?: 'IN' | 'OUT' | 'INOUT';
  }[];
  returnType?: string;
  involvedTables: string[];
  definition: string;
  description?: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyRelation[];
  rowCount: number;
  rows: Record<string, any>[];
  dateColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  sensitiveColumns: string[];
}

export interface SensitiveDataAlert {
  table: string;
  column: string;
  reason: string;
  sampleCount: number;
  severity: 'ALTA' | 'MEDIA' | 'BAJA';
  recommendation: string;
}

export interface ParsedSQLBackup {
  fileName: string;
  fileSizeBytes: number;
  detectedDialect: SQLDialect;
  tables: Record<string, TableSchema>;
  routines: StoredRoutine[];
  foreignKeys: ForeignKeyRelation[];
  totalRecords: number;
  sensitiveAlerts: SensitiveDataAlert[];
  rawStatementsCount: {
    creates: number;
    inserts: number;
    alters: number;
    routines: number;
    other: number;
  };
}

export type FilterOperator =
  | '='
  | '!='
  | 'LIKE'
  | 'NOT LIKE'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'BETWEEN'
  | 'IN'
  | 'IS NULL'
  | 'IS NOT NULL';

export interface ColumnFilter {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
  valueSecondary?: string; // For BETWEEN
}

export type DatePeriodType = 'all' | 'year' | 'quarter' | 'month' | 'day' | 'range';

export interface DateFilter {
  enabled: boolean;
  column: string;
  periodType: DatePeriodType;
  year?: number;
  quarter?: number; // 1, 2, 3, 4
  month?: number; // 1 to 12
  specificDate?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
}

export interface FilterState {
  searchQuery: string;
  dateFilter: DateFilter;
  columnFilters: ColumnFilter[];
}
