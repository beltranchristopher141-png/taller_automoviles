require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS: ' + origin));
  }
}));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'taller_automotriz',
  port: Number(process.env.DB_PORT || 3306),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true
}).promise();

app.get('/', (_req, res) => res.json({ message: 'API Taller Automotriz activa', health: '/api/health' }));
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ api: 'ok', database: 'connected' }); }
  catch (err) { res.status(500).json({ error: 'No se pudo conectar con MySQL', detail: err.message }); }
});

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
function crudRoutes(path, table, fields, required = fields) {
  app.get(`/api/${path}`, asyncRoute(async (_req, res) => {
    const sql = table === 'vehiculos'
      ? 'SELECT v.*, c.nombre AS cliente_nombre FROM vehiculos v INNER JOIN clientes c ON v.cliente_id = c.id ORDER BY v.id DESC'
      : `SELECT * FROM ${table} ORDER BY id DESC`;
    const [rows] = await pool.query(sql);
    res.json(rows);
  }));
  app.post(`/api/${path}`, asyncRoute(async (req, res) => {
    const values = fields.map(f => req.body[f] === '' ? null : req.body[f]);
    const missing = required.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === '');
    if (missing.length) return res.status(400).json({ message: `Faltan campos obligatorios: ${missing.join(', ')}` });
    const placeholders = fields.map(() => '?').join(', ');
    const [result] = await pool.query(
      `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`, values
    );
    res.status(201).json({ message: 'Registro creado correctamente', id: result.insertId });
  }));
  app.put(`/api/${path}/:id`, asyncRoute(async (req, res) => {
    const missing = required.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === '');
    if (missing.length) return res.status(400).json({ message: `Faltan campos obligatorios: ${missing.join(', ')}` });
    const values = fields.map(f => req.body[f] === '' ? null : req.body[f]);
    const [result] = await pool.query(
      `UPDATE ${table} SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`,
      [...values, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: 'Registro actualizado correctamente' });
  }));
  app.delete(`/api/${path}/:id`, asyncRoute(async (req, res) => {
    const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado correctamente' });
  }));
}

crudRoutes('clientes', 'clientes', ['nombre','telefono','correo'], ['nombre','telefono']);
crudRoutes('vehiculos', 'vehiculos', ['cliente_id','placa','marca','modelo','anio','color'], ['cliente_id','placa','marca','modelo']);
crudRoutes('servicios', 'servicios', ['nombre','descripcion','precio','duracion_min','activo'], ['nombre','precio']);

app.get('/api/ordenes', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT o.id, o.vehiculo_id, o.servicio_id, o.fecha, o.estado, o.observaciones,
           o.costo_total, v.placa, v.marca, v.modelo, c.nombre AS cliente,
           s.nombre AS servicio, s.precio AS precio_servicio
    FROM ordenes o
    INNER JOIN vehiculos v ON o.vehiculo_id = v.id
    INNER JOIN clientes c ON v.cliente_id = c.id
    INNER JOIN servicios s ON o.servicio_id = s.id
    ORDER BY o.id DESC
  `);
  res.json(rows);
}));
app.post('/api/ordenes', asyncRoute(async (req, res) => {
  const { vehiculo_id, servicio_id, fecha, estado = 'Pendiente', observaciones = '', costo_total } = req.body;
  if (!vehiculo_id || !servicio_id || !fecha || costo_total === undefined || costo_total === '') {
    return res.status(400).json({ message: 'Vehículo, servicio, fecha y costo son obligatorios' });
  }
  const [result] = await pool.query(
    'INSERT INTO ordenes (vehiculo_id, servicio_id, fecha, estado, observaciones, costo_total) VALUES (?, ?, ?, ?, ?, ?)',
    [vehiculo_id, servicio_id, fecha, estado, observaciones, costo_total]
  );
  res.status(201).json({ message: 'Orden creada correctamente', id: result.insertId });
}));
app.put('/api/ordenes/:id', asyncRoute(async (req, res) => {
  const { vehiculo_id, servicio_id, fecha, estado, observaciones = '', costo_total } = req.body;
  if (!vehiculo_id || !servicio_id || !fecha || !estado || costo_total === undefined || costo_total === '') {
    return res.status(400).json({ message: 'Vehículo, servicio, fecha, estado y costo son obligatorios' });
  }
  const [result] = await pool.query(
    'UPDATE ordenes SET vehiculo_id=?, servicio_id=?, fecha=?, estado=?, observaciones=?, costo_total=? WHERE id=?',
    [vehiculo_id, servicio_id, fecha, estado, observaciones, costo_total, req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Orden no encontrada' });
  res.json({ message: 'Orden actualizada correctamente' });
}));
app.delete('/api/ordenes/:id', asyncRoute(async (req, res) => {
  const [result] = await pool.query('DELETE FROM ordenes WHERE id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Orden no encontrada' });
  res.json({ message: 'Orden eliminada correctamente' });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un registro con ese dato único, por ejemplo la placa.' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'Selecciona un cliente, vehículo o servicio que exista.' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'No se puede eliminar: hay registros relacionados. Elimina o reasigna primero las órdenes/vehículos relacionados.' });
  res.status(500).json({ message: 'Error interno del servidor', detail: err.message });
});

app.listen(PORT, () => console.log(`API Taller Automotriz escuchando en puerto ${PORT}`));
