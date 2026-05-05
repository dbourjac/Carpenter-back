require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors    = require('cors');

const app = express();

// ── Middlewares globales ─────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,   // necesario para enviar cookies de sesión
}));

// Aumentar límite para imágenes Base64 (5 MB aprox → 7 MB en base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Sesiones ────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'carpinteria_secret_dev',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production', // HTTPS en prod
    maxAge:   1000 * 60 * 60 * 8,  // 8 horas
  },
}));

// ── Rutas ────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/LoginRoute'));
app.use('/api/personal',    require('./routes/personalRoute'));
app.use('/api/solicitantes',require('./routes/solicitanteRoute'));
app.use('/api/servicios',   require('./routes/servicioRoute'));
app.use('/api/utensilios',  require('./routes/utensilioRoute'));
app.use('/api/seguimiento', require('./routes/seguimientoRoute'));
app.use('/api/reportes',    require('./routes/reportesRoute'));

// ── Cron: actualización diaria de estados de mantenimiento ───────
const { iniciarCronMantenimiento } = require("./modules/mantenimientoCron");
iniciarCronMantenimiento({ ejecutarAlInicio: process.env.NODE_ENV !== "production" });

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Manejo de rutas no encontradas ───────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// ── Manejo global de errores ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('❌ Error no capturado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ── Iniciar servidor ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
