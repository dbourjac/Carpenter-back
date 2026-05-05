const router = require('express').Router();
const ctrl   = require('../controllers/reportesController');
const { requireAuth } = require('../modules/authMiddleware');

router.use(requireAuth);

// Dashboard principal
router.get('/dashboard',              ctrl.dashboard);

// Servicios
// GET /api/reportes/historial?fecha_inicio=&fecha_fin=&solicitante_id=&personal_id=&tipo=
router.get('/historial',              ctrl.historialServicios);
router.get('/resumen-tipo',           ctrl.resumenPorTipo);
router.get('/activos',                ctrl.serviciosActivos);

// Equipos
router.get('/mantenimientos',         ctrl.utensiliosMantenimiento);
// GET /api/reportes/historial-mantenimiento?utensilio_id=&fecha_inicio=&fecha_fin=
router.get('/historial-mantenimiento',ctrl.historialMantenimiento);

// Personal
router.get('/ranking-personal',       ctrl.rankingPersonal);

module.exports = router;
