const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const formatoMoneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
})
const etiquetasSede = { NORTH: 'Norte', CENTER: 'Centro', SOUTH: 'Sur' }

let periodoEvolucion = 'mes'
let datosResumen = null

function setText(id, texto) {
    const elemento = document.getElementById(id)
    if (elemento) elemento.textContent = texto
}

function etiquetaFecha(fecha) {
    if (typeof fecha !== 'string') return fecha ?? ''

    if (/^\d{4}-\d{2}$/.test(fecha)) {
        const texto = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' })
            .format(new Date(`${fecha}-01T00:00:00Z`))
        return texto.charAt(0).toUpperCase() + texto.slice(1)
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const texto = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' })
            .format(new Date(`${fecha}T00:00:00Z`))
        return texto.charAt(0).toUpperCase() + texto.slice(1)
    }

    return fecha
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

function actualizarPlantillaDetalle(resumen, evolucion, periodo) {
    if (!resumen) return

    const partes = [
        `${resumen.totalSedes} sedes`,
        `${resumen.totalDepartments} departamentos`
    ]

    if (Array.isArray(evolucion) && evolucion.length > 1) {
        const actual = Number(evolucion.at(-1).cantidad ?? 0)
        const anterior = Number(evolucion.at(-2).cantidad ?? 0)
        const diferencia = actual - anterior
        const comparacion = periodo === 'semana' ? 'día anterior' : 'mes anterior'
        partes.push(`${diferencia >= 0 ? '+' : ''}${formatoNumero.format(diferencia)} altas vs. ${comparacion}`)
    }

    setText('plantillaDetalle', partes.join(' · '))
}

function actualizarEvolucionDetalle(evolucion, periodo) {
    if (!Array.isArray(evolucion) || evolucion.length === 0) return
    const ultimo = evolucion.at(-1)
    const altas = formatoNumero.format(Number(ultimo.cantidad ?? 0))

    if (periodo === 'semana') {
        setText('evolucionDetalle', `Altas el ${etiquetaFecha(ultimo.fecha)}: ${altas}`)
        return
    }

    const plantilla = formatoNumero.format(Number(ultimo.plantilla ?? 0))
    setText(
        'evolucionDetalle',
        `Altas en ${etiquetaFecha(ultimo.fecha)}: ${altas} · plantilla ${plantilla}`
    )
}

function actualizarEvolucion(evolucion, periodo, fallo = false) {
    const esSemana = periodo === 'semana'

    setText(
        'evolucionSubtitulo',
        esSemana
            ? 'Altas de contrato por día (semana actual)'
            : 'Altas y plantilla activa por mes (últimos 12 meses)'
    )

    const boton = document.getElementById('btnPeriodoEvolucion')
    if (boton) {
        boton.textContent = esSemana ? 'Ver 12 meses' : 'Ver semana actual'
        boton.setAttribute('aria-pressed', String(esSemana))
    }

    actualizarPlantillaDetalle(datosResumen, evolucion, periodo)

    if (fallo) {
        setText('evolucionDetalle', 'No se pudo cargar la evolución')
    } else {
        actualizarEvolucionDetalle(evolucion, periodo)
    }

    if (typeof window.iniciarGraficas === 'function') {
        window.iniciarGraficas(evolucion, periodo)
    }
}

function configurarBotonEvolucion() {
    const boton = document.getElementById('btnPeriodoEvolucion')
    if (!boton) return

    boton.addEventListener('click', async () => {
        const periodo = periodoEvolucion === 'mes' ? 'semana' : 'mes'
        boton.disabled = true

        try {
            const evolucion = periodo === 'semana'
                ? await window.HORIZON_API.getEvolucionContratacionesSemana()
                : await window.HORIZON_API.getEvolucionContrataciones()
            periodoEvolucion = periodo
            actualizarEvolucion(evolucion, periodo)
        } catch (error) {
            console.error('Error al cambiar el periodo de la evolución:', error)
            setText('evolucionDetalle', 'No se pudo cargar la evolución')
        } finally {
            boton.disabled = false
        }
    })
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

const formatoPorcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function textoPorcentaje(valor) {
    return `${formatoPorcentaje.format(Number(valor ?? 0))} %`
}

function fechaCorta(fecha) {
    if (typeof fecha !== 'string' || !fecha) return '—'
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number)
    if (!anio || !mes || !dia) return fecha
    const texto = new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(anio, mes - 1, dia)))
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function celda(texto) {
    const td = document.createElement('td')
    td.textContent = texto ?? ''
    return td
}

function renderizarRotacion(datos) {
    if (!datos) {
        setText('rotacionValor', '—')
        setText('rotacionDetalle', 'No se pudo cargar la rotación')
        return
    }

    setText('rotacionValor', textoPorcentaje(datos.tasa))
    const variacion = Number(datos.variacion ?? 0)
    const signo = variacion > 0 ? '+' : ''
    setText(
        'rotacionDetalle',
        Number(datos.total ?? 0) === 0
            ? 'Sin bajas en los últimos 12 meses'
            : `${signo}${formatoPorcentaje.format(variacion)} pp · ${datos.total} ${datos.total === 1 ? 'baja' : 'bajas'} en 12 meses`
    )
}

function renderizarAusentismo(datos) {
    if (!datos) {
        setText('ausentismoValor', '—')
        setText('ausentismoDetalle', 'No se pudo cargar el ausentismo')
        return
    }

    setText('ausentismoValor', textoPorcentaje(datos.tasa))
    setText(
        'ausentismoDetalle',
        Number(datos.empleados ?? 0) === 0
            ? 'Sin ausencias aprobadas este mes (objetivo: menos de 4 %)'
            : `${datos.empleados} personas · ${formatoNumero.format(Number(datos.dias ?? 0))} días este mes`
    )
}

function renderizarNominaDetalle(datos, salarioActual) {
    if (datos?.period) {
        actualizarTotalSalario(datos.total)
        setText(
            'nominaDetalle',
            `${datos.period} · ${datos.status === 'PENDIENTE' ? 'pendiente de cierre' : 'cerrada'}`
        )
        return
    }

    actualizarTotalSalario(salarioActual)
    setText('nominaDetalle', 'Sin cierre registrado · salario vigente')
}

function renderizarDecisiones(datos) {
    const cuerpo = document.getElementById('decisionesBody')
    if (!cuerpo) return

    cuerpo.replaceChildren()

    if (!datos || !Array.isArray(datos.lista) || datos.lista.length === 0) {
        const fila = document.createElement('tr')
        const columna = celda(datos ? 'No hay decisiones pendientes' : 'No se pudieron cargar las decisiones')
        columna.colSpan = 4
        columna.className = 'text-body-tertiary'
        fila.append(columna)
        cuerpo.append(fila)
        setText('decisionesDetalle', 'Bandeja al día')
        return
    }

    for (const solicitud of datos.lista) {
        const fila = document.createElement('tr')
        const solicitudTexto = [
            solicitud.type,
            solicitud.empleado ?? solicitud.title
        ].filter(Boolean).join(' · ')
        const estado = solicitud.status === 'INCIDENCIAS' ? '● Incidencias' : '● Pendiente'

        fila.append(
            celda(solicitudTexto),
            celda(solicitud.responsable ?? 'Sin asignar'),
            celda(fechaCorta(solicitud.vence)),
            celda(estado)
        )
        cuerpo.append(fila)
    }

    setText('decisionesDetalle', `${datos.cantidad} ${datos.cantidad === 1 ? 'pendiente' : 'pendientes'}`)
}

function renderizarActividad(datos) {
    const lista = document.getElementById('actividadLista')
    if (!lista) return

    lista.replaceChildren()

    if (!Array.isArray(datos) || datos.length === 0) {
        const item = document.createElement('li')
        item.className = 'list-group-item text-body-tertiary'
        item.textContent = datos ? 'Sin actividad registrada' : 'No se pudo cargar la actividad'
        lista.append(item)
        setText('actividadDetalle', 'Últimos movimientos')
        return
    }

    for (const entrada of datos) {
        const item = document.createElement('li')
        item.className = 'list-group-item'
        item.textContent = [entrada.actor, entrada.action, entrada.entity]
            .filter(Boolean).join(' ')
        lista.append(item)
    }

    setText('actividadDetalle', 'Últimos movimientos registrados')
}

function renderizarHito(dato) {
    if (dato === undefined) {
        setText('proximoHito', 'No se pudo cargar el próximo hito')
        setText('proximoHitoDetalle', 'Vuelve a intentarlo en unos segundos')
        return
    }

    if (!dato) {
        setText('proximoHito', 'Sin hitos programados')
        setText('proximoHitoDetalle', 'No hay hitos próximos registrados')
        return
    }

    setText('proximoHito', `Próximo hito: ${dato.title}`)
    setText(
        'proximoHitoDetalle',
        [dato.description, fechaCorta(dato.fecha), dato.owner].filter(Boolean).join(' · ')
    )
}

async function cargarIndicadores(salarioActual) {
    const nombres = [
        'rotación', 'ausentismo', 'contratos por vencer', 'decisiones',
        'actividad', 'hitos', 'nómina', 'expedientes'
    ]

    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getRotacion(),
        window.HORIZON_API.getAusentismo(),
        window.HORIZON_API.getContratosPorVencer(),
        window.HORIZON_API.getDecisiones(),
        window.HORIZON_API.getActividad(),
        window.HORIZON_API.getHitos(),
        window.HORIZON_API.getNomina(),
        window.HORIZON_API.getExpedientes()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al cargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    const valor = (indice) => peticiones[indice].status === 'fulfilled' ? peticiones[indice].value : null

    renderizarRotacion(valor(0))
    renderizarAusentismo(valor(1))
    renderizarDecisiones(valor(3))
    renderizarActividad(valor(4))
    renderizarHito(peticiones[5].status === 'fulfilled' ? peticiones[5].value : undefined)
    renderizarNominaDetalle(valor(6), salarioActual)
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

    datosResumen = resumen.status === 'fulfilled' ? resumen.value : null
    const totalPlantilla = datosResumen
        ? Number(datosResumen.totalEmployees ?? 0)
        : totalPorDepartamentos
    actualizarPlantilla(totalPlantilla)

    if (salario.status === 'fulfilled') {
        actualizarTotalSalario(salario.value?.total)
    }

    const datosEvolucion = evolucion.status === 'fulfilled' ? evolucion.value : []
    actualizarEvolucion(datosEvolucion, 'mes', evolucion.status === 'rejected')
    configurarBotonEvolucion()

    if (nomina.status === 'fulfilled') {
        renderizarNomina(nomina.value)
    }

    renderizarDistribucion(
        porSede.status === 'fulfilled' ? porSede.value : [],
        porRol.status === 'fulfilled' ? porRol.value : [],
        porContrato.status === 'fulfilled' ? porContrato.value : []
    )

    await cargarIndicadores(salario.status === 'fulfilled' ? Number(salario.value?.total ?? 0) : 0)
}

document.addEventListener('DOMContentLoaded', cargarResumen)
