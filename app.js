import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const apiBaseUrl = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

// Configuración de Express
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: 'mi_clave_secreta', // Cambia esto por un texto seguro
    resave: false,
    saveUninitialized: false
}));

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'pages'));

// Archivos públicos: CSS, JS e imágenes
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de autenticación
function protegerRuta(req, res, next) {
    if (req.session?.usuarioLogeado) {
        return next();
    }

    // Las peticiones de API reciben 401, no una página HTML
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({
            error: 'Debes iniciar sesión'
        });
    }

    return res.redirect('/login');
}

// Login
app.get('/login', (req, res) => {
    if (req.session?.usuarioLogeado) {
        return res.redirect('/');
    }

    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Procesar login
app.post('/login', (req, res) => {
    // Aquí validarías contra tu base de datos.
    // Por ahora, simulamos que el login fue exitoso automáticamente:
    req.session.usuarioLogeado = true;
    res.redirect('/');
});

// Todas las páginas privadas
app.get(['/', '/resumen'], protegerRuta, (req, res) => {
    res.render('index', { vista: 'resumen' });
});

app.get('/directorio', protegerRuta, (req, res) => {
    res.render('index', { vista: 'directorio' });
});

app.get('/api/empleadosByDepartamento', protegerRuta, async (req, res, next) => {
    try {
        const response = await fetch(
            `${apiBaseUrl}/empleadosByDepartamento`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Error al obtener los empleados'
            });
        }

        const datos = await response.json();
        res.json(datos);
    } catch (error) {
        next(error);
    }
});

app.get('/api/totalSalario', protegerRuta, async (req, res, next) => {
    try {
        const response = await fetch(
            `${apiBaseUrl}/totalSalario`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Error al obtener el total de salario'
            });
        }

        const datos = await response.json();
        res.json(datos);
    } catch (error) {
        next(error);
    }
});

// Cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Página 404
app.use((req, res) => {
    res.status(404).render('404');
});

// Manejo de errores
app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).send('Error interno del servidor');
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
