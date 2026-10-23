# Horizon · Recursos Humanos

Panel web de administración de Recursos Humanos construido con **Express**, **EJS** y **Bootstrap 5**. Incluye un resumen ejecutivo con indicadores y gráficas, un directorio de empleados y un flujo de inicio de sesión basado en sesiones.

> Proyecto en fase de desarrollo: los datos de empleados y varias acciones de la interfaz son de ejemplo.

## Características

- **Inicio de sesión con sesión en servidor** (`express-session`) y middleware de protección de rutas.
- **Resumen** (`/resumen`):
  - Tarjetas de KPIs: plantilla activa, rotación, ausentismo y coste de nómina.
  - Gráfica de evolución de la plantilla con Chart.js.
  - Distribución por departamento calculada dinámicamente desde una API externa.
  - Bandeja de decisiones y actividad reciente.
- **Directorio** (`/directorio`):
  - Tarjetas de indicadores de personal.
  - Buscador y filtros por departamento, sede y estado.
  - Tabla de empleados con paginación (elementos visuales de ejemplo).
- **Página 404** personalizada dentro del layout principal.
- Estilos propios sobre Bootstrap y utilidades de sombra/fondo en `public/styles.css`.

## Stack tecnológico

| Tecnología        | Uso                                              |
| ----------------- | ------------------------------------------------ |
| Node.js           | Entorno de ejecución (ES Modules)                |
| Express 5         | Servidor HTTP y enrutamiento                     |
| EJS 7             | Motor de plantillas del lado del servidor        |
| express-session   | Gestión de sesiones de usuario                   |
| Bootstrap 5.3     | Maquetación y componentes (vía CDN)              |
| Chart.js          | Gráficas (vía CDN)                               |
| pnpm 12           | Gestor de paquetes                               |

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior (probado con Node 24).
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

El formulario de `/login` **no valida credenciales**: cualquier envío crea la sesión y redirige al resumen. Para cerrar sesión, usa el botón **Cerrar sesión** o visita `/logout`.

## Scripts disponibles

| Comando        | Descripción                                        |
| -------------- | -------------------------------------------------- |
| `pnpm run dev` | Inicia el servidor con `node --watch` (desarrollo). |
| `pnpm run run` | Inicia el servidor con `node app.js`.               |
| `pnpm test`    | Placeholder; aún no hay pruebas implementadas.      |

## Rutas

| Método | Ruta          | Protegida | Descripción                                   |
| ------ | ------------- | --------- | --------------------------------------------- |
| GET    | `/`           | Sí        | Redirige al resumen (misma vista que `/resumen`). |
| GET    | `/resumen`    | Sí        | Panel ejecutivo de Recursos Humanos.          |
| GET    | `/directorio` | Sí        | Directorio de empleados.                      |
| GET    | `/login`      | No        | Formulario de inicio de sesión.               |
| POST   | `/login`      | No        | Crea la sesión (sin validación real).         |
| GET    | `/logout`     | No        | Destruye la sesión y redirige a `/login`.     |
| GET    | `*`           | —         | Página 404 personalizada.                     |

Las rutas protegidas usan el middleware `protegerRuta` de `app.js`: si no existe `req.session.usuarioLogeado`, se redirige a `/login`.

## Estructura del proyecto

```
recursos_humanos/
├── app.js                    # Configuración de Express, sesión, rutas y 404
├── package.json
├── pnpm-lock.yaml
├── public/                   # Archivos estáticos servidos en la raíz
│   ├── styles.css            # Estilos y utilidades propias
│   ├── js/
│   │   └── graficas.js       # Inicialización de Chart.js (window.iniciarGraficas)
│   └── utils/
│       └── resumen.js        # Consumo de la API y render de KPIs
└── src/
    ├── index.ejs             # Layout principal (sidebar, header, contenido)
    ├── static/
    │   └── search.svg        # Icono del buscador (servido en /static)
    └── pages/
        ├── resumen.ejs       # Vista del panel ejecutivo
        ├── directorio.ejs    # Vista del directorio
        ├── login.ejs         # Vista independiente del login
        └── 404.ejs           # Contenido de la página 404
```

El layout `src/index.ejs` recibe la variable `vista` y la inyecta con `<%- include(vista) %>`, de modo que cada página solo contiene su contenido principal.

## API de datos externa

La vista de resumen (`public/utils/resumen.js`) consume un backend local en **http://localhost:4000**:

| Endpoint                          | Respuesta esperada                                  |
| --------------------------------- | --------------------------------------------------- |
| `GET /empleadosByDepartamento`    | `[{ "nombre": "Tecnología", "cantidad": 75 }, ...]` |
| `GET /totalSalario`               | `{ "total": 707678740 }`                            |

- Si la API no está disponible, los errores se muestran en la consola del navegador y se conservan los valores estáticos del HTML.
- Las URLs están escritas directamente en el código; para otros entornos conviene moverlas a una variable de entorno y centralizarlas.

## Limitaciones conocidas y próximos pasos

- **Seguridad:** la clave de sesión (`secret`) está escrita en `app.js`; debe moverse a una variable de entorno (`.env`) antes de desplegar.
- **Autenticación:** `POST /login` no valida usuario ni contraseña; hay que conectarlo a una base de datos o proveedor de identidad.
- **Sesiones:** el almacén por defecto de `express-session` es en memoria, no apto para producción.
- **Datos:** los empleados del directorio y los indicadores están codificados en las plantillas; falta conectarlos a la API.
- **Interfaz:** "Añadir empleado", "Exportar", "Columnas", filtros y paginación son elementos visuales sin lógica.
- **Pruebas:** no hay suite de tests configurada (`pnpm test` es un placeholder).

## Licencia

Distribuido bajo la licencia **ISC**. Consulta el campo `license` de `package.json`.
