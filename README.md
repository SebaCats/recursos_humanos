# Horizon · Recursos Humanos

Panel web de administración de Recursos Humanos construido con **HTML5**, **CSS**, **JavaScript** y **Bootstrap 5**. Incluye un resumen ejecutivo con indicadores y gráficas, un directorio de empleados y un formulario de inicio de sesión conectado a un backend mediante sesiones con cookies.

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
- **Inicio de sesión** (`login.html`) conectado a la API del backend.
- **Validación de sesión** en las páginas del panel mediante `js/auth.js`.
- **Página 404** (`404.html`) independiente.
- **Estilos propios** sobre Bootstrap en `css/styles.css`.
- **Sin proceso de build**: son archivos estáticos que se pueden abrir o servir directamente.

## Stack tecnológico

| Tecnología    | Uso                                              |
| ------------- | ------------------------------------------------ |
| HTML5         | Estructura de las páginas                        |
| CSS3          | Estilos propios en `css/styles.css`              |
| JavaScript    | Interacción, autenticación y actualización del DOM |
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
│   ├── auth.js         # Comprueba la sesión antes de mostrar el panel
│   ├── login.js        # Envía las credenciales al backend
│   ├── graficas.js     # Inicialización de Chart.js (solo en el resumen)
│   └── resumen.js      # Consumo de la API y actualización de KPIs
├── static/
│   └── search.svg      # Icono del buscador
└── README.md
```

Algunas rutas de recursos y redirecciones parten de la raíz del dominio (`/`). La autenticación y los datos también apuntan actualmente a `http://localhost:3000`; para desplegar el frontend en otro dominio o subdirectorio, actualiza esas URLs y redirecciones en `js/auth.js`, `js/login.js` y `js/resumen.js`.

## Uso local

No hay dependencias que instalar para visualizar el frontend. Sirve la carpeta con cualquier servidor estático:

```bash
# Opción 1: Node.js
npx serve .

# Opción 2: Python
python -m http.server 8080
```

Sirve el frontend en un origen distinto al backend (por ejemplo, `http://localhost:8080`) y deja el backend disponible en `http://localhost:3000`. Abre `index.html`, `resumen.html` o `directorio.html` desde el servidor estático. El backend debe permitir solicitudes CORS desde el origen del frontend y el envío de credenciales (`credentials: include`).

No abras las páginas con doble clic (`file://`): la sesión y las llamadas a la API requieren que el frontend se sirva por HTTP. Sin un backend disponible, la validación de sesión redirige al inicio de sesión y las peticiones de datos no se completan.

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

`js/resumen.js` consume estas rutas del backend:

```text
GET http://localhost:3000/api/empleadosByDepartamento  ->  [{ "nombre": "Tecnología", "cantidad": 75 }, ...]
GET http://localhost:3000/api/totalSalario             ->  { "total": 707678740 }
```

Ambas solicitudes envían las cookies de sesión. Si fallan, el error se registra en la consola y se mantienen los valores estáticos del HTML.

## Integración con un backend

Este repositorio contiene únicamente el frontend estático. La integración actual espera que el backend esté en `http://localhost:3000` y exponga:

| Método | Ruta | Comportamiento esperado |
| ------ | ---- | ----------------------- |
| `POST` | `/api/login` | Recibe `{ "usuario": "...", "password": "..." }`, valida las credenciales y establece una cookie de sesión. |
| `GET` | `/api/check-session` | Responde exitosamente si la cookie corresponde a una sesión válida; de lo contrario, devuelve un estado no exitoso (por ejemplo, `401`). |
| `GET` | `/api/empleadosByDepartamento` | Devuelve los empleados agrupados por departamento. |
| `GET` | `/api/totalSalario` | Devuelve el total de salarios. |

Para conectarlo:

1. Sirve esta carpeta con un servidor estático, por ejemplo `express.static` o equivalente.
2. Configura CORS en el backend para permitir el origen exacto del frontend y el envío de credenciales. La cookie de sesión debe tener atributos compatibles con el entorno, incluidos `SameSite` y `Secure`.
3. Protege las rutas de datos con la misma sesión utilizada por `/api/check-session`.
4. Si el backend no está en `http://localhost:3000`, cambia la URL en `js/auth.js`, `js/login.js` y `js/resumen.js`. Ajusta también las rutas absolutas de redirección (`/login.html` e `/index.html`) si el sitio no se publica en la raíz del dominio.

El backend anterior usaba EJS y servía `pages/` y `public/`; debe servir los `.html` de este proyecto directamente.

## Despliegue en GitHub Pages

Al ser un sitio estático, se puede publicar directamente:

1. Sube el contenido a la rama configurada para Pages (por ejemplo, `main`).
2. En **Settings → Pages**, selecciona la rama y la carpeta raíz (`/`).
3. La entrada será `index.html`.

GitHub Pages solo sirve el frontend y no ejecuta la API. Para usar autenticación y cargar datos allí, despliega el backend por separado, configura CORS y cookies para ambos orígenes y actualiza las URLs en los archivos JavaScript. La configuración actual apunta a `localhost`, por lo que no funcionará para visitantes del sitio publicado.

## Limitaciones conocidas

- **Autenticación:** el frontend envía las credenciales y valida la sesión, pero la autenticación real, la creación de la cookie y la autorización dependen del backend.
- **Datos:** los empleados del directorio y la mayoría de los indicadores están codificados en el HTML.
- **Interfaz:** "Añadir empleado", "Exportar", "Columnas", filtros y paginación son elementos visuales sin lógica.
- **API:** las llamadas requieren un backend disponible en `http://localhost:3000` (o la URL configurada) y CORS con credenciales cuando frontend y backend tienen orígenes distintos.
- **Duplicación de layout:** al no haber motor de plantillas, la barra lateral y el header se repiten en `index.html`, `resumen.html` y `directorio.html`.

## Licencia

Distribuido bajo la licencia **ISC**.
