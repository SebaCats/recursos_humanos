const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function actualizarPlantilla(total) {
    const plantillaActiva = document.getElementById('plantillaActiva')
    if (plantillaActiva) {
        plantillaActiva.textContent = String(total)
    }

    const totalPlantillaText = document.getElementById('totalPlantillaText')
    if (totalPlantillaText) {
        totalPlantillaText.textContent = `${formatoNumero.format(total)} personas - plantilla actual`
    }
}

function actualizarTotalSalario(total) {
    const totalNomina = document.getElementById('totalNomina')
    if (totalNomina) {
        totalNomina.textContent = `$${formatoNumero.format(Number(total ?? 0))}`
    }
}

function renderizarDepartamentos(departamentos) {
    if (!Array.isArray(departamentos)) {
        throw new Error('La respuesta de departamentos no es un arreglo')
    }

    const total = departamentos.reduce(
        (acumulado, departamento) => acumulado + Number(departamento.cantidad ?? 0),
        0
    )
    actualizarPlantilla(total)

    const progressDiv = document.getElementById('progressDiv')
    if (!progressDiv) return

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
}

async function cargarResumen() {
    const [departamentos, salario] = await Promise.allSettled([
        window.HORIZON_API.getEmpleadosByDepartamento(),
        window.HORIZON_API.getTotalSalario()
    ])

    if (departamentos.status === 'fulfilled') {
        renderizarDepartamentos(departamentos.value)
    } else {
        console.error('Error al cargar los departamentos:', departamentos.reason)
    }

    if (salario.status === 'fulfilled') {
        actualizarTotalSalario(salario.value?.total)
    } else {
        console.error('Error al cargar el total de la nómina:', salario.reason)
    }
}

document.addEventListener('DOMContentLoaded', cargarResumen)
