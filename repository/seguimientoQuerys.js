const pool = require('../database/conexionBD');

//#region ── CONSULTAS DE SEGUIMIENTO ─────────────────────────────

/**
 * Retorna todos los seguimientos con datos del solicitante y técnico asignado,
 * ordenados por fecha de inicio descendente.
 * @returns {Promise<object[]>}
 */
const getAll = async () => {
  const [rows] = await pool.execute(
    `SELECT seg.*,
            -- Datos del servicio padre
            svc.nombre_servicio, svc.tipo_servicio, svc.status       AS status_servicio,
            svc.prioridad,     svc.fecha_inicio  AS svc_fecha_inicio,
            svc.fecha_fin,     svc.ubicacion     AS svc_ubicacion,
            -- Datos del área solicitante
            sol.nombre_area, sol.nombre_contacto, sol.telefono AS tel_solicitante,
            -- Nombre del técnico
            p.nombre AS nombre_personal
     FROM seguimiento seg
     JOIN servicios    svc ON svc.id  = seg.servicio_id
     JOIN solicitantes sol ON sol.id  = seg.solicitante_id
     LEFT JOIN personal p  ON p.id   = seg.personal_id
     ORDER BY seg.fecha_inicio DESC`
  );
  return rows;
};

/**
 * Retorna un seguimiento por su ID propio (no por servicio_id).
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT seg.*,
            svc.nombre_servicio, svc.tipo_servicio, svc.status       AS status_servicio,
            svc.prioridad,     svc.fecha_inicio  AS svc_fecha_inicio,
            svc.fecha_fin,     svc.ubicacion     AS svc_ubicacion,
            sol.nombre_area, sol.nombre_contacto, sol.telefono AS tel_solicitante,
            p.nombre AS nombre_personal
     FROM seguimiento seg
     JOIN servicios    svc ON svc.id  = seg.servicio_id
     JOIN solicitantes sol ON sol.id  = seg.solicitante_id
     LEFT JOIN personal p  ON p.id   = seg.personal_id
     WHERE seg.id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Retorna el seguimiento ligado a un servicio (relación 1:1) con todos los datos enriquecidos.
 * @param {number} servicio_id
 * @returns {Promise<object|null>}
 */
const getByServicioId = async (servicio_id) => {
  const [rows] = await pool.execute(
    `SELECT seg.*,
            svc.nombre_servicio, svc.tipo_servicio, svc.status       AS status_servicio,
            svc.prioridad,     svc.fecha_inicio  AS svc_fecha_inicio,
            svc.fecha_fin,     svc.ubicacion     AS svc_ubicacion,
            sol.nombre_area, sol.nombre_contacto, sol.telefono AS tel_solicitante,
            p.nombre AS nombre_personal
     FROM seguimiento seg
     JOIN servicios    svc ON svc.id  = seg.servicio_id
     JOIN solicitantes sol ON sol.id  = seg.solicitante_id
     LEFT JOIN personal p  ON p.id   = seg.personal_id
     WHERE seg.servicio_id = ?`,
    [servicio_id]
  );
  return rows[0] || null;
};

//#endregion

//#region ── OPERACIONES DE ESCRITURA ─────────────────────────────

/**
 * Inserta un nuevo seguimiento. Llamado automáticamente al crear un servicio.
 * @param {{ servicio_id: number, solicitante_id: number, personal_id?: number, ubicacion: string, tipo_seg_servicio: string, fecha_inicio: string, fecha_fin_estimada?: string, observaciones?: string }} param0
 * @returns {Promise<number>} ID del registro creado
 */
const create = async ({ servicio_id, solicitante_id, personal_id, ubicacion, tipo_seg_servicio, fecha_inicio, fecha_fin_estimada, observaciones }) => {
    const [rows] = await pool.execute(
        'SELECT nombre_servicio FROM servicios WHERE id = ?',
        [servicio_id]
    );
    if (rows.length === 0) {
        throw new Error('servicio_id no existe');
    }
    const nombre_servicio = rows[0].nombre_servicio;

    const [result] = await pool.execute(
        `INSERT INTO seguimiento (
            servicio_id,
            nombre_servicio,
            solicitante_id,
            personal_id,
            ubicacion,
            tipo_seg_servicio,
            fecha_inicio,
            fecha_fin_estimada,
            observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            servicio_id,
            nombre_servicio,
            solicitante_id,
            personal_id        || null,
            ubicacion,
            tipo_seg_servicio,
            fecha_inicio,
            fecha_fin_estimada || null,
            observaciones      || null,
        ]
    );

    return result.insertId;
};

/**
 * Actualiza los campos operativos del seguimiento (sin sincronización al servicio).
 * La sincronización al servicio padre se hace en el módulo, no aquí.
 * @param {number} id
 * @param {{ personal_id?: number, ubicacion: string, fecha_fin_estimada?: string, observaciones?: string }} fields
 * @returns {Promise<number>} Filas afectadas
 */
const update = async (id, fields) => {
  const { personal_id, ubicacion, fecha_fin_estimada, observaciones } = fields;
  const [result] = await pool.execute(
    `UPDATE seguimiento SET personal_id=?, ubicacion=?, fecha_fin_estimada=?, observaciones=?
     WHERE id=?`,
    [personal_id || null, ubicacion, fecha_fin_estimada || null, observaciones || null, id]
  );
  return result.affectedRows;
};

/**
 * Actualiza únicamente el campo de observaciones de un seguimiento.
 * Endpoint ligero para no enviar todos los campos del PUT.
 * @param {number} id
 * @param {string} observaciones
 * @returns {Promise<number>} Filas afectadas
 */
const updateObservaciones = async (id, observaciones) => {
  const [result] = await pool.execute(
    `UPDATE seguimiento SET observaciones=? WHERE id=?`,
    [observaciones, id]
  );
  return result.affectedRows;
};

//#endregion

module.exports = { getAll, getById, getByServicioId, create, update, updateObservaciones };
