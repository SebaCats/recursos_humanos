// Configuración del API para el despliegue.
//
// En Vercel se deja vacío: vercel.json redirige /login, /logout,
// /check-session, /employee/* y /api/* al backend. Al ser rutas relativas,
// la cookie de sesión se mantiene same-origin y no hace falta SameSite=None.
//
// Si sirves el frontend con otro servidor estático (sin proxy), cambia el
// valor a la URL pública del backend, por ejemplo 'https://api.tudominio.com'.
const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)

window.HORIZON_API_BASE = esLocal ? 'http://localhost:3000' : ''
