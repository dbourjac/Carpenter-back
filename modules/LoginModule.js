const bcrypt    = require('bcryptjs');
const loginRepo = require('../repository/LoginQuerys');

// Número de rondas para el hash de bcrypt (10 es el estándar recomendado)
const SALT_ROUNDS = 10;

//#region ── AUTENTICACIÓN ─────────────────────────────────────────

/**
 * Verifica las credenciales del usuario y retorna sus datos sin el hash de contraseña.
 * @param {string} nombre_usuario - Nombre de usuario ingresado
 * @param {string} password       - Contraseña en texto plano a verificar
 * @returns {Promise<object>} Usuario sin el campo password
 * @throws {{ status: 401, message: string }} Si las credenciales no son válidas
 */
const login = async (nombre_usuario, password) => {
  const usuario = await loginRepo.findByUsername(nombre_usuario);

  // Mensaje genérico para no revelar si el usuario existe o no
  if (!usuario) throw { status: 401, message: 'Credenciales inválidas' };

  const match = await bcrypt.compare(password, usuario.password);
  if (!match) throw { status: 401, message: 'Credenciales inválidas' };

  // Excluir el hash de la respuesta antes de devolver al cliente
  const { password: _pwd, ...usuarioSafe } = usuario;
  return usuarioSafe;
};

/**
 * Retorna los datos públicos de un usuario por su ID.
 * @param {number} id - ID del usuario
 * @returns {Promise<object>} Datos del usuario (sin contraseña)
 * @throws {{ status: 404 }} Si no se encuentra
 */
const getUsuarioById = async (id) => {
  const usuario = await loginRepo.findById(id);
  if (!usuario) throw { status: 404, message: 'Usuario no encontrado' };
  return usuario;
};

//#endregion

//#region ── GESTIÓN DE USUARIOS (solo admin) ──────────────────────

/**
 * Crea un nuevo usuario hasheando su contraseña antes de guardarla.
 * Solo debe ser llamado por un usuario con rol 'admin'.
 * @param {{ nombre_usuario: string, password: string, rol: string, personal_id?: number }} param0
 * @returns {Promise<{ id: number, nombre_usuario: string, rol: string }>}
 * @throws {{ status: 409 }} Si el nombre de usuario ya existe
 */
const crearUsuario = async ({ nombre_usuario, password, rol, personal_id }) => {
  // Verificar duplicado antes de hashear para no gastar CPU innecesariamente
  const existe = await loginRepo.findByUsername(nombre_usuario);
  if (existe) throw { status: 409, message: 'El nombre de usuario ya existe' };

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = await loginRepo.createUsuario({ nombre_usuario, password_hash, rol, personal_id });
  return { id, nombre_usuario, rol };
};

/**
 * Retorna la lista de todos los usuarios registrados (sin contraseñas).
 * @returns {Promise<object[]>}
 */
const listarUsuarios = async () => {
  return loginRepo.getAllUsuarios();
};

/**
 * Reemplaza la contraseña de un usuario con un nuevo hash.
 * @param {number} id              - ID del usuario a modificar
 * @param {string} nueva_password  - Nueva contraseña en texto plano
 * @throws {{ status: 404 }} Si el usuario no existe
 */
const cambiarPassword = async (id, nueva_password) => {
  const password_hash = await bcrypt.hash(nueva_password, SALT_ROUNDS);
  const affected = await loginRepo.updatePassword(id, password_hash);
  if (!affected) throw { status: 404, message: 'Usuario no encontrado' };
};

/**
 * Elimina un usuario del sistema.
 * @param {number} id - ID del usuario a eliminar
 * @throws {{ status: 404 }} Si no se encuentra
 */
const eliminarUsuario = async (id) => {
  const affected = await loginRepo.deleteUsuario(id);
  if (!affected) throw { status: 404, message: 'Usuario no encontrado' };
};

//#endregion

module.exports = { login, getUsuarioById, crearUsuario, listarUsuarios, cambiarPassword, eliminarUsuario };
