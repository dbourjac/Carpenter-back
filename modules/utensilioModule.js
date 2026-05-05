const repo = require('../repository/utensilioQuerys');

//#region ── CRUD UTENSILIOS ───────────────────────────────────────

/**
 * Retorna todos los utensilios con su área de ubicación y operador actual.
 * @returns {Promise<object[]>}
 */
const getAll = async () => repo.getAll();

/**
 * Retorna un utensilio por su ID.
 * @param {number} id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getById = async (id) => {
  const u = await repo.getById(id);
  if (!u) throw { status: 404, message: 'Utensilio no encontrado' };
  return u;
};

/**
 * Registra un nuevo utensilio en el sistema.
 * @param {{ clasificacion: string, tipo_utensilio: string, solicitante_id?: number, operador_id?: number, Rangos_mantenimiento?: string, ultimo_mantenimiento?: string }} data
 * @returns {Promise<object>} Registro creado
 */
const create = async (data) => {
  const id = await repo.create(data);
  return repo.getById(id);
};

/**
 * Actualiza los datos de un utensilio.
 * @param {number}  id
 * @param {object}  data - Campos del utensilio a actualizar
 * @returns {Promise<object>} Registro actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 */
const update = async (id, data) => {
  await getById(id);
  await repo.update(id, data);
  return repo.getById(id);
};

/**
 * Elimina un utensilio del sistema.
 * @param {number} id
 * @throws {{ status: 404 }} Si no se encuentra
 */
const remove = async (id) => {
  await getById(id);
  return repo.remove(id);
};

//#endregion

//#region ── MANTENIMIENTO ─────────────────────────────────────────

/**
 * Retorna el historial completo de mantenimientos de un utensilio,
 * del más reciente al más antiguo.
 * @param {number} id - ID del utensilio
 * @returns {Promise<object[]>}
 * @throws {{ status: 404 }} Si el utensilio no existe
 */
const getHistorialMantenimiento = async (id) => {
  await getById(id);
  return repo.getHistorialMantenimiento(id);
};

/**
 * Registra un nuevo mantenimiento para el utensilio.
 * Internamente actualiza ultimo_mantenimiento y resetea status_mantenimiento a 'Al día'.
 * @param {number} id - ID del utensilio
 * @param {{ personal_id?: number, fecha_mantenimiento: string, tipo: string, descripcion: string, proxima_fecha?: string }} data
 * @returns {Promise<number>} ID del registro de mantenimiento creado
 * @throws {{ status: 404 }} Si el utensilio no existe
 */
const registrarMantenimiento = async (id, data) => {
  await getById(id);
  return repo.addMantenimiento({ ...data, utensilio_id: id });
};

//#endregion

//#region -SERVICIO
    /*const registrarUtensilioaServ = async (id, data) =>{
        await getById (id);
        return  repo.addSu({...data, utensilio_id:id});
    };*/
//#endregion
module.exports = { getAll, getById, create, update, remove, getHistorialMantenimiento, registrarMantenimiento };
