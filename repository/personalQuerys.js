const pool = require('../database/conexionBD');

//#region ── CRUD PERSONAL ─────────────────────────────────────────

/**
 * Retorna todo el personal ordenado alfabéticamente por nombre.
 * @returns {Promise<object[]>}
 */
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT * FROM personal ORDER BY nombre`
  );
  return rows;
};

/**
 * Busca un miembro del personal por su ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM personal WHERE id = ?`, [id]
  );
  return rows[0] || null;
};

/**
 * Inserta un nuevo miembro del personal.
 * @param {{ nombre: string, cargo: string, especialidad: string, telefono: string }} param0
 * @returns {Promise<number>} ID del registro creado
 */
const create = async ({ nombre, cargo, especialidad, telefono }) => {
  const [result] = await pool.execute(
    `INSERT INTO personal (nombre, cargo, especialidad, telefono)
     VALUES (?, ?, ?, ?)`,
    [nombre, cargo, especialidad, telefono]
  );
  return result.insertId;
};

/**
 * Actualiza los datos de un miembro del personal.
 * @param {number} id
 * @param {{ nombre: string, cargo: string, especialidad: string, telefono: string }} param1
 * @returns {Promise<number>} Filas afectadas
 */
const update = async (id, { nombre, cargo, especialidad, telefono }) => {
  const [result] = await pool.execute(
    `UPDATE personal SET nombre=?, cargo=?, especialidad=?, telefono=?
     WHERE id = ?`,
    [nombre, cargo, especialidad, telefono, id]
  );
  return result.affectedRows;
};

/**
 * Elimina un miembro del personal de la BD.
 * @param {number} id
 * @returns {Promise<number>} Filas afectadas
 */
const remove = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM personal WHERE id = ?`, [id]
  );
  return result.affectedRows;
};

//#endregion

//#region ── CONSULTAS RELACIONADAS A SERVICIOS ────────────────────

/**
 * Retorna todos los servicios asignados a un técnico,
 * ordenados: activos primero (En progreso → Pendiente → Completado), luego por fecha descendente.
 * @param {number} id - ID del técnico
 * @returns {Promise<object[]>} Servicios con datos del solicitante
 */
const getServiciosAsignados = async (id) => {
  const [rows] = await pool.execute(
    `SELECT s.*,
            sol.nombre_area, sol.nombre_contacto
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     WHERE s.personal_id = ?
     ORDER BY
       FIELD(s.status, 'En progreso', 'Pendiente', 'Completado'),
       s.fecha_inicio DESC`,
    [id]
  );
  return rows;
};

/**
 * Cuenta los servicios en estado 'Pendiente' o 'En progreso' de un técnico.
 * Usado para validar si se puede eliminar al técnico sin dejar servicios activos sin responsable.
 * @param {number} id - ID del técnico
 * @returns {Promise<number>} Total de servicios activos
 */
const countServiciosActivos = async (id) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM servicios
     WHERE personal_id = ? AND status IN ('Pendiente', 'En progreso')`,
    [id]
  );
  return rows[0].total;
};

//#endregion

module.exports = { getAll, getById, create, update, remove, getServiciosAsignados, countServiciosActivos };
