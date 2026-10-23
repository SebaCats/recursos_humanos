import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

// 1. Recrear __dirname y __filename para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Para poder leer los datos que vengan de un formulario de login (<form method="POST">)
app.use(express.urlencoded({ extended: true }));

// 2. Configurar la sesión
app.use(session({
    secret: 'mi_clave_secreta', // Cambia esto por un texto seguro
    resave: false,
    saveUninitialized: false
}));

// 3. Crear el Middleware de Autenticación
const protegerRuta = (req, res, next) => {
    if (req.session.usuarioLogeado) {
        next(); // Si está logeado, lo deja pasar
    } else {
        res.redirect('/login'); // Si no, lo patea al login
    }
};

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');

// Indicar que las vistas están en la carpeta 'src'
app.set('views', path.join(__dirname, 'src'));

// Configurar carpetas de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'src', 'static')));

// Rutas principales
app.get(['/', '/resumen'], protegerRuta, (req, res) => {
    res.render('index', { vista: 'pages/resumen' });
});

app.get('/directorio', protegerRuta, (req, res) => {
    res.render('index', { vista: 'pages/directorio' });
});

// Mostrar el formulario de login
app.get('/login', (req, res) => {
    if (req.session.usuarioLogeado) return res.redirect('/'); // Si ya entró, no mostrar login
    res.render('pages/login');
});

// Procesar el login (cuando el usuario envía sus datos)
app.post('/login', (req, res) => {
    // Aquí validarías contra tu base de datos.
    // Por ahora, simulamos que el login fue exitoso automáticamente:
    req.session.usuarioLogeado = true;
    res.redirect('/');
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Manejador 404
app.use((req, res) => {
    res.status(404).render('index', {vista: 'pages/404'})
})

const port = 3000;
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});