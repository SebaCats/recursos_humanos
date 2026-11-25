const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const formatoMoneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
})
const etiquetasSede = { NORTH: 'Norte', CENTER: 'Centro', SOUTH: 'Sur' }

let periodoEvolucion = 'mes'
let datosResumen = null
let datosDecisiones = null
let datosAusencias = null
let datosNomina = null
let salarioVigente = 0
let puedeGestionarRRHH = false
let accionesDecisionesConfiguradas = false
let formularioHitoConfigurado = false

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

function renderizarNominaDetalle(datos, salarioActual = salarioVigente) {
    datosNomina = datos?.period ? datos : null

    if (datosNomina) {
        actualizarTotalSalario(datosNomina.total)
        setText(
            'nominaDetalle',
            `${datosNomina.period} · ${datosNomina.status === 'PENDIENTE' ? 'pendiente de cierre' : 'cerrada'}`
        )
        actualizarBotonCerrarNomina()
        return
    }

    actualizarTotalSalario(salarioActual)
    const sinPendientes = datos && typeof datos === 'object' && 'status' in datos
    setText(
        'nominaDetalle',
        sinPendientes ? 'Sin periodos pendientes · salario vigente' : 'Sin cierre registrado · salario vigente'
    )
    actualizarBotonCerrarNomina()
}

function actualizarBotonCerrarNomina() {
    const boton = document.getElementById('btnCerrarNomina')
    if (!boton) return

    const pendiente = datosNomina?.status === 'PENDIENTE' && /^\d{4}-\d{2}$/.test(datosNomina?.period ?? '')
    boton.hidden = !puedeGestionarRRHH || !pendiente
}

function mostrarAlertaCerrarNomina(mensaje, tipo) {
    const alerta = document.getElementById('alertaCerrarNomina')
    if (!alerta) return
    alerta.className = `alert alert-${tipo}`
    alerta.textContent = mensaje
    alerta.classList.remove('d-none')
}

function ocultarAlertaCerrarNomina() {
    const alerta = document.getElementById('alertaCerrarNomina')
    if (!alerta) return
    alerta.className = 'alert d-none'
    alerta.textContent = ''
}

function cerrarModalNomina() {
    const modal = document.getElementById('modalCerrarNomina')
    if (modal && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrap.Modal.getInstance(modal)?.hide()
    }
}

function rellenarModalNomina() {
    setText('nominaPeriodo', datosNomina?.period ?? '—')
    setText('nominaTotalCierre', `$${formatoNumero.format(Number(datosNomina?.total ?? 0))}`)
    ocultarAlertaCerrarNomina()
}

function configurarCierreNomina() {
    const boton = document.getElementById('btnCerrarNomina')
    if (boton && boton.dataset.configurado !== 'true') {
        boton.addEventListener('click', rellenarModalNomina)
        boton.dataset.configurado = 'true'
    }

    const formulario = document.getElementById('formCerrarNomina')
    if (!formulario || formulario.dataset.configurado === 'true') return
    formulario.addEventListener('submit', cerrarPeriodoNomina)
    formulario.dataset.configurado = 'true'
}

// Cerrar recalcula el total en el backend: se vuelve a consultar la nómina y la
// actividad para que el KPI y el registro de cambios queden alineados.
async function recargarNomina() {
    const nombres = ['nómina', 'actividad']
    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getNomina(),
        window.HORIZON_API.getActividad()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al recargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    if (peticiones[0].status === 'fulfilled') renderizarNominaDetalle(peticiones[0].value)
    if (peticiones[1].status === 'fulfilled') renderizarActividad(peticiones[1].value)
}

async function cerrarPeriodoNomina(evento) {
    evento.preventDefault()

    const periodo = datosNomina?.period
    if (!puedeGestionarRRHH || datosNomina?.status !== 'PENDIENTE' || !periodo) {
        mostrarAlertaCerrarNomina('No hay un periodo pendiente que se pueda cerrar', 'warning')
        return
    }

    ocultarAlertaCerrarNomina()
    const boton = document.getElementById('botonCerrarNomina')
    if (boton) boton.disabled = true
    setText('nominaDetalle', `Cerrando nómina de ${periodo}...`)

    try {
        const resultado = await window.HORIZON_API.cerrarNomina(periodo)
        cerrarModalNomina()
        await recargarNomina()
        setText(
            'nominaDetalle',
            datosNomina?.period
                ? `${resultado?.message ?? 'Nómina cerrada'} · ${datosNomina.period} pendiente`
                : `${periodo} cerrado · salario vigente`
        )
    } catch (error) {
        console.error('Error al cerrar la nómina:', error)

        if (error.status === 403) {
            puedeGestionarRRHH = false
            actualizarBotonCerrarNomina()
            configurarHito()
            renderizarDecisiones(datosDecisiones, false)
            renderizarAusencias(datosAusencias, false)
            setText('nominaDetalle', 'Sin permisos para cerrar la nómina')
            return
        }

        if (error.status === 409) {
            cerrarModalNomina()
            await recargarNomina()
            setText('nominaDetalle', 'El periodo ya estaba cerrado')
            return
        }

        mostrarAlertaCerrarNomina(error.message ?? 'No se pudo cerrar la nómina', 'danger')
        setText('nominaDetalle', 'No se pudo cerrar la nómina')
    } finally {
        if (boton) boton.disabled = false
    }
}

function botonDecision(id, accion, etiqueta, clase) {
    const boton = document.createElement('button')
    boton.type = 'button'
    boton.className = `btn btn-sm ${clase}`
    boton.textContent = etiqueta
    boton.dataset.decisionId = String(id)
    boton.dataset.accion = accion
    boton.setAttribute('aria-label', `${etiqueta} solicitud ${id}`)
    return boton
}

function renderizarDecisiones(datos, puedeResolver = false) {
    const cuerpo = document.getElementById('decisionesBody')
    if (!cuerpo) return

    cuerpo.replaceChildren()

    if (!datos || !Array.isArray(datos.lista) || datos.lista.length === 0) {
        const fila = document.createElement('tr')
        const columna = celda(datos ? 'No hay decisiones pendientes' : 'No se pudieron cargar las decisiones')
        columna.colSpan = 5
        columna.className = 'text-body-tertiary'
        fila.append(columna)
        cuerpo.append(fila)
        setText('decisionesDetalle', datos ? 'Bandeja al día' : 'No se pudieron cargar las decisiones')
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

        const acciones = document.createElement('td')
        const pendiente = ['PENDIENTE', 'INCIDENCIAS'].includes(solicitud.status)
        if (puedeResolver && pendiente) {
            acciones.append(
                botonDecision(solicitud.id, 'aprobar', 'Aprobar', 'btn-outline-success me-1'),
                botonDecision(solicitud.id, 'rechazar', 'Rechazar', 'btn-outline-danger')
            )
        } else {
            acciones.textContent = '—'
        }
        fila.append(acciones)
        cuerpo.append(fila)
    }

    setText('decisionesDetalle', `${datos.cantidad} ${datos.cantidad === 1 ? 'pendiente' : 'pendientes'}`)
}

// Tras resolver una decisión se vuelven a consultar la bandeja y la actividad:
// el backend registra la traza en la misma transacción y no hay caché que
// invalidar.
async function recargarDecisiones() {
    const nombres = ['decisiones', 'actividad']
    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getDecisiones(),
        window.HORIZON_API.getActividad()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al recargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    if (peticiones[0].status === 'fulfilled') {
        datosDecisiones = peticiones[0].value
        renderizarDecisiones(datosDecisiones, puedeGestionarRRHH)
    } else {
        document.getElementById('decisionesBody')?.querySelectorAll('button[data-decision-id]')
            .forEach((elemento) => { elemento.disabled = false })
    }
    if (peticiones[1].status === 'fulfilled') {
        renderizarActividad(peticiones[1].value)
    }
}

async function resolverDecisionDesdeBandeja(evento) {
    const boton = evento.target.closest('button[data-decision-id][data-accion]')
    if (!boton || boton.disabled || !puedeGestionarRRHH) return

    const accion = boton.dataset.accion
    if (!['aprobar', 'rechazar'].includes(accion)) return

    const cuerpo = document.getElementById('decisionesBody')
    cuerpo?.querySelectorAll('button[data-decision-id]').forEach((elemento) => {
        elemento.disabled = true
    })
    setText('decisionesDetalle', accion === 'aprobar' ? 'Aprobando solicitud...' : 'Rechazando solicitud...')

    try {
        const id = boton.dataset.decisionId
        const resultado = accion === 'aprobar'
            ? await window.HORIZON_API.aprobarDecision(id)
            : await window.HORIZON_API.rechazarDecision(id)
        setText('decisionesDetalle', resultado?.message ?? 'Decisión actualizada')
        await recargarDecisiones()
    } catch (error) {
        console.error('Error al resolver la decisión:', error)

        if (error.status === 403) {
            puedeGestionarRRHH = false
            renderizarDecisiones(datosDecisiones, false)
            setText('decisionesDetalle', 'Sin permisos para resolver decisiones')
        } else if (error.status === 409) {
            setText('decisionesDetalle', 'La solicitud ya estaba resuelta')
            await recargarDecisiones()
        } else {
            setText('decisionesDetalle', error.message ?? 'No se pudo resolver la decisión')
            cuerpo?.querySelectorAll('button[data-decision-id]').forEach((elemento) => {
                elemento.disabled = false
            })
        }
    }
}

function configurarAccionesDecisiones() {
    if (accionesDecisionesConfiguradas) return
    const cuerpo = document.getElementById('decisionesBody')
    if (!cuerpo) return

    cuerpo.addEventListener('click', resolverDecisionDesdeBandeja)
    accionesDecisionesConfiguradas = true
}

const CAMPOS_HITO = {
    title: 'hitoTitulo',
    description: 'hitoDescripcion',
    due_date: 'hitoFecha',
    owner: 'hitoResponsable'
}

function marcarCampoHito(ruta, mensaje) {
    const id = CAMPOS_HITO[ruta]
    const campo = id ? document.getElementById(id) : null
    if (!campo) return

    campo.classList.add('is-invalid')
    campo.setAttribute('aria-invalid', String(Boolean(mensaje)))
}

function limpiarCamposHito() {
    for (const id of Object.values(CAMPOS_HITO)) {
        const campo = document.getElementById(id)
        if (!campo) continue
        campo.classList.remove('is-invalid')
        campo.removeAttribute('aria-invalid')
    }
}

function mostrarAlertaHito(mensaje, tipo) {
    const alerta = document.getElementById('alertaProgramarHito')
    if (!alerta) return
    alerta.className = `alert alert-${tipo}`
    alerta.textContent = mensaje
    alerta.classList.remove('d-none')
}

function ocultarAlertaHito() {
    const alerta = document.getElementById('alertaProgramarHito')
    if (!alerta) return
    alerta.className = 'alert d-none'
    alerta.textContent = ''
}

function cerrarModalHito() {
    const modal = document.getElementById('modalProgramarHito')
    if (modal && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrap.Modal.getInstance(modal)?.hide()
    }
}

// La fecha mínima se calcula en UTC para que coincida con la validación del
// backend, que compara contra new Date().toISOString().slice(0, 10).
function configurarHito() {
    const boton = document.getElementById('btnProgramarHito')
    if (boton) boton.hidden = !puedeGestionarRRHH

    const fecha = document.getElementById('hitoFecha')
    if (fecha && !fecha.min) fecha.min = new Date().toISOString().slice(0, 10)

    const formulario = document.getElementById('formProgramarHito')
    if (!formulario || formularioHitoConfigurado) return

    formulario.addEventListener('submit', registrarHito)
    formularioHitoConfigurado = true
}

async function recargarHito() {
    const nombres = ['hitos', 'actividad']
    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getHitos(),
        window.HORIZON_API.getActividad()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al recargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    if (peticiones[0].status === 'fulfilled') renderizarHito(peticiones[0].value)
    if (peticiones[1].status === 'fulfilled') renderizarActividad(peticiones[1].value)
}

async function registrarHito(evento) {
    evento.preventDefault()

    const titulo = document.getElementById('hitoTitulo')?.value.trim() ?? ''
    const descripcion = document.getElementById('hitoDescripcion')?.value.trim() ?? ''
    const fecha = document.getElementById('hitoFecha')?.value.trim() ?? ''
    const responsable = document.getElementById('hitoResponsable')?.value.trim() ?? ''
    const hoy = new Date().toISOString().slice(0, 10)

    limpiarCamposHito()
    ocultarAlertaHito()

    const errores = []
    if (titulo.length < 3) {
        marcarCampoHito('title', 'Título demasiado corto')
        errores.push('El título debe tener al menos 3 caracteres')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoy) {
        marcarCampoHito('due_date', 'Fecha no válida')
        errores.push('La fecha debe ser hoy o posterior')
    }
    if (errores.length) {
        mostrarAlertaHito(errores.join(' '), 'danger')
        return
    }

    const cuerpo = { title: titulo, due_date: fecha }
    if (descripcion) cuerpo.description = descripcion
    if (responsable) cuerpo.owner = responsable

    const boton = document.getElementById('botonGuardarHito')
    if (boton) boton.disabled = true
    setText('estadoHito', 'Registrando hito...')

    try {
        const resultado = await window.HORIZON_API.crearHito(cuerpo)
        setText('estadoHito', resultado?.message ?? 'Hito registrado')
        evento.currentTarget.reset()
        ocultarAlertaHito()
        limpiarCamposHito()
        cerrarModalHito()
        await recargarHito()
    } catch (error) {
        console.error('Error al registrar el hito:', error)

        if (error.status === 403) {
            puedeGestionarRRHH = false
            configurarHito()
            cerrarModalHito()
            setText('estadoHito', 'Sin permisos para programar hitos')
            return
        }

        const detalles = Array.isArray(error.data?.errors) ? error.data.errors : []
        for (const detalle of detalles) marcarCampoHito(detalle.path, detalle.message)
        const mensaje = detalles.length
            ? detalles.map((detalle) => `${detalle.path}: ${detalle.message}`).join(' ')
            : error.message ?? 'No se pudo registrar el hito'
        mostrarAlertaHito(mensaje, 'danger')
        setText('estadoHito', 'No se pudo registrar el hito')
    } finally {
        if (boton) boton.disabled = false
    }
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

const CAMPOS_AUSENCIA = {
    id_employee: 'ausenciaEmpleado',
    type: 'ausenciaTipo',
    start_date: 'ausenciaInicio',
    end_date: 'ausenciaFin',
    days: 'ausenciaDias'
}

const ETIQUETAS_AUSENCIA = {
    VACACIONES: 'Vacaciones',
    ENFERMEDAD: 'Enfermedad',
    PERMISO: 'Permiso',
    LICENCIA: 'Licencia',
    OTRO: 'Otro'
}

function botonAusencia(id, accion, etiqueta, clase) {
    const boton = document.createElement('button')
    boton.type = 'button'
    boton.className = `btn btn-sm ${clase}`
    boton.textContent = etiqueta
    boton.dataset.ausenciaId = String(id)
    boton.dataset.accion = accion
    boton.setAttribute('aria-label', `${etiqueta} ausencia ${id}`)
    return boton
}

function renderizarAusencias(datos, puedeGestionar = false) {
    const cuerpo = document.getElementById('ausenciasBody')
    if (!cuerpo) return

    cuerpo.replaceChildren()

    const lista = Array.isArray(datos) ? datos : []
    if (lista.length === 0) {
        const fila = document.createElement('tr')
        const columna = celda(datos ? 'No hay ausencias registradas' : 'No se pudieron cargar las ausencias')
        columna.colSpan = 6
        columna.className = 'text-body-tertiary'
        fila.append(columna)
        cuerpo.append(fila)
        setText('ausenciasDetalle', datos ? 'Sin solicitudes' : 'No se pudieron cargar las ausencias')
        return
    }

    for (const ausencia of lista) {
        const fila = document.createElement('tr')
        const estado = document.createElement('span')
        estado.className = 'badge text-bg-' + (
            ausencia.status === 'APROBADA' ? 'success'
                : ausencia.status === 'RECHAZADA' ? 'danger' : 'warning'
        )
        estado.textContent = ausencia.status

        const acciones = document.createElement('td')
        if (puedeGestionar && ausencia.status === 'PENDIENTE') {
            acciones.append(
                botonAusencia(ausencia.id, 'aprobar', 'Aprobar', 'btn-outline-success me-1'),
                botonAusencia(ausencia.id, 'rechazar', 'Rechazar', 'btn-outline-danger')
            )
        } else {
            acciones.textContent = '—'
        }

        fila.append(
            celda(ausencia.empleado ?? '—'),
            celda(ETIQUETAS_AUSENCIA[ausencia.type] ?? ausencia.type),
            celda(`${fechaCorta(ausencia.start_date)} – ${fechaCorta(ausencia.end_date)}`),
            celda(ausencia.days ?? '—'),
            (() => { const td = document.createElement('td'); td.append(estado); return td })(),
            acciones
        )
        cuerpo.append(fila)
    }

    const pendientes = lista.filter((ausencia) => ausencia.status === 'PENDIENTE').length
    setText(
        'ausenciasDetalle',
        pendientes === 0
            ? `${lista.length} ${lista.length === 1 ? 'registro' : 'registros'} · Sin pendientes`
            : `${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'} de ${lista.length}`
    )
}

function configurarAccionesAusencias() {
    const cuerpo = document.getElementById('ausenciasBody')
    if (!cuerpo || cuerpo.dataset.configurado === 'true') return
    cuerpo.addEventListener('click', resolverAusenciaDesdeBandeja)
    cuerpo.dataset.configurado = 'true'
}

// Toda resolución recarga la bandeja, el indicador de ausentismo y la actividad,
// tal como hace el backend dentro de la misma transacción.
async function recargarAusencias() {
    const nombres = ['ausencias', 'ausentismo', 'actividad']
    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getAusencias(),
        window.HORIZON_API.getAusentismo(),
        window.HORIZON_API.getActividad()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al recargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    if (peticiones[0].status === 'fulfilled') {
        datosAusencias = peticiones[0].value
        renderizarAusencias(datosAusencias, puedeGestionarRRHH)
    } else {
        document.getElementById('ausenciasBody')?.querySelectorAll('button[data-ausencia-id]')
            .forEach((elemento) => { elemento.disabled = false })
    }
    if (peticiones[1].status === 'fulfilled') renderizarAusentismo(peticiones[1].value)
    if (peticiones[2].status === 'fulfilled') renderizarActividad(peticiones[2].value)
}

async function resolverAusenciaDesdeBandeja(evento) {
    const boton = evento.target.closest('button[data-ausencia-id][data-accion]')
    if (!boton || boton.disabled || !puedeGestionarRRHH) return

    const accion = boton.dataset.accion
    if (!['aprobar', 'rechazar'].includes(accion)) return

    const cuerpo = document.getElementById('ausenciasBody')
    cuerpo?.querySelectorAll('button[data-ausencia-id]').forEach((elemento) => {
        elemento.disabled = true
    })
    setText('ausenciasDetalle', accion === 'aprobar' ? 'Aprobando ausencia...' : 'Rechazando ausencia...')

    try {
        const id = boton.dataset.ausenciaId
        const resultado = accion === 'aprobar'
            ? await window.HORIZON_API.aprobarAusencia(id)
            : await window.HORIZON_API.rechazarAusencia(id)
        setText('ausenciasDetalle', resultado?.message ?? 'Ausencia actualizada')
        await recargarAusencias()
    } catch (error) {
        console.error('Error al resolver la ausencia:', error)

        if (error.status === 403) {
            puedeGestionarRRHH = false
            renderizarAusencias(datosAusencias, false)
            renderizarDecisiones(datosDecisiones, false)
            configurarHito()
            setText('ausenciasDetalle', 'Sin permisos para resolver ausencias')
            return
        }

        setText(
            'ausenciasDetalle',
            error.status === 409
                ? 'La ausencia ya estaba resuelta'
                : error.message ?? 'No se pudo resolver la ausencia'
        )
        await recargarAusencias()
    }
}

function marcarCampoAusencia(ruta, mensaje) {
    const id = CAMPOS_AUSENCIA[ruta]
    const campo = id ? document.getElementById(id) : null
    if (!campo) return
    campo.classList.add('is-invalid')
    campo.setAttribute('aria-invalid', String(Boolean(mensaje)))
}

function limpiarCamposAusencia() {
    for (const id of Object.values(CAMPOS_AUSENCIA)) {
        const campo = document.getElementById(id)
        if (!campo) continue
        campo.classList.remove('is-invalid')
        campo.removeAttribute('aria-invalid')
    }
}

function mostrarAlertaAusencia(mensaje, tipo) {
    const alerta = document.getElementById('alertaSolicitarAusencia')
    if (!alerta) return
    alerta.className = `alert alert-${tipo}`
    alerta.textContent = mensaje
    alerta.classList.remove('d-none')
}

function ocultarAlertaAusencia() {
    const alerta = document.getElementById('alertaSolicitarAusencia')
    if (!alerta) return
    alerta.className = 'alert d-none'
    alerta.textContent = ''
}

function cerrarModalAusencia() {
    const modal = document.getElementById('modalSolicitarAusencia')
    if (modal && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrap.Modal.getInstance(modal)?.hide()
    }
}

async function cargarEmpleadosAusencia() {
    const selector = document.getElementById('ausenciaEmpleado')
    if (!selector) return

    try {
        const datos = await window.HORIZON_API.getEmployees()
        const empleados = Array.isArray(datos?.employees) ? datos.employees : []
        const fragmento = document.createDocumentFragment()
        const inicial = document.createElement('option')
        inicial.value = ''
        inicial.textContent = 'Selecciona un empleado'
        fragmento.append(inicial)

        for (const empleado of empleados) {
            const opcion = document.createElement('option')
            opcion.value = String(empleado.id)
            opcion.textContent = [empleado.name, empleado.last_name].filter(Boolean).join(' ')
            fragmento.append(opcion)
        }

        selector.replaceChildren(fragmento)
    } catch (error) {
        console.error('Error al cargar los empleados:', error)
        selector.replaceChildren()
        const opcion = document.createElement('option')
        opcion.value = ''
        opcion.textContent = 'No se pudieron cargar los empleados'
        selector.append(opcion)
    }
}

function configurarSolicitudAusencia() {
    const boton = document.getElementById('btnSolicitarAusencia')
    const formulario = document.getElementById('formSolicitarAusencia')
    const hoy = new Date().toISOString().slice(0, 10)

    boton?.addEventListener('click', cargarEmpleadosAusencia)

    for (const id of ['ausenciaInicio', 'ausenciaFin']) {
        const campo = document.getElementById(id)
        if (campo && !campo.min) campo.min = hoy
    }

    if (!formulario || formulario.dataset.configurado === 'true') return
    formulario.addEventListener('submit', registrarAusencia)
    formulario.dataset.configurado = 'true'
}

async function registrarAusencia(evento) {
    evento.preventDefault()

    const idEmpleado = document.getElementById('ausenciaEmpleado')?.value ?? ''
    const tipo = document.getElementById('ausenciaTipo')?.value ?? ''
    const inicio = document.getElementById('ausenciaInicio')?.value ?? ''
    const fin = document.getElementById('ausenciaFin')?.value ?? ''
    const dias = document.getElementById('ausenciaDias')?.value ?? ''

    limpiarCamposAusencia()
    ocultarAlertaAusencia()

    const errores = []
    if (!idEmpleado) {
        marcarCampoAusencia('id_employee', 'Selecciona un empleado')
        errores.push('Selecciona un empleado')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) {
        marcarCampoAusencia('start_date', 'Fecha no válida')
        errores.push('La fecha de inicio no es válida')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fin) || (inicio && fin < inicio)) {
        marcarCampoAusencia('end_date', 'Fecha no válida')
        errores.push('La fecha de fin no puede ser anterior al inicio')
    }
    if (!Number.isInteger(Number(dias)) || Number(dias) < 1 || Number(dias) > 365) {
        marcarCampoAusencia('days', 'Días no válidos')
        errores.push('Indica entre 1 y 365 días')
    }
    if (errores.length) {
        mostrarAlertaAusencia(errores.join(' '), 'danger')
        return
    }

    const cuerpo = {
        id_employee: Number(idEmpleado),
        type: tipo,
        start_date: inicio,
        end_date: fin,
        days: Number(dias)
    }

    const boton = document.getElementById('botonGuardarAusencia')
    if (boton) boton.disabled = true
    setText('ausenciasDetalle', 'Registrando ausencia...')

    try {
        const resultado = await window.HORIZON_API.solicitarAusencia(cuerpo)
        setText('ausenciasDetalle', resultado?.message ?? 'Ausencia solicitada')
        evento.currentTarget.reset()
        limpiarCamposAusencia()
        ocultarAlertaAusencia()
        cerrarModalAusencia()
        await recargarAusencias()
    } catch (error) {
        console.error('Error al solicitar la ausencia:', error)

        const detalles = Array.isArray(error.data?.errors) ? error.data.errors : []
        for (const detalle of detalles) marcarCampoAusencia(detalle.path, detalle.message)
        const mensaje = detalles.length
            ? detalles.map((detalle) => `${detalle.path}: ${detalle.message}`).join(' ')
            : error.message ?? 'No se pudo solicitar la ausencia'
        mostrarAlertaAusencia(mensaje, 'danger')
        setText('ausenciasDetalle', 'No se pudo solicitar la ausencia')
    } finally {
        if (boton) boton.disabled = false
    }
}

async function cargarIndicadores(salarioActual) {
    salarioVigente = Number(salarioActual ?? 0)
    const nombres = [
        'rotación', 'ausentismo', 'contratos por vencer', 'decisiones',
        'actividad', 'hitos', 'nómina', 'expedientes', 'permisos', 'ausencias'
    ]

    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getRotacion(),
        window.HORIZON_API.getAusentismo(),
        window.HORIZON_API.getContratosPorVencer(),
        window.HORIZON_API.getDecisiones(),
        window.HORIZON_API.getActividad(),
        window.HORIZON_API.getHitos(),
        window.HORIZON_API.getNomina(),
        window.HORIZON_API.getExpedientes(),
        window.HORIZON_API.getPermisos(),
        window.HORIZON_API.getAusencias()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al cargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    const valor = (indice) => peticiones[indice].status === 'fulfilled' ? peticiones[indice].value : null

    renderizarRotacion(valor(0))
    renderizarAusentismo(valor(1))

    datosDecisiones = valor(3)
    puedeGestionarRRHH = ['RRHH', 'ADMIN'].includes(peticiones[8].value?.nivel)
    configurarAccionesDecisiones()
    configurarAccionesAusencias()
    configurarHito()
    configurarSolicitudAusencia()
    configurarCierreNomina()
    renderizarDecisiones(datosDecisiones, puedeGestionarRRHH)
    datosAusencias = valor(9)
    renderizarAusencias(datosAusencias, puedeGestionarRRHH)

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
