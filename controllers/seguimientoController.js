const mod = require('../modules/seguimientoModule');

//#region ── CONSULTAS DE SEGUIMIENTO ─────────────────────────────

/**
 * GET /api/seguimiento
 * Retorna todos los registros de seguimiento con datos de solicitante y técnico.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Seguimiento[]
 */
const getAll = async (req, res) => {
  try {
    res.json(await mod.getAll());
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * GET /api/seguimiento/:id
 * Retorna un registro de seguimiento por su ID propio.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Seguimiento | 404
 */
const getById = async (req, res) => {
  try {
    res.json(await mod.getById(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * GET /api/seguimiento/servicio/:servicio_id
 * Retorna el seguimiento asociado a un servicio específico (relación 1:1).
 * @param {import('express').Request}  req - Params: { servicio_id }
 * @param {import('express').Response} res - 200: Seguimiento | 404
 */
const getByServicioId = async (req, res) => {
  try {
    res.json(await mod.getByServicioId(req.params.servicio_id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

//#region ── ACTUALIZACIÓN DE SEGUIMIENTO ─────────────────────────

/**
 * PUT /api/seguimiento/:id
 * Actualiza los campos operativos del seguimiento.
 * Si cambia personal_id o ubicacion, sincroniza el cambio al servicio padre
 * y ajusta los contadores de servicios_activos del personal involucrado.
 * @param {import('express').Request}  req - Params: { id } | Body: { personal_id?, ubicacion, fecha_fin_estimada?, observaciones? }
 * @param {import('express').Response} res - 200: Seguimiento actualizado | 404
 */
const update = async (req, res) => {
  try {
    res.json(await mod.update(req.params.id, req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * PATCH /api/seguimiento/:id/observaciones
 * Agrega o reemplaza las observaciones/notas técnicas de un seguimiento.
 * Endpoint ligero para no enviar todos los campos del PUT cuando solo se quiere anotar algo.
 * @param {import('express').Request}  req - Params: { id } | Body: { observaciones }
 * @param {import('express').Response} res - 200: Seguimiento actualizado | 400 | 404
 */
const addObservacion = async (req, res) => {
  try {
    const { observaciones } = req.body;

    if (!observaciones)
      return res.status(400).json({ message: 'Falta campo observaciones' });

    res.json(await mod.addObservacion(req.params.id, observaciones));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

module.exports = { getAll, getById, getByServicioId, update, addObservacion };
