const pool = require('../database/conexionBD');

//#region ── CRUD UTENSILIOS ───────────────────────────────────────

/**
 * Retorna todos los utensilios con el área de ubicación y el nombre del operador actual.
 * Ordenados por clasificación y luego por tipo de utensilio.
 * @returns {Promise<object[]>}
 */
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT u.*,
            s.nombre_area AS ubicacion_area,
            p.nombre AS operador_nombre
     FROM utensilios u
     LEFT JOIN solicitantes s ON s.id = u.solicitante_id
     LEFT JOIN personal p     ON p.id = u.operador_id
     ORDER BY u.clasificacion, u.tipo_utensilio`
  );
  return rows;
};

/**
 * Busca un utensilio por su ID incluyendo área y operador.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT u.*,
            s.nombre_area AS ubicacion_area,
            p.nombre AS operador_nombre
     FROM utensilios u
     LEFT JOIN solicitantes s ON s.id = u.solicitante_id
     LEFT JOIN personal p     ON p.id = u.operador_id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Inserta un nuevo utensilio.
 * @param {{ clasificacion: string, tipo_utensilio: string, solicitante_id?: number, operador_id?: number, Rangos_mantenimiento?: string, ultimo_mantenimiento?: string }} param0
 * @returns {Promise<number>} ID del registro creado
 */
const create = async ({ clasificacion, tipo_utensilio, solicitante_id, operador_id, Rangos_mantenimiento, ultimo_mantenimiento }) => {
  const [result] = await pool.execute(
    `INSERT INTO utensilios (clasificacion, tipo_utensilio, solicitante_id, operador_id, Rangos_mantenimiento, ultimo_mantenimiento)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [clasificacion, tipo_utensilio, solicitante_id || null, operador_id || null,
     Rangos_mantenimiento || null, ultimo_mantenimiento || null]
  );
  return result.insertId;
};

/**
 * Actualiza todos los campos de un utensilio.
 * @param {number} id
 * @param {{ clasificacion: string, tipo_utensilio: string, solicitante_id?: number, operador_id?: number, Rangos_mantenimiento?: string, status_mantenimiento: string, status_utensilio: string, ultimo_mantenimiento?: string }} fields
 * @returns {Promise<number>} Filas afectadas
 */
const update = async (id, fields) => {
  const { clasificacion, tipo_utensilio, solicitante_id, operador_id,
          Rangos_mantenimiento, status_mantenimiento, status_utensilio, ultimo_mantenimiento } = fields;
  const [result] = await pool.execute(
    `UPDATE utensilios SET clasificacion=?, tipo_utensilio=?, solicitante_id=?,
     operador_id=?, Rangos_mantenimiento=?, status_mantenimiento=?,
     status_utensilio=?, ultimo_mantenimiento=? WHERE id = ?`,
    [clasificacion, tipo_utensilio, solicitante_id || null, operador_id || null,
     Rangos_mantenimiento || null, status_mantenimiento, status_utensilio,
     ultimo_mantenimiento || null, id]
  );
  return result.affectedRows;
};

/**
 * Elimina un utensilio de la BD.
 * @param {number} id
 * @returns {Promise<number>} Filas afectadas
 */
const remove = async (id) => {
  const [result] = await pool.execute(
    `DELETE FROM utensilios WHERE id = ?`, [id]
  );
  return result.affectedRows;
};

//#endregion

//#region ── HISTORIAL DE MANTENIMIENTO ───────────────────────────

/**
 * Retorna el historial completo de mantenimientos de un utensilio,
 * del más reciente al más antiguo, con el nombre del técnico que lo realizó.
 * @param {number} utensilio_id
 * @returns {Promise<object[]>}
 */
const getHistorialMantenimiento = async (utensilio_id) => {
  const [rows] = await pool.execute(
    `SELECT hm.*, p.nombre AS tecnico
     FROM historial_mantenimiento hm
     LEFT JOIN personal p ON p.id = hm.personal_id
     WHERE hm.utensilio_id = ?
     ORDER BY hm.fecha_mantenimiento DESC`,
    [utensilio_id]
  );
  return rows;
};

/**
 * Registra un mantenimiento y actualiza el utensilio en una transacción:
 * - Inserta en historial_mantenimiento
 * - Actualiza ultimo_mantenimiento, status_mantenimiento → 'Al día', status_utensilio → 'Disponible'
 * @param {{ utensilio_id: number, personal_id?: number, fecha_mantenimiento: string, tipo: string, descripcion: string, proxima_fecha?: string }} param0
 * @returns {Promise<number>} ID del registro de mantenimiento creado
 */
const addMantenimiento = async ({ utensilio_id, personal_id, fecha_mantenimiento, tipo, descripcion, proxima_fecha }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO historial_mantenimiento (utensilio_id, personal_id, fecha_mantenimiento, tipo, descripcion, proxima_fecha)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [utensilio_id, personal_id || null, fecha_mantenimiento, tipo, descripcion, proxima_fecha || null]
    );

    // Resetear estado del utensilio después del mantenimiento
    await conn.execute(
      `UPDATE utensilios SET ultimo_mantenimiento=?, status_mantenimiento='Al día', status_utensilio='Disponible'
       WHERE id = ?`,
      [fecha_mantenimiento, utensilio_id]
    );

    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

//#endregion

//#region ── USO EXCLUSIVO DEL CRON ───────────────────────────────

/**
 * Retorna solo los campos necesarios para el cron de mantenimiento.
 * Más liviano que getAll: omite JOINs y excluye utensilios sin rango o sin fecha.
 * @returns {Promise<{ id: number, Rangos_mantenimiento: string, ultimo_mantenimiento: Date, status_mantenimiento: string, status_utensilio: string }[]>}
 */
const getAllParaCron = async () => {
  const [rows] = await pool.execute(
    `SELECT id, Rangos_mantenimiento, ultimo_mantenimiento,
            status_mantenimiento, status_utensilio
     FROM utensilios
     WHERE Rangos_mantenimiento IS NOT NULL
       AND ultimo_mantenimiento IS NOT NULL`
  );
  return rows;
};

/**
 * Actualiza los campos de status usados por el cron de mantenimiento.
 * Si status_utensilio es null, solo actualiza status_mantenimiento
 * para no sobreescribir 'En uso' de un utensilio asignado a un servicio activo.
 * @param {number}      id                   - ID del utensilio
 * @param {string}      status_mantenimiento - Nuevo status de mantenimiento
 * @param {string|null} status_utensilio     - Nuevo status del utensilio (null = no tocar)
 */
const updateStatusCron = async (id, status_mantenimiento, status_utensilio) => {
  if (status_utensilio !== null) {
    // Actualizar ambos campos
    await pool.execute(
      `UPDATE utensilios
       SET status_mantenimiento = ?, status_utensilio = ?
       WHERE id = ?`,
      [status_mantenimiento, status_utensilio, id]
    );
  } else {
    // Solo actualizar el status de mantenimiento — no tocar status_utensilio
    await pool.execute(
      `UPDATE utensilios SET status_mantenimiento = ? WHERE id = ?`,
      [status_mantenimiento, id]
    );
  }
};

//#endregion
//#region -SERVICIO
/*const addSu = async (data)=>{
  await pool.execute(
    'INSERT INTO servicio_utensilio (servicio_id,utensilio_id,Status) VALUES (?, ?, ?)',[data.servicio_id, data.utensilio_id, data.Status]
  );
}*/
//#endregion
module.exports = {
  getAll, getById, create, update, remove,
  getHistorialMantenimiento, addMantenimiento,
  getAllParaCron, updateStatusCron,
};
