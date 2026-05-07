const pool = require('../database/conexionBD');

//#region ── CONSULTAS DE SERVICIOS ───────────────────────────────

/**
 * Retorna todos los servicios con datos del solicitante y técnico asignado,
 * ordenados por fecha de inicio descendente.
 * @returns {Promise<object[]>}
 */
const getAll = async () => {
  const [rows] = await pool.execute(
      `SELECT s.*,
              sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
              p.nombre AS nombre_personal
       FROM servicios s
              JOIN solicitantes sol ON sol.id = s.solicitante_id
              LEFT JOIN personal p   ON p.id  = s.personal_id
       ORDER BY s.fecha_inicio DESC`
  );
  return rows;
};

/**
 * Busca un servicio por su ID con datos del solicitante y técnico.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
const getById = async (id) => {
  const [rows] = await pool.execute(
      `SELECT s.*,
              sol.nombre_area, sol.nombre_contacto, sol.telefono, sol.email,
              p.nombre AS nombre_personal
       FROM servicios s
              JOIN solicitantes sol ON sol.id = s.solicitante_id
              LEFT JOIN personal p   ON p.id  = s.personal_id
       WHERE s.id = ?`,
      [id]
  );
  return rows[0] || null;
};

//#endregion

//#region ── OPERACIONES DE ESCRITURA ─────────────────────────────

/**
 * Inserta un nuevo servicio en una transacción que también incrementa los contadores:
 * - solicitante.servicios_activos + 1
 * - personal.servicios_activos + 1 (si se asignó técnico)
 * @param {{ solicitante_id: number, personal_id?: number, tipo_servicio: string, fecha_inicio: string, ubicacion: string, prioridad?: string }} param0
 * @returns {Promise<number>} ID del servicio creado
 */
const create = async ({ nombre_servicio, solicitante_id, personal_id, tipo_servicio, fecha_inicio, fecha_fin, status, ubicacion, prioridad }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
        `INSERT INTO servicios (nombre_servicio, solicitante_id, personal_id, tipo_servicio, fecha_inicio, fecha_fin, status, ubicacion, prioridad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre_servicio,
          solicitante_id,
          personal_id  || null,
          tipo_servicio,
          fecha_inicio,
          fecha_fin    || null,
          status       || 'pendiente',
          ubicacion,
          prioridad    || 'media',
        ]
    );

    // Incrementar servicios activos del área solicitante
    await conn.execute(
        `UPDATE solicitantes SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
        [solicitante_id]
    );

    // Incrementar servicios activos del técnico asignado (si hay)
    if (personal_id) {
      await conn.execute(
          `UPDATE personal SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
          [personal_id]
      );
    }

    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Actualiza todos los campos de un servicio.
 * Si cambia el personal_id y el servicio no está completado,
 * ajusta los contadores servicios_activos del técnico anterior (−1) y el nuevo (+1).
 * @param {number} id
 * @param {{ solicitante_id: number, personal_id?: number, tipo_servicio: string, fecha_inicio: string, fecha_fin?: string, status: string, prioridad: string, ubicacion: string }} fields
 * @returns {Promise<number>} Filas afectadas
 */
const update = async (id, fields) => {
  const { nombre_servicio, solicitante_id, personal_id, tipo_servicio, fecha_inicio, fecha_fin, status, prioridad, ubicacion } = fields;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Leer el estado actual antes de modificar para comparar personal
    const [rows] = await conn.execute(`SELECT personal_id, status FROM servicios WHERE id = ?`, [id]);
    const actual = rows[0];

    const [result] = await conn.execute(
      `UPDATE servicios SET nombre_servicio=?, solicitante_id=?, personal_id=?, tipo_servicio=?,
       fecha_inicio=?, fecha_fin=?, status=?, prioridad=?, ubicacion=?
       WHERE id = ?`,
      [nombre_servicio, solicitante_id, personal_id || null, tipo_servicio, fecha_inicio,
       fecha_fin || null, status, prioridad, ubicacion, id]
    );

    // Ajustar contadores solo si el servicio sigue activo y cambió el técnico
    if (actual && actual.status !== 'Completado') {
      const personalAnterior = actual.personal_id;
      const personalNuevo    = personal_id || null;

      if (personalAnterior !== personalNuevo) {
        if (personalAnterior) {
          await conn.execute(
            `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
            [personalAnterior]
          );
        }
        if (personalNuevo) {
          await conn.execute(
            `UPDATE personal SET servicios_activos = servicios_activos + 1 WHERE id = ?`,
            [personalNuevo]
          );
        }
      }
    }

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Marca el servicio como 'Completado' y en la misma transacción:
 * - Decrementa solicitante.servicios_activos y suma total_servicios_completados
 * - Decrementa personal.servicios_activos del técnico asignado
 * - Libera todos los utensilios asignados (status → 'Disponible', operador_id → NULL)
 * @param {number} id
 * @param {string} fecha_fin
 * @returns {Promise<true>}
 */
const completar = async (id, fecha_fin, notas) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT * FROM servicios WHERE id = ?`,
      [id]
    );
    const servicio = rows[0];
    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }
    // Evitar doble completado
    if (servicio.status === 'Completado') {
      throw new Error('El servicio ya está completado');
    }
    // Completar servicio
    await conn.execute(
      `UPDATE servicios
       SET status = 'Completado',
           fecha_fin = ?
       WHERE id = ?`,
      [fecha_fin, id]
    );
    // Actualizar solicitante
    await conn.execute(
      `UPDATE solicitantes
      SET servicios_activos =
        CASE
          WHEN servicios_activos > 0
          THEN servicios_activos - 1
          ELSE 0
        END,

          total_servicios_completados =
            total_servicios_completados + 1

      WHERE id = ?`,
      [servicio.solicitante_id]
    );
    // Actualizar técnico
    if (servicio.personal_id) {
      await conn.execute(
        `UPDATE personal
        SET servicios_activos =
          CASE
            WHEN servicios_activos > 0
            THEN servicios_activos - 1
            ELSE 0
          END
        WHERE id = ?`,
        [servicio.personal_id]
      );
    }
    // Historial
    await conn.execute(
      `INSERT INTO historial_servicios
       (
         nombre_servicio,
         servicio_id,
         solicitante_id,
         personal_id,
         tipo_hs_servicio,
         fecha_inicio,
         fecha_fin,
         status_final,
         notas
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Completado', ?)`,
      [
        servicio.nombre_servicio,
        servicio.id,
        servicio.solicitante_id,
        servicio.personal_id,
        servicio.tipo_servicio,
        servicio.fecha_inicio,
        fecha_fin,
        notas || null
      ]
    );
    await conn.commit();
    return {
      message: 'Servicio completado y registrado en historial'
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
// cambiar estatus
const cambiarStatus = async (id, status) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Obtener servicio
    const [rows] = await conn.execute(
      `SELECT * FROM servicios WHERE id = ?`,
      [id]
    );
    const servicio = rows[0];
    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }
    const estabaCompletado = servicio.status === 'Completado';

      // Cambiar status
      await conn.execute(
        `UPDATE servicios
        SET status = ?
        WHERE id = ?`,
        [status, id]
      );

      if (estabaCompletado) {

        // Restaurar contadores solicitante
        await conn.execute(
          `UPDATE solicitantes
          SET servicios_activos = GREATEST(servicios_activos + 1, 0),
              total_servicios_completados = GREATEST(total_servicios_completados - 1, 0)
          WHERE id = ?`,
          [servicio.solicitante_id]
        );

        // Restaurar contador técnico
        if (servicio.personal_id) {
          await conn.execute(
            `UPDATE personal
            SET servicios_activos = GREATEST(servicios_activos + 1, 0)
            WHERE id = ?`,
            [servicio.personal_id]
          );
        }

        // Restaurar utensilios
        await conn.execute(
          `UPDATE utensilios u
          JOIN servicio_utensilios su
            ON su.utensilio_id = u.id
          SET u.status_utensilio = 'En uso',
              u.operador_id = ?,
              u.solicitante_id = ?
          WHERE su.servicio_id = ?
            AND u.status_utensilio = 'Finalizado'`,
          [servicio.personal_id, servicio.solicitante_id, id]
        );

        // Restaurar relación utensilios
        await conn.execute(
          `UPDATE servicio_utensilios
          SET Status = 'En uso'
          WHERE servicio_id = ?
            AND Status = 'Finalizado'`,
          [id]
        );

        // Eliminar historial
        await conn.execute(
          `DELETE FROM historial_servicios
          WHERE servicio_id = ?`,
          [id]
        );
      }
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Elimina un servicio. Si no estaba completado, en la misma transacción:
 * - Revierte servicios_activos del solicitante y del técnico
 * - Libera los utensilios asignados (status → 'Disponible', operador_id → NULL)
 * @param {number} id
 * @returns {Promise<number>} Filas afectadas
 */
const remove = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT * FROM servicios WHERE id = ?`, [id]);
    const servicio = rows[0];
    if (!servicio) throw new Error('Servicio no encontrado');

    // Revertir contadores solo si el servicio no estaba completado
    if (servicio.status !== 'Completado') {
      await conn.execute(
        `UPDATE solicitantes SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
        [servicio.solicitante_id]
      );

      if (servicio.personal_id) {
        await conn.execute(
          `UPDATE personal SET servicios_activos = GREATEST(servicios_activos - 1, 0) WHERE id = ?`,
          [servicio.personal_id]
        );
      }

      // Liberar utensilios al eliminar el servicio activo
      await conn.execute(
        `UPDATE utensilios u
         JOIN servicio_utensilios su ON su.utensilio_id = u.id
         SET u.status_utensilio = 'Disponible', u.operador_id = NULL
         WHERE su.servicio_id = ? AND u.status_utensilio = 'En uso'`,
        [id]
      );
    }

    const [result] = await conn.execute(`DELETE FROM servicios WHERE id = ?`, [id]);
    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

//#endregion

//#region ── UTENSILIOS DEL SERVICIO ──────────────────────────────

/**
 * Retorna los utensilios asignados a un servicio mediante la tabla pivote.
 * @param {number} servicio_id
 * @returns {Promise<object[]>}
 */
const getUtensilios = async (servicio_id) => {
  const [rows] = await pool.execute(
    `SELECT u.* FROM utensilios u
     JOIN servicio_utensilios su ON su.utensilio_id = u.id
     WHERE su.servicio_id = ?`,
    [servicio_id]
  );
  return rows;
};

/**
 * Asigna un utensilio al servicio en una transacción que también:
 * - Valida que el utensilio esté 'Disponible' (no 'En uso' ni 'Mantenimiento')
 * - Cambia su status_utensilio a 'En uso'
 * - Asigna el personal_id del servicio como operador_id del utensilio
 * @param {number} servicio_id
 * @param {number} utensilio_id
 * @throws {{ status: 409 }} Si el utensilio no está disponible
 */
const addUtensilio = async (servicio_id, utensilio_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar disponibilidad del utensilio antes de asignar
    const [check] = await conn.execute(
      `SELECT status_utensilio FROM utensilios WHERE id = ?`, [utensilio_id]
    );
    if (check[0] && check[0].status_utensilio === 'En uso') {
      throw { status: 409, message: 'El utensilio ya está en uso en otro servicio' };
    }
    if (check[0] && check[0].status_utensilio === 'Mantenimiento') {
      throw { status: 409, message: 'El utensilio está en mantenimiento y no puede asignarse' };
    }

    // Registrar en tabla pivote (IGNORE evita duplicados silenciosamente)
    await conn.execute(
      `INSERT IGNORE INTO servicio_utensilios (servicio_id, utensilio_id) VALUES (?, ?)`,
      [servicio_id, utensilio_id]
    );

    // Obtener el técnico del servicio para asignarlo como operador del utensilio
    const [svcRows] = await conn.execute(
      `SELECT personal_id FROM servicios WHERE id = ?`, [servicio_id]
    );
    const operador_id = svcRows[0]?.personal_id || null;

    // Marcar utensilio como en uso y asignar operador
    await conn.execute(
      `UPDATE utensilios SET status_utensilio = 'En uso', operador_id = ? WHERE id = ?`,
      [operador_id, utensilio_id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Desasigna un utensilio del servicio y lo regresa a 'Disponible' en una transacción.
 * @param {number} servicio_id
 * @param {number} utensilio_id
 */
const removeUtensilio = async (servicio_id, utensilio_id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `DELETE FROM servicio_utensilios WHERE servicio_id=? AND utensilio_id=?`,
      [servicio_id, utensilio_id]
    );

    // Liberar el utensilio al quitarlo del servicio
    await conn.execute(
      `UPDATE utensilios SET status_utensilio = 'Disponible', operador_id = NULL WHERE id = ?`,
      [utensilio_id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

//#endregion

module.exports = {
  getAll, getById,
  create, update, completar, remove, cambiarStatus,
  getUtensilios, addUtensilio, removeUtensilio,
};
