# Horizon · Recursos Humanos

Panel web de administración de Recursos Humanos construido con **Express**, **EJS** y **Bootstrap 5**. Incluye un resumen ejecutivo con indicadores y gráficas, un directorio de empleados, autenticación basada en sesiones y un proxy hacia la API de datos.

> Proyecto en fase de desarrollo: los datos de empleados y varias acciones de la interfaz son de ejemplo.

## Características

- **Autenticación con sesión en servidor** (`express-session`) y middleware `protegerRuta`.
- **Login** servido como página estática (`public/login.html`).
- **Resumen** (`/resumen`):
  - Tarjetas de KPIs: plantilla activa, rotación, ausentismo y coste de nómina.
  - Gráfica de evolución de la plantilla con Chart.js.
  - Distribución por departamento calculada dinámicamente desde la API.
  - Bandeja de decisiones y actividad reciente.
- **Directorio** (`/directorio`):
  - Tarjetas de indicadores de personal.
  - Buscador y filtros por departamento, sede y estado.
  - Tabla de empleados con paginación (elementos visuales de ejemplo).
- **API interna** que hace de proxy entre el navegador y el backend de datos; las peticiones sin sesión reciben `401 JSON`.
- **Página 404** independiente y **manejador de errores 500**.
- Estilos propios sobre Bootstrap en `public/css/styles.css`.

## Stack tecnológico

| Tecnología      | Uso                                        |
| --------------- | ------------------------------------------ |
| Node.js         | Entorno de ejecución (ES Modules)          |
| Express 5       | Servidor HTTP, enrutamiento y proxy        |
| EJS 7           | Motor de plantillas del lado del servidor  |
| express-session | Gestión de sesiones de usuario             |
| Bootstrap 5.3   | Maquetación y componentes (vía CDN)        |
| Chart.js        | Gráficas (vía CDN)                         |
| pnpm 12         | Gestor de paquetes                         |

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior (necesario para `fetch` global; probado con Node 24).
- [pnpm](https://pnpm.io/) 12.14 o superior (versión fijada en `package.json`).

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/SebaCats/recursos_humanos.git
cd recursos_humanos

# 2. Instalar dependencias
pnpm install

# 3. Iniciar en modo desarrollo (reinicio automático)
pnpm run dev

# o en modo normal
pnpm run run
```

La aplicación queda disponible en **http://localhost:3000**.

### Inicio de sesión

El formulario de `/login` **no valida credenciales**: cualquier envío crea la sesión y redirige al resumen. Los campos del formulario tampoco tienen atributo `name`, por lo que el servidor no recibe sus valores. Para cerrar sesión, usa el botón **Cerrar sesión** o visita `/logout`.

## Scripts disponibles

| Comando        | Descripción                                         |
| -------------- | --------------------------------------------------- |
| `pnpm run dev` | Inicia el servidor con `node --watch` (desarrollo).  |
| `pnpm run run` | Inicia el servidor con `node app.js`.                |
| `pnpm test`    | Placeholder; aún no hay pruebas implementadas.       |

## Rutas

| Método | Ruta                             | Protegida | Descripción                                                   |
| ------ | -------------------------------- | --------- | ------------------------------------------------------------- |
| GET    | `/`                              | Sí        | Renderiza el resumen (misma vista que `/resumen`).             |
| GET    | `/resumen`                       | Sí        | Panel ejecutivo de Recursos Humanos.                          |
| GET    | `/directorio`                    | Sí        | Directorio de empleados.                                      |
| GET    | `/login`                         | No        | Sirve `public/login.html`; si hay sesión redirige a `/`.      |
| POST   | `/login`                         | No        | Crea la sesión (sin validación real de credenciales).         |
| GET    | `/logout`                        | No        | Destruye la sesión y redirige a `/login`.                     |
| GET    | `/api/empleadosByDepartamento`   | Sí        | Proxy hacia el backend de empleados por departamento.         |
| GET    | `/api/totalSalario`              | Sí        | Proxy hacia el backend del coste total de nómina.             |
| GET    | `*`                              | —         | Página 404 independiente.                                     |

Las rutas privadas usan el middleware `protegerRuta` de `app.js`: si no existe `req.session.usuarioLogeado`, las páginas redirigen a `/login` y las rutas `/api/*` responden `401` con un JSON de error.

## Estructura del proyecto

```
recursos_humanos/
├── app.js                    # Express: sesión, rutas, proxy de API y errores
├── package.json
├── pnpm-lock.yaml
├── README.md
├── pages/                    # Vistas EJS (carpeta configurada como views)
│   ├── index.ejs             # Layout principal (sidebar, header, contenido)
│   ├── resumen.ejs           # Vista del panel + scripts de gráficas y KPIs
│   ├── directorio.ejs        # Vista del directorio
│   └── 404.ejs               # Página 404 completa e independiente
└── public/                   # Archivos estáticos servidos en la raíz
    ├── login.html            # Formulario de login
    ├── css/
    │   └── styles.css        # Estilos y utilidades propias
    ├── js/
    │   ├── graficas.js       # Inicialización de Chart.js (solo en resumen)
    │   └── resumen.js        # Consumo de la API y render de KPIs (solo en resumen)
    └── static/
        └── search.svg        # Icono del buscador (servido en /static)
```

El layout `pages/index.ejs` recibe la variable `vista` y la inyecta con `<%- include(vista) %>`; por eso `app.js` pasa `vista: 'resumen'` o `vista: 'directorio'`. La página 404 no usa el layout: es un documento HTML completo.

## API y proxy

El navegador ya no llama directamente al backend: consume rutas relativas del mismo origen y Express las reenvía al servicio de datos configurado en `API_URL` (por defecto **http://localhost:4000**).

```
Navegador → GET /api/... → Express (proxy) → API_URL/...
```

| Ruta consumida por el frontend        | Destino en el backend             | Respuesta esperada                                  |
| ------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `GET /api/empleadosByDepartamento`    | `GET /empleadosByDepartamento`    | `[{ "nombre": "Tecnología", "cantidad": 75 }, ...]` |
| `GET /api/totalSalario`               | `GET /totalSalario`               | `{ "total": 707678740 }`                            |

- Si el backend no está disponible, el proxy responde con un error 500 y el frontend mantiene los valores estáticos del HTML, registrando el fallo en la consola.
- La URL del backend se configura con la variable de entorno `API_URL`; si no se define, se usa `http://localhost:4000`. El proyecto no carga `.env` automáticamente, así que la variable debe existir en el entorno del proceso.
- Las rutas de API están protegidas por sesión y responden `401 JSON` si no hay sesión.

## Flujo de autenticación

1. `GET /login` sirve `public/login.html` (o redirige a `/` si ya hay sesión).
2. `POST /login` marca `req.session.usuarioLogeado = true` y redirige a `/`.
3. `protegerRuta` deja pasar las peticiones con sesión; sin sesión, las páginas redirigen a `/login` y las rutas `/api/*` responden `401 JSON`.
4. `GET /logout` destruye la sesión y vuelve al login.

## Limitaciones conocidas y próximos pasos

- **Seguridad:** la clave de sesión (`secret`) está escrita en `app.js`; debe moverse a una variable de entorno (`.env`) antes de desplegar.
- **Autenticación:** `POST /login` no valida usuario ni contraseña; hay que conectarlo a una base de datos o proveedor de identidad.
- **Sesiones:** el almacén por defecto de `express-session` es en memoria, no apto para producción.
- **Datos:** los empleados del directorio y los indicadores están codificados en las plantillas; falta conectarlos a la API.
- **Interfaz:** "Añadir empleado", "Exportar", "Columnas", filtros y paginación son elementos visuales sin lógica.
- **Pruebas:** no hay suite de tests configurada (`pnpm test` es un placeholder).

## Licencia

Distribuido bajo la licencia **ISC**. Consulta el campo `license` de `package.json`.
