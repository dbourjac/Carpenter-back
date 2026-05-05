const mod = require('../modules/servicioModule');

//#region ── CRUD SERVICIOS ────────────────────────────────────────

/**
 * GET /api/servicios
 * Retorna la lista completa de servicios con datos del solicitante y técnico asignado.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Servicio[]
 */
const getAll = async (req, res) => {
  try {
    res.json(await mod.getAll());
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * GET /api/servicios/:id
 * Retorna un servicio por su ID.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Servicio | 404
 */
const getById = async (req, res) => {
  try {
    res.json(await mod.getById(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * POST /api/servicios
 * Crea un nuevo servicio. Genera automáticamente su registro de seguimiento.
 * @param {import('express').Request}  req - Body: { solicitante_id, personal_id?, tipo_servicio, fecha_inicio, ubicacion, prioridad? }
 * @param {import('express').Response} res - 201: Servicio creado
 */
const create = async (req, res) => {
  try {
    res.status(201).json(await mod.create(req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * PUT /api/servicios/:id
 * Actualiza todos los campos de un servicio. Si cambia el personal_id,
 * ajusta automáticamente los contadores de servicios_activos del personal anterior y nuevo.
 * @param {import('express').Request}  req - Params: { id } | Body: campos del servicio
 * @param {import('express').Response} res - 200: Servicio actualizado | 404
 */
const update = async (req, res) => {
  try {
    res.json(await mod.update(req.params.id, req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * DELETE /api/servicios/:id
 * Elimina un servicio. Si no estaba completado, revierte los contadores
 * de servicios_activos del solicitante y personal, y libera los utensilios asignados.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: { message } | 404
 */
const remove = async (req, res) => {
  try {
    await mod.remove(req.params.id);
    res.json({ message: 'Servicio eliminado' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

//#region ── CAMBIOS DE ESTADO ─────────────────────────────────────

/**
 * PATCH /api/servicios/:id/completar
 * Marca el servicio como 'Completado', registra la fecha de fin,
 * guarda el registro en historial_servicios y libera los utensilios asignados.
 * @param {import('express').Request}  req - Params: { id } | Body: { fecha_fin, notas? }
 * @param {import('express').Response} res - 200: { message } | 404
 */
const completar = async (req, res) => {
  try {
    const result = await mod.completar(req.params.id, req.body);
    res.json(result);
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * PATCH /api/servicios/:id/status
 * Cambia el status del servicio entre 'Pendiente' y 'En progreso'.
 * Para completar un servicio usar el endpoint /completar (requiere fecha_fin).
 * @param {import('express').Request}  req - Params: { id } | Body: { status: 'Pendiente' | 'En progreso' }
 * @param {import('express').Response} res - 200: Servicio actualizado | 400 | 409
 */
const cambiarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Falta el campo status' });
    res.json(await mod.cambiarStatus(req.params.id, status));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * PATCH /api/servicios/:id/prioridad
 * Cambia la prioridad del servicio sin modificar otros campos.
 * @param {import('express').Request}  req - Params: { id } | Body: { prioridad: 'baja' | 'media' | 'alta' }
 * @param {import('express').Response} res - 200: Servicio actualizado | 400 | 404
 */
const cambiarPrioridad = async (req, res) => {
  try {
    const { prioridad } = req.body;
    if (!prioridad) return res.status(400).json({ message: 'Falta el campo prioridad' });
    res.json(await mod.cambiarPrioridad(req.params.id, prioridad));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

//#region ── UTENSILIOS DEL SERVICIO ──────────────────────────────

/**
 * GET /api/servicios/:id/utensilios
 * Retorna los utensilios asignados a un servicio.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Utensilio[]
 */
const getUtensilios = async (req, res) => {
  try {
    res.json(await mod.getUtensilios(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * POST /api/servicios/:id/utensilios
 * Asigna un utensilio al servicio. Cambia su status a 'En uso' y asigna el operador_id.
 * Rechaza con 409 si el utensilio ya está en uso o en mantenimiento.
 * @param {import('express').Request}  req - Params: { id } | Body: { utensilio_id }
 * @param {import('express').Response} res - 200: { message } | 409
 */
const addUtensilio = async (req, res) => {
  try {
    await mod.addUtensilio(req.params.id, req.body.utensilio_id);
    res.json({ message: 'Utensilio asignado' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * DELETE /api/servicios/:id/utensilios/:utensilio_id
 * Desasigna un utensilio del servicio y lo regresa a estado 'Disponible'.
 * @param {import('express').Request}  req - Params: { id, utensilio_id }
 * @param {import('express').Response} res - 200: { message }
 */
const removeUtensilio = async (req, res) => {
  try {
    await mod.removeUtensilio(req.params.id, req.params.utensilio_id);
    res.json({ message: 'Utensilio removido' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

//#region ── EVIDENCIAS (Base64) ───────────────────────────────────

/**
 * GET /api/servicios/:id/evidencias
 * Retorna todas las imágenes de evidencia asociadas a un servicio.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Evidencia[] (incluye url_image en Base64)
 */
const getEvidencias = async (req, res) => {
  try {
    res.json(await mod.getEvidencias(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * POST /api/servicios/:id/evidencias
 * Guarda una imagen de evidencia en Base64 asociada al servicio.
 * Valida el tipo MIME (JPEG, PNG, WEBP) y el tamaño máximo (5 MB).
 * @param {import('express').Request}  req - Params: { id } | Body: { tipo: 'inicio'|'fin', image: 'data:image/...;base64,...' }
 * @param {import('express').Response} res - 201: { message } | 400
 */
const addEvidencia = async (req, res) => {
  try {
    const { tipo, image } = req.body;

    // Ambos campos son obligatorios
    if (!tipo || !image)
      return res.status(400).json({ message: 'Se requieren tipo e image (base64)' });

    await mod.addEvidencia(req.params.id, tipo, image);
    res.status(201).json({ message: 'Evidencia guardada' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * DELETE /api/servicios/:id/evidencias/:evidencia_id
 * Elimina una imagen de evidencia por su ID.
 * @param {import('express').Request}  req - Params: { id, evidencia_id }
 * @param {import('express').Response} res - 200: { message } | 404
 */
const deleteEvidencia = async (req, res) => {
  try {
    await mod.deleteEvidencia(req.params.evidencia_id);
    res.json({ message: 'Evidencia eliminada' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

module.exports = {
  getAll, getById, create, update, remove,
  completar, cambiarStatus, cambiarPrioridad,
  getUtensilios, addUtensilio, removeUtensilio,
  addEvidencia, getEvidencias, deleteEvidencia,
};
