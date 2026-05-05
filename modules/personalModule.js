const repo = require('../repository/personalQuerys');

//#region ── CRUD PERSONAL ─────────────────────────────────────────

/**
 * Retorna todo el personal técnico registrado.
 * @returns {Promise<object[]>}
 */
const getAll = async () => repo.getAll();

/**
 * Retorna un miembro del personal por su ID.
 * @param {number} id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getById = async (id) => {
  const p = await repo.getById(id);
  if (!p) throw { status: 404, message: 'Personal no encontrado' };
  return p;
};

/**
 * Registra un nuevo miembro del personal.
 * @param {{ nombre: string, cargo: string, especialidad: string, telefono: string }} data
 * @returns {Promise<object>} Registro creado
 */
const create = async (data) => {
  const id = await repo.create(data);
  return repo.getById(id);
};

/**
 * Actualiza los datos de un miembro del personal.
 * @param {number} id
 * @param {{ nombre: string, cargo: string, especialidad: string, telefono: string }} data
 * @returns {Promise<object>} Registro actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 */
const update = async (id, data) => {
  await getById(id); // valida existencia antes de actualizar
  await repo.update(id, data);
  return repo.getById(id);
};

/**
 * Elimina un miembro del personal.
 * Verifica que no tenga servicios activos asignados antes de proceder.
 * @param {number} id
 * @throws {{ status: 404 }} Si no se encuentra
 * @throws {{ status: 409 }} Si tiene servicios activos asignados
 */
const remove = async (id) => {
  await getById(id);

  // Impedir eliminación si tiene servicios activos para no dejar servicios sin responsable
  const activos = await repo.countServiciosActivos(id);
  if (activos > 0) {
    throw {
      status: 409,
      message: `No se puede eliminar: el técnico tiene ${activos} servicio(s) activo(s) asignados.`,
    };
  }
  return repo.remove(id);
};

//#endregion

//#region ── SERVICIOS DEL TÉCNICO ────────────────────────────────

/**
 * Retorna todos los servicios asignados a un técnico,
 * ordenados por status (activos primero) y luego por prioridad.
 * @param {number} id - ID del técnico
 * @returns {Promise<object[]>} Lista de servicios con datos del solicitante
 * @throws {{ status: 404 }} Si el técnico no existe
 */
const getServiciosAsignados = async (id) => {
  await getById(id); // valida existencia
  return repo.getServiciosAsignados(id);
};

//#endregion

module.exports = { getAll, getById, create, update, remove, getServiciosAsignados };
