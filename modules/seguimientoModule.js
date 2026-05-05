const repo = require('../repository/seguimientoQuerys');
const pool = require('../database/conexionBD');

//#region ── CONSULTAS ─────────────────────────────────────────────

/**
 * Retorna todos los registros de seguimiento con datos del solicitante y técnico.
 * @returns {Promise<object[]>}
 */
const getAll = async () => repo.getAll();

/**
 * Retorna un seguimiento por su ID propio.
 * @param {number} id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getById = async (id) => {
  const s = await repo.getById(id);
  if (!s) throw { status: 404, message: 'Seguimiento no encontrado' };
  return s;
};

/**
 * Retorna el seguimiento asociado a un servicio (relación 1:1).
 * @param {number} servicio_id
 * @returns {Promise<object>}
 * @throws {{ status: 404 }} Si no se encuentra seguimiento para ese servicio
 */
const getByServicioId = async (servicio_id) => {
  const s = await repo.getByServicioId(servicio_id);
  if (!s) throw { status: 404, message: 'Seguimiento no encontrado para ese servicio' };
  return s;
};

//#endregion

//#region ── ACTUALIZACIÓN CON SINCRONIZACIÓN ──────────────────────

/**
 * Actualiza el seguimiento y sincroniza los cambios relevantes al servicio padre.
 *
 * Lógica de sincronización:
 * - Si cambia personal_id: ajusta servicios_activos del técnico anterior (−1)
 *   y del nuevo (+1), y actualiza operador_id en los utensilios 'En uso' del servicio.
 * - Si cambia personal_id o ubicacion: refleja el cambio en la tabla servicios.
 * - Todo ocurre dentro de una transacción para garantizar consistencia.
 *
 * @param {number} id   - ID del seguimiento a actualizar
 * @param {{ personal_id?: number, ubicacion: string, fecha_fin_estimada?: string, observaciones?: string }} data
 * @returns {Promise<object>} Seguimiento actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 */
const update = async (id, data) => {
  const seg  = await getById(id);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Actualizar el seguimiento
    await conn.execute(
      `UPDATE seguimiento SET personal_id=?, ubicacion=?, fecha_fin_estimada=?, observaciones=? WHERE id=?`,
      [data.personal_id || null, data.ubicacion, data.fecha_fin_estimada || null, data.observaciones || null, id]
    );

    // 2. Detectar qué campos cambiaron para saber si hay que sincronizar
    const personalCambio  = data.personal_id != seg.personal_id;
    const ubicacionCambio = data.ubicacion   !== seg.ubicacion;

    if (personalCambio || ubicacionCambio) {

      if (personalCambio) {
        // Verificar que el servicio padre no esté completado antes de mover contadores
        const [svcRows] = await conn.execute(
          `SELECT status, personal_id FROM servicios WHERE id = ?`, [seg.servicio_id]
        );
        const svc = svcRows[0];

        if (svc && svc.status !== 'Completado') {
          const personalAnterior = svc.personal_id;
          const personalNuevo    = data.personal_id || null;

          // Decrementar contador del técnico que se va
          if (personalAnterior) {
            await conn.execute(
              `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
              [personalAnterior]
            );
          }

          // Incrementar contador del técnico que entra
          if (personalNuevo) {
            await conn.execute(
              `UPDATE personal SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
              [personalNuevo]
            );
          }

          // Reasignar operador_id en los utensilios 'En uso' de este servicio
          if (personalNuevo !== personalAnterior) {
            await conn.execute(
              `UPDATE utensilios u
               JOIN servicio_utensilios su ON su.utensilio_id = u.id
               SET u.operador_id = ?
               WHERE su.servicio_id = ? AND u.status_utensilio = 'En uso'`,
              [personalNuevo, seg.servicio_id]
            );
          }
        }
      }

      // Reflejar personal_id y ubicacion en el servicio padre (fuente de verdad compartida)
      await conn.execute(
        `UPDATE servicios SET personal_id=?, ubicacion=? WHERE id=?`,
        [data.personal_id || null, data.ubicacion, seg.servicio_id]
      );
    }

    await conn.commit();
    return repo.getById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Agrega o reemplaza las observaciones/notas técnicas de un seguimiento.
 * Endpoint ligero que evita enviar todos los campos solo para anotar algo.
 * @param {number} id            - ID del seguimiento
 * @param {string} observaciones - Texto de observaciones
 * @returns {Promise<object>} Seguimiento actualizado
 * @throws {{ status: 404 }} Si no se encuentra
 */
const addObservacion = async (id, observaciones) => {
  await getById(id);
  await repo.updateObservaciones(id, observaciones);
  return repo.getById(id);
};

//#endregion

module.exports = { getAll, getById, getByServicioId, update, addObservacion };
