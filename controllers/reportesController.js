const mod = require('../modules/reportesModule');

//#region ── DASHBOARD ─────────────────────────────────────────────

/**
 * GET /api/reportes/dashboard
 * Retorna el resumen completo para la pantalla de inicio del supervisor:
 * conteos por status, por prioridad, urgentes, alertas de utensilios,
 * y las listas de servicios pendientes y en progreso (máx. 10 c/u).
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: { resumen, servicios_pendientes, servicios_en_progreso }
 */
const dashboard = async (req, res) => {
  try {
    res.json(await mod.dashboard());
  } catch (e) { res.status(500).json({ message: e.message }); }
};

//#endregion

//#region ── REPORTES DE SERVICIOS ────────────────────────────────

/**
 * GET /api/reportes/historial
 * Retorna el historial de servicios completados con filtros opcionales por query params.
 * @param {import('express').Request}  req - Query: { fecha_inicio?, fecha_fin?, solicitante_id?, personal_id?, tipo? }
 * @param {import('express').Response} res - 200: HistorialServicio[]
 */
const historialServicios = async (req, res) => {
  try {
    res.json(await mod.historialServicios(req.query));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * GET /api/reportes/resumen-tipo
 * Retorna el conteo y promedio de días por tipo de servicio completado.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: { tipo, total, promedio_dias }[]
 */
const resumenPorTipo = async (req, res) => {
  try {
    res.json(await mod.resumenPorTipo());
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/**
 * GET /api/reportes/activos
 * Retorna todos los servicios en estado 'Pendiente' o 'En progreso',
 * ordenados por prioridad descendente y fecha de inicio ascendente.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Servicio[]
 */
const serviciosActivos = async (req, res) => {
  try {
    res.json(await mod.serviciosActivos());
  } catch (e) { res.status(500).json({ message: e.message }); }
};

//#endregion

//#region ── REPORTES DE UTENSILIOS ───────────────────────────────

/**
 * GET /api/reportes/mantenimientos
 * Retorna los utensilios cuyo status_mantenimiento es 'Próximo' o 'En proceso'.
 * Útil para el supervisor como alerta de atención pendiente.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Utensilio[]
 */
const utensiliosMantenimiento = async (req, res) => {
  try {
    res.json(await mod.utensiliosMantenimiento());
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/**
 * GET /api/reportes/historial-mantenimiento
 * Retorna el historial de mantenimientos con filtros opcionales.
 * @param {import('express').Request}  req - Query: { utensilio_id?, fecha_inicio?, fecha_fin? }
 * @param {import('express').Response} res - 200: HistorialMantenimiento[]
 */
const historialMantenimiento = async (req, res) => {
  try {
    res.json(await mod.historialMantenimiento(req.query));
  } catch (e) { res.status(500).json({ message: e.message }); }
};

//#endregion

//#region ── REPORTES DE PERSONAL ─────────────────────────────────

/**
 * GET /api/reportes/ranking-personal
 * Retorna el personal ordenado por cantidad de servicios completados (descendente).
 * Incluye el promedio de días por servicio.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: { id, nombre, cargo, servicios_completados, promedio_dias }[]
 */
const rankingPersonal = async (req, res) => {
  try {
    res.json(await mod.rankingPersonal());
  } catch (e) { res.status(500).json({ message: e.message }); }
};

//#endregion

module.exports = {
  dashboard,
  historialServicios, resumenPorTipo, serviciosActivos,
  utensiliosMantenimiento, historialMantenimiento,
  rankingPersonal,
};
