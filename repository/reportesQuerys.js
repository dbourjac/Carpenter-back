const pool = require('../database/conexionBD');

//#region ── HISTORIAL DE SERVICIOS ───────────────────────────────

/**
 * Retorna el historial de servicios completados con filtros opcionales por query params.
 * Todos los filtros son opcionales y se combinan con AND.
 * @param {{ fecha_inicio?: string, fecha_fin?: string, solicitante_id?: number, personal_id?: number, tipo?: string }} filtros
 * @returns {Promise<object[]>} Historial con datos del solicitante y técnico
 */
const getHistorialServicios = async ({ fecha_inicio, fecha_fin, solicitante_id, personal_id, tipo } = {}) => {
  let query = `
    SELECT hs.*,
           sol.nombre_area, sol.nombre_contacto,
           p.nombre AS nombre_personal
    FROM historial_servicios hs
    JOIN solicitantes sol ON sol.id = hs.solicitante_id
    LEFT JOIN personal p   ON p.id  = hs.personal_id
    WHERE 1=1`;
  const params = [];

  // Construir filtros dinámicamente según los parámetros recibidos
  if (fecha_inicio)   { query += ` AND hs.fecha_inicio >= ?`;    params.push(fecha_inicio); }
  if (fecha_fin)      { query += ` AND hs.fecha_fin    <= ?`;    params.push(fecha_fin); }
  if (solicitante_id) { query += ` AND hs.solicitante_id = ?`;   params.push(solicitante_id); }
  if (personal_id)    { query += ` AND hs.personal_id    = ?`;   params.push(personal_id); }
  if (tipo)           { query += ` AND hs.tipo_hs_servicio = ?`; params.push(tipo); }

  query += ` ORDER BY hs.fecha_fin DESC`;
  const [rows] = await pool.execute(query, params);
  return rows;
};

/**
 * Retorna el conteo de servicios completados y el promedio de días agrupado por tipo.
 * @returns {Promise<{ tipo: string, total: number, promedio_dias: number }[]>}
 */
const resumenPorTipo = async () => {
  const [rows] = await pool.execute(
    `SELECT tipo_hs_servicio AS tipo,
            COUNT(*) AS total,
            AVG(duracion_dias) AS promedio_dias
     FROM historial_servicios
     WHERE status_final = 'Completado'
     GROUP BY tipo_hs_servicio`
  );
  return rows;
};

//#endregion

//#region ── DASHBOARD ─────────────────────────────────────────────

/**
 * Ejecuta múltiples queries en paralelo para armar el resumen del dashboard.
 * Retorna conteos por status, por prioridad, urgentes, alertas de utensilios
 * y las listas de los 10 servicios más urgentes en cada estado activo.
 * @returns {Promise<{ resumen: object, servicios_pendientes: object[], servicios_en_progreso: object[] }>}
 */
const getDashboard = async () => {

  // Conteo de servicios agrupado por status
  const [porStatus] = await pool.execute(
    `SELECT status, COUNT(*) AS total
     FROM servicios
     GROUP BY status`
  );

  // Conteo por prioridad solo de servicios activos (sin los completados)
  const [porPrioridad] = await pool.execute(
    `SELECT prioridad, COUNT(*) AS total
     FROM servicios
     WHERE status IN ('Pendiente', 'En progreso')
     GROUP BY prioridad`
  );

  // Urgentes = prioridad alta + activos
  const [urgentes] = await pool.execute(
    `SELECT COUNT(*) AS total FROM servicios
     WHERE prioridad = 'alta' AND status IN ('Pendiente', 'En progreso')`
  );

  // Top 10 servicios pendientes ordenados por prioridad y antigüedad
  const [pendientes] = await pool.execute(
    `SELECT s.id, s.nombre_servicio, s.tipo_servicio, s.prioridad, s.fecha_inicio,
            s.ubicacion, sol.nombre_area, p.nombre AS tecnico
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p  ON p.id  = s.personal_id
     WHERE s.status = 'Pendiente'
     ORDER BY FIELD(s.prioridad,'alta','media','baja'), s.fecha_inicio ASC
     LIMIT 10`
  );

  // Top 10 servicios en progreso ordenados por prioridad y antigüedad
  const [enProgreso] = await pool.execute(
    `SELECT s.id, s.nombre_servicio, s.tipo_servicio, s.prioridad, s.fecha_inicio,
            s.ubicacion, sol.nombre_area, p.nombre AS tecnico
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p  ON p.id  = s.personal_id
     WHERE s.status = 'En progreso'
     ORDER BY FIELD(s.prioridad,'alta','media','baja'), s.fecha_inicio ASC
     LIMIT 10`
  );

  // Utensilios que requieren atención del supervisor
  const [utensiliosAlerta] = await pool.execute(
    `SELECT COUNT(*) AS total FROM utensilios
     WHERE status_mantenimiento IN ('Próximo','En proceso')`
  );

  // Mapear arrays a objetos para fácil acceso en el frontend
  const statusMap = { Pendiente: 0, 'En progreso': 0, Completado: 0 };
  porStatus.forEach(r => { statusMap[r.status] = r.total; });

  const prioridadMap = { baja: 0, media: 0, alta: 0 };
  porPrioridad.forEach(r => { prioridadMap[r.prioridad] = r.total; });

  return {
    resumen: {
      pendientes:        statusMap['Pendiente'],
      en_progreso:       statusMap['En progreso'],
      completados:       statusMap['Completado'],
      urgentes:          urgentes[0].total,
      por_prioridad:     prioridadMap,
      utensilios_alerta: utensiliosAlerta[0].total,
    },
    servicios_pendientes:   pendientes,
    servicios_en_progreso:  enProgreso,
  };
};

//#endregion

//#region ── SERVICIOS ACTIVOS ─────────────────────────────────────

/**
 * Retorna todos los servicios en estado 'Pendiente' o 'En progreso',
 * ordenados por prioridad descendente y fecha ascendente.
 * @returns {Promise<object[]>}
 */
const getServiciosActivos = async () => {
  const [rows] = await pool.execute(
    `SELECT s.*,
            sol.nombre_area, sol.nombre_contacto,
            p.nombre AS nombre_personal
     FROM servicios s
     JOIN solicitantes sol ON sol.id = s.solicitante_id
     LEFT JOIN personal p   ON p.id  = s.personal_id
     WHERE s.status IN ('Pendiente','En progreso')
     ORDER BY FIELD(s.prioridad,'alta','media','baja'), s.fecha_inicio ASC`
  );
  return rows;
};

//#endregion

//#region ── UTENSILIOS ────────────────────────────────────────────

/**
 * Retorna los utensilios cuyo status_mantenimiento es 'Próximo' o 'En proceso'.
 * Útil para que el supervisor vea qué equipos requieren atención.
 * @returns {Promise<object[]>}
 */
const getUtensiliosMantenimiento = async () => {
  const [rows] = await pool.execute(
    `SELECT u.*, s.nombre_area AS ubicacion_area
     FROM utensilios u
     LEFT JOIN solicitantes s ON s.id = u.solicitante_id
     WHERE u.status_mantenimiento IN ('Próximo','En proceso')
     ORDER BY u.status_mantenimiento`
  );
  return rows;
};

/**
 * Retorna el historial de mantenimientos con filtros opcionales.
 * @param {{ utensilio_id?: number, fecha_inicio?: string, fecha_fin?: string }} filtros
 * @returns {Promise<object[]>} Historial con datos del utensilio y técnico
 */
const getHistorialMantenimiento = async ({ utensilio_id, fecha_inicio, fecha_fin } = {}) => {
  let query = `
    SELECT hm.*, u.tipo_utensilio, u.clasificacion,
           p.nombre AS tecnico
    FROM historial_mantenimiento hm
    JOIN utensilios u ON u.id = hm.utensilio_id
    LEFT JOIN personal p ON p.id = hm.personal_id
    WHERE 1=1`;
  const params = [];

  if (utensilio_id) { query += ` AND hm.utensilio_id = ?`;         params.push(utensilio_id); }
  if (fecha_inicio) { query += ` AND hm.fecha_mantenimiento >= ?`; params.push(fecha_inicio); }
  if (fecha_fin)    { query += ` AND hm.fecha_mantenimiento <= ?`; params.push(fecha_fin); }

  query += ` ORDER BY hm.fecha_mantenimiento DESC`;
  const [rows] = await pool.execute(query, params);
  return rows;
};

//#endregion

//#region ── PERSONAL ─────────────────────────────────────────────

/**
 * Retorna el personal ordenado por servicios completados descendente.
 * Incluye promedio de días por servicio para evaluar eficiencia.
 * @returns {Promise<{ id: number, nombre: string, cargo: string, especialidad: string, servicios_completados: number, promedio_dias: number }[]>}
 */
const rankingPersonal = async () => {
  const [rows] = await pool.execute(
    `SELECT p.id, p.nombre, p.cargo, p.especialidad,
            COUNT(hs.id) AS servicios_completados,
            AVG(hs.duracion_dias) AS promedio_dias
     FROM personal p
     LEFT JOIN historial_servicios hs ON hs.personal_id = p.id
       AND hs.status_final = 'Completado'
     GROUP BY p.id
     ORDER BY servicios_completados DESC`
  );
  return rows;
};

//#endregion

module.exports = {
  getHistorialServicios,
  resumenPorTipo,
  getDashboard,
  getServiciosActivos,
  getUtensiliosMantenimiento,
  getHistorialMantenimiento,
  rankingPersonal,
};
