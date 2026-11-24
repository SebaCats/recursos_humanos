# Horizon · Recursos Humanos

> **Demo / Despliegue en Vercel:** [https://nexo-erp.vercel.app](https://recursoshumanos-gilt.vercel.app/login.html)

> Copia de despliegue: consulta `../README.md` para Vercel y la API. La base del API se configura en `js/config.js` (vacía en Vercel, `http://localhost:3000` en local); `vercel.json` proxya las rutas al backend.

Panel web de administración de Recursos Humanos construido con **HTML5**, **CSS**, **JavaScript** y **Bootstrap 5**. Incluye un resumen ejecutivo con indicadores y gráficas, un directorio de empleados y autenticación mediante **cookie de sesión HttpOnly** emitida por el backend.

> **Proyecto en desarrollo:** el frontend consume autenticación, catálogos, reportes, directorio (con paginación y filtros), detalle de empleado y alta. Quedan como elementos visuales el filtro de estado, "Exportar", "Columnas" y las secciones de decisiones/actividad.

## Estado actual

| Área | Estado |
| ---- | ------ |
| Login, logout y verificación de sesión (`/login`, `/logout`, `/check-session`) | Terminado |
| Endpoints de datos y reportes (`/api/*`) | Terminado |
| Resumen | Conectado a `/api/resumen`, evolución, distribución, nómina y tablas de apoyo reales |
| Directorio | Conectado a `GET /employee/getPage`, paginación, catálogos, filtros y detalle por id |
| Formulario de alta | Conectado a `POST /employee/create` con catálogos dinámicos |
| Formulario de login | Conectado al backend real |
| Cambio de contraseña | Conectado a `POST /employee/change-password` desde el resumen y el directorio |

## Características

**Resumen** (`index.html`):
- Página de entrada del panel.
- Plantilla activa y cobertura desde `GET /api/resumen`; nómina desde `GET /api/totalSalario`.
- Gráfica de altas y plantilla activa con Chart.js: en la vista mensual las altas son barras y la plantilla acumulada una línea; en la semanal se muestran solo las altas por día. El botón “Ver semana actual” / “Ver 12 meses” alterna entre `GET /api/evolucionContratacionesSemanal` (7 días, lunes a domingo) y `GET /api/evolucionContrataciones` (12 meses). El cliente completa los periodos sin altas con 0.
- Distribución por departamento, sedes, roles y tipos de contrato desde `/api/*`.
- Nómina por departamento construida con `GET /api/salarioByDepartamento`; el coste previsto usa `GET /api/nomina` y cae al salario vigente si no hay cierre.
- Rotación, ausentismo, contratos por vencer, bandeja de decisiones, actividad reciente y próximo hito alimentados por `/api/rotacion`, `/api/ausentismo`, `/api/contratosPorVencer`, `/api/decisiones`, `/api/actividad` y `/api/hitos`.

**Directorio** (`directorio.html`):
- Tarjetas de indicadores alimentadas por `/api/resumen`, `/api/evolucionContrataciones`, `/api/empleadosBySede`, `/api/contratosPorVencer` y `/api/expedientes`.
- Buscador que filtra por nombre, correo o ID, más filtros funcionales de departamento, sede y contrato. Buscar o filtrar reinicia la paginación.
- Tabla paginada (10 filas por página) cargada desde `GET /employee/getPage`; al pulsar un nombre se consulta `GET /employee/getById/:id`. Si el backend aún no tiene ese endpoint, se usa `GET /employee/getAll` y se pagina en el cliente.
- Modal "Añadir empleado" con sedes, departamentos, tipos de contrato y puestos cargados desde `GET /api/catalogos`. Envía `POST /employee/create` y muestra la contraseña temporal.

**Inicio de sesión** (`login.html`):
- Envía las credenciales a `POST /login`.
- El backend responde con una cookie de sesión `HttpOnly`; el frontend no manipula el token.
- Redirige al panel y muestra el mensaje del backend si las credenciales fallan.

**Cambio de contraseña** (modal en `index.html` y `directorio.html`):
- El botón de la barra lateral abre un formulario con contraseña actual, nueva y confirmación.
- `js/password.js` valida los campos (mínimo 8 caracteres y coincidencia) y envía `POST /employee/change-password` mediante `window.HORIZON_API`.
- La cuenta se toma de la cookie de sesión en el backend; el formulario solo envía las contraseñas. Muestra el error del backend si la contraseña actual es incorrecta y un aviso cuando el cambio se aplica.

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
│   ├── password.js     # Valida y envía el formulario de cambio de contraseña
│   ├── directorio.js   # Carga la tabla y envía el formulario de alta
│   ├── graficas.js     # Inicialización de Chart.js (solo en el resumen)
│   └── resumen.js      # Consumo de los endpoints de datos y actualización de KPIs
├── static/
│   └── search.svg      # Icono del buscador
└── README.md
```

Las rutas de recursos y las redirecciones son relativas, por lo que el frontend funciona tanto en la raíz del dominio como en un subdirectorio. En esta copia las llamadas al API usan `window.HORIZON_API_BASE` (`js/config.js`): en local apuntan a `http://localhost:3000` y en Vercel son relativas, resueltas por `vercel.json`. Todas las peticiones pasan por `window.HORIZON_API` (`js/api.js`), así que no hace falta editar `js/auth.js`, `js/login.js`, `js/password.js`, `js/resumen.js` ni `js/directorio.js` al cambiar de entorno.

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

Todas las peticiones pasan por `window.HORIZON_API` (`js/api.js`) y envían la cookie de sesión. En local usan `http://localhost:3000`; en Vercel son relativas y `vercel.json` las proxya al backend.

Endpoints consumidos por el panel:

```text
GET /api/resumen                     -> { totalEmployees, totalContracts, totalDepartments, totalSedes, averageSalary }
GET /api/totalSalario                -> { "total": 2070000 }
GET /api/empleadosByDepartamento     -> [{ "nombre": "Tecnología", "cantidad": 1 }, ...]
GET /api/empleadosBySede             -> [{ "nombre": "NORTH", "cantidad": 1 }, ...]
GET /api/empleadosByRole             -> [{ "nombre": "GUEST", "cantidad": 2 }, ...]
GET /api/empleadosByContractType     -> [{ "nombre": "Indefinido", "cantidad": 1 }, ...]
GET /api/salarioByDepartamento       -> [{ "nombre": "Tecnología", "sede": "SOUTH", "total": 1200000 }, ...]
GET /api/evolucionContrataciones          -> [{ "mes": "2026-11", "cantidad": 6, "plantilla": 5 }, ...] (12 meses; altas del mes y plantilla acumulada)
GET /api/evolucionContratacionesSemanal   -> [{ "fecha": "2026-11-23", "cantidad": 1 }, ...] (7 días de lunes a domingo)
GET /api/catalogos                   -> { roles, sedes, departments, contractTypes, positions }
GET /api/rotacion                    -> { total, tasa, variacion, empleados }
GET /api/ausentismo                  -> { empleados, plantilla, dias, tasa }
GET /api/contratosPorVencer          -> { cantidad, lista: [{ nombre, departamento, fecha, dias }] }
GET /api/decisiones                  -> { cantidad, lista: [{ id, type, title, empleado, responsable, vence, status }] }
GET /api/actividad                   -> [{ id, actor, action, entity, entity_id, fecha }]
GET /api/hitos                       -> { title, description, fecha, owner } | null
GET /api/nomina                      -> { period, total, status }
GET /api/expedientes                 -> { porcentaje, completos, total, pendientes }
GET /employee/getAll                 -> { "employees": [...] }
GET /employee/getPage?page=1&limit=10&q=&department=&sede=&contract_type=
                                     -> { "employees": [...], "pagination": { "page": 1, "limit": 10, "total": 23, "totalPages": 3 } }
GET /employee/getById/:id            -> { "employee": {...} }
POST /employee/create                -> { "result": { "temporaryPassword": "..." } }
POST /employee/change-password       -> { "message": "Contraseña actualizada" }
                                        body: { "currentPassword": "...", "newPassword": "..." }
```

`js/api.js` normaliza ambas series: la mensual a 12 meses y la semanal a 7 días (lunes a domingo), añadiendo `cantidad: 0` donde no hay contratos. Así la gráfica y el indicador de incorporaciones usan siempre periodos completos.

Si alguna petición falla se registra en consola; las secciones afectadas muestran guiones o valores vacíos en lugar de datos inventados. Si falla la evolución, la gráfica se pinta en cero y el detalle indica que no se pudo cargar.

| Elemento | ID | Archivo que lo actualiza |
| -------- | -- | ------------------------ |
| Plantilla activa y detalle | `plantillaActiva`, `plantillaDetalle` | `js/resumen.js` |
| Total de nómina | `totalNomina`, `nominaDetalle` | `js/resumen.js` |
| Rotación y ausentismo | `rotacionValor`, `rotacionDetalle`, `ausentismoValor`, `ausentismoDetalle` | `js/resumen.js` |
| Barras por departamento | `progressDiv` | `js/resumen.js` |
| Nómina por departamento | `nominaPorDepartamento` | `js/resumen.js` |
| Distribución por sede/rol/contrato | `distribucionDetalle` | `js/resumen.js` |
| Gráfica de altas y plantilla | `myChart`, `evolucionDetalle`, `evolucionSubtitulo`, `btnPeriodoEvolucion` | `js/graficas.js` + `js/resumen.js` |
| Bandeja y actividad | `decisionesBody`, `decisionesDetalle`, `actividadLista`, `actividadDetalle` | `js/resumen.js` |
| Próximo hito | `proximoHito`, `proximoHitoDetalle` | `js/resumen.js` |
| KPIs del directorio | `directorioPersonasActivas`, `directorioCobertura`, `directorioIncorporaciones`, `directorioContratosVencer`, `directorioExpedientesCompletos` | `js/directorio.js` |
| Filtros y catálogos | `listaFiltro*`, `selectorSede`, `selectorDepartamento`, `selectorContrato`, `listaPuestos` | `js/directorio.js` |
| Paginación del directorio | `paginacionEmpleados`, `directorioPaginadoText` | `js/directorio.js` |
| Detalle de empleado | `detalleEmpleado` | `js/directorio.js` |

---

## Integración con el Backend

El frontend espera que el backend esté ejecutándose en `http://localhost:3000`.

### Endpoints terminados

| Método | Ruta | Comportamiento |
| ------ | ---- | -------------- |
| `POST` | `/login` | Recibe `{ "email": "...", "password": "..." }`. Responde `200 OK` y establece la cookie `session-token` (`HttpOnly`, `SameSite=Strict`). |
| `POST` | `/logout` | Elimina la cookie y responde `200 OK`. |
| `GET` | `/check-session` | Devuelve `200 OK` con `{ "user": ... }` si la cookie contiene un JWT válido; `401` si no hay sesión. |
| `GET` | `/api/empleadosByDepartamento` | `[{ "nombre": "...", "cantidad": 75 }, ...]`. Alimenta las barras del resumen. |
| `GET` | `/api/totalSalario` | `{ "total": 707678740 }`. Suma de salarios; `0` si no hay contratos. |
| `GET` | `/api/resumen` | Totales de empleados, contratos, departamentos, sedes y salario promedio. |
| `GET` | `/api/empleadosBySede`, `/api/empleadosByRole`, `/api/empleadosByContractType` | Conteos con `{ nombre, cantidad }` para KPIs y distribución. |
| `GET` | `/api/salarioByDepartamento` | `[{ nombre, sede, total }]`. Nómina agrupada por departamento y sede. |
| `GET` | `/api/evolucionContrataciones` | `[{ mes, cantidad, plantilla }]` de los últimos 12 meses. `js/api.js` garantiza la serie continua y reconstruye la plantilla si el backend no la envía. |
| `GET` | `/api/evolucionContratacionesSemanal` | `[{ fecha, cantidad }]` de lunes a domingo de la semana actual. Lo consume el botón de la gráfica. |
| `GET` | `/api/catalogos` | Roles, sedes, departamentos, tipos de contrato y puestos para el formulario y filtros. |
| `GET` | `/employee/getAll` | `{ "employees": [...] }` con los datos completos del contrato, departamento, sede y rol. |
| `GET` | `/employee/getPage` | Página del directorio con `{ "employees": [...], "pagination": { page, limit, total, totalPages } }`. Acepta `page`, `limit`, `q`, `department`, `sede` y `contract_type`. |
| `GET` | `/employee/getById/:id` | `{ "employee": {...} }`. Alimenta el modal de detalle. |
| `POST` | `/employee/create` | Alta de empleado y contrato. Si no se envía `password`, la respuesta incluye `result.temporaryPassword`. |
| `POST` | `/employee/change-password` | Recibe `{ "currentPassword": "...", "newPassword": "..." }`. Verifica la contraseña actual de la sesión, guarda el hash de la nueva y responde `{ "message": "Contraseña actualizada" }`. `400` si la actual es incorrecta o la nueva no es válida. |

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

- **Datos:** el resumen, la gráfica de altas, el directorio, los catálogos y el alta usan datos reales. Las tarjetas de rotación/ausentismo, la bandeja de decisiones y la actividad reciente siguen siendo ejemplos (la BD no registra bajas ni ausencias).
- **Directorio:** la paginación y los filtros de departamento, sede y contrato funcionan; el filtro de estado, "Exportar" y "Columnas" siguen siendo elementos visuales.
- **Contratos:** la BD no tiene fecha de vencimiento, por lo que la tarjeta "Contratos próximos a vencer" no se calcula desde la API.
- **API:** requiere que el backend esté disponible en `http://localhost:3000` (o la URL configurada) con CORS y credenciales habilitados.
- **Sesión:** la cookie es `HttpOnly`, por lo que el frontend no puede leerla; el estado se consulta con `/check-session`.
- **Duplicación de layout:** al no utilizar un motor de plantillas en el frontend, la barra lateral y la cabecera se repiten entre `index.html` y `directorio.html`.

---

### Integrantes del proyecto

| Nombre | Rol |
| :--- | :--- |
| Guillermo Sepúlveda | Diseño UI/UX |
| Rodrigo Ruiz | Interactividad / JS |
| Fernando Alvarado | Jefe Proyecto |

---

## Licencia

Distribuido bajo la licencia **ISC**.
