const loginModule = require('../modules/LoginModule');

//#region ── AUTENTICACIÓN ─────────────────────────────────────────

/**
 * POST /api/auth/login
 * Inicia sesión con nombre de usuario y contraseña.
 * Si las credenciales son válidas, guarda el usuario en la sesión activa.
 * @param {import('express').Request}  req - Body: { nombre_usuario, password }
 * @param {import('express').Response} res - 200: { message, usuario } | 400 | 401
 */
const login = async (req, res) => {
  try {
    const { nombre_usuario, password } = req.body;

    // Validar que lleguen ambos campos antes de consultar la BD
    if (!nombre_usuario || !password)
      return res.status(400).json({ message: 'Faltan credenciales' });

    const usuario = await loginModule.login(nombre_usuario, password);

    // Persistir usuario en sesión (sin el hash de contraseña)
    req.session.usuario = usuario;
    res.json({ message: 'Sesión iniciada', usuario });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/**
 * POST /api/auth/logout
 * Destruye la sesión activa y limpia la cookie del cliente.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: { message }
 */
const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesión cerrada' });
  });
};

/**
 * GET /api/auth/me
 * Retorna la información del usuario autenticado en la sesión actual.
 * @param {import('express').Request}  req - Requiere sesión activa
 * @param {import('express').Response} res - 200: Usuario | 404
 */
const me = async (req, res) => {
  try {
    const usuario = await loginModule.getUsuarioById(req.session.usuario.id);
    res.json(usuario);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

//#endregion

//#region ── GESTIÓN DE USUARIOS (solo admin) ──────────────────────

/**
 * POST /api/auth/usuarios
 * Crea un nuevo usuario del sistema. Solo accesible por el rol admin.
 * @param {import('express').Request}  req - Body: { nombre_usuario, password, rol, personal_id? }
 * @param {import('express').Response} res - 201: { id, nombre_usuario, rol } | 409 si ya existe
 */
const crearUsuario = async (req, res) => {
  try {
    const usuario = await loginModule.crearUsuario(req.body);
    res.status(201).json(usuario);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/**
 * GET /api/auth/usuarios
 * Lista todos los usuarios registrados. Solo accesible por el rol admin.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - 200: Usuario[]
 */
const listarUsuarios = async (req, res) => {
  try {
    const lista = await loginModule.listarUsuarios();
    res.json(lista);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/auth/usuarios/:id/password
 * Actualiza la contraseña de un usuario. Solo accesible por el rol admin.
 * @param {import('express').Request}  req - Params: { id } | Body: { nueva_password }
 * @param {import('express').Response} res - 200: { message } | 400 | 404
 */
const cambiarPassword = async (req, res) => {
  try {
    const { nueva_password } = req.body;

    if (!nueva_password)
      return res.status(400).json({ message: 'Falta nueva_password' });

    await loginModule.cambiarPassword(req.params.id, nueva_password);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

/**
 * DELETE /api/auth/usuarios/:id
 * Elimina un usuario del sistema. Solo accesible por el rol admin.
 * @param {import('express').Request}  req - Params: { id }
 * @param {import('express').Response} res - 200: { message } | 404
 */
const eliminarUsuario = async (req, res) => {
  try {
    await loginModule.eliminarUsuario(req.params.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

//#endregion

module.exports = { login, logout, me, crearUsuario, listarUsuarios, cambiarPassword, eliminarUsuario };
