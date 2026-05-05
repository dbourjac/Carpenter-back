//#region ── MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN ──────────

/**
 * Middleware: verifica que exista una sesión activa antes de continuar.
 * Si no hay sesión, responde 401 y corta la cadena de middlewares.
 * Usar en cualquier ruta que requiera login.
 * @param {import('express').Request}   req
 * @param {import('express').Response}  res
 * @param {import('express').NextFunction} next
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.usuario)
    return res.status(401).json({ message: 'No autenticado. Inicia sesión.' });
  next();
};

/**
 * Middleware de fábrica: permite el acceso solo a los roles indicados.
 * Debe usarse después de requireAuth, ya que asume que req.session.usuario existe.
 * @param {...string} roles - Roles permitidos, ej: requireRole('admin', 'supervisor')
 * @returns {import('express').RequestHandler}
 *
 * @example
 * // Solo admin puede acceder
 * router.post('/usuarios', requireAuth, requireRole('admin'), ctrl.crear);
 */
const requireRole = (...roles) => (req, res, next) => {
  // Doble check de sesión por si se usa sin requireAuth
  if (!req.session?.usuario)
    return res.status(401).json({ message: 'No autenticado' });

  if (!roles.includes(req.session.usuario.rol))
    return res.status(403).json({ message: 'Sin permisos para esta acción' });

  next();
};

//#endregion

module.exports = { requireAuth, requireRole };
