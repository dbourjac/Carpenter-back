// routes/LoginRoute.js
const router = require('express').Router();
const ctrl   = require('../controllers/LoginController');
const { requireAuth, requireRole } = require('../modules/authMiddleware');

router.post('/login',  ctrl.login);
router.post('/logout', requireAuth, ctrl.logout);
router.get ('/me',     requireAuth, ctrl.me);

// Solo admin gestiona usuarios
router.post  ('/usuarios',              requireAuth, requireRole('admin'), ctrl.crearUsuario);
router.get   ('/usuarios',              requireAuth, requireRole('admin'), ctrl.listarUsuarios);
router.patch ('/usuarios/:id/password', requireAuth, requireRole('admin'), ctrl.cambiarPassword);
router.delete('/usuarios/:id',          requireAuth, requireRole('admin'), ctrl.eliminarUsuario);

module.exports = router;
