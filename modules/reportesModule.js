const repo = require('../repository/reportesQuerys');

//#region ── DASHBOARD ─────────────────────────────────────────────

/**
 * Retorna el resumen completo para la pantalla de inicio del supervisor.
 * Incluye conteos por status, por prioridad, urgentes, alertas de utensilios,
 * y las listas de servicios pendientes y en progreso (máx. 10 c/u).
 * @returns {Promise<{ resumen: object, servicios_pendientes: object[], servicios_en_progreso: object[] }>}
 */
const dashboard = () => repo.getDashboard();

//#endregion

//#region ── REPORTES DE SERVICIOS ────────────────────────────────

/**
 * Retorna el historial de servicios con filtros opcionales.
 * @param {{ fecha_inicio?: string, fecha_fin?: string, solicitante_id?: number, personal_id?: number, tipo?: string }} filtros
 * @returns {Promise<object[]>}
 */
const historialServicios = (filtros) => repo.getHistorialServicios(filtros);

/**
 * Retorna el conteo y promedio de días por tipo de servicio completado.
 * @returns {Promise<{ tipo: string, total: number, promedio_dias: number }[]>}
 */
const resumenPorTipo = () => repo.resumenPorTipo();

/**
 * Retorna todos los servicios activos (Pendiente + En progreso),
 * ordenados por prioridad descendente y fecha ascendente.
 * @returns {Promise<object[]>}
 */
const serviciosActivos = () => repo.getServiciosActivos();

//#endregion

//#region ── REPORTES DE UTENSILIOS ───────────────────────────────

/**
 * Retorna los utensilios con status_mantenimiento 'Próximo' o 'En proceso'.
 * @returns {Promise<object[]>}
 */
const utensiliosMantenimiento = () => repo.getUtensiliosMantenimiento();

/**
 * Retorna el historial de mantenimientos con filtros opcionales.
 * @param {{ utensilio_id?: number, fecha_inicio?: string, fecha_fin?: string }} filtros
 * @returns {Promise<object[]>}
 */
const historialMantenimiento = (filtros) => repo.getHistorialMantenimiento(filtros);

//#endregion

//#region ── REPORTES DE PERSONAL ─────────────────────────────────

/**
 * Retorna el personal ordenado por servicios completados descendente.
 * @returns {Promise<{ id: number, nombre: string, cargo: string, servicios_completados: number, promedio_dias: number }[]>}
 */
const rankingPersonal = () => repo.rankingPersonal();

//#endregion

module.exports = {
  dashboard,
  historialServicios, resumenPorTipo, serviciosActivos,
  utensiliosMantenimiento, historialMantenimiento,
  rankingPersonal,
};
