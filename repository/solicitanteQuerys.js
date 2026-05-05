const pool = require('../database/conexionBD');

//#region ── CRUD SOLICITANTES ─────────────────────────────────────

/**
 * Retorna todos los solicitantes ordenados por nombre de área.
 * @returns {Promise<object[]>}
 */
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT * FROM solicitantes ORDER BY nombre_area`
  );
  return rows;
};

/**
 * Busca un solicitante por su ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM solicitantes WHERE id = ?`, [id]
  );
  return rows[0] || null;
};

/**
 * Inserta un nuevo solicitante.
 * @param {{ nombre_area: string, nombre_contacto: string, telefono: string, email: string, direccion: string }} param0
 * @returns {Promise<number>} ID del registro creado
 */
const create = async ({ nombre_area, nombre_contacto, telefono, email, direccion }) => {
  const [result] = await pool.execute(
    `INSERT INTO solicitantes (nombre_area, nombre_contacto, telefono, email, direccion)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre_area, nombre_contacto, telefono, email, direccion]
  );
  return result.insertId;
};

/**
 * Actualiza los datos de un solicitante.
 * @param {number} id
 * @param {{ nombre_area: string, nombre_contacto: string, telefono: string, email: string, direccion: string }} param1
 * @returns {Promise<number>} Filas afectadas
 */
const update = async (id, { nombre_area, nombre_contacto, telefono, email, direccion }) => {
  const [result] = await pool.execute(
    `UPDATE solicitantes SET nombre_area=?, nombre_contacto=?, telefono=?,
     email=?, direccion=? WHERE id = ?`,
    [nombre_area, nombre_contacto, telefono, email, direccion, id]
  );
  return result.affectedRows;
};

/**
 * Elimina un solicitante de la BD.
 * No hace validaciones aquí — esa responsabilidad es del módulo.
 * @param {number} id
 * @returns {Promise<number>} Filas afectadas
 */
const remove = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM solicitantes WHERE id = ?`, [id]
  );
  return result.affectedRows;
};

//#endregion

//#region ── VALIDACIONES ─────────────────────────────────────────

/**
 * Cuenta los servicios activos (Pendiente o En progreso) de un solicitante.
 * Usado antes de eliminar para evitar romper integridad referencial.
 * @param {number} id - ID del solicitante
 * @returns {Promise<number>} Total de servicios activos
 */
const countServiciosActivos = async (id) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM servicios
     WHERE solicitante_id = ? AND status IN ('Pendiente', 'En progreso')`,
    [id]
  );
  return rows[0].total;
};

//#endregion

module.exports = { getAll, getById, create, update, remove, countServiciosActivos };
