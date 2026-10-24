# Horizon · Recursos Humanos

Panel web de administración de Recursos Humanos construido con **HTML5**, **CSS**, **JavaScript** y **Bootstrap 5**. Incluye un resumen ejecutivo con indicadores y gráficas, un directorio de empleados y un formulario de login. Los datos de ejemplo se pueden sustituir por datos reales mediante JavaScript (DOM).

> Proyecto en fase de desarrollo: los empleados, indicadores y acciones de la interfaz son de ejemplo.

## Características

- **Resumen** (`resumen.html`):
  - Tarjetas de KPIs: plantilla activa, rotación, ausentismo y coste de nómina.
  - Gráfica de evolución de la plantilla con Chart.js.
  - Distribución por departamento actualizada desde la API con JavaScript.
  - Bandeja de decisiones y actividad reciente.
- **Directorio** (`directorio.html`):
  - Tarjetas de indicadores de personal.
  - Buscador y filtros por departamento, sede y estado.
  - Tabla de empleados con paginación (elementos visuales de ejemplo).
- **Login** (`login.html`) y **página 404** (`404.html`) independientes.
- **Estilos propios** sobre Bootstrap en `css/styles.css`.
- **Sin proceso de build**: son archivos estáticos que se pueden abrir o servir directamente.

## Stack tecnológico

| Tecnología    | Uso                                              |
| ------------- | ------------------------------------------------ |
| HTML5         | Estructura de las páginas                        |
| CSS3          | Estilos propios en `css/styles.css`              |
| JavaScript    | Interacción y actualización del DOM              |
| Bootstrap 5.3 | Maquetación y componentes (vía CDN)              |
| Chart.js      | Gráficas del resumen (vía CDN)                   |

## Estructura del proyecto

```text
recursos_humanos/
├── index.html          # Entrada del panel (mismo contenido que resumen.html)
├── resumen.html        # Panel ejecutivo de Recursos Humanos
├── directorio.html     # Directorio de empleados
├── login.html          # Formulario de inicio de sesión
├── 404.html            # Página de error independiente
├── css/
│   └── styles.css      # Estilos y utilidades propias
├── js/
│   ├── graficas.js     # Inicialización de Chart.js (solo en el resumen)
│   └── resumen.js      # Consumo de la API y actualización de KPIs
├── static/
│   └── search.svg      # Icono del buscador
├── README.md
└── .gitignore
```

Todas las rutas a CSS, JavaScript e imágenes son **relativas**, por lo que el sitio funciona igual en la raíz de un dominio, en un subdirectorio o abierto desde el sistema de archivos.

## Uso local

No hay dependencias que instalar para visualizar el frontend. Sirve la carpeta con cualquier servidor estático:

```bash
# Opción 1: Node.js
npx serve .

# Opción 2: Python
python -m http.server 8080
```

Luego abre `http://localhost:3000` (o `http://localhost:8080`) y navega a `index.html`, `resumen.html` o `directorio.html`.

También puedes abrir `index.html` directamente con doble clic. En ese caso la gráfica funciona, pero las peticiones a `/api/...` fallarán porque no hay servidor ni backend disponible; los valores de ejemplo del HTML permanecen visibles.

## Datos dinámicos con JavaScript (DOM)

La antigua plantilla EJS usaba `<%- include(vista) %>` para inyectar el contenido de `resumen.ejs` o `directorio.ejs` dentro de `index.ejs`. Al convertir el proyecto a HTML estático, **cada página incluye el layout completo y su contenido ya escrito en HTML**. No queda ninguna etiqueta EJS.

Los datos que antes podía inyectar el servidor ahora se actualizan en el navegador. Los puntos de inserción son:

| Elemento | ID | Archivo que lo actualiza |
| -------- | -- | ------------------------ |
| Plantilla activa | `plantillaActiva` | `js/resumen.js` |
| Total de nómina | `totalNomina` | `js/resumen.js` |
| Texto de plantilla | `totalPlantillaText` | `js/resumen.js` |
| Barras por departamento | `progressDiv` | `js/resumen.js` |
| Gráfica de evolución | `myChart` | `js/graficas.js` |

Ejemplo mínimo de inyección manual desde la consola del navegador:

```js
document.getElementById('plantillaActiva').textContent = '320';
document.getElementById('totalNomina').textContent = '$812.400.000';
document.getElementById('totalPlantillaText').textContent = '320 personas - plantilla actual';
```

`js/resumen.js` consume estas rutas relativas al mismo origen:

```text
GET /api/empleadosByDepartamento  ->  [{ "nombre": "Tecnología", "cantidad": 75 }, ...]
GET /api/totalSalario             ->  { "total": 707678740 }
```

Si las peticiones fallan (por ejemplo, al abrir el archivo sin backend), el error se registra en la consola y se mantienen los valores estáticos del HTML.

## Integración con un backend

Este repositorio contiene únicamente el frontend estático. Para conectarlo con el backend de Recursos Humanos:

1. Sirve esta carpeta como raíz de archivos estáticos (`express.static` o equivalente).
2. Publica las rutas `/api/empleadosByDepartamento` y `/api/totalSalario` desde el mismo origen.
3. Si se mantiene la autenticación con sesión, protege esas rutas y sirve `login.html` en `/login`.
4. Ajusta los enlaces de navegación (`resumen.html`, `directorio.html`, `login.html`) a las rutas que exponga el servidor, o configura redirecciones.

El backend anterior usaba EJS y servía `pages/` y `public/`; después de esta reorganización debe apuntar a la raíz del proyecto y servir los `.html` directamente.

## Despliegue en GitHub Pages

Al ser un sitio estático, se puede publicar directamente:

1. Sube el contenido a la rama configurada para Pages (por ejemplo, `main`).
2. En **Settings → Pages**, selecciona la rama y la carpeta raíz (`/`).
3. La entrada será `index.html`.

Ten en cuenta que GitHub Pages no ejecuta las rutas `/api/...`; para que los KPIs se actualicen necesitas desplegar el backend en otro servicio y cambiar las URLs de `js/resumen.js` o poner un proxy delante.

## Limitaciones conocidas

- **Autenticación:** el formulario de login es visual; no valida credenciales ni crea sesión por sí solo.
- **Datos:** los empleados del directorio y la mayoría de los indicadores están codificados en el HTML.
- **Interfaz:** "Añadir empleado", "Exportar", "Columnas", filtros y paginación son elementos visuales sin lógica.
- **API:** las llamadas a `/api/...` requieren un backend o proxy en el mismo origen.
- **Duplicación de layout:** al no haber motor de plantillas, la barra lateral y el header se repiten en `index.html`, `resumen.html` y `directorio.html`.

## Licencia

Distribuido bajo la licencia **ISC**.
