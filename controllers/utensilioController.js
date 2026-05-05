const { param } = require('../app');
const mod = require('../modules/utensilioModule');

//#region ── CRUD UTENSILIOS ───────────────────────────────────────

/**
 * GET /api/utensilios
 * Retorna la lista completa de utensilios (herramientas, maquinaria, equipo)
 * incluyendo el área donde están ubicados y el operador asignado.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Utensilio[]
 */
const getAll = async (req, res) => {
  try {
    res.json(await mod.getAll());
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * GET /api/utensilios/:id
 * Retorna un utensilio por su ID.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: Utensilio | 404
 */
const getById = async (req, res) => {
  try {
    res.json(await mod.getById(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * POST /api/utensilios
 * Registra un nuevo utensilio en el sistema.
 * @param {import('express').Request}  req - Body: { clasificacion, tipo_utensilio, solicitante_id?, operador_id?, Rangos_mantenimiento?, ultimo_mantenimiento? }
 * @param {import('express').Response} res - 201: Utensilio creado
 */
const create = async (req, res) => {
  try {
    res.status(201).json(await mod.create(req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * PUT /api/utensilios/:id
 * Actualiza los datos de un utensilio por su ID.
 * @param {import('express').Request}  req - Params: { id } | Body: campos del utensilio
 * @param {import('express').Response} res - 200: Utensilio actualizado | 404
 */
const update = async (req, res) => {
  try {
    res.json(await mod.update(req.params.id, req.body));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * DELETE /api/utensilios/:id
 * Elimina un utensilio del sistema.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: { message } | 404
 */
const remove = async (req, res) => {
  try {
    await mod.remove(req.params.id);
    res.json({ message: 'Utensilio eliminado' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

//#endregion

//#region ── MANTENIMIENTO ─────────────────────────────────────────

/**
 * GET /api/utensilios/:id/mantenimiento
 * Retorna el historial completo de mantenimientos de un utensilio,
 * ordenado del más reciente al más antiguo.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: HistorialMantenimiento[] | 404
 */
const getHistorial = async (req, res) => {
  try {
    res.json(await mod.getHistorialMantenimiento(req.params.id));
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};

/**
 * POST /api/utensilios/:id/mantenimiento
 * Registra un nuevo mantenimiento para el utensilio.
 * Actualiza automáticamente ultimo_mantenimiento y resetea status_mantenimiento a 'Al día'.
 * @param {import('express').Request}  req - Params: { id } | Body: { personal_id?, fecha_mantenimiento, tipo, descripcion, proxima_fecha? }
 * @param {import('express').Response} res - 201: { id, message } | 404
 */
const registrarMantenimiento = async (req, res) => {
  try {
    const id = await mod.registrarMantenimiento(req.params.id, req.body);
    res.status(201).json({ id, message: 'Mantenimiento registrado' });
  } catch (e) { res.status(e.status || 500).json({ message: e.message }); }
};


//#endregion
//#region -SERVICIOS
/*const addutensilioservice = async (req, res) =>{
  try{
    const id = await mod.registrarUtensilioaServ(req.params.id, req.body);
    res.status(201).json({ id, message:'Utensilio agregado exitosamente a un servicio'});
  }catch(err){
    console.error(err);
    res.status(e.status || 500).json({ message: e.message });
  }
}*/
//#endregion

module.exports = { getAll, getById, create, update, remove, getHistorial, registrarMantenimiento };
