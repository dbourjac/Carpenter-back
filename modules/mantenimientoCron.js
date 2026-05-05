const cron           = require('node-cron');
const utensilioQuery = require('../repository/utensilioQuerys');

//#region ── LÓGICA DE ESTADOS DE MANTENIMIENTO ────────────────────
//
//  Reglas de negocio:
//    días >= Rangos_mantenimiento       → 'En proceso'  | utensilio → 'Mantenimiento'
//    días >= Rangos_mantenimiento - 7   → 'Próximo'     | utensilio sin cambio
//    días <  lo anterior                → 'Al día'      | utensilio sin cambio
//
//#endregion

/**
 * Determina el status de mantenimiento que le corresponde a un utensilio
 * según los días transcurridos desde su último mantenimiento.
 * Si Rangos_mantenimiento no es un número válido, retorna null (sin cambio).
 *
 * @param {number} diasTranscurridos - Días desde ultimo_mantenimiento hasta hoy
 * @param {{ Rangos_mantenimiento: string }} utensilio
 * @returns {{ status_mantenimiento: string, status_utensilio: string|null } | null}
 */
function calcularStatus(diasTranscurridos, utensilio) {
  const rango = parseInt(utensilio.Rangos_mantenimiento, 10);

  // Si el campo no es un entero válido, saltamos este utensilio sin modificarlo
  if (isNaN(rango)) return null;

  if (diasTranscurridos >= rango) {
    // Venció el plazo — requiere mantenimiento urgente
    return {
      status_mantenimiento: 'En proceso',
      status_utensilio:     'Mantenimiento',
    };
  } else if (diasTranscurridos >= rango - 7) {
    // Faltan 7 días o menos — aviso anticipado
    return {
      status_mantenimiento: 'Próximo',
      status_utensilio:     null, // no sobrescribir 'En uso' si está asignado
    };
  } else {
    // Dentro del plazo
    return {
      status_mantenimiento: 'Al día',
      status_utensilio:     null,
    };
  }
}

/**
 * Recorre todos los utensilios que tienen Rangos_mantenimiento y ultimo_mantenimiento definidos,
 * calcula su estado actual y actualiza la BD solo si el valor cambió.
 * Esto evita writes innecesarios en cada ejecución.
 *
 * @returns {Promise<void>}
 */
async function actualizarEstadosMantenimiento() {
  const diaHoy     = new Date();
  const utensilios = await utensilioQuery.getAllParaCron();

  let actualizados = 0;
  let errores      = 0;

  for (const utensilio of utensilios) {
    try {
      const ultimoMant        = new Date(utensilio.ultimo_mantenimiento);
      const diasTranscurridos = Math.floor(
        (diaHoy - ultimoMant) / (1000 * 60 * 60 * 24)
      );

      const nuevoStatus = calcularStatus(diasTranscurridos, utensilio);

      // Si Rangos_mantenimiento no era número, saltar sin tocar el registro
      if (!nuevoStatus) continue;

      // Comparar contra el estado actual para no hacer UPDATE si no cambió nada
      const statusCambio    = utensilio.status_mantenimiento !== nuevoStatus.status_mantenimiento;
      const utensilioCambio = nuevoStatus.status_utensilio !== null &&
                              utensilio.status_utensilio   !== nuevoStatus.status_utensilio;

      if (statusCambio || utensilioCambio) {
        await utensilioQuery.updateStatusCron(
          utensilio.id,
          nuevoStatus.status_mantenimiento,
          nuevoStatus.status_utensilio
        );
        actualizados++;

        console.log(
          `  [CRON] Utensilio #${utensilio.id}: ` +
          `${utensilio.status_mantenimiento} → ${nuevoStatus.status_mantenimiento}` +
          (nuevoStatus.status_utensilio ? ` | utensilio → ${nuevoStatus.status_utensilio}` : '')
        );
      }
    } catch (err) {
      errores++;
      console.error(`  [CRON] Error procesando utensilio #${utensilio.id}:`, err.message);
    }
  }

  console.log(
    `[CRON] Mantenimiento completado — ` +
    `${utensilios.length} revisados, ${actualizados} actualizados, ${errores} errores.`
  );
}

/**
 * Registra el cron job que actualiza los estados de mantenimiento diariamente a las 00:00.
 * En desarrollo puede ejecutarse también al arrancar el servidor para ver resultados de inmediato.
 *
 * @param {{ ejecutarAlInicio?: boolean }} opciones
 *   - ejecutarAlInicio: true  → corre una vez al iniciar el servidor (default en development)
 *   - ejecutarAlInicio: false → solo corre a medianoche (recomendado en production)
 */
function iniciarCronMantenimiento({ ejecutarAlInicio = false } = {}) {
  // Expresión cron: minuto 0, hora 0, todos los días
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Iniciando actualización de estados de mantenimiento...');
    try {
      await actualizarEstadosMantenimiento();
    } catch (err) {
      console.error('[CRON] Error general en cron de mantenimiento:', err.message);
    }
  });

  console.log('[CRON] Tarea de mantenimiento programada → todos los días a las 00:00');

  // Útil en desarrollo: ver resultados sin esperar a medianoche
  if (ejecutarAlInicio) {
    console.log('[CRON] Ejecutando revisión inicial al arrancar el servidor...');
    actualizarEstadosMantenimiento().catch(err =>
      console.error('[CRON] Error en revisión inicial:', err.message)
    );
  }
}

module.exports = { iniciarCronMantenimiento, actualizarEstadosMantenimiento };
