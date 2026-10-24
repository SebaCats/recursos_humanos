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
// Prepara al servidor para que pueda entender datos enviados por formularios web y datos en formato JSON
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: 'mi_clave_secreta', // Cambia esto por un texto seguro
    resave: false,
    saveUninitialized: false
}));

// Configura un motor de plantillas llamado EJS. 
// Esto sirve para crear páginas web dinámicas (HTML que puede cambiar dependiendo de los datos).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'pages'));

// Archivos públicos: CSS, JS e imágenes
app.use(express.static(path.join(__dirname, 'public')));

// La función protegerRuta es como un guardia de seguridad. 
// Antes de dejar entrar a alguien a una página privada, revisa si tiene su "credencial" (req.session.usuarioLogeado).
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

// Si alguien entra a la página de login pero ya había iniciado sesión, lo manda directo a la página principal. 
// Si no, le muestra el archivo login.html.
app.get('/login', (req, res) => {
    if (req.session?.usuarioLogeado) {
        return res.redirect('/');
    }

    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Cuando el usuario envía sus datos para entrar, el código (por ahora) hace trampa: asume que todo está correcto, 
// le da la credencial de usuarioLogeado = true y lo deja entrar.
app.post('/login', (req, res) => {
    // Aquí validarías contra tu base de datos.
    // Por ahora, simulamos que el login fue exitoso automáticamente:
    req.session.usuarioLogeado = true;
    res.redirect('/');
});

// Todas estas rutas pasan primero por el "guardia" (protegerRuta):
// Muestran la página principal (la plantilla index con la vista resumen).
app.get(['/', '/resumen'], protegerRuta, (req, res) => {
    res.render('index', { vista: 'resumen' });
});

// Muestra la sección del directorio.
app.get('/directorio', protegerRuta, (req, res) => {
    res.render('index', { vista: 'directorio' });
});

// /api/... Estas rutas actúan como un puente. Cuando tu página web pide la lista de empleados o los salarios,
// este servidor va y le pregunta a otro servidor (tu API externa en el puerto 4000), 
// recoge los datos y se los devuelve a tu página.
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

// Página 404: Si alguien intenta entrar a un enlace que no existe 
// (ej: localhost:3000/pagina-inventada), le muestra una vista de "Error 404".
app.use((req, res) => {
    res.status(404).render('404');
});

// Error 500: Si algo se rompe internamente en el código, evita que el servidor se apague por completo
// y muestra un mensaje de "Error interno".
app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).send('Error interno del servidor');
});

// app.listen: Finalmente, enciende el servidor para que empiece a escuchar visitas en el puerto 3000.
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
