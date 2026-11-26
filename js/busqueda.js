// Búsqueda global del encabezado. Consulta /api/buscar con debounce y muestra
// los resultados agrupados; no interpola datos de la API como HTML.
const LIMITE_RESULTADOS = 5

let temporizadorBusquedaGlobal
let controlBusquedaGlobal

function ocultarResultadosBusqueda() {
    const contenedor = document.getElementById('resultadosBusqueda')
    const entrada = document.getElementById('buscarEmpresa')
    if (contenedor) contenedor.hidden = true
    if (entrada) entrada.setAttribute('aria-expanded', 'false')
}

function mostrarResultadosBusqueda(contenedor) {
    const entrada = document.getElementById('buscarEmpresa')
    if (!contenedor) return
    contenedor.hidden = false
    if (entrada) entrada.setAttribute('aria-expanded', 'true')
}

function itemResultado(textoPrincipal, textoSecundario, accion) {
    const item = document.createElement(accion ? 'button' : 'div')
    item.className = accion ? 'dropdown-item py-1' : 'dropdown-item-text py-1'

    if (accion) {
        item.type = 'button'
        item.addEventListener('click', accion)
    }

    const principal = document.createElement('div')
    principal.className = 'text-truncate'
    principal.textContent = textoPrincipal
    item.append(principal)

    if (textoSecundario) {
        const secundario = document.createElement('small')
        secundario.className = 'text-body-tertiary d-block text-truncate'
        secundario.textContent = textoSecundario
        item.append(secundario)
    }

    return item
}

function tituloGrupoBusqueda(texto) {
    const titulo = document.createElement('div')
    titulo.className = 'small fw-semibold text-body-tertiary px-2 pt-2'
    titulo.textContent = texto
    return titulo
}

function abrirEmpleado(empleado) {
    if (!empleado?.id) return
    ocultarResultadosBusqueda()

    // En el directorio se abre el modal de detalle; desde el resumen se lleva
    // al directorio con el nombre como búsqueda inicial.
    if (typeof window.verDetalle === 'function' && document.getElementById('detalleEmpleado')) {
        window.verDetalle(empleado.id)
        return
    }

    const nombre = [empleado.name, empleado.last_name].filter(Boolean).join(' ')
    window.location.assign(`./directorio.html?q=${encodeURIComponent(nombre)}`)
}

function renderizarResultadosBusqueda(datos, q) {
    const contenedor = document.getElementById('resultadosBusqueda')
    if (!contenedor) return

    const fragmento = document.createDocumentFragment()
    const resumen = document.createElement('div')
    resumen.className = 'small text-body-tertiary px-2 pb-1'
    resumen.textContent = `${Number(datos?.total ?? 0)} resultados para “${q}”`
    fragmento.append(resumen)

    const grupos = [
        ['Empleados', datos?.empleados, (empleado) => ({
            principal: [empleado.name, empleado.last_name].filter(Boolean).join(' '),
            secundario: [empleado.position, empleado.department, empleado.email].filter(Boolean).join(' · '),
            accion: () => abrirEmpleado(empleado)
        })],
        ['Decisiones', datos?.decisiones, (decision) => ({
            principal: decision.texto,
            secundario: decision.detalle
        })],
        ['Hitos', datos?.hitos, (hito) => ({
            principal: hito.texto,
            secundario: hito.detalle
        })],
        ['Actividad', datos?.actividad, (entrada) => ({
            principal: entrada.texto,
            secundario: entrada.detalle
        })]
    ]

    let cantidad = 0
    for (const [titulo, filas, obtener] of grupos) {
        if (!Array.isArray(filas) || filas.length === 0) continue
        fragmento.append(tituloGrupoBusqueda(titulo))
        for (const fila of filas) {
            const item = obtener(fila)
            fragmento.append(itemResultado(item.principal ?? '', item.secundario ?? '', item.accion))
            cantidad++
        }
    }

    if (cantidad === 0) {
        fragmento.append(itemResultado('Sin resultados', 'Prueba con otro nombre, correo o puesto'))
    }

    contenedor.replaceChildren(fragmento)
    mostrarResultadosBusqueda(contenedor)
}

async function ejecutarBusquedaGlobal(q) {
    if (controlBusquedaGlobal) controlBusquedaGlobal.abort()
    controlBusquedaGlobal = new AbortController()

    const contenedor = document.getElementById('resultadosBusqueda')
    try {
        const datos = await window.HORIZON_API.buscar(q, LIMITE_RESULTADOS, controlBusquedaGlobal.signal)
        if (q !== document.getElementById('buscarEmpresa')?.value.trim()) return
        renderizarResultadosBusqueda(datos, q)
    } catch (error) {
        if (error.name === 'AbortError' || error.status === 401) return
        console.error('Error en la búsqueda global:', error)
        if (!contenedor) return
        const mensaje = error.status === 403
            ? 'No tienes permisos para buscar en la empresa'
            : error.message
        contenedor.replaceChildren(itemResultado('No se pudo completar la búsqueda', mensaje))
        mostrarResultadosBusqueda(contenedor)
    }
}

function configurarBusquedaGlobal() {
    const entrada = document.getElementById('buscarEmpresa')
    const contenedor = document.getElementById('resultadosBusqueda')
    if (!entrada || !contenedor) return

    entrada.addEventListener('input', () => {
        clearTimeout(temporizadorBusquedaGlobal)
        const q = entrada.value.trim()

        if (controlBusquedaGlobal) controlBusquedaGlobal.abort()
        if (q.length < 2) {
            if (q.length === 0) {
                ocultarResultadosBusqueda()
            } else {
                contenedor.replaceChildren(itemResultado('Escribe al menos 2 caracteres'))
                mostrarResultadosBusqueda(contenedor)
            }
            return
        }

        temporizadorBusquedaGlobal = setTimeout(() => ejecutarBusquedaGlobal(q), 250)
    })

    entrada.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') ocultarResultadosBusqueda()
    })

    document.addEventListener('click', (evento) => {
        const objetivo = evento.target
        if (objetivo?.closest?.('.resultados-busqueda, #buscarEmpresa, #btnBuscarEmpresaMovil')) return
        ocultarResultadosBusqueda()
    })

    const botonMovil = document.getElementById('btnBuscarEmpresaMovil')
    botonMovil?.addEventListener('click', () => {
        const abierto = entrada.classList.toggle('mobile-search-open')
        botonMovil.setAttribute('aria-expanded', String(abierto))
        botonMovil.setAttribute('aria-label', abierto ? 'Ocultar buscador' : 'Mostrar buscador')
        if (abierto) {
            entrada.focus()
            if (entrada.value.trim().length >= 2) ejecutarBusquedaGlobal(entrada.value.trim())
        } else {
            ocultarResultadosBusqueda()
        }
    })
    entrada.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && entrada.classList.contains('mobile-search-open')) {
            entrada.classList.remove('mobile-search-open')
            botonMovil?.setAttribute('aria-expanded', 'false')
            botonMovil?.focus()
            ocultarResultadosBusqueda()
        }
    })
}

document.addEventListener('DOMContentLoaded', configurarBusquedaGlobal)
