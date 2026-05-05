const router = require('express').Router();
const ctrl   = require('../controllers/seguimientoController');
const { requireAuth } = require('../modules/authMiddleware');

router.use(requireAuth);

router.get('/por-servicio/:servicio_id', ctrl.getByServicioId);

router.get ('/',                            ctrl.getAll);
router.get ('/:id',                         ctrl.getById);
//router.get ('/servicio/:servicio_id',       ctrl.getByServicioId);
router.put ('/:id',                         ctrl.update);

router.patch('/:id/observaciones',          ctrl.addObservacion);

module.exports = router;
