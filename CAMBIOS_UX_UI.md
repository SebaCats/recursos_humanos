# Horizon — Cambios UX/UI

## Objetivo

Modernizar la interfaz manteniendo el nombre, la estructura, el azul de identidad, Bootstrap 5 y las funcionalidades conectadas al backend.

## Cambios aplicados

### Sistema visual
- Se centralizaron colores, radios, bordes y sombras mediante variables CSS `--horizon-*`.
- Se unificaron superficies, botones, campos, tablas, dropdowns, modales y resultados de búsqueda.
- Se redujo el peso de las sombras y se mejoró la jerarquía tipográfica.
- Se añadieron estilos para tema oscuro, densidad compacta, foco visible y movimiento reducido.
- Se incorporó Bootstrap Icons en las páginas del panel y acceso.

### Resumen y directorio
- Se añadieron clases de layout compartidas para sidebar, encabezado y contenido.
- Se mejoró el tratamiento responsive del menú lateral y los encabezados.
- Se corrigió la jerarquía semántica de los valores KPI: ya no compiten como múltiples `h1` con el título de página.
- Se añadió una búsqueda móvil funcional al directorio y se corrigió la apertura/cierre de la búsqueda global móvil.
- Se retiraron los enlaces ficticios de pestañas de estado y el botón «Columnas», porque no tenían funcionalidad conectada.
- Se retiró el filtro de estado de muestra que no aplicaba realmente ningún filtro. Los filtros conectados (departamento, sede y contrato) se mantienen.
- Se corrigieron elementos de navegación y etiquetas accesibles.

### Login y página 404
- El login ahora comparte la hoja de estilos de Horizon y conserva el concepto de panel lateral azul.
- Se corrigieron clases de campos, etiquetas, metadatos y estructura responsive.
- Se eliminó la casilla de «Recordar sesión» y el enlace de recuperación que no estaban conectados a una función real.
- Se añadió estado de carga al botón y anuncio accesible de errores.
- La página 404 ahora utiliza la identidad de Horizon y permite volver al inicio del panel.

## Validaciones realizadas

- Parseo HTML de `index.html`, `directorio.html`, `login.html` y `404.html`.
- Comprobación de sintaxis JavaScript con `node --check` en `login.js`, `busqueda.js` y `directorio.js`.
- Comprobación de referencias locales a CSS, JavaScript y recursos desde las páginas HTML.

## Pendiente de validar en entorno real

- Comportamiento visual con datos reales y sesión autenticada.
- Flujo completo de filtros, modales, importación/exportación y permisos con el backend activo.
- Capturas comparativas en Chrome, Firefox y Safari, en escritorio, tablet y móvil.
- La preferencia de idioma inglés aún no traduce las etiquetas del producto; se conserva el comportamiento existente.
