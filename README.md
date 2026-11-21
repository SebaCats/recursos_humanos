# Horizon · Recursos Humanos

> Copia de despliegue: consulta `../README.md` para Vercel y la API. La base del API se configura en `js/config.js` (vacía en Vercel, `http://localhost:3000` en local); `vercel.json` proxya las rutas al backend.

Panel web de administración de Recursos Humanos construido con **HTML5**, **CSS**, **JavaScript** y **Bootstrap 5**. Incluye un resumen ejecutivo con indicadores y gráficas, un directorio de empleados y autenticación mediante **cookie de sesión HttpOnly** emitida por el backend.

> **Proyecto en desarrollo:** el frontend ya consume la autenticación, el resumen, el directorio y el alta de empleados. Quedan como elementos visuales la gráfica de evolución, los filtros avanzados, la paginación y las acciones de exportar/columnas.

## Estado actual

| Área | Estado |
| ---- | ------ |
| Login, logout y verificación de sesión (`/login`, `/logout`, `/check-session`) | Terminado |
| Endpoints de datos (`/api/empleadosByDepartamento`, `/api/totalSalario`) | Terminado |
| Resumen | Conectado a la API real para plantilla, distribución por departamento y nómina |
| Directorio | Conectado a `GET /employee/getAll` (búsqueda local incluida) |
| Formulario de alta | Conectado a `POST /employee/create` |
| Formulario de login | Conectado al backend real |

## Características

**Resumen** (`index.html`):
- Página de entrada del panel.
- Tarjetas de KPIs: plantilla activa, rotación, ausentismo y coste de nómina.
- Gráfica de evolución de la plantilla con Chart.js.
- Distribución por departamento construida con `GET /api/empleadosByDepartamento`.
- Bandeja de decisiones y actividad reciente (datos de ejemplo).

**Directorio** (`directorio.html`):
- Tarjetas de indicadores de personal; la plantilla se calcula con `GET /employee/getAll`.
- Buscador que filtra la tabla por nombre, correo o ID.
- Tabla cargada desde la API; los filtros de departamento, sede y estado siguen siendo visuales.
- Modal "Añadir empleado" conectado a `POST /employee/create`; muestra la contraseña temporal cuando el backend la genera.

**Inicio de sesión** (`login.html`):
- Envía las credenciales a `POST /login`.
- El backend responde con una cookie de sesión `HttpOnly`; el frontend no manipula el token.
- Redirige al panel y muestra el mensaje del backend si las credenciales fallan.

**Validación de sesión**:
- Controlada en las páginas del panel (`index.html` y `directorio.html`) mediante `js/auth.js`.
- Consulta `GET http://localhost:3000/check-session` enviando la cookie con `credentials: 'include'`.
- Si la sesión no es válida, redirige a `login.html`. El contenido se oculta con `visibility` para no romper el layout `d-flex` del `body`.

**Cierre de sesión**:
- El enlace "Cerrar sesión" (`data-logout`) envía `POST /logout`.
- El backend elimina la cookie y el frontend vuelve a `login.html`.

**Página 404** (`404.html`) independiente.

**Estilos propios** sobre Bootstrap en `css/styles.css`.

**Sin proceso de build**: son archivos estáticos que se pueden abrir o servir directamente.

---

## Stack tecnológico

| Tecnología    | Uso                                                      |
| ------------- | -------------------------------------------------------- |
| HTML5         | Estructura de las páginas                                |
| CSS3          | Estilos propios en `css/styles.css`                      |
| JavaScript    | Interacción, sesión por cookie y manejo del DOM          |
| Bootstrap 5.3 | Maquetación y componentes (vía CDN)                      |
| Chart.js      | Gráficas del resumen (vía CDN)                           |

---

## Estructura del proyecto

```text
recursos_humanos/
├── index.html          # Entrada del panel y vista de resumen
├── directorio.html     # Directorio de empleados
├── login.html          # Formulario de inicio de sesión
├── 404.html            # Página de error independiente
├── css/
│   └── styles.css      # Estilos y utilidades propias
├── js/
│   ├── api.js          # Cliente único: fetch con credenciales, JSON y errores 401
│   ├── auth.js         # Valida la cookie de sesión antes de mostrar el panel y gestiona el logout
│   ├── login.js        # Envía credenciales al backend e inicia la sesión
│   ├── directorio.js   # Carga la tabla y envía el formulario de alta
│   ├── graficas.js     # Inicialización de Chart.js (solo en el resumen)
│   └── resumen.js      # Consumo de los endpoints de datos y actualización de KPIs
├── static/
│   └── search.svg      # Icono del buscador
└── README.md
```

Las rutas de recursos y las redirecciones son relativas, por lo que el frontend funciona tanto en la raíz del dominio como en un subdirectorio. En esta copia las llamadas al API usan `window.HORIZON_API_BASE` (`js/config.js`): en local apuntan a `http://localhost:3000` y en Vercel son relativas, resueltas por `vercel.json`. Todas las peticiones pasan por `window.HORIZON_API` (`js/api.js`), así que no hace falta editar `js/auth.js`, `js/login.js`, `js/resumen.js` ni `js/directorio.js` al cambiar de entorno.

---

## Uso local

No hay dependencias que instalar para visualizar el frontend. Sirve la carpeta con cualquier servidor estático:

```bash
# Opción 1: Node.js
npx serve . -l 5500

# Opción 2: Python
python -m http.server 5500
```

Sirve el frontend en `http://localhost:5500` y deja el backend disponible en `http://localhost:3000`. Abre `index.html` o `directorio.html` desde el servidor estático. El backend debe permitir solicitudes CORS desde el origen del frontend con credenciales (por defecto acepta `http://localhost:5500` y `http://127.0.0.1:5500`).

No abras las páginas con doble clic (`file://`): la validación de sesión y las llamadas a la API requieren que el frontend se sirva por HTTP. Sin un backend disponible, la validación redirige a `login.html` al no poder verificar la cookie.

---

## Autenticación por cookie de sesión

El backend emite una cookie `session-token` con las marcas `HttpOnly` y `SameSite=Strict` (vigencia de 1 hora). El frontend no lee ni guarda el token en `localStorage`: el navegador envía la cookie automáticamente gracias a `credentials: 'include'`.

1. **Inicio de sesión (`js/login.js`)**:
   - Envía `POST http://localhost:3000/login` con `{ email, password }`.
   - Si la respuesta es exitosa (`200 OK`), el backend establece la cookie de sesión y el frontend redirige a `index.html`.
   - Si falla, muestra el campo `message` de la respuesta (por ejemplo, credenciales incorrectas).

2. **Verificación de sesión (`js/auth.js`)**:
   - Al cargar el panel, envía `GET http://localhost:3000/check-session` con `credentials: 'include'`.
   - Si responde `200 OK` con `{ "user": ... }`, muestra el contenido y registra el usuario autenticado en la consola.
   - Si responde `401` o hay un error de red, redirige a `login.html`.

3. **Cierre de sesión**:
   - El enlace con `data-logout` envía `POST http://localhost:3000/logout` con `credentials: 'include'`.
   - El backend invalida la sesión y elimina la cookie; el frontend redirige a `login.html`.

---

## Datos dinámicos

El resumen consume estos endpoints con la cookie de sesión (protegidos por JWT):

```text
GET http://localhost:3000/api/empleadosByDepartamento  ->  [{ "nombre": "Tecnología", "cantidad": 75 }, ...]
GET http://localhost:3000/api/totalSalario             ->  { "total": 707678740 }
```

Si alguna petición falla, el error se registra en la consola y se conservan los valores de ejemplo del HTML.

Elementos que se actualizarán cuando la API esté disponible:

| Elemento | ID | Archivo que lo actualiza |
| -------- | -- | ------------------------ |
| Plantilla activa | `plantillaActiva` | `js/resumen.js` |
| Total de nómina | `totalNomina` | `js/resumen.js` |
| Texto de plantilla | `totalPlantillaText` | `js/resumen.js` |
| Barras por departamento | `progressDiv` | `js/resumen.js` |
| Gráfica de evolución | `myChart` | `js/graficas.js` |

---

## Integración con el Backend

El frontend espera que el backend esté ejecutándose en `http://localhost:3000`.

### Endpoints terminados

| Método | Ruta | Comportamiento |
| ------ | ---- | -------------- |
| `POST` | `/login` | Recibe `{ "email": "...", "password": "..." }`. Responde `200 OK` y establece la cookie `session-token` (`HttpOnly`, `SameSite=Strict`). |
| `POST` | `/logout` | Elimina la cookie y responde `200 OK`. |
| `GET` | `/check-session` | Devuelve `200 OK` con `{ "user": ... }` si la cookie contiene un JWT válido; `401` si no hay sesión. |
| `GET` | `/api/empleadosByDepartamento` | Devuelve `[{ "nombre": "...", "cantidad": 75 }, ...]` con los contratos agrupados por departamento. |
| `GET` | `/api/totalSalario` | Devuelve `{ "total": 707678740 }` con la suma de salarios; `0` si no hay contratos. |
| `GET` | `/employee/getAll` | Devuelve `{ "employees": [{ "name": "...", "email": "..." }] }`. Alimenta la tabla del directorio. |
| `POST` | `/employee/create` | Alta de empleado y contrato. Si no se envía `password`, la respuesta incluye `temporaryPassword`. |

Todas las rutas anteriores, salvo `/login` y `/logout`, requieren sesión válida. `vercel.json` las proxya al backend con una sola regla y les aplica `Cache-Control: no-store`.

---

## Despliegue en GitHub Pages

Al ser un sitio estático, se puede publicar directamente:

1. Sube el contenido a la rama configurada para Pages (por ejemplo, `main`).
2. En **Settings → Pages**, selecciona la rama y la carpeta raíz (`/`).
3. La página de entrada será `index.html`.

> **Nota:** GitHub Pages solo sirve archivos estáticos. La autenticación por cookie requiere desplegar el backend por separado y configurar CORS con credenciales. Si frontend y backend quedan en dominios distintos, la cookie debe usar `SameSite=None; Secure` y ambos deben servirse por HTTPS.

---

## Limitaciones conocidas

- **Datos:** el resumen, la tabla del directorio y el alta usan datos reales; la gráfica de evolución y las tarjetas de rotación/ausentismo siguen siendo ejemplos.
- **Directorio:** `/employee/getAll` todavía solo devuelve `name` y `email`, por lo que las columnas de departamento, puesto, sede y contrato aparecen como `—` hasta que el backend las incluya.
- **Interfaz:** "Exportar", "Columnas", los filtros por departamento/sede/estado y la paginación siguen siendo elementos visuales.
- **API:** requiere que el backend esté disponible en `http://localhost:3000` (o la URL configurada) con CORS y credenciales habilitados.
- **Sesión:** la cookie es `HttpOnly`, por lo que el frontend no puede leerla; el estado se consulta con `/check-session`.
- **Duplicación de layout:** al no utilizar un motor de plantillas en el frontend, la barra lateral y la cabecera se repiten entre `index.html` y `directorio.html`.

---

## Licencia

Distribuido bajo la licencia **ISC**.
