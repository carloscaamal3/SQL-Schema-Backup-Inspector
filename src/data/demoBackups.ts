export interface DemoDataset {
  id: string;
  name: string;
  description: string;
  dialect: 'mysql' | 'postgresql' | 'sqlserver';
  fileName: string;
  sql: string;
}

export const DEMO_BACKUPS: DemoDataset[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce & Facturación Global',
    description: 'MySQL dump con clientes, productos, pedidos, pagos y procedimientos almacenados de corte mensual.',
    dialect: 'mysql',
    fileName: 'ecommerce_store_backup_2026.sql',
    sql: `-- ==========================================================
-- DUMP DE BASE DE DATOS: ecommerce_global_db
-- Dialecto: MySQL 8.0 (InnoDB)
-- ==========================================================

DROP TABLE IF EXISTS \`detalles_pedido\`;
DROP TABLE IF EXISTS \`pagos\`;
DROP TABLE IF EXISTS \`pedidos\`;
DROP TABLE IF EXISTS \`productos\`;
DROP TABLE IF EXISTS \`clientes\`;

CREATE TABLE \`clientes\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`nombre\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(150) NOT NULL,
  \`pais\` VARCHAR(50) DEFAULT 'México',
  \`categoria\` VARCHAR(20) DEFAULT 'REGULAR',
  \`fecha_registro\` DATETIME NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`clientes\` (\`id\`, \`nombre\`, \`email\`, \`pais\`, \`categoria\`, \`fecha_registro\`) VALUES
(1, 'Carlos Mendoza', 'carlos.mendoza@empresa.com', 'México', 'VIP', '2024-01-15 09:30:00'),
(2, 'Valeria Silva', 'valeria.silva@techcorp.io', 'Colombia', 'VIP', '2024-03-22 14:10:00'),
(3, 'Mateo Gómez', 'mateo.gomez@gmail.com', 'Argentina', 'REGULAR', '2024-06-10 11:45:00'),
(4, 'Sofía Ramírez', 'sofia.r@startup.co', 'Chile', 'CORPORATIVO', '2024-09-05 16:20:00'),
(5, 'Alejandro Morales', 'alejandro.m@digital.pe', 'Perú', 'REGULAR', '2024-11-18 10:15:00'),
(6, 'Lucía Fernández', 'lucia.f@ibero.es', 'España', 'VIP', '2025-01-08 08:50:00'),
(7, 'Diego Castro', 'diego.castro@latam.org', 'México', 'REGULAR', '2025-02-14 13:00:00'),
(8, 'Elena Vargas', 'elena.vargas@global.net', 'Colombia', 'CORPORATIVO', '2025-04-19 17:35:00'),
(9, 'Javier Herrera', 'javier.h@consulting.com', 'México', 'VIP', '2025-07-23 12:10:00'),
(10, 'Camila Navarro', 'camila.n@solutions.com', 'Chile', 'REGULAR', '2025-10-11 15:40:00'),
(11, 'Rodrigo Peña', 'rodrigo.pena@retail.mx', 'México', 'REGULAR', '2025-12-01 09:15:00'),
(12, 'Mariana Ortiz', 'mariana.ortiz@innovate.co', 'Colombia', 'VIP', '2026-01-12 11:00:00'),
(13, 'Esteban Cruz', 'esteban.cruz@finance.ar', 'Argentina', 'CORPORATIVO', '2026-02-20 14:25:00'),
(14, 'Paula Domínguez', 'paula.d@media.es', 'España', 'REGULAR', '2026-03-05 10:40:00');

CREATE TABLE \`productos\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`sku\` VARCHAR(30) NOT NULL,
  \`nombre\` VARCHAR(120) NOT NULL,
  \`precio_unitario\` DECIMAL(10,2) NOT NULL,
  \`stock_actual\` INT NOT NULL DEFAULT 0,
  \`activo\` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`productos\` (\`id\`, \`sku\`, \`nombre\`, \`precio_unitario\`, \`stock_actual\`, \`activo\`) VALUES
(1, 'PROD-LAP-01', 'Laptop Dell XPS 15 32GB', 1899.99, 45, 1),
(2, 'PROD-MON-02', 'Monitor UltraWide 34\" 144Hz', 549.50, 80, 1),
(3, 'PROD-MOU-03', 'Mouse Ergonómico Inalámbrico', 45.00, 320, 1),
(4, 'PROD-KEY-04', 'Teclado Mecánico RGB Pro', 129.90, 150, 1),
(5, 'PROD-AUR-05', 'Auriculares Noise Cancelling', 249.00, 95, 1),
(6, 'PROD-HUB-06', 'Docking Station Thunderbolt 4', 199.99, 60, 1),
(7, 'PROD-CAM-07', 'Webcam 4K Pro Streaming', 135.00, 110, 1);

CREATE TABLE \`pedidos\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`cliente_id\` INT NOT NULL,
  \`fecha_creacion\` DATETIME NOT NULL,
  \`subtotal\` DECIMAL(10,2) NOT NULL,
  \`impuestos\` DECIMAL(10,2) NOT NULL,
  \`total\` DECIMAL(10,2) NOT NULL,
  \`estado\` VARCHAR(30) NOT NULL,
  \`metodo_envio\` VARCHAR(50) DEFAULT 'ESTANDAR',
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_pedidos_cliente\` FOREIGN KEY (\`cliente_id\`) REFERENCES \`clientes\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`pedidos\` (\`id\`, \`cliente_id\`, \`fecha_creacion\`, \`subtotal\`, \`impuestos\`, \`total\`, \`estado\`, \`metodo_envio\`) VALUES
(101, 1, '2024-02-10 10:15:00', 1899.99, 303.99, 2203.98, 'PAGADO', 'EXPRESS'),
(102, 2, '2024-03-25 15:30:00', 679.40, 108.70, 788.10, 'PAGADO', 'ESTANDAR'),
(103, 3, '2024-05-12 11:20:00', 174.90, 27.98, 202.88, 'CANCELADO', 'ESTANDAR'),
(104, 4, '2024-07-18 16:45:00', 2148.99, 343.84, 2492.83, 'PAGADO', 'EXPRESS'),
(105, 5, '2024-09-02 09:10:00', 549.50, 87.92, 637.42, 'PAGADO', 'ESTANDAR'),
(106, 6, '2024-11-28 14:05:00', 2347.98, 375.68, 2723.66, 'PAGADO', 'EXPRESS'),
(107, 7, '2025-01-15 10:00:00', 448.99, 71.84, 520.83, 'PAGADO', 'ESTANDAR'),
(108, 8, '2025-02-20 13:25:00', 3799.98, 607.99, 4407.97, 'PAGADO', 'EXPRESS'),
(109, 9, '2025-04-10 16:50:00', 129.90, 20.78, 150.68, 'PENDIENTE', 'ESTANDAR'),
(110, 10, '2025-06-18 11:15:00', 749.49, 119.92, 869.41, 'PAGADO', 'ESTANDAR'),
(111, 11, '2025-08-22 15:40:00', 1899.99, 303.99, 2203.98, 'PAGADO', 'EXPRESS'),
(112, 12, '2025-10-05 09:30:00', 2897.48, 463.60, 3361.08, 'PAGADO', 'EXPRESS'),
(113, 1, '2025-11-19 14:20:00', 384.00, 61.44, 445.44, 'PAGADO', 'ESTANDAR'),
(114, 2, '2025-12-14 17:00:00', 1899.99, 303.99, 2203.98, 'CANCELADO', 'EXPRESS'),
(115, 13, '2026-01-10 10:10:00', 4248.97, 679.84, 4928.81, 'PAGADO', 'EXPRESS'),
(116, 14, '2026-02-05 12:40:00', 549.50, 87.92, 637.42, 'PENDIENTE', 'ESTANDAR'),
(117, 4, '2026-02-28 15:15:00', 199.99, 32.00, 231.99, 'PAGADO', 'ESTANDAR'),
(118, 6, '2026-03-12 11:50:00', 2148.99, 343.84, 2492.83, 'PAGADO', 'EXPRESS');

CREATE TABLE \`detalles_pedido\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`pedido_id\` INT NOT NULL,
  \`producto_id\` INT NOT NULL,
  \`cantidad\` INT NOT NULL,
  \`precio_unitario\` DECIMAL(10,2) NOT NULL,
  \`total_linea\` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_detalle_pedido\` FOREIGN KEY (\`pedido_id\`) REFERENCES \`pedidos\` (\`id\`),
  CONSTRAINT \`fk_detalle_producto\` FOREIGN KEY (\`producto_id\`) REFERENCES \`productos\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`detalles_pedido\` (\`id\`, \`pedido_id\`, \`producto_id\`, \`cantidad\`, \`precio_unitario\`, \`total_linea\`) VALUES
(1, 101, 1, 1, 1899.99, 1899.99),
(2, 102, 2, 1, 549.50, 549.50),
(3, 102, 4, 1, 129.90, 129.90),
(4, 103, 3, 1, 45.00, 45.00),
(5, 103, 4, 1, 129.90, 129.90),
(6, 104, 1, 1, 1899.99, 1899.99),
(7, 104, 5, 1, 249.00, 249.00),
(8, 105, 2, 1, 549.50, 549.50),
(9, 106, 1, 1, 1899.99, 1899.99),
(10, 106, 5, 1, 249.00, 249.00),
(11, 106, 6, 1, 199.99, 199.99),
(12, 107, 6, 1, 199.99, 199.99),
(13, 107, 5, 1, 249.00, 249.00),
(14, 108, 1, 2, 1899.99, 3799.98),
(15, 109, 4, 1, 129.90, 129.90),
(16, 110, 2, 1, 549.50, 549.50),
(17, 110, 6, 1, 199.99, 199.99),
(18, 111, 1, 1, 1899.99, 1899.99),
(19, 112, 1, 1, 1899.99, 1899.99),
(20, 112, 2, 1, 549.50, 549.50),
(21, 112, 5, 1, 249.00, 249.00),
(22, 112, 6, 1, 199.99, 199.99),
(23, 113, 3, 2, 45.00, 90.00),
(24, 113, 5, 1, 249.00, 249.00),
(25, 113, 3, 1, 45.00, 45.00),
(26, 115, 1, 2, 1899.99, 3799.98),
(27, 115, 5, 1, 249.00, 249.00),
(28, 115, 6, 1, 199.99, 199.99),
(29, 116, 2, 1, 549.50, 549.50),
(30, 117, 6, 1, 199.99, 199.99),
(31, 118, 1, 1, 1899.99, 1899.99),
(32, 118, 5, 1, 249.00, 249.00);

CREATE TABLE \`pagos\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`pedido_id\` INT NOT NULL,
  \`monto\` DECIMAL(10,2) NOT NULL,
  \`metodo\` VARCHAR(40) NOT NULL,
  \`referencia_transaccion\` VARCHAR(100) NOT NULL,
  \`fecha_pago\` DATETIME NOT NULL,
  \`estado_pago\` VARCHAR(20) DEFAULT 'APROBADO',
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_pagos_pedido\` FOREIGN KEY (\`pedido_id\`) REFERENCES \`pedidos\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO \`pagos\` (\`id\`, \`pedido_id\`, \`monto\`, \`metodo\`, \`referencia_transaccion\`, \`fecha_pago\`, \`estado_pago\`) VALUES
(1, 101, 2203.98, 'TARJETA_CREDITO', 'TX-STRIPE-89123847', '2024-02-10 10:16:30', 'APROBADO'),
(2, 102, 788.10, 'PAYPAL', 'PP-PAY-99213821', '2024-03-25 15:32:00', 'APROBADO'),
(3, 104, 2492.83, 'TRANSFERENCIA', 'SPEI-BAN-3312984', '2024-07-18 16:50:00', 'APROBADO'),
(4, 105, 637.42, 'TARJETA_DEBITO', 'TX-STRIPE-11928374', '2024-09-02 09:12:15', 'APROBADO'),
(5, 106, 2723.66, 'TARJETA_CREDITO', 'TX-STRIPE-77829103', '2024-11-28 14:08:40', 'APROBADO'),
(6, 107, 520.83, 'PAYPAL', 'PP-PAY-44129831', '2025-01-15 10:02:10', 'APROBADO'),
(7, 108, 4407.97, 'TRANSFERENCIA', 'SPEI-BAN-9921827', '2025-02-20 13:28:00', 'APROBADO'),
(8, 110, 869.41, 'TARJETA_CREDITO', 'TX-STRIPE-66281920', '2025-06-18 11:18:25', 'APROBADO'),
(9, 111, 2203.98, 'TARJETA_CREDITO', 'TX-STRIPE-55192834', '2025-08-22 15:42:00', 'APROBADO'),
(10, 112, 3361.08, 'TARJETA_CREDITO', 'TX-STRIPE-22819204', '2025-10-05 09:35:10', 'APROBADO'),
(11, 113, 445.44, 'PAYPAL', 'PP-PAY-88219384', '2025-11-19 14:22:45', 'APROBADO'),
(12, 115, 4928.81, 'TRANSFERENCIA', 'SPEI-BAN-7712983', '2026-01-10 10:14:00', 'APROBADO'),
(13, 117, 231.99, 'TARJETA_DEBITO', 'TX-STRIPE-44910293', '2026-02-28 15:18:00', 'APROBADO'),
(14, 118, 2492.83, 'TARJETA_CREDITO', 'TX-STRIPE-33019284', '2026-03-12 11:52:10', 'APROBADO');

DELIMITER //

CREATE PROCEDURE \`sp_corte_mensual_ventas\` (
  IN p_anio INT,
  IN p_mes INT,
  OUT p_total_recaudado DECIMAL(12,2),
  OUT p_pedidos_completados INT
)
BEGIN
  -- Procedimiento de consolidación y corte mensual contable
  SELECT 
    COALESCE(SUM(total), 0),
    COUNT(*)
  INTO 
    p_total_recaudado,
    p_pedidos_completados
  FROM \`pedidos\`
  WHERE YEAR(\`fecha_creacion\`) = p_anio
    AND MONTH(\`fecha_creacion\`) = p_mes
    AND \`estado\` = 'PAGADO';
END //

CREATE FUNCTION \`fn_calcular_descuento_cliente\` (
  p_cliente_id INT
) RETURNS DECIMAL(5,2)
DETERMINISTIC
BEGIN
  DECLARE v_total_gastado DECIMAL(10,2);
  DECLARE v_descuento DECIMAL(5,2) DEFAULT 0.00;

  SELECT COALESCE(SUM(total), 0)
  INTO v_total_gastado
  FROM \`pedidos\`
  WHERE \`cliente_id\` = p_cliente_id AND \`estado\` = 'PAGADO';

  IF v_total_gastado >= 5000.00 THEN
    SET v_descuento = 15.00;
  ELSEIF v_total_gastado >= 2000.00 THEN
    SET v_descuento = 10.00;
  ELSEIF v_total_gastado >= 500.00 THEN
    SET v_descuento = 5.00;
  END IF;

  RETURN v_descuento;
END //

DELIMITER ;
`,
  },
  {
    id: 'rrhh',
    name: 'RRHH, Nóminas y Accesos (Con Datos Sensibles)',
    description: 'PostgreSQL dump con departamentos, empleados, nóminas y hashes de contraseña para auditar seguridad.',
    dialect: 'postgresql',
    fileName: 'rrhh_nominas_dump_2026.sql',
    sql: `-- ==========================================================
-- DUMP DE BASE DE DATOS: rrhh_corporativo_db
-- Dialecto: PostgreSQL 16
-- ==========================================================

DROP TABLE IF EXISTS "nominas" CASCADE;
DROP TABLE IF EXISTS "asistencias" CASCADE;
DROP TABLE IF EXISTS "empleados" CASCADE;
DROP TABLE IF EXISTS "departamentos" CASCADE;

CREATE TABLE "departamentos" (
  "id" SERIAL PRIMARY KEY,
  "codigo" VARCHAR(20) NOT NULL UNIQUE,
  "nombre" VARCHAR(100) NOT NULL,
  "presupuesto_anual" NUMERIC(12,2) NOT NULL,
  "activo" BOOLEAN DEFAULT true
);

INSERT INTO "departamentos" ("id", "codigo", "nombre", "presupuesto_anual", "activo") VALUES
(1, 'DEP-TI', 'Tecnología e Infraestructura', 850000.00, true),
(2, 'DEP-FIN', 'Finanzas y Contabilidad', 420000.00, true),
(3, 'DEP-RRHH', 'Recursos Humanos y Cultura', 250000.00, true),
(4, 'DEP-OPS', 'Operaciones y Logística', 980000.00, true),
(5, 'DEP-MKT', 'Marketing y Expansión', 380000.00, true);

CREATE TABLE "empleados" (
  "id" SERIAL PRIMARY KEY,
  "departamento_id" INT NOT NULL REFERENCES "departamentos"("id"),
  "documento_identidad" VARCHAR(30) NOT NULL,
  "nombres" VARCHAR(80) NOT NULL,
  "apellidos" VARCHAR(80) NOT NULL,
  "email_corporativo" VARCHAR(120) NOT NULL,
  "password_hash" VARCHAR(100) NOT NULL,
  "token_acceso" VARCHAR(255) NULL,
  "salario_base" NUMERIC(10,2) NOT NULL,
  "estado" VARCHAR(20) DEFAULT 'ACTIVO',
  "fecha_ingreso" DATE NOT NULL
);

INSERT INTO "empleados" ("id", "departamento_id", "documento_identidad", "nombres", "apellidos", "email_corporativo", "password_hash", "token_acceso", "salario_base", "estado", "fecha_ingreso") VALUES
(1, 1, 'DOC-MX-772819', 'Guillermo', 'Sánchez', 'guillermo.s@empresa.com', '$2b$12$K8j7mYqZ.hO9uU7B6TqG0.1o8D6P0Z3e9f5V4r1a2b3c4d5e6f7g8', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6Ikd1aWxsZXJtbyJ9.5X9q', 4500.00, 'ACTIVO', '2024-02-01'),
(2, 1, 'DOC-CO-449102', 'Beatriz', 'López', 'beatriz.l@empresa.com', '$2b$12$R9w8xTyZ.mK1nN8B7QqG0.2p9E7Q1A4f0g6W5s2b3c4d5e6f7g8h9', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwibmFtZSI6IkJlYXRyaXoifQ.7Y2k', 3800.00, 'ACTIVO', '2024-04-15'),
(3, 2, 'DOC-AR-119283', 'Ignacio', 'Pérez', 'ignacio.p@empresa.com', '$2b$12$Z1x2cTvB.nL2oO9C8RrG0.3q0F8R2B5g1h7X6t3c4d5e6f7g8h9i0', NULL, 3200.00, 'ACTIVO', '2024-07-01'),
(4, 3, 'DOC-CL-998822', 'Daniela', 'Ríos', 'daniela.r@empresa.com', '$2b$12$A2b3cDvE.oM3pP0D9SsH1.4r1G9S3C6h2i8Y7u4d5e6f7g8h9i0j1', NULL, 2900.00, 'ACTIVO', '2024-10-10'),
(5, 4, 'DOC-PE-667744', 'Fernando', 'Solís', 'fernando.s@empresa.com', '$2b$12$B3c4dEwF.pA4qQ1E0TtI2.5s2H0T4D7i3j9Z8v5e6f7g8h9i0j1k2', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1IiwibmFtZSI6IkZlcm5hbmRvIn0.8Z3m', 2800.00, 'SUSPENDIDO', '2025-01-20'),
(6, 1, 'DOC-MX-334455', 'Claudia', 'Mena', 'claudia.m@empresa.com', '$2b$12$C4d5eFxG.qB5rR2F1UuJ3.6t3I1U5E8j4k0A9w6f7g8h9i0j1k2l3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2IiwibmFtZSI6IkNsYXVkaWEifQ.9A4n', 4100.00, 'ACTIVO', '2025-03-01'),
(7, 5, 'DOC-ES-556677', 'Marcos', 'Navas', 'marcos.n@empresa.com', '$2b$12$D5e6fGyH.rC6sS3G2VvK4.7u4J2V6F9k5l1B0x7g8h9i0j1k2l3m4', NULL, 3500.00, 'ACTIVO', '2025-06-15'),
(8, 2, 'DOC-CO-889900', 'Luciana', 'Bravo', 'luciana.b@empresa.com', '$2b$12$E6f7gHzI.sD7tT4H3WwL5.8v5K3W7G0l6m2C1y8h9i0j1k2l3m4n5', NULL, 3100.00, 'ACTIVO', '2025-09-01'),
(9, 4, 'DOC-MX-123456', 'Roberto', 'Cano', 'roberto.c@empresa.com', '$2b$12$F7g8hIaJ.tE8uU5I4XxM6.9w6L4X8H1m7n3D2z9i0j1k2l3m4n5o6', NULL, 2600.00, 'ACTIVO', '2025-11-15'),
(10, 1, 'DOC-CL-654321', 'Lorena', 'Pardo', 'lorena.p@empresa.com', '$2b$12$G8h9iJbK.uF9vV6J5YyN7.0x7M5Y9I2n8o4E3a0j1k2l3m4n5o6p7', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMCIsIm5hbWUiOiJMb3JlbmEifQ.1B5p', 4700.00, 'ACTIVO', '2026-01-10');

CREATE TABLE "nominas" (
  "id" SERIAL PRIMARY KEY,
  "empleado_id" INT NOT NULL REFERENCES "empleados"("id"),
  "periodo_anio" INT NOT NULL,
  "periodo_mes" INT NOT NULL,
  "salario_bruto" NUMERIC(10,2) NOT NULL,
  "deduccion_seguro" NUMERIC(10,2) NOT NULL,
  "deduccion_impuestos" NUMERIC(10,2) NOT NULL,
  "salario_neto" NUMERIC(10,2) NOT NULL,
  "fecha_emision" DATE NOT NULL,
  "estado" VARCHAR(20) DEFAULT 'LIQUIDADA'
);

INSERT INTO "nominas" ("id", "empleado_id", "periodo_anio", "periodo_mes", "salario_bruto", "deduccion_seguro", "deduccion_impuestos", "salario_neto", "fecha_emision", "estado") VALUES
(1, 1, 2025, 1, 4500.00, 315.00, 675.00, 3510.00, '2025-01-30', 'LIQUIDADA'),
(2, 2, 2025, 1, 3800.00, 266.00, 532.00, 3002.00, '2025-01-30', 'LIQUIDADA'),
(3, 3, 2025, 1, 3200.00, 224.00, 416.00, 2560.00, '2025-01-30', 'LIQUIDADA'),
(4, 1, 2025, 6, 4500.00, 315.00, 675.00, 3510.00, '2025-06-30', 'LIQUIDADA'),
(5, 6, 2025, 6, 4100.00, 287.00, 574.00, 3239.00, '2025-06-30', 'LIQUIDADA'),
(6, 7, 2025, 6, 3500.00, 245.00, 455.00, 2800.00, '2025-06-30', 'LIQUIDADA'),
(7, 1, 2025, 12, 4500.00, 315.00, 675.00, 3510.00, '2025-12-30', 'LIQUIDADA'),
(8, 6, 2025, 12, 4100.00, 287.00, 574.00, 3239.00, '2025-12-30', 'LIQUIDADA'),
(9, 8, 2025, 12, 3100.00, 217.00, 403.00, 2480.00, '2025-12-30', 'LIQUIDADA'),
(10, 1, 2026, 1, 4500.00, 315.00, 675.00, 3510.00, '2026-01-30', 'LIQUIDADA'),
(11, 2, 2026, 1, 3800.00, 266.00, 532.00, 3002.00, '2026-01-30', 'LIQUIDADA'),
(12, 10, 2026, 1, 4700.00, 329.00, 752.00, 3619.00, '2026-01-30', 'LIQUIDADA'),
(13, 1, 2026, 2, 4500.00, 315.00, 675.00, 3510.00, '2026-02-28', 'PENDIENTE'),
(14, 10, 2026, 2, 4700.00, 329.00, 752.00, 3619.00, '2026-02-28', 'PENDIENTE');

CREATE OR REPLACE FUNCTION fn_calcular_salario_neto(
  p_bruto NUMERIC,
  p_porcentaje_impuestos NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN p_bruto - (p_bruto * 0.07) - (p_bruto * (p_porcentaje_impuestos / 100.0));
END;
$$;
`,
  },
  {
    id: 'banco',
    name: 'Transacciones Bancarias y Cuentas',
    description: 'SQL Server dump con cuentas financieras, movimientos trimestrales y balance de auditoría.',
    dialect: 'sqlserver',
    fileName: 'banco_transacciones_backup.sql',
    sql: `-- ==========================================================
-- DUMP DE BASE DE DATOS: banco_financiero_db
-- Dialecto: Microsoft SQL Server (T-SQL)
-- ==========================================================

CREATE TABLE [sucursales] (
  [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [codigo_sucursal] NVARCHAR(20) NOT NULL,
  [nombre] NVARCHAR(100) NOT NULL,
  [ciudad] NVARCHAR(60) NOT NULL,
  [estado] NVARCHAR(20) DEFAULT 'OPERATIVA'
);

INSERT INTO [sucursales] ([codigo_sucursal], [nombre], [ciudad], [estado]) VALUES
('SUC-CDMX-01', 'Sucursal Reforma Centro', 'Ciudad de México', 'OPERATIVA'),
('SUC-MTY-02', 'Sucursal San Pedro', 'Monterrey', 'OPERATIVA'),
('SUC-GDL-03', 'Sucursal Providencia', 'Guadalajara', 'OPERATIVA'),
('SUC-BOG-04', 'Sucursal Chico Norte', 'Bogotá', 'OPERATIVA');

CREATE TABLE [cuentas] (
  [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [sucursal_id] INT NOT NULL,
  [numero_cuenta] NVARCHAR(30) NOT NULL,
  [titular] NVARCHAR(100) NOT NULL,
  [tipo_cuenta] NVARCHAR(30) NOT NULL,
  [saldo_disponible] DECIMAL(14,2) NOT NULL,
  [fecha_apertura] DATETIME2 NOT NULL,
  [estado] NVARCHAR(20) DEFAULT 'ACTIVA',
  CONSTRAINT [fk_cuentas_sucursal] FOREIGN KEY ([sucursal_id]) REFERENCES [sucursales] ([id])
);

INSERT INTO [cuentas] ([sucursal_id], [numero_cuenta], [titular], [tipo_cuenta], [saldo_disponible], [fecha_apertura], [estado]) VALUES
(1, 'CTA-MX-998811', 'Corporativo Alfa SA', 'EMPRESARIAL', 1450000.50, '2024-01-10 08:30:00', 'ACTIVA'),
(1, 'CTA-MX-776622', 'Alejandro Rivera', 'CORRIENTE', 12450.00, '2024-04-18 10:15:00', 'ACTIVA'),
(2, 'CTA-MX-554433', 'Industrias del Norte SA', 'EMPRESARIAL', 3890200.00, '2024-07-22 14:00:00', 'ACTIVA'),
(3, 'CTA-MX-332211', 'Mariana Garza', 'AHORROS', 8430.75, '2024-11-05 16:45:00', 'ACTIVA'),
(1, 'CTA-MX-221199', 'Tecnología Web SC', 'EMPRESARIAL', 780500.00, '2025-02-14 09:10:00', 'ACTIVA'),
(4, 'CTA-CO-445566', 'Inversiones Andinas SAS', 'EMPRESARIAL', 2150000.00, '2025-05-19 11:30:00', 'ACTIVA'),
(2, 'CTA-MX-889900', 'Pedro Zambrano', 'CORRIENTE', 3200.00, '2025-09-08 15:20:00', 'BLOQUEADA'),
(3, 'CTA-MX-112233', 'Gabriela Solano', 'AHORROS', 15400.90, '2026-01-15 10:05:00', 'ACTIVA');

CREATE TABLE [transacciones] (
  [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [cuenta_id] INT NOT NULL,
  [tipo_movimiento] NVARCHAR(30) NOT NULL,
  [monto] DECIMAL(12,2) NOT NULL,
  [comision] DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  [fecha_transaccion] DATETIME2 NOT NULL,
  [estado_transaccion] NVARCHAR(20) DEFAULT 'APROBADA',
  [canal] NVARCHAR(40) DEFAULT 'BANCA_DIGITAL',
  CONSTRAINT [fk_transacciones_cuenta] FOREIGN KEY ([cuenta_id]) REFERENCES [cuentas] ([id])
);

INSERT INTO [transacciones] ([cuenta_id], [tipo_movimiento], [monto], [comision], [fecha_transaccion], [estado_transaccion], [canal]) VALUES
(1, 'DEPOSITO', 500000.00, 0.00, '2024-02-15 10:30:00', 'APROBADA', 'SPEI'),
(2, 'RETIRO_CAJERO', 3000.00, 25.00, '2024-05-10 18:45:00', 'APROBADA', 'CAJERO_ATM'),
(3, 'TRANSFERENCIA_RECIBIDA', 1250000.00, 0.00, '2024-08-20 11:15:00', 'APROBADA', 'SPEI'),
(4, 'COMPRA_COMERCIO', 1450.50, 0.00, '2024-12-02 19:10:00', 'APROBADA', 'TPV'),
(5, 'TRANSFERENCIA_ENVIADA', 180000.00, 50.00, '2025-03-12 14:20:00', 'APROBADA', 'BANCA_DIGITAL'),
(6, 'DEPOSITO_VENTANILLA', 45000.00, 0.00, '2025-06-25 12:00:00', 'APROBADA', 'VENTANILLA'),
(7, 'TRANSFERENCIA_ENVIADA', 15000.00, 50.00, '2025-09-08 15:18:00', 'RECHAZADA', 'BANCA_DIGITAL'),
(1, 'PAGO_PROVEEDOR', 340000.00, 15.00, '2025-10-14 09:40:00', 'APROBADA', 'SPEI'),
(5, 'PAGO_NOMINA', 290000.00, 100.00, '2025-11-28 17:30:00', 'APROBADA', 'SPEI'),
(8, 'DEPOSITO', 15000.00, 0.00, '2026-01-20 11:25:00', 'APROBADA', 'BANCA_DIGITAL'),
(3, 'TRANSFERENCIA_ENVIADA', 480000.00, 50.00, '2026-02-14 16:10:00', 'APROBADA', 'SPEI'),
(2, 'RETIRO_CAJERO', 2500.00, 25.00, '2026-03-05 13:50:00', 'APROBADA', 'CAJERO_ATM');
`,
  },
  {
    id: 'contabilidad',
    name: 'Contabilidad Gubernamental y Pólizas (SP_EJERCICIO)',
    description: 'Esquema financiero y fiscal con SP_EJERCICIO como año fiscal, pólizas contables, centros de costo y cuentas.',
    dialect: 'sqlserver',
    fileName: 'contabilidad_polizas_ejercicio_dump.sql',
    sql: `-- ==========================================================
-- DUMP DE BASE DE DATOS: contabilidad_fiscal_db
-- Dialecto: Microsoft SQL Server (T-SQL)
-- ==========================================================

DROP TABLE IF EXISTS [detalles_poliza];
DROP TABLE IF EXISTS [polizas];
DROP TABLE IF EXISTS [catalogo_cuentas];

CREATE TABLE [catalogo_cuentas] (
  [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [codigo_cuenta] NVARCHAR(30) NOT NULL,
  [nombre_cuenta] NVARCHAR(120) NOT NULL,
  [tipo_cuenta] NVARCHAR(30) NOT NULL,
  [naturaleza] NVARCHAR(10) NOT NULL
);

INSERT INTO [catalogo_cuentas] ([codigo_cuenta], [nombre_cuenta], [tipo_cuenta], [naturaleza]) VALUES
('1101-01', 'Caja y Efectivo Disponible', 'ACTIVO_CIRCULANTE', 'DEUDORA'),
('1102-01', 'Bancos Nacionales Moneda Nacional', 'ACTIVO_CIRCULANTE', 'DEUDORA'),
('1105-01', 'Clientes y Cuentas por Cobrar', 'ACTIVO_CIRCULANTE', 'DEUDORA'),
('2101-01', 'Proveedores Nacionales', 'PASIVO_CORTO_PLAZO', 'ACREEDORA'),
('2103-01', 'Impuestos Federales por Pagar', 'PASIVO_CORTO_PLAZO', 'ACREEDORA'),
('4101-01', 'Ingresos por Ventas Gravadas', 'INGRESOS', 'ACREEDORA'),
('5101-01', 'Sueldos y Salarios Administrativos', 'GASTOS_OPERACION', 'DEUDORA');

CREATE TABLE [polizas] (
  [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [SP_EJERCICIO] INT NOT NULL,
  [periodo_mes] INT NOT NULL,
  [numero_poliza] NVARCHAR(25) NOT NULL,
  [tipo_poliza] NVARCHAR(20) NOT NULL,
  [concepto] NVARCHAR(200) NOT NULL,
  [total_cargos] DECIMAL(14,2) NOT NULL,
  [total_abonos] DECIMAL(14,2) NOT NULL,
  [estado] NVARCHAR(20) DEFAULT 'APLICADA',
  [fecha_registro] DATETIME2 NOT NULL
);

INSERT INTO [polizas] ([SP_EJERCICIO], [periodo_mes], [numero_poliza], [tipo_poliza], [concepto], [total_cargos], [total_abonos], [estado], [fecha_registro]) VALUES
(2024, 1, 'ING-2024-001', 'INGRESO', 'Cobro de facturas cliente corporativo 01', 125000.00, 125000.00, 'APLICADA', '2024-01-15 10:00:00'),
(2024, 3, 'EGR-2024-042', 'EGRESO', 'Liquidación de nómina quincenal marzo 2024', 84000.00, 84000.00, 'APLICADA', '2024-03-31 16:30:00'),
(2024, 7, 'DR-2024-118', 'DIARIO', 'Provisión mensual de depreciación de activos fijos', 32500.00, 32500.00, 'APLICADA', '2024-07-30 18:00:00'),
(2024, 12, 'DR-2024-290', 'DIARIO', 'Cierre anual preliminar de ejercicio fiscal 2024', 450000.00, 450000.00, 'APLICADA', '2024-12-31 23:59:00'),
(2025, 1, 'ING-2025-002', 'INGRESO', 'Cobro servicios de consultoría internacional', 280000.00, 280000.00, 'APLICADA', '2025-01-20 11:15:00'),
(2025, 2, 'EGR-2025-019', 'EGRESO', 'Pago a proveedores estratégicos de TI', 95400.00, 95400.00, 'APLICADA', '2025-02-14 12:45:00'),
(2025, 6, 'DR-2025-088', 'DIARIO', 'Ajuste cambiario semestral USD/MXN', 18900.00, 18900.00, 'APLICADA', '2025-06-30 17:20:00'),
(2025, 10, 'ING-2025-156', 'INGRESO', 'Facturación proyecto de modernización digital', 340000.00, 340000.00, 'APLICADA', '2025-10-18 14:10:00'),
(2025, 12, 'DR-2025-240', 'DIARIO', 'Cierre de balance y arqueo general 2025', 520000.00, 520000.00, 'APLICADA', '2025-12-31 22:00:00'),
(2026, 1, 'ING-2026-001', 'INGRESO', 'Anticipo clientes contratos anuales 2026', 195000.00, 195000.00, 'APLICADA', '2026-01-10 09:30:00'),
(2026, 2, 'EGR-2026-015', 'EGRESO', 'Pago seguro patrimonial y fianzas operativas', 68000.00, 68000.00, 'APLICADA', '2026-02-05 13:00:00'),
(2026, 3, 'DR-2026-031', 'DIARIO', 'Corte mensual de amortizaciones primer trimestre', 42000.00, 42000.00, 'PENDIENTE', '2026-03-15 15:40:00');

CREATE TABLE [detalles_poliza] (
  [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [poliza_id] INT NOT NULL,
  [cuenta_id] INT NOT NULL,
  [SP_EJERCICIO] INT NOT NULL,
  [cargo] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  [abono] DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  [descripcion_movimiento] NVARCHAR(150) NOT NULL,
  CONSTRAINT [fk_detalle_poliza_poliza] FOREIGN KEY ([poliza_id]) REFERENCES [polizas] ([id]),
  CONSTRAINT [fk_detalle_poliza_cuenta] FOREIGN KEY ([cuenta_id]) REFERENCES [catalogo_cuentas] ([id])
);

INSERT INTO [detalles_poliza] ([poliza_id], [cuenta_id], [SP_EJERCICIO], [cargo], [abono], [descripcion_movimiento]) VALUES
(1, 2, 2024, 125000.00, 0.00, 'Depósito en cuenta bancaria principal'),
(1, 3, 2024, 0.00, 125000.00, 'Cancelación de saldo cliente'),
(2, 7, 2024, 84000.00, 0.00, 'Gasto de sueldos devengados'),
(2, 2, 2024, 0.00, 84000.00, 'Dispersión SPEI de nómina'),
(5, 2, 2025, 280000.00, 0.00, 'Transferencia recibida servicios'),
(5, 6, 2025, 0.00, 280000.00, 'Ingresos facturados por servicios'),
(6, 4, 2025, 95400.00, 0.00, 'Amortización cuenta proveedores'),
(6, 2, 2025, 0.00, 95400.00, 'Transferencia bancaria a proveedor'),
(10, 2, 2026, 195000.00, 0.00, 'Entrada a bancos por anticipo'),
(10, 6, 2026, 0.00, 195000.00, 'Ingreso diferido contrato 2026');
`,
  },
];
