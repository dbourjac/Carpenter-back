const pool = require('../database/conexionBD');

//#region ── CONSULTAS DE USUARIO ─────────────────────────────────

/**
 * Busca un usuario por nombre de usuario incluyendo el nombre del personal vinculado.
 * Usado durante el proceso de login para verificar credenciales.
 * @param {string} nombre_usuario
 * @returns {Promise<object|null>} Usuario con password (hash) o null si no existe
 */
const findByUsername = async (nombre_usuario) => {
  const [rows] = await pool.execute(
    `SELECT u.*, p.nombre AS nombre_personal
     FROM Usuario u
     LEFT JOIN personal p ON p.id = u.personal_id
     WHERE u.nombre_usuario = ?`,
    [nombre_usuario]
  );
  return rows[0] || null;
};

/**
 * Busca un usuario por su ID. No retorna el hash de contraseña.
 * Usado para recuperar datos de sesión activa.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const findById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre_usuario, u.rol, u.personal_id,
            p.nombre AS nombre_personal
     FROM Usuario u
     LEFT JOIN personal p ON p.id = u.personal_id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
};

//#endregion

//#region ── OPERACIONES CRUD DE USUARIO (admin) ───────────────────

/**
 * Inserta un nuevo usuario en la BD.
 * La contraseña debe llegar ya hasheada con bcrypt.
 * @param {{ nombre_usuario: string, password_hash: string, rol: string, personal_id?: number }} param0
 * @returns {Promise<number>} ID del usuario creado
 */
const createUsuario = async ({ nombre_usuario, password_hash, rol, personal_id }) => {
  const [result] = await pool.execute(
    `INSERT INTO Usuario (nombre_usuario, password, rol, personal_id)
     VALUES (?, ?, ?, ?)`,
    [nombre_usuario, password_hash, rol, personal_id || null]
  );
  return result.insertId;
};

/**
 * Retorna todos los usuarios registrados sin incluir contraseñas.
 * @returns {Promise<object[]>}
 */
const getAllUsuarios = async () => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre_usuario, u.rol, u.personal_id,
            p.nombre AS nombre_personal, u.created_at
     FROM Usuario u
     LEFT JOIN personal p ON p.id = u.personal_id
     ORDER BY u.id`
  );
  return rows;
};

/**
 * Reemplaza el hash de contraseña de un usuario.
 * La nueva contraseña debe llegar ya hasheada.
 * @param {number} id
 * @param {string} password_hash - Nuevo hash de bcrypt
 * @returns {Promise<number>} Filas afectadas (0 si no existe)
 */
const updatePassword = async (id, password_hash) => {
  const [result] = await pool.execute(
    `UPDATE Usuario SET password = ? WHERE id = ?`,
    [password_hash, id]
  );
  return result.affectedRows;
};

/**
 * Elimina un usuario de la BD.
 * @param {number} id
 * @returns {Promise<number>} Filas afectadas (0 si no existe)
 */
const deleteUsuario = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM Usuario WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
};

//#endregion

module.exports = {
  findByUsername,
  findById,
  createUsuario,
  getAllUsuarios,
  updatePassword,
  deleteUsuario,
};
