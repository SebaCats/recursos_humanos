# Horizon · Recursos Humanos

Panel web de administración de Recursos Humanos construido con **HTML5**, **CSS**, **JavaScript** y **Bootstrap 5**. Incluye un resumen ejecutivo con indicadores y gráficas, un directorio de empleados y un sistema de autenticación mediante **JSON Web Tokens (JWT)** almacenados en `localStorage`.

> Proyecto en fase de desarrollo: los empleados, indicadores y acciones de la interfaz son de ejemplo.

## Características

**Resumen** (`resumen.html`):
- Tarjetas de KPIs: plantilla activa, rotación, ausentismo y coste de nómina.
- Gráfica de evolución de la plantilla con Chart.js.
- Distribución por departamento actualizada desde la API con JavaScript.
- Bandeja de decisiones y actividad reciente.

**Directorio** (`directorio.html`):
- Tarjetas de indicadores de personal.
- Buscador y filtros por departamento, sede y estado.
- Tabla de empleados con paginación (elementos visuales de ejemplo).

**Inicio de sesión** (`login.html`):
- Formulario conectado a la API de autenticación.
- Almacena el token JWT recibido en `localStorage`.

**Validación de sesión**:
- Controlada en las páginas del panel mediante `js/auth.js`.
- Envía el token JWT en el encabezado `Authorization: Bearer <token>` al endpoint `/api/check-session`.

**Página 404** (`404.html`) independiente.

**Estilos propios** sobre Bootstrap en `css/styles.css`.

**Sin proceso de build**: son archivos estáticos que se pueden abrir o servir directamente.

---

## Stack tecnológico

| Tecnología    | Uso                                               |
| ------------- | ------------------------------------------------- |
| HTML5         | Estructura de las páginas                         |
| CSS3          | Estilos propios en `css/styles.css`               |
| JavaScript    | Interacción, autenticación JWT y manejo del DOM   |
| Bootstrap 5.3 | Maquetación y componentes (vía CDN)               |
| Chart.js      | Gráficas del resumen (vía CDN)                    |

---

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
│   ├── auth.js         # Valida el JWT desde localStorage antes de mostrar el panel
│   ├── login.js        # Envía credenciales al backend y guarda el token JWT
│   ├── graficas.js     # Inicialización de Chart.js (solo en el resumen)
│   └── resumen.js      # Consumo de la API con cabecera Authorization y actualización de KPIs
├── static/
│   └── search.svg      # Icono del buscador
└── README.md
```

Algunas rutas de recursos y redirecciones parten de la raíz del dominio (`/`). La autenticación y los datos apuntan actualmente a `http://localhost:3000`; para desplegar el frontend en otro dominio o subdirectorio, actualiza esas URLs y redirecciones en `js/auth.js`, `js/login.js` y `js/resumen.js`.

---

## Uso local

No hay dependencias que instalar para visualizar el frontend. Sirve la carpeta con cualquier servidor estático:

```bash
# Opción 1: Node.js
npx serve .

# Opción 2: Python
python -m http.server 8080
```

Sirve el frontend en un origen distinto al backend (por ejemplo, `http://localhost:8080`) y deja el backend disponible en `http://localhost:3000`. Abre `index.html`, `resumen.html` o `directorio.html` desde el servidor estático. El backend debe permitir solicitudes CORS desde el origen del frontend.

No abras las páginas con doble clic (`file://`): la validación de sesión y las llamadas a la API requieren que el frontend se sirva por HTTP. Sin un backend disponible, la validación de sesión redirige a `login.html` al no detectar un token válido.

---

## Autenticación con JWT

La autenticación se gestiona mediante tokens JWT con el siguiente flujo:

1. **Inicio de sesión (`js/login.js`)**:
   - Envía una petición `POST` a `http://localhost:3000/api/login` con `{ usuario, password }`.
   - Si la respuesta es exitosa (`200 OK`), extrae `data.token` y lo almacena en el almacenamiento local del navegador:
     ```js
     localStorage.setItem('token', data.token);
     ```
   - Redirige al usuario a `/index.html`.

2. **Verificación de sesión (`js/auth.js`)**:
   - Obtiene el token guardado en `localStorage`. Si no existe, redirige inmediatamente a `/login.html`.
   - Realiza una petición `GET` a `http://localhost:3000/api/check-session` incluyendo la cabecera `Authorization`:
     ```js
     headers: {
       'Authorization': `Bearer ${token}`
     }
     ```
   - Si la API responde con un estado no exitoso (ej. `401 Unauthorized`), se remueve el token de `localStorage` y se redirige a `/login.html`.

3. **Cierre de sesión**:
   - Para cerrar sesión basta con eliminar la clave `token` de `localStorage` mediante `localStorage.removeItem('token')` y redirigir a `/login.html`.

---

## Datos dinámicos con JavaScript (DOM)

Cada página incluye el layout completo y su contenido escrito en HTML estático.

Los datos obtenidos desde el backend se inyectan dinámicamente en el DOM:

| Elemento | ID | Archivo que lo actualiza |
| -------- | -- | ------------------------ |
| Plantilla activa | `plantillaActiva` | `js/resumen.js` |
| Total de nómina | `totalNomina` | `js/resumen.js` |
| Texto de plantilla | `totalPlantillaText` | `js/resumen.js` |
| Barras por departamento | `progressDiv` | `js/resumen.js` |
| Gráfica de evolución | `myChart` | `js/graficas.js` |

`js/resumen.js` consume estas rutas del backend adjuntando la cabecera `Authorization: Bearer <token>`:

```text
GET http://localhost:3000/api/empleadosByDepartamento  ->  [{ "nombre": "Tecnología", "cantidad": 75 }, ...]
GET http://localhost:3000/api/totalSalario             ->  { "total": 707678740 }
```

Si las solicitudes fallan o el token no es válido, el error se registra en la consola y se conservan los valores por defecto del HTML.

---

## Integración con el Backend

El frontend espera que el backend esté ejecutándose en `http://localhost:3000` y exponga los siguientes endpoints:

| Método | Ruta | Comportamiento esperado |
| ------ | ---- | ----------------------- |
| `POST` | `/api/login` | Recibe `{ "usuario": "...", "password": "..." }`, valida las credenciales y responde con `{ "mensaje": "...", "token": "<jwt_token>" }`. |
| `GET` | `/api/check-session` | Requiere middleware `protegerRuta` (valida el encabezado `Authorization: Bearer <token>`). Responde `200 OK` si el token es válido; de lo contrario devuelve `401`. |
| `GET` | `/api/empleadosByDepartamento` | Ruta protegida. Devuelve los empleados agrupados por departamento. |
| `GET` | `/api/totalSalario` | Ruta protegida. Devuelve el total acumulado de salarios. |

---

## Despliegue en GitHub Pages

Al ser un sitio estático, se puede publicar directamente:

1. Sube el contenido a la rama configurada para Pages (por ejemplo, `main`).
2. En **Settings → Pages**, selecciona la rama y la carpeta raíz (`/`).
3. La página de entrada será `index.html`.

> **Nota:** GitHub Pages solo sirve archivos estáticos. Para que la autenticación por JWT y los endpoints de datos funcionen, debes desplegar el backend por separado (ej. Render, Railway, Vercel), configurar CORS en el servidor y actualizar la URL base de la API en los scripts de `js/`.

---

## Limitaciones conocidas

- **Datos:** Los empleados del directorio y varios indicadores gráficos están codificados en el HTML como plantilla base.
- **Interfaz:** Las funciones "Añadir empleado", "Exportar", "Columnas", filtros y paginación son elementos visuales sin lógica de backend integrada.
- **API:** Requiere que el backend esté disponible en `http://localhost:3000` (o la URL configurada) habilitando CORS.
- **Duplicación de layout:** Al no utilizar un motor de plantillas en el frontend, la barra lateral y la cabecera se repiten entre los archivos HTML.

---

## Licencia

Distribuido bajo la licencia **ISC**.