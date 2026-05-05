const mod = require('../modules/personalModule');

//#region ── CRUD PERSONAL ─────────────────────────────────────────

/**
 * GET /api/personal
 * Retorna la lista completa del personal técnico registrado.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Personal[]
 */
const getAll = async (req, res) => {
  try {
    res.json(await mod.getAll());
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * GET /api/personal/:id
 * Retorna un miembro del personal por su ID.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Personal | 404
 */
const getById = async (req, res) => {
  try {
    res.json(await mod.getById(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * POST /api/personal
 * Registra un nuevo miembro del personal técnico.
 * @param {import('express').Request}  req - Body: { nombre, cargo, especialidad, telefono }
 * @param {import('express').Response} res - 201: Personal creado
 */
const create = async (req, res) => {
  try {
    res.status(201).json(await mod.create(req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * PUT /api/personal/:id
 * Actualiza los datos de un miembro del personal por su ID.
 * @param {import('express').Request}  req - Params: { id } | Body: { nombre, cargo, especialidad, telefono }
 * @param {import('express').Response} res - 200: Personal actualizado | 404
 */
const update = async (req, res) => {
  try {
    res.json(await mod.update(req.params.id, req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * DELETE /api/personal/:id
 * Elimina un miembro del personal. Falla con 409 si tiene servicios activos asignados.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: { message } | 404 | 409
 */
const remove = async (req, res) => {
  try {
    await mod.remove(req.params.id);
    res.json({ message: 'Personal eliminado' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

//#region ── SERVICIOS ASIGNADOS ───────────────────────────────────

/**
 * GET /api/personal/:id/servicios
 * Retorna todos los servicios asignados a un técnico,
 * ordenados por status activo primero y luego por prioridad descendente.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Servicio[] | 404
 */
const getServiciosAsignados = async (req, res) => {
  try {
    res.json(await mod.getServiciosAsignados(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

module.exports = { getAll, getById, create, update, remove, getServiciosAsignados };
