const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const formatoMoneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
})
const etiquetasSede = { NORTH: 'Norte', CENTER: 'Centro', SOUTH: 'Sur' }

function setText(id, texto) {
    const elemento = document.getElementById(id)
    if (elemento) elemento.textContent = texto
}

function etiquetaMes(mes) {
    if (typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes)) return mes ?? ''
    const texto = new Intl.DateTimeFormat('es-CO', { month: 'short' })
        .format(new Date(`${mes}-01T00:00:00`))
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function etiquetaSede(nombre) {
    return etiquetasSede[nombre] ?? nombre ?? ''
}

function actualizarPlantilla(total) {
    setText('plantillaActiva', String(total))
    setText('totalPlantillaText', `${formatoNumero.format(total)} personas - plantilla actual`)
}

function actualizarTotalSalario(total) {
    setText('totalNomina', `$${formatoNumero.format(Number(total ?? 0))}`)
}

function actualizarPlantillaDetalle(resumen, evolucion) {
    if (!resumen) return

    const partes = [
        `${resumen.totalSedes} sedes`,
        `${resumen.totalDepartments} departamentos`
    ]

    if (Array.isArray(evolucion) && evolucion.length > 1) {
        const actual = Number(evolucion.at(-1).cantidad ?? 0)
        const anterior = Number(evolucion.at(-2).cantidad ?? 0)
        const diferencia = actual - anterior
        partes.push(`${diferencia >= 0 ? '+' : ''}${formatoNumero.format(diferencia)} altas vs. mes anterior`)
    }

    setText('plantillaDetalle', partes.join(' · '))
}

function actualizarEvolucionDetalle(evolucion) {
    if (!Array.isArray(evolucion) || evolucion.length === 0) return
    const ultimo = evolucion.at(-1)
    setText(
        'evolucionDetalle',
        `Altas en ${etiquetaMes(ultimo.mes)}: ${formatoNumero.format(Number(ultimo.cantidad ?? 0))}`
    )
}

function renderizarDepartamentos(departamentos) {
    if (!Array.isArray(departamentos)) {
        throw new Error('La respuesta de departamentos no es un arreglo')
    }

    const total = departamentos.reduce(
        (acumulado, departamento) => acumulado + Number(departamento.cantidad ?? 0),
        0
    )

    const progressDiv = document.getElementById('progressDiv')
    if (!progressDiv) return total

    // Se construye con nodos en lugar de innerHTML: el nombre del
    // departamento viene de la base de datos y no debe interpretarse como HTML.
    const fragmento = document.createDocumentFragment()

    departamentos.forEach((departamento) => {
        const nombre = String(departamento.nombre ?? 'Sin departamento')
        const cantidad = Number(departamento.cantidad ?? 0)
        const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0

        const fila = document.createElement('div')
        fila.className = 'd-flex justify-content-between'

        const etiqueta = document.createElement('small')
        etiqueta.textContent = nombre

        const valor = document.createElement('small')
        valor.textContent = `${cantidad} - ${porcentaje}%`

        fila.append(etiqueta, valor)

        const barraContenedor = document.createElement('div')
        barraContenedor.className = 'progress'
        barraContenedor.setAttribute('role', 'progressbar')
        barraContenedor.setAttribute('aria-label', `Progreso ${nombre}`)
        barraContenedor.setAttribute('aria-valuenow', String(porcentaje))
        barraContenedor.setAttribute('aria-valuemin', '0')
        barraContenedor.setAttribute('aria-valuemax', '100')

        const barra = document.createElement('div')
        barra.className = 'progress-bar'
        barra.style.width = `${porcentaje}%`

        barraContenedor.append(barra)
        fragmento.append(fila, barraContenedor)
    })

    progressDiv.replaceChildren(fragmento)
    return total
}

function renderizarNomina(salarios) {
    const contenedor = document.getElementById('nominaPorDepartamento')
    if (!contenedor || !Array.isArray(salarios)) return

    if (salarios.length === 0) {
        contenedor.textContent = 'Sin datos de nómina'
        return
    }

    const fragmento = document.createDocumentFragment()
    const titulo = document.createElement('div')
    titulo.className = 'fw-semibold'
    titulo.textContent = 'Nómina por departamento'
    fragmento.append(titulo)

    salarios.forEach((fila) => {
        const linea = document.createElement('div')
        linea.textContent = `${fila.nombre} (${fila.sede}): ${formatoMoneda.format(Number(fila.total ?? 0))}`
        fragmento.append(linea)
    })

    contenedor.replaceChildren(fragmento)
}

function renderizarDistribucion(porSede, porRol, porContrato) {
    const partes = []

    if (Array.isArray(porRol)) {
        porRol.forEach((fila) => partes.push(`${fila.nombre}: ${fila.cantidad}`))
    }
    if (Array.isArray(porContrato)) {
        porContrato.forEach((fila) => partes.push(`${fila.nombre}: ${fila.cantidad}`))
    }
    if (Array.isArray(porSede)) {
        porSede.forEach((fila) => partes.push(`${etiquetaSede(fila.nombre)}: ${fila.cantidad}`))
    }

    setText('distribucionDetalle', partes.join(' · '))
}

async function cargarResumen() {
    const nombres = [
        'departamentos', 'salario', 'resumen', 'evolución',
        'sedes', 'roles', 'contratos', 'nómina por departamento'
    ]

    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getEmpleadosByDepartamento(),
        window.HORIZON_API.getTotalSalario(),
        window.HORIZON_API.getResumen(),
        window.HORIZON_API.getEvolucionContrataciones(),
        window.HORIZON_API.getEmpleadosBySede(),
        window.HORIZON_API.getEmpleadosByRole(),
        window.HORIZON_API.getEmpleadosByContractType(),
        window.HORIZON_API.getSalarioByDepartamento()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al cargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    const [departamentos, salario, resumen, evolucion, porSede, porRol, porContrato, nomina] = peticiones

    let totalPorDepartamentos = 0
    if (departamentos.status === 'fulfilled') {
        try {
            totalPorDepartamentos = renderizarDepartamentos(departamentos.value)
        } catch (error) {
            console.error('Error al renderizar los departamentos:', error)
        }
    }

    const totalPlantilla = resumen.status === 'fulfilled'
        ? Number(resumen.value.totalEmployees ?? 0)
        : totalPorDepartamentos
    actualizarPlantilla(totalPlantilla)

    if (salario.status === 'fulfilled') {
        actualizarTotalSalario(salario.value?.total)
    }

    const datosEvolucion = evolucion.status === 'fulfilled' ? evolucion.value : []
    actualizarPlantillaDetalle(
        resumen.status === 'fulfilled' ? resumen.value : null,
        datosEvolucion
    )
    if (evolucion.status === 'rejected') {
        setText('evolucionDetalle', 'No se pudo cargar la evolución')
    } else {
        actualizarEvolucionDetalle(datosEvolucion)
    }

    if (typeof window.iniciarGraficas === 'function') {
        window.iniciarGraficas(datosEvolucion)
    }

    if (nomina.status === 'fulfilled') {
        renderizarNomina(nomina.value)
    }

    renderizarDistribucion(
        porSede.status === 'fulfilled' ? porSede.value : [],
        porRol.status === 'fulfilled' ? porRol.value : [],
        porContrato.status === 'fulfilled' ? porContrato.value : []
    )
}

document.addEventListener('DOMContentLoaded', cargarResumen)
