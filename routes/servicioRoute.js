const router = require('express').Router();
const ctrl   = require('../controllers/servicioController');
const { requireAuth } = require('../modules/authMiddleware');

//router.use(requireAuth);

// CRUD base
router.get   ('/',    ctrl.getAll);
router.get   ('/:id', ctrl.getById);
router.post  ('/',    ctrl.create);
router.put   ('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Cambios de estado rápidos
router.patch('/:id/completar',  ctrl.completar);   // requiere { fecha_fin }
router.patch('/:id/status',     ctrl.cambiarStatus);    // { status: 'Pendiente'|'En progreso' }
router.patch('/:id/prioridad',  ctrl.cambiarPrioridad); // { prioridad: 'baja'|'media'|'alta' }

// Utensilios del servicio
router.get   ('/:id/utensilios',               ctrl.getUtensilios);
router.post  ('/:id/utensilios',               ctrl.addUtensilio);
router.delete('/:id/utensilios/:utensilio_id', ctrl.removeUtensilio);

// Evidencias (Base64)
router.get   ('/:id/evidencias',               ctrl.getEvidencias);
router.post  ('/:id/evidencias',               ctrl.addEvidencia);
router.delete('/:id/evidencias/:evidencia_id', ctrl.deleteEvidencia);

module.exports = router;
