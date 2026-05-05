const router = require('express').Router();
const ctrl   = require('../controllers/utensilioController');
const { requireAuth } = require('../modules/authMiddleware');

//router.use(requireAuth);

router.get   ('/',    ctrl.getAll);
router.get   ('/:id', ctrl.getById);
router.post  ('/',    ctrl.create);
router.put   ('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// Mantenimiento
router.get ('/:id/mantenimiento',  ctrl.getHistorial);
router.post('/:id/mantenimiento',  ctrl.registrarMantenimiento);
// servicio
//router.post ('/:id/servicio', ctrl.addutensilioservice);

module.exports = router;
