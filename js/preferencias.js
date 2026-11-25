// Preferencias compartidas por index.html y directorio.html.
// El modal existe en ambas páginas; los valores se leen y se escriben en el
// backend y se aplican al documento en el cliente.
(() => {
    const TEMAS = ['CLARO', 'OSCURO', 'SISTEMA']
    const IDIOMAS = ['ES', 'EN']
    const DENSIDADES = ['COMPACTA', 'COMODA']
    const CLAVES = ['tema', 'idioma', 'notificaciones', 'densidad']

    const formulario = document.getElementById('formPreferencias')
    const modal = document.getElementById('modalPreferencias')
    const alerta = document.getElementById('alertaPreferencias')
    const botonGuardar = formulario?.querySelector('button[type="submit"]')

    if (!formulario || !window.HORIZON_API) return

    let actual = null

    function campo(id) {
        return document.getElementById(id)
    }

    function mostrarAlerta(tipo, mensaje) {
        if (!alerta) return
        alerta.className = `alert alert-${tipo}`
        alerta.textContent = mensaje
    }

    function ocultarAlerta() {
        if (!alerta) return
        alerta.className = 'alert d-none'
        alerta.textContent = ''
    }

    function marcar(id, invalido) {
        const elemento = campo(id)
        if (!elemento) return
        if (invalido) elemento.classList.add('is-invalid')
        else elemento.classList.remove('is-invalid')
    }

    function obtenerValor(clave) {
        if (clave === 'notificaciones') return Boolean(campo('prefNotificaciones')?.checked)

        const control = campo(`pref${clave.charAt(0).toUpperCase()}${clave.slice(1)}`)
        const valor = control?.value ?? ''
        const permitidos = clave === 'tema' ? TEMAS : clave === 'idioma' ? IDIOMAS : DENSIDADES
        if (!permitidos.includes(valor)) {
            marcar(control?.id, true)
            return null
        }
        marcar(control?.id, false)
        return valor
    }

    function rellenarFormulario() {
        if (!actual) return

        const tema = campo('prefTema')
        const idioma = campo('prefIdioma')
        const notificaciones = campo('prefNotificaciones')
        const densidad = campo('prefDensidad')

        if (tema) tema.value = actual.tema
        if (idioma) idioma.value = actual.idioma
        if (notificaciones) notificaciones.checked = actual.notificaciones
        if (densidad) densidad.value = actual.densidad

        for (const id of ['prefTema', 'prefIdioma', 'prefDensidad']) marcar(id, false)
    }

    function aplicar(preferencias) {
        const tema = TEMAS.includes(preferencias?.tema) ? preferencias.tema : 'CLARO'
        const idioma = IDIOMAS.includes(preferencias?.idioma) ? preferencias.idioma : 'ES'
        const densidad = DENSIDADES.includes(preferencias?.densidad) ? preferencias.densidad : 'COMODA'
        const notificaciones = preferencias?.notificaciones !== false

        if (tema === 'SISTEMA') document.documentElement.removeAttribute('data-bs-theme')
        else document.documentElement.setAttribute('data-bs-theme', tema === 'OSCURO' ? 'dark' : 'light')

        document.body.classList.toggle('densidad-compacta', densidad === 'COMPACTA')
        document.documentElement.lang = idioma.toLowerCase()

        const estado = campo('estadoNotificaciones')
        if (estado) {
            estado.textContent = `Notificaciones ${notificaciones ? 'activas' : 'desactivadas'} · Idioma ${idioma}`
        }

        actual = { tema, idioma, notificaciones, densidad }
        rellenarFormulario()
    }

    async function cargarPreferencias({ silencioso = false } = {}) {
        try {
            const preferencias = await window.HORIZON_API.getPreferencias()
            aplicar(preferencias)
            return preferencias
        } catch (error) {
            if (error?.status === 401) return null
            console.error('Error al cargar las preferencias:', error)
            if (!silencioso) {
                mostrarAlerta('danger', error?.message ?? 'No se pudieron cargar las preferencias')
            }
            return null
        }
    }

    async function guardar(evento) {
        evento.preventDefault()
        ocultarAlerta()

        if (!actual) {
            mostrarAlerta('danger', 'Aún no se cargaron las preferencias')
            return
        }

        const cambios = {}
        let invalido = false

        for (const clave of CLAVES) {
            const valor = obtenerValor(clave)
            if (valor === null) {
                invalido = true
                continue
            }
            if (valor !== actual[clave]) cambios[clave] = valor
        }

        if (invalido) {
            mostrarAlerta('danger', 'Revisa los valores marcados')
            return
        }
        if (!Object.keys(cambios).length) {
            mostrarAlerta('success', 'No hay cambios para guardar')
            return
        }

        if (botonGuardar) botonGuardar.disabled = true

        try {
            await window.HORIZON_API.guardarPreferencias(cambios)
            // No hay caché que invalidar: se vuelve a consultar el estado guardado.
            await cargarPreferencias({ silencioso: true })
            mostrarAlerta('success', 'Preferencias guardadas')
        } catch (error) {
            console.error('Error al guardar las preferencias:', error)

            if (error?.status === 401) return
            if (error?.status === 403) {
                mostrarAlerta('danger', 'Sin permisos para guardar preferencias')
                return
            }

            const detalles = Array.isArray(error?.data?.errors) ? error.data.errors : []
            const mensaje = detalles.length
                ? detalles.map((detalle) => `${detalle.path}: ${detalle.message}`).join(' ')
                : (error?.message ?? 'No se pudieron guardar las preferencias')
            mostrarAlerta('danger', mensaje)
        } finally {
            if (botonGuardar) botonGuardar.disabled = false
        }
    }

    modal?.addEventListener('show.bs.modal', () => {
        ocultarAlerta()
        cargarPreferencias({ silencioso: true })
    })

    formulario.addEventListener('submit', guardar)
    cargarPreferencias({ silencioso: true })
})()
