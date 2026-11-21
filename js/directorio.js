const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
let empleados = []

function normalizarEmpleados(data) {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.employees)) return data.employees
    return []
}

function nombreCompleto(empleado) {
    return [empleado.name, empleado.last_name].filter(Boolean).join(' ')
}

function celda(valor) {
    const td = document.createElement('td')
    td.textContent = valor || '—'
    return td
}

function crearFila(empleado) {
    const fila = document.createElement('tr')

    const celdaEmpleado = document.createElement('td')
    const nombre = document.createElement('div')
    nombre.textContent = nombreCompleto(empleado) || 'Sin nombre'

    const detalle = document.createElement('div')
    const identificador = empleado.id ? `EMP-${String(empleado.id).padStart(4, '0')}` : ''
    detalle.textContent = [identificador, empleado.email].filter(Boolean).join(' - ') || 'Sin correo'

    celdaEmpleado.append(nombre, detalle)

    // El backend todavía solo devuelve name y email en /employee/getAll.
    // Los demás campos se muestran cuando la respuesta los incorpora.
    fila.append(
        celdaEmpleado,
        celda(empleado.department),
        celda(empleado.position),
        celda(empleado.sede),
        celda(empleado.contract_type),
        celda(empleado.estado ?? 'Activo')
    )
    return fila
}

function actualizarContador(visibles) {
    const contador = document.getElementById('directorioEmpleadosCount')
    if (!contador) return

    contador.textContent = visibles === empleados.length
        ? `${formatoNumero.format(empleados.length)} empleados`
        : `Mostrando ${formatoNumero.format(visibles)} de ${formatoNumero.format(empleados.length)} empleados`

    const activas = document.getElementById('directorioPersonasActivas')
    if (activas) activas.textContent = formatoNumero.format(empleados.length)
}

function renderizarEmpleados(filtro = '') {
    const tbody = document.getElementById('directorioEmpleadosBody')
    if (!tbody) return

    const texto = filtro.trim().toLowerCase()
    const visibles = empleados.filter((empleado) => {
        const buscado = `${nombreCompleto(empleado)} ${empleado.email ?? ''} ${empleado.id ?? ''}`.toLowerCase()
        return !texto || buscado.includes(texto)
    })

    const fragmento = document.createDocumentFragment()

    if (visibles.length === 0) {
        const fila = document.createElement('tr')
        const celdaVacia = document.createElement('td')
        celdaVacia.colSpan = 6
        celdaVacia.className = 'text-center text-body-tertiary'
        celdaVacia.textContent = empleados.length === 0
            ? 'No hay empleados registrados'
            : 'No hay resultados para la búsqueda'
        fila.append(celdaVacia)
        fragmento.append(fila)
    } else {
        visibles.forEach((empleado) => fragmento.append(crearFila(empleado)))
    }

    tbody.replaceChildren(fragmento)
    actualizarContador(visibles.length)
}

async function cargarEmpleados() {
    try {
        const data = await window.HORIZON_API.getEmployees()
        empleados = normalizarEmpleados(data)
        renderizarEmpleados(document.getElementById('buscarEmpleados')?.value ?? '')
    } catch (error) {
        // El backend responde 404 cuando aún no hay empleados registrados.
        if (error.status === 404) {
            empleados = []
            renderizarEmpleados()
            return
        }

        console.error('Error al cargar el directorio:', error)
        const contador = document.getElementById('directorioEmpleadosCount')
        if (contador) contador.textContent = 'No se pudo cargar el directorio'
    }
}

function mostrarRespuesta(mensaje, tipo = 'info') {
    const alerta = document.getElementById('respuestaRegistro')
    if (!alerta) return

    alerta.className = `alert alert-${tipo}`
    alerta.textContent = mensaje
}

async function registrarEmpleado(evento) {
    evento.preventDefault()

    const formulario = evento.currentTarget
    const boton = document.getElementById('botonRegistrar')
    const datos = Object.fromEntries(new FormData(formulario).entries())
    datos.salary = Number(datos.salary)

    if (boton) boton.disabled = true
    mostrarRespuesta('Registrando empleado...', 'info')

    try {
        const resultado = await window.HORIZON_API.createEmployee(datos)
        const temporal = resultado?.temporaryPassword
        mostrarRespuesta(
            temporal
                ? `Empleado registrado. Contraseña temporal: ${temporal}`
                : 'Empleado registrado correctamente',
            'success'
        )
        formulario.reset()
        await cargarEmpleados()
    } catch (error) {
        console.error('Error al registrar el empleado:', error)
        const detalles = Array.isArray(error.data?.errors)
            ? error.data.errors.map((detalle) => detalle.message).join(' ')
            : ''
        mostrarRespuesta(
            `${error.message}${detalles ? ` (${detalles})` : ''}`,
            'danger'
        )
    } finally {
        if (boton) boton.disabled = false
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarEmpleados()

    document.getElementById('buscarEmpleados')?.addEventListener('input', (evento) => {
        renderizarEmpleados(evento.target.value)
    })

    document.getElementById('formularioRegistro')?.addEventListener('submit', registrarEmpleado)
})
