CREATE DATABASE IF NOT EXISTS taller_automotriz
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taller_automotriz;

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(25) NOT NULL,
  correo VARCHAR(120),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  placa VARCHAR(15) NOT NULL UNIQUE,
  marca VARCHAR(50) NOT NULL,
  modelo VARCHAR(50) NOT NULL,
  anio SMALLINT,
  color VARCHAR(30),
  CONSTRAINT fk_vehiculo_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion_min INT DEFAULT 60,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ordenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id INT NOT NULL,
  servicio_id INT NOT NULL,
  fecha DATE NOT NULL,
  estado ENUM('Pendiente','En proceso','Completada','Cancelada') NOT NULL DEFAULT 'Pendiente',
  observaciones VARCHAR(500),
  costo_total DECIMAL(10,2) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orden_vehiculo FOREIGN KEY (vehiculo_id)
    REFERENCES vehiculos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orden_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

INSERT INTO clientes (nombre, telefono, correo) VALUES
('Carlos Hernández', '7000-1000', 'carlos@example.com'),
('María López', '7000-2000', 'maria@example.com');

INSERT INTO vehiculos (cliente_id, placa, marca, modelo, anio, color) VALUES
(1, 'P123-456', 'Toyota', 'Corolla', 2018, 'Gris'),
(2, 'P789-012', 'Honda', 'Civic', 2020, 'Azul');

INSERT INTO servicios (nombre, descripcion, precio, duracion_min, activo) VALUES
('Cambio de aceite', 'Cambio de aceite y revisión básica', 25.00, 45, TRUE),
('Diagnóstico general', 'Escaneo y revisión de fallas', 35.00, 60, TRUE),
('Servicio de frenos', 'Inspección y mantenimiento de frenos', 50.00, 90, TRUE);

INSERT INTO ordenes (vehiculo_id, servicio_id, fecha, estado, observaciones, costo_total) VALUES
(1, 1, CURDATE(), 'Completada', 'Servicio de ejemplo', 25.00),
(2, 2, CURDATE(), 'Pendiente', 'Revisar luz del tablero', 35.00);
