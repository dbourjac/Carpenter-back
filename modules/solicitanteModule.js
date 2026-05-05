const repo = require('../repository/solicitanteQuerys');
const pool = require('../database/conexionBD');

//#region ── CRUD SOLICITANTES ─────────────────────────────────────

/**
 * Retorna todos los solicitantes registrados.
 * @returns {Promise<object[]>}
 */
const getAll = async () => repo.getAll();

/**
 * Retorna un solicitante por su ID.
 * @param {number} id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getById = async (id) => {
  const s = await repo.getById(id);
  if (!s) throw { status: 404, message: 'Solicitante no encontrado' };
  return s;
};

/**
 * Registra un nuevo solicitante (área o departamento).
 * @param {{ nombre_area: string, nombre_contacto: string, telefono: string, email: string, direccion: string }} data
 * @returns {Promise<object>} Registro creado
 */
const create = async (data) => {
  const id = await repo.create(data);
  return repo.getById(id);
};

/**
 * Actualiza los datos de un solicitante.
 * @param {number} id
 * @param {{ nombre_area: string, nombre_contacto: string, telefono: string, email: string, direccion: string }} data
 * @returns {Promise<object>} Registro actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 */
const update = async (id, data) => {
  await getById(id);
  await repo.update(id, data);
  return repo.getById(id);
};

/**
 * Elimina un solicitante del sistema.
 * Realiza una doble validación antes de eliminar:
 * 1. Revisa el campo servicios_activos del registro.
 * 2. Hace un COUNT directo en BD como respaldo por si el contador estuviera desincronizado.
 * Esto evita que MySQL retorne un error crudo de FK al intentar borrar.
 * @param {number} id
 * @throws {{ status: 404 }} Si no se encuentra
 * @throws {{ status: 409 }} Si tiene servicios activos asociados
 */
const remove = async (id) => {
  const solicitante = await getById(id);

  // Primera verificación: usar el contador en caché del registro
  if (solicitante.servicios_activos > 0) {
    throw {
      status: 409,
      message: `No se puede eliminar "${solicitante.nombre_area}": tiene ${solicitante.servicios_activos} servicio(s) activo(s). Completa o cancela los servicios primero.`,
    };
  }

  // Segunda verificación: consulta directa a la BD como respaldo
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM servicios
     WHERE solicitante_id = ? AND status IN ('Pendiente','En progreso')`,
    [id]
  );
  const totalActivos = rows[0].total;

  if (totalActivos > 0) {
    throw {
      status: 409,
      message: `No se puede eliminar: existen ${totalActivos} servicio(s) activo(s) asociados a este solicitante.`,
    };
  }

  return repo.remove(id);
};

//#endregion

module.exports = { getAll, getById, create, update, remove };
