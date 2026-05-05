const mod = require('../modules/solicitanteModule');

//#region ── CRUD SOLICITANTES ─────────────────────────────────────

/**
 * GET /api/solicitantes
 * Retorna la lista completa de áreas/solicitantes registrados.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Solicitante[]
 */
const getAll = async (req, res) => {
  try {
    res.json(await mod.getAll());
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * GET /api/solicitantes/:id
 * Retorna un solicitante por su ID.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Solicitante | 404
 */
const getById = async (req, res) => {
  try {
    res.json(await mod.getById(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * POST /api/solicitantes
 * Registra un nuevo solicitante (área o contacto).
 * @param {import('express').Request}  req - Body: { nombre_area, nombre_contacto, telefono, email, direccion }
 * @param {import('express').Response} res - 201: Solicitante creado
 */
const create = async (req, res) => {
  try {
    res.status(201).json(await mod.create(req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * PUT /api/solicitantes/:id
 * Actualiza los datos de un solicitante por su ID.
 * @param {import('express').Request}  req - Params: { id } | Body: { nombre_area, nombre_contacto, telefono, email, direccion }
 * @param {import('express').Response} res - 200: Solicitante actualizado | 404
 */
const update = async (req, res) => {
  try {
    res.json(await mod.update(req.params.id, req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * DELETE /api/solicitantes/:id
 * Elimina un solicitante. Falla con 409 si tiene servicios activos asociados,
 * evitando romper la integridad referencial de la BD.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: { message } | 404 | 409
 */
const remove = async (req, res) => {
  try {
    await mod.remove(req.params.id);
    res.json({ message: 'Solicitante eliminado' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

module.exports = { getAll, getById, create, update, remove };
