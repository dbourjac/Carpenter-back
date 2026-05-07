const servicioRepo    = require('../repository/servicioQuerys');
const seguimientoRepo = require('../repository/seguimientoQuerys');
const pool            = require('../database/conexionBD');

// Valores válidos para status y prioridad (usados en validaciones)
const VALID_STATUS    = ['Pendiente', 'En progreso', 'Completado'];
const VALID_PRIORIDAD = ['baja', 'media', 'alta'];

//#region ── CRUD SERVICIOS ────────────────────────────────────────

/**
 * Retorna todos los servicios con datos del solicitante y técnico asignado.
 * @returns {Promise<object[]>}
 */
const getAll = async () => servicioRepo.getAll();

/**
 * Retorna un servicio por su ID.
 * @param {number} id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getById = async (id) => {
  const s = await servicioRepo.getById(id);
  if (!s) throw { status: 404, message: 'Servicio no encontrado' };
  return s;
};

/**
 * Crea un nuevo servicio y genera automáticamente su registro de seguimiento.
 * También incrementa servicios_activos del solicitante y del personal asignado.
 * @param {{ solicitante_id: number, personal_id?: number, tipo_servicio: string, fecha_inicio: string, ubicacion: string, prioridad?: string, fecha_fin_estimada?: string }} data
 * @returns {Promise<object>} Servicio creado con su seguimiento
 */
const create = async (data) => {
  const id = await servicioRepo.create(data);
  // Crear seguimiento ligado automáticamente — relación 1:1
  await seguimientoRepo.create({
    nombre_servicio : data.nombre_servicio,
    servicio_id:        id,
    solicitante_id:     data.solicitante_id,
    personal_id:        data.personal_id        || null,
    ubicacion:          data.ubicacion,
    tipo_seg_servicio:  data.tipo_servicio,
    fecha_inicio:       data.fecha_inicio,
    fecha_fin_estimada: data.fecha_fin_estimada  || null,
    observaciones:      data.observaciones       || null,
  });

  return servicioRepo.getById(id);
};

/**
 * Actualiza todos los campos de un servicio.
 * Si cambia el personal_id, ajusta los contadores servicios_activos
 * del técnico anterior (decrementa) y del nuevo (incrementa).
 * @param {number} id
 * @param {object} data - Campos del servicio a actualizar
 * @returns {Promise<object>} Servicio actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 */
const update = async (id, data) => {
  await getById(id);
  await servicioRepo.update(id, data);
  return servicioRepo.getById(id);
};

/**
 * Elimina un servicio. Si no estaba completado:
 * - Revierte servicios_activos del solicitante y personal
 * - Libera todos los utensilios asignados (status → 'Disponible')
 * @param {number} id
 * @throws {{ status: 404 }} Si no se encuentra
 */
const remove = async (id) => {
  await getById(id);
  return servicioRepo.remove(id);
};

//#endregion

//#region ── CAMBIOS DE ESTADO ─────────────────────────────────────

/**
 * Completa un servicio: registra fecha_fin, guarda en historial_servicios,
 * decrementa contadores del solicitante y personal, y libera los utensilios asignados.
 * @param {number} id
 * @param {{ fecha_fin: string, notas?: string }} param1
 * @returns {Promise<{ message: string }>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const completar = async (id, { fecha_fin, notas }) => {
  return await servicioRepo.completar(id, fecha_fin, notas);
};

/**
 * Cambia el status del servicio entre 'Pendiente' y 'En progreso'.
 * No permite cambiar a 'Completado' desde aquí — usar completar() para eso.
 * @param {number} id
 * @param {string} status - 'Pendiente' | 'En progreso'
 * @returns {Promise<object>} Servicio actualizado
 * @throws {{ status: 400 }} Si el status no es válido
 * @throws {{ status: 409 }} Si el servicio ya está completado
 */
const cambiarStatus = async (id, status) => {

  if (!VALID_STATUS.includes(status)) {
    throw {
      status: 400,
      message: `Status inválido`
    };
  }

  if (status === 'Completado') {
    throw {
      status: 400,
      message: 'Para completar un servicio usa completar()'
    };
  }

  await getById(id);

  await servicioRepo.cambiarStatus(id, status);

  return servicioRepo.getById(id);
};

/**
 * Cambia la prioridad del servicio sin afectar otros campos.
 * @param {number} id
 * @param {string} prioridad - 'baja' | 'media' | 'alta'
 * @returns {Promise<object>} Servicio actualizado
 * @throws {{ status: 400 }} Si la prioridad no es válida
 * @throws {{ status: 404 }} Si no se encuentra
 */
const cambiarPrioridad = async (id, prioridad) => {
  if (!VALID_PRIORIDAD.includes(prioridad))
    throw { status: 400, message: `Prioridad inválida. Valores permitidos: ${VALID_PRIORIDAD.join(', ')}` };

  await getById(id);
  await pool.execute(`UPDATE servicios SET prioridad = ? WHERE id = ?`, [prioridad, id]);
  return servicioRepo.getById(id);
};

//#endregion

//#region ── UTENSILIOS DEL SERVICIO ──────────────────────────────

/**
 * Retorna los utensilios asignados a un servicio.
 * @param {number} servicio_id
 * @returns {Promise<object[]>}
 */
const getUtensilios = (servicio_id) => servicioRepo.getUtensilios(servicio_id);

/**
 * Asigna un utensilio al servicio.
 * Cambia status_utensilio a 'En uso' y asigna el operador_id del servicio.
 * Rechaza con 409 si el utensilio está en uso o en mantenimiento.
 * @param {number} servicio_id
 * @param {number} utensilio_id
 * @throws {{ status: 409 }} Si el utensilio no está disponible
 */
const addUtensilio = (servicio_id, utensilio_id) =>
  servicioRepo.addUtensilio(servicio_id, utensilio_id);

/**
 * Desasigna un utensilio del servicio y lo regresa a 'Disponible'.
 * @param {number} servicio_id
 * @param {number} utensilio_id
 */
const removeUtensilio = (servicio_id, utensilio_id) =>
  servicioRepo.removeUtensilio(servicio_id, utensilio_id);

//#endregion

//#region ── EVIDENCIAS (Base64) ───────────────────────────────────

// Tipos MIME aceptados para las imágenes de evidencia
const VALID_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Guarda una imagen de evidencia en Base64 asociada al servicio.
 * Valida el tipo MIME y el tamaño antes de insertar en BD.
 * @param {number} servicio_id
 * @param {'inicio'|'fin'} tipo    - Momento de la evidencia
 * @param {string}         base64Data - Imagen en formato 'data:image/jpeg;base64,...'
 * @throws {{ status: 400 }} Si el MIME no es válido o supera 5 MB
 */
const addEvidencia = async (servicio_id, tipo, base64Data) => {
  await getById(servicio_id);

  // Extraer el MIME del prefijo del Base64
  const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
  if (!mimeMatch || !VALID_MIME.includes(mimeMatch[1])) {
    throw { status: 400, message: 'Formato de imagen no válido. Usa JPEG, PNG o WEBP.' };
  }

  // ~5 MB en base64 ≈ 6.7M caracteres — margen de seguridad a 7M
  if (base64Data.length > 7_000_000) {
    throw { status: 400, message: 'La imagen supera el tamaño máximo permitido (5 MB).' };
  }

  await pool.execute(
    `INSERT INTO evidencia (servicio_id, tipo, url_image) VALUES (?, ?, ?)`,
    [servicio_id, tipo, base64Data]
  );
};

/**
 * Retorna todas las evidencias de un servicio, ordenadas por tipo y fecha.
 * @param {number} servicio_id
 * @returns {Promise<object[]>} Lista con id, tipo, url_image (Base64) y created_at
 */
const getEvidencias = async (servicio_id) => {
  await getById(servicio_id);
  const [rows] = await pool.execute(
    `SELECT id, servicio_id, tipo, url_image, created_at
     FROM evidencia WHERE servicio_id = ? ORDER BY tipo, created_at`,
    [servicio_id]
  );
  return rows;
};

/**
 * Elimina una evidencia por su ID.
 * @param {number} evidencia_id
 * @throws {{ status: 404 }} Si no se encuentra
 */
const deleteEvidencia = async (evidencia_id) => {
  const [result] = await pool.execute(
    `DELETE FROM evidencia WHERE id = ?`, [evidencia_id]
  );
  if (!result.affectedRows) throw { status: 404, message: 'Evidencia no encontrada' };
};

//#endregion

module.exports = {
  getAll, getById, create, update, completar, remove,
  cambiarStatus, cambiarPrioridad,
  getUtensilios, addUtensilio, removeUtensilio,
  addEvidencia, getEvidencias, deleteEvidencia,
};
