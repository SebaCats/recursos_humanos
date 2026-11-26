const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const etiquetasSede = { NORTH: 'Norte', CENTER: 'Centro', SOUTH: 'Sur' }

const EMPLEADOS_POR_PAGINA = 10

let empleados = []
let catalogos = { roles: [], sedes: [], departments: [], contractTypes: [], positions: [] }
let filtros = { department: '', sede: '', contract_type: '' }
let pagina = 1
let totalEmpleados = 0
let totalPaginas = 1
let temporizadorBusqueda
let solicitudActual = 0
let puedeRRHH = false
let puedeAdmin = false
let exportacionConfigurada = false
let importacionConfigurada = false
let filasImportacion = []
let nombreArchivoImportacion = ''
let accionesContratoConfiguradas = false
let empleadoSeleccionado = null
let empleadoSeleccionadoNombre = ''
let solicitudExpediente = 0

function setText(id, texto) {
    const elemento = document.getElementById(id)
    if (elemento) elemento.textContent = texto
}

function setTextSiVacio(id, texto) {
    const elemento = document.getElementById(id)
    if (elemento && elemento.textContent.trim() === '—') elemento.textContent = texto
}

function nombreCompleto(empleado) {
    return [empleado.name, empleado.last_name].filter(Boolean).join(' ')
}

function identidad(empleado) {
    return empleado.id ? `EMP-${String(empleado.id).padStart(4, '0')}` : ''
}

function etiquetaSede(nombre) {
    return etiquetasSede[nombre] ?? nombre ?? ''
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

function celda(valor) {
    const td = document.createElement('td')
    td.textContent = valor || '—'
    return td
}

function normalizarEmpleados(data) {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.employees)) return data.employees
    return []
}

function crearFila(empleado) {
    const fila = document.createElement('tr')

    const celdaEmpleado = document.createElement('td')
    const nombre = document.createElement('button')
    nombre.type = 'button'
    nombre.className = 'btn btn-link p-0 text-start fw-semibold'
    nombre.textContent = nombreCompleto(empleado) || 'Sin nombre'
    nombre.addEventListener('click', () => verDetalle(empleado.id))

    const detalle = document.createElement('div')
    detalle.textContent = [identidad(empleado), empleado.email].filter(Boolean).join(' - ') || 'Sin correo'

    celdaEmpleado.append(nombre, detalle)

    fila.append(
        celdaEmpleado,
        celda(empleado.department),
        celda(empleado.position),
        celda(etiquetaSede(empleado.sede)),
        celda(empleado.contract_type),
        celda(empleado.estado ?? 'Activo')
    )
    return fila
}

function hayFiltros() {
    const busqueda = document.getElementById('buscarEmpleados')?.value.trim() ?? ''
    return Boolean(busqueda || filtros.department || filtros.sede || filtros.contract_type)
}

function actualizarContadores() {
    const total = formatoNumero.format(totalEmpleados)
    setText('directorioEmpleadosCount', totalEmpleados === 0 ? 'Sin resultados' : `${total} empleados`)

    if (totalEmpleados === 0) {
        setText('directorioPaginadoText', hayFiltros() ? 'No hay resultados para los filtros aplicados' : 'No hay empleados registrados')
        return
    }

    if (empleados.length === 0) {
        setText('directorioPaginadoText', `No hay resultados en la página ${pagina}`)
        return
    }

    const inicio = (pagina - 1) * EMPLEADOS_POR_PAGINA + 1
    const fin = Math.min(inicio + empleados.length - 1, totalEmpleados)
    setText(
        'directorioPaginadoText',
        `Mostrando ${formatoNumero.format(inicio)}–${formatoNumero.format(fin)} de ${total} empleados`
    )
}

function numerosDePagina(actual, total) {
    const candidatos = new Set([1, total, actual - 1, actual, actual + 1])
    const visibles = [...candidatos]
        .filter((numero) => numero >= 1 && numero <= total)
        .sort((a, b) => a - b)

    const resultado = []
    visibles.forEach((numero, indice) => {
        if (indice > 0 && numero - visibles[indice - 1] > 1) resultado.push('…')
        resultado.push(numero)
    })
    return resultado
}

function crearItemPagina(texto, destino, etiqueta, deshabilitado = false, activo = false) {
    const item = document.createElement('li')
    item.className = `page-item${deshabilitado ? ' disabled' : ''}${activo ? ' active' : ''}`

    const enlace = document.createElement('button')
    enlace.type = 'button'
    enlace.className = 'page-link'
    enlace.textContent = texto
    enlace.setAttribute('aria-label', etiqueta)
    if (activo) enlace.setAttribute('aria-current', 'page')

    enlace.dataset.pagina = String(destino)
    if (deshabilitado) enlace.disabled = true

    item.append(enlace)
    return item
}

function renderizarPaginacion() {
    const lista = document.getElementById('paginacionEmpleados')
    if (!lista) return

    const fragmento = document.createDocumentFragment()
    fragmento.append(crearItemPagina('‹', pagina - 1, 'Página anterior', pagina <= 1))

    for (const numero of numerosDePagina(pagina, totalPaginas)) {
        if (numero === '…') {
            const item = document.createElement('li')
            item.className = 'page-item disabled'
            const texto = document.createElement('span')
            texto.className = 'page-link'
            texto.textContent = '…'
            item.append(texto)
            fragmento.append(item)
            continue
        }
        fragmento.append(crearItemPagina(String(numero), numero, `Página ${numero}`, false, numero === pagina))
    }

    fragmento.append(crearItemPagina('›', pagina + 1, 'Página siguiente', pagina >= totalPaginas))
    lista.replaceChildren(fragmento)
}

function renderizarEmpleados() {
    const tbody = document.getElementById('directorioEmpleadosBody')
    if (!tbody) return

    const fragmento = document.createDocumentFragment()

    if (empleados.length === 0) {
        const fila = document.createElement('tr')
        const celdaVacia = document.createElement('td')
        celdaVacia.colSpan = 6
        celdaVacia.className = 'text-center text-body-tertiary'
        celdaVacia.textContent = hayFiltros() ? 'No hay resultados para la búsqueda' : 'No hay empleados registrados'
        fila.append(celdaVacia)
        fragmento.append(fila)
    } else {
        empleados.forEach((empleado) => fragmento.append(crearFila(empleado)))
    }

    tbody.replaceChildren(fragmento)
    actualizarContadores()
    renderizarPaginacion()
}

// Los filtros se aplican en el backend. Este bloque solo se usa si el backend
// desplegado todavía no tiene /employee/getPage: así la paginación sigue
// funcionando con la respuesta completa de /employee/getAll.
function paginarEnCliente(data, parametros) {
    const texto = (parametros.q ?? '').trim().toLowerCase()
    const filtrados = normalizarEmpleados(data).filter((empleado) => {
        const buscado = `${nombreCompleto(empleado)} ${empleado.email ?? ''} ${empleado.id ?? ''}`.toLowerCase()
        if (texto && !buscado.includes(texto)) return false
        if (parametros.sede && empleado.sede !== parametros.sede) return false
        if (parametros.department && empleado.department !== parametros.department) return false
        if (parametros.contract_type && empleado.contract_type !== parametros.contract_type) return false
        return true
    })

    const total = filtrados.length
    const inicio = (parametros.page - 1) * parametros.limit
    return {
        employees: filtrados.slice(inicio, inicio + parametros.limit),
        pagination: {
            page: parametros.page,
            limit: parametros.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / parametros.limit))
        }
    }
}

async function obtenerEmpleados(parametros) {
    try {
        return await window.HORIZON_API.getEmployeesPage(parametros)
    } catch (error) {
        if (error.status !== 404) throw error
        try {
            return paginarEnCliente(await window.HORIZON_API.getEmployees(), parametros)
        } catch (errorGetAll) {
            if (errorGetAll.status === 404) return paginarEnCliente(null, parametros)
            throw errorGetAll
        }
    }
}

async function cargarEmpleados() {
    // Si el usuario cambia de página o escribe rápido, se descartan las
    // respuestas anteriores para no pintar datos de una consulta obsoleta.
    const solicitud = ++solicitudActual

    try {
        const parametros = {
            page: pagina,
            limit: EMPLEADOS_POR_PAGINA,
            q: document.getElementById('buscarEmpleados')?.value ?? '',
            department: filtros.department,
            sede: filtros.sede,
            contract_type: filtros.contract_type
        }

        let data = await obtenerEmpleados(parametros)
        if (solicitud !== solicitudActual) return

        let total = Number(data?.pagination?.total ?? 0)
        let paginas = Math.max(1, Number(data?.pagination?.totalPages) || Math.ceil(total / (data?.pagination?.limit ?? EMPLEADOS_POR_PAGINA)))

        // Si se estaba en una página que ya no existe tras aplicar un filtro,
        // se muestra la última página disponible.
        if (data?.pagination && pagina > paginas && total > 0) {
            pagina = paginas
            parametros.page = pagina
            data = await obtenerEmpleados(parametros)
            if (solicitud !== solicitudActual) return

            total = Number(data?.pagination?.total ?? 0)
            paginas = Math.max(1, Number(data?.pagination?.totalPages) || Math.ceil(total / (data?.pagination?.limit ?? EMPLEADOS_POR_PAGINA)))
        }

        empleados = normalizarEmpleados(data)
        totalEmpleados = total
        totalPaginas = paginas
        if (data?.pagination?.page) pagina = Number(data.pagination.page)

        renderizarEmpleados()

        const totalTexto = formatoNumero.format(totalEmpleados)
        setTextSiVacio('directorioPersonasActivas', totalTexto)
        setTextSiVacio('navTotalEmpleados', totalTexto)
    } catch (error) {
        if (solicitud !== solicitudActual) return
        console.error('Error al cargar el directorio:', error)
        empleados = []
        totalEmpleados = 0
        totalPaginas = 1
        renderizarEmpleados()
        document.getElementById('paginacionEmpleados')?.replaceChildren()
        setText('directorioEmpleadosCount', 'No se pudo cargar el directorio')
        setText('directorioPaginadoText', 'No se pudo cargar el directorio')
    }
}

function poblarSelect(select, opciones, obtenerTexto, obtenerValor, placeholder) {
    if (!select) return

    const textoInicial = placeholder
        ?? select.querySelector('option[value=""]')?.textContent
        ?? 'Seleccionar...'

    const fragmento = document.createDocumentFragment()
    fragmento.append(new Option(textoInicial, ''))

    for (const opcion of opciones) {
        fragmento.append(new Option(obtenerTexto(opcion), obtenerValor(opcion)))
    }

    select.replaceChildren(fragmento)
}

function actualizarOpcionesDepartamentos() {
    const sede = document.getElementById('selectorSede')?.value ?? ''
    const departamentos = catalogos.departments.filter(
        (departamento) => !sede || departamento.sede === sede
    )

    poblarSelect(
        document.getElementById('selectorDepartamento'),
        departamentos,
        (departamento) => `${departamento.name} · ${etiquetaSede(departamento.sede)}`,
        (departamento) => departamento.name,
        sede ? 'Seleccionar...' : 'Seleccionar sede primero...'
    )
}

function poblarFiltro(contenedorId, botonId, opciones, obtenerTexto, obtenerValor, clave, etiquetaGeneral) {
    const contenedor = document.getElementById(contenedorId)
    const boton = document.getElementById(botonId)
    if (!contenedor) return

    const items = [{ valor: '', texto: etiquetaGeneral }]
    for (const opcion of opciones) {
        items.push({ valor: obtenerValor(opcion), texto: obtenerTexto(opcion) })
    }

    const fragmento = document.createDocumentFragment()

    for (const item of items) {
        const li = document.createElement('li')
        const botonItem = document.createElement('button')
        botonItem.type = 'button'
        botonItem.className = 'dropdown-item'
        botonItem.textContent = item.texto
        botonItem.classList.toggle('active', filtros[clave] === item.valor)

        botonItem.addEventListener('click', () => {
            filtros[clave] = item.valor
            if (boton) boton.textContent = item.valor ? item.texto : etiquetaGeneral
            contenedor.querySelectorAll('.dropdown-item').forEach((elemento) => {
                elemento.classList.toggle('active', elemento === botonItem)
            })
            pagina = 1
            cargarEmpleados()
        })

        li.append(botonItem)
        fragmento.append(li)
    }

    contenedor.replaceChildren(fragmento)
}

async function cargarCatalogos() {
    try {
        catalogos = await window.HORIZON_API.getCatalogos()

        poblarSelect(
            document.getElementById('selectorSede'),
            catalogos.sedes,
            (sede) => etiquetaSede(sede.name),
            (sede) => sede.name
        )
        actualizarOpcionesDepartamentos()

        poblarSelect(
            document.getElementById('selectorContrato'),
            catalogos.contractTypes,
            (contrato) => contrato.name,
            (contrato) => contrato.name
        )

        const listaPuestos = document.getElementById('listaPuestos')
        if (listaPuestos) {
            const fragmento = document.createDocumentFragment()
            for (const puesto of catalogos.positions) {
                fragmento.append(new Option(puesto.name, puesto.name))
            }
            listaPuestos.replaceChildren(fragmento)
        }

        const departamentosUnicos = [...new Set(catalogos.departments.map((departamento) => departamento.name))]
            .sort((a, b) => a.localeCompare(b, 'es'))

        poblarFiltro(
            'listaFiltroDepartamento', 'botonFiltroDepartamento',
            departamentosUnicos, (nombre) => nombre, (nombre) => nombre,
            'department', 'Departamentos'
        )
        poblarFiltro(
            'listaFiltroSede', 'botonFiltroSede',
            catalogos.sedes, (sede) => etiquetaSede(sede.name), (sede) => sede.name,
            'sede', 'Sede'
        )
        poblarFiltro(
            'listaFiltroContrato', 'botonFiltroContrato',
            catalogos.contractTypes, (contrato) => contrato.name, (contrato) => contrato.name,
            'contract_type', 'Contrato'
        )
    } catch (error) {
        console.error('Error al cargar los catálogos:', error)
    }
}

async function descargarEmpleados() {
    const boton = document.getElementById('btnExportar')
    if (boton?.disabled) return

    if (boton) boton.disabled = true
    setText('estadoExportacion', 'Generando CSV...')

    try {
        const filtrosExportacion = {
            q: document.getElementById('buscarEmpleados')?.value ?? '',
            department: filtros.department,
            sede: filtros.sede,
            contract_type: filtros.contract_type
        }
        const { blob, nombre } = await window.HORIZON_API.exportarEmpleados(filtrosExportacion)

        const url = URL.createObjectURL(blob)
        const enlace = document.createElement('a')
        enlace.href = url
        enlace.download = nombre
        document.body.append(enlace)
        enlace.click()
        enlace.remove()
        // Se libera en el siguiente tick para que el navegador alcance a iniciar
        // la descarga antes de invalidar la URL temporal.
        setTimeout(() => URL.revokeObjectURL(url), 0)

        setText('estadoExportacion', `CSV descargado: ${nombre}`)
    } catch (error) {
        console.error('Error al exportar los empleados:', error)
        if (error.status === 403) {
            puedeRRHH = false
            if (boton) boton.hidden = true
            setText('estadoExportacion', 'Sin permisos para exportar')
        } else {
            setText('estadoExportacion', error.message ?? 'No se pudo exportar el directorio')
        }
    } finally {
        if (boton) boton.disabled = false
    }
}

function configurarExportacion() {
    const boton = document.getElementById('btnExportar')
    if (!boton) return

    boton.hidden = !puedeRRHH
    if (exportacionConfigurada) return

    boton.addEventListener('click', descargarEmpleados)
    exportacionConfigurada = true
}

const CAMPOS_BAJA = {
    id_employee: 'bajaEmpleado',
    termination_date: 'bajaFecha',
    reason: 'bajaMotivo',
    note: 'bajaNota'
}

const CAMPOS_CONTRATO = {
    id_employee: 'contratoEmpleado',
    position: 'contratoPuesto',
    sede: 'contratoSede',
    department: 'contratoDepartamento',
    contract_type: 'contratoTipo',
    salary: 'contratoSalario',
    end_date: 'contratoFin'
}

function marcarCampo(id, mensaje) {
    const campo = document.getElementById(id)
    if (!campo) return
    if (mensaje) campo.classList.add('is-invalid')
    else campo.classList.remove('is-invalid')
    campo.setAttribute('aria-invalid', String(Boolean(mensaje)))
}

function limpiarCampos(ids) {
    for (const id of ids) marcarCampo(id, '')
}

function mostrarAlerta(id, mensaje, tipo) {
    const alerta = document.getElementById(id)
    if (!alerta) return
    alerta.className = `alert alert-${tipo}`
    alerta.textContent = mensaje
    alerta.classList.remove('d-none')
}

function ocultarAlerta(id) {
    const alerta = document.getElementById(id)
    if (!alerta) return
    alerta.className = 'alert d-none'
    alerta.textContent = ''
}

function cerrarModal(id) {
    const modal = document.getElementById(id)
    if (modal && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrap.Modal.getInstance(modal)?.hide()
    }
}

// Un 403 revoca todas las acciones privilegiadas, no solo la que falló: las
// bandejas, la exportación, la importación y los documentos quedan inactivos.
function sinPermisosContratos(mensaje = 'Sin permisos para gestionar contratos') {
    puedeRRHH = false
    puedeAdmin = false
    configurarExportacion()
    configurarImportacion()
    configurarAccionesContrato()
    document.getElementById('listaDocumentosEmpleado')?.querySelectorAll('select')
        .forEach((elemento) => { elemento.disabled = true })
    setText('estadoContratos', mensaje)
    setText('estadoExpediente', 'Sin permisos para actualizar documentos')
    setText('estadoImportacion', 'Sin permisos para importar empleados')
}

function actualizarDepartamentosContrato() {
    const sede = document.getElementById('contratoSede')?.value ?? ''
    const departamentos = catalogos.departments.filter(
        (departamento) => !sede || departamento.sede === sede
    )

    poblarSelect(
        document.getElementById('contratoDepartamento'),
        departamentos,
        (departamento) => `${departamento.name} · ${etiquetaSede(departamento.sede)}`,
        (departamento) => departamento.name,
        sede ? 'Seleccionar...' : 'Seleccionar sede primero...'
    )
}

function prepararBaja() {
    if (!puedeRRHH || !empleadoSeleccionado) return

    document.getElementById('formRegistrarBaja')?.reset()
    limpiarCampos(Object.values(CAMPOS_BAJA))
    ocultarAlerta('alertaRegistrarBaja')

    const hoy = new Date().toISOString().slice(0, 10)
    const fecha = document.getElementById('bajaFecha')
    if (fecha) {
        fecha.max = hoy
        fecha.value = hoy
    }
    const campoId = document.getElementById('bajaEmpleado')
    if (campoId) campoId.value = String(empleadoSeleccionado)
    setText('bajaEmpleadoNombre', empleadoSeleccionadoNombre || String(empleadoSeleccionado))
    setText('estadoContratos', '')
}

function prepararContrato() {
    if (!puedeRRHH || !empleadoSeleccionado) return

    document.getElementById('formNuevoContrato')?.reset()
    limpiarCampos(Object.values(CAMPOS_CONTRATO))
    ocultarAlerta('alertaNuevoContrato')

    const campoId = document.getElementById('contratoEmpleado')
    if (campoId) campoId.value = String(empleadoSeleccionado)
    setText('contratoEmpleadoNombre', empleadoSeleccionadoNombre || String(empleadoSeleccionado))

    const hoy = new Date().toISOString().slice(0, 10)
    const fin = document.getElementById('contratoFin')
    if (fin) fin.min = hoy

    poblarSelect(
        document.getElementById('contratoSede'),
        catalogos.sedes,
        (sede) => etiquetaSede(sede.name),
        (sede) => sede.name,
        'Seleccionar...'
    )
    poblarSelect(
        document.getElementById('contratoTipo'),
        catalogos.contractTypes,
        (tipo) => tipo.name,
        (tipo) => tipo.name,
        'Seleccionar...'
    )
    actualizarDepartamentosContrato()
    setText('estadoContratos', '')
}

function configurarAccionesContrato() {
    const seccion = document.getElementById('detalleContratosContenido')
    if (seccion) seccion.hidden = !puedeRRHH || !empleadoSeleccionado

    const botonBaja = document.getElementById('btnRegistrarBaja')
    if (botonBaja && botonBaja.dataset.configurado !== 'true') {
        botonBaja.addEventListener('click', prepararBaja)
        botonBaja.dataset.configurado = 'true'
    }
    const botonContrato = document.getElementById('btnNuevoContrato')
    if (botonContrato && botonContrato.dataset.configurado !== 'true') {
        botonContrato.addEventListener('click', prepararContrato)
        botonContrato.dataset.configurado = 'true'
    }

    const formBaja = document.getElementById('formRegistrarBaja')
    if (formBaja && formBaja.dataset.configurado !== 'true') {
        formBaja.addEventListener('submit', registrarBaja)
        formBaja.dataset.configurado = 'true'
    }
    const formContrato = document.getElementById('formNuevoContrato')
    if (formContrato && formContrato.dataset.configurado !== 'true') {
        formContrato.addEventListener('submit', registrarContrato)
        formContrato.dataset.configurado = 'true'
    }

    const sede = document.getElementById('contratoSede')
    if (sede && sede.dataset.configurado !== 'true') {
        sede.addEventListener('change', actualizarDepartamentosContrato)
        sede.dataset.configurado = 'true'
    }
}

// Las dos escrituras afectan al directorio, a los KPIs y a la ficha abierta.
// No hay caché que invalidar: se vuelven a pedir las mismas rutas de siempre.
async function recargarTrasContrato(id) {
    const nombres = ['empleados', 'indicadores', 'detalle']
    const peticiones = await Promise.allSettled([
        cargarEmpleados(),
        cargarIndicadores(),
        verDetalle(id, { abrir: false })
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al recargar ${nombres[indice]}:`, peticion.reason)
        }
    })
}

function erroresDeValidacion(error, campos, mensajeGenerico) {
    const detalles = Array.isArray(error?.data?.errors) ? error.data.errors : []
    for (const detalle of detalles) {
        const id = campos[detalle.path]
        if (id) marcarCampo(id, detalle.message)
    }
    if (!detalles.length) return error?.message ?? mensajeGenerico
    return detalles.map((detalle) => `${detalle.path}: ${detalle.message}`).join(' ')
}

async function registrarBaja(evento) {
    evento.preventDefault()

    if (!puedeRRHH || !empleadoSeleccionado) {
        mostrarAlerta('alertaRegistrarBaja', 'Sin permisos para registrar la baja', 'danger')
        return
    }

    const hoy = new Date().toISOString().slice(0, 10)
    const fecha = document.getElementById('bajaFecha')?.value.trim() ?? ''
    const motivo = document.getElementById('bajaMotivo')?.value.trim() ?? ''
    const nota = document.getElementById('bajaNota')?.value.trim() ?? ''

    limpiarCampos(Object.values(CAMPOS_BAJA))
    ocultarAlerta('alertaRegistrarBaja')

    const errores = []
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoy) {
        marcarCampo(CAMPOS_BAJA.termination_date, 'Fecha no válida')
        errores.push('La fecha de baja debe ser válida y no futura')
    }
    if (motivo.length < 3 || motivo.length > 200) {
        marcarCampo(CAMPOS_BAJA.reason, 'Motivo no válido')
        errores.push('El motivo debe tener entre 3 y 200 caracteres')
    }
    if (nota.length > 500) {
        marcarCampo(CAMPOS_BAJA.note, 'Nota demasiado larga')
        errores.push('La nota no puede superar los 500 caracteres')
    }
    if (errores.length) {
        mostrarAlerta('alertaRegistrarBaja', errores.join(' '), 'danger')
        return
    }

    const cuerpo = {
        id_employee: Number(empleadoSeleccionado),
        termination_date: fecha,
        reason: motivo
    }
    if (nota) cuerpo.note = nota

    const boton = document.getElementById('botonGuardarBaja')
    if (boton) boton.disabled = true
    setText('estadoContratos', 'Registrando baja...')

    try {
        const resultado = await window.HORIZON_API.registrarBaja(cuerpo)
        cerrarModal('modalRegistrarBaja')
        await recargarTrasContrato(empleadoSeleccionado)
        setText('estadoContratos', resultado?.message ?? 'Baja registrada')
    } catch (error) {
        console.error('Error al registrar la baja:', error)

        if (error.status === 403) {
            sinPermisosContratos('Sin permisos para registrar la baja')
            mostrarAlerta('alertaRegistrarBaja', error.message, 'danger')
            return
        }
        if (error.status === 401) return

        const mensaje = erroresDeValidacion(error, CAMPOS_BAJA, 'No se pudo registrar la baja')
        mostrarAlerta('alertaRegistrarBaja', mensaje, 'danger')
        setText('estadoContratos', 'No se pudo registrar la baja')
    } finally {
        if (boton) boton.disabled = false
    }
}

async function registrarContrato(evento) {
    evento.preventDefault()

    if (!puedeRRHH || !empleadoSeleccionado) {
        mostrarAlerta('alertaNuevoContrato', 'Sin permisos para registrar el contrato', 'danger')
        return
    }

    const hoy = new Date().toISOString().slice(0, 10)
    const puesto = document.getElementById('contratoPuesto')?.value.trim() ?? ''
    const sede = document.getElementById('contratoSede')?.value.trim() ?? ''
    const departamento = document.getElementById('contratoDepartamento')?.value.trim() ?? ''
    const tipo = document.getElementById('contratoTipo')?.value.trim() ?? ''
    const salario = Number(document.getElementById('contratoSalario')?.value ?? '')
    const fin = document.getElementById('contratoFin')?.value.trim() ?? ''

    limpiarCampos(Object.values(CAMPOS_CONTRATO))
    ocultarAlerta('alertaNuevoContrato')

    const errores = []
    if (puesto.length < 3 || puesto.length > 100) {
        marcarCampo(CAMPOS_CONTRATO.position, 'Puesto no válido')
        errores.push('El puesto debe tener entre 3 y 100 caracteres')
    }
    if (!sede) {
        marcarCampo(CAMPOS_CONTRATO.sede, 'Selecciona una sede')
        errores.push('Selecciona una sede')
    }
    if (!departamento) {
        marcarCampo(CAMPOS_CONTRATO.department, 'Selecciona un departamento')
        errores.push('Selecciona un departamento')
    }
    if (!tipo) {
        marcarCampo(CAMPOS_CONTRATO.contract_type, 'Selecciona un tipo')
        errores.push('Selecciona un tipo de contrato')
    }
    if (!Number.isFinite(salario) || salario < 500000 || salario > 10000000) {
        marcarCampo(CAMPOS_CONTRATO.salary, 'Salario no válido')
        errores.push('El salario debe estar entre $ 500.000 y $ 10.000.000')
    }
    if (fin && (!/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < hoy)) {
        marcarCampo(CAMPOS_CONTRATO.end_date, 'Fecha no válida')
        errores.push('La fecha de fin no puede ser anterior a hoy')
    }
    if (errores.length) {
        mostrarAlerta('alertaNuevoContrato', errores.join(' '), 'danger')
        return
    }

    const cuerpo = {
        id_employee: Number(empleadoSeleccionado),
        position: puesto,
        sede,
        department: departamento,
        contract_type: tipo,
        salary: salario
    }
    if (fin) cuerpo.end_date = fin

    const boton = document.getElementById('botonGuardarContrato')
    if (boton) boton.disabled = true
    setText('estadoContratos', 'Registrando contrato...')

    try {
        const resultado = await window.HORIZON_API.crearContrato(cuerpo)
        cerrarModal('modalNuevoContrato')
        await recargarTrasContrato(empleadoSeleccionado)
        setText('estadoContratos', resultado?.message ?? 'Contrato registrado')
    } catch (error) {
        console.error('Error al registrar el contrato:', error)

        if (error.status === 403) {
            sinPermisosContratos('Sin permisos para registrar el contrato')
            mostrarAlerta('alertaNuevoContrato', error.message, 'danger')
            return
        }
        if (error.status === 401) return

        const mensaje = erroresDeValidacion(error, CAMPOS_CONTRATO, 'No se pudo registrar el contrato')
        mostrarAlerta('alertaNuevoContrato', mensaje, 'danger')
        setText('estadoContratos', 'No se pudo registrar el contrato')
    } finally {
        if (boton) boton.disabled = false
    }
}

async function cargarIndicadores() {
    const nombres = ['resumen', 'evolución', 'sedes', 'contratos por vencer', 'expedientes', 'permisos']
    const peticiones = await Promise.allSettled([
        window.HORIZON_API.getResumen(),
        window.HORIZON_API.getEvolucionContrataciones(),
        window.HORIZON_API.getEmpleadosBySede(),
        window.HORIZON_API.getContratosPorVencer(),
        window.HORIZON_API.getExpedientes(),
        window.HORIZON_API.getPermisos()
    ])
    const [resumen, evolucion, porSede, porVencer, expedientes, permisos] = peticiones

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al cargar ${nombres[indice]}:`, peticion.reason)
        }
    })

    if (resumen.status === 'fulfilled') {
        const datos = resumen.value
        const total = formatoNumero.format(Number(datos.totalEmployees ?? 0))
        setText('directorioPersonasActivas', total)
        setText('navTotalEmpleados', total)

        const sedes = porSede.status === 'fulfilled' && porSede.value.length > 0
            ? porSede.value.length
            : datos.totalSedes
        setText(
            'directorioCobertura',
            `En ${sedes} sedes y ${datos.totalDepartments} departamentos`
        )
    } else {
        console.error('Error al cargar el resumen:', resumen.reason)
    }

    if (evolucion.status === 'fulfilled') {
        const ultimoMes = evolucion.value.at(-1)
        setText('directorioIncorporaciones', formatoNumero.format(Number(ultimoMes?.cantidad ?? 0)))
    } else {
        console.error('Error al cargar la evolución:', evolucion.reason)
    }

    if (porSede.status === 'rejected') {
        console.error('Error al cargar las sedes:', porSede.reason)
    }

    if (porVencer.status === 'fulfilled') {
        const cantidad = Number(porVencer.value?.cantidad ?? 0)
        setText('directorioContratosVencer', formatoNumero.format(cantidad))
        setText(
            'directorioContratosDetalle',
            cantidad === 0 ? 'Ninguno en los próximos 60 días' : 'En los próximos 60 días'
        )
    } else {
        console.error('Error al cargar los contratos por vencer:', porVencer.reason)
    }

    if (expedientes.status === 'fulfilled') {
        const datos = expedientes.value
        setText('directorioExpedientesCompletos', `${datos?.porcentaje ?? 0} %`)
        setText(
            'directorioExpedientesDetalle',
            Number(datos?.total ?? 0) === 0
                ? 'Sin documentos registrados'
                : `${datos.pendientes} ${datos.pendientes === 1 ? 'expediente por' : 'expedientes por'} actualizar`
        )
    } else {
        console.error('Error al cargar los expedientes:', expedientes.reason)
    }

    const nivel = permisos.status === 'fulfilled' ? permisos.value?.nivel : null
    puedeRRHH = ['RRHH', 'ADMIN'].includes(nivel)
    puedeAdmin = nivel === 'ADMIN'
    configurarExportacion()
    configurarImportacion()
    configurarAccionesContrato()
}

function crearDetalle(empleado) {
    const lista = document.createElement('dl')
    lista.className = 'row mb-0'

    const campos = [
        ['ID', identidad(empleado)],
        ['Correo', empleado.email],
        ['Departamento', empleado.department],
        ['Puesto', empleado.position],
        ['Sede', etiquetaSede(empleado.sede)],
        ['Tipo de contrato', empleado.contract_type],
        ['Salario', empleado.salary ? `$${formatoNumero.format(Number(empleado.salary))}` : ''],
        ['Rol', empleado.role],
        ['Alta', empleado.created_at ? new Date(empleado.created_at).toLocaleDateString('es-CO') : '']
    ]

    for (const [etiqueta, valor] of campos) {
        const dt = document.createElement('dt')
        dt.className = 'col-sm-4 text-body-tertiary'
        dt.textContent = etiqueta

        const dd = document.createElement('dd')
        dd.className = 'col-sm-8'
        dd.textContent = valor || '—'

        lista.append(dt, dd)
    }

    return lista
}

const ETIQUETAS_DOCUMENTO = {
    IDENTIFICACION: 'Identificación',
    CONTRATO: 'Contrato',
    HOJA_DE_VIDA: 'Hoja de vida',
    CERTIFICADO: 'Certificado',
    OTRO: 'Otro'
}
const ESTADOS_DOCUMENTO = ['PENDIENTE', 'ACTUALIZADO', 'VENCIDO']

function claseEstadoDocumento(estado) {
    if (estado === 'ACTUALIZADO') return 'text-bg-success'
    if (estado === 'VENCIDO') return 'text-bg-danger'
    return 'text-bg-warning'
}

function actualizarKpiExpedientes() {
    return window.HORIZON_API.getExpedientes().then((datos) => {
        setText('directorioExpedientesCompletos', `${datos?.porcentaje ?? 0} %`)
        setText(
            'directorioExpedientesDetalle',
            Number(datos?.total ?? 0) === 0
                ? 'Sin documentos registrados'
                : `${datos.pendientes} ${datos.pendientes === 1 ? 'expediente por' : 'expedientes por'} actualizar`
        )
    }).catch((error) => {
        console.error('Error al actualizar el indicador de expedientes:', error)
    })
}

function renderizarDocumentosEmpleado(documentos, idEmpleado) {
    const lista = document.getElementById('listaDocumentosEmpleado')
    if (!lista) return

    const propios = documentos.filter(
        (documento) => String(documento.id_employee) === String(idEmpleado)
    )

    if (propios.length === 0) {
        lista.textContent = 'Sin documentos registrados para este empleado'
        return
    }

    const fragmento = document.createDocumentFragment()
    for (const documento of propios) {
        const fila = document.createElement('div')
        fila.className = 'd-flex justify-content-between align-items-center gap-2 py-1 border-bottom'

        const informacion = document.createElement('div')
        const titulo = document.createElement('div')
        titulo.className = 'small fw-semibold'
        titulo.textContent = ETIQUETAS_DOCUMENTO[documento.document_type] ?? documento.document_type
        const estado = document.createElement('span')
        estado.className = `badge ${claseEstadoDocumento(documento.status)}`
        estado.textContent = documento.status
        const fecha = document.createElement('small')
        fecha.className = 'text-body-tertiary d-block'
        fecha.textContent = documento.updated_at
            ? `Actualizado: ${fechaCorta(documento.updated_at)}`
            : 'Sin fecha de actualización'
        informacion.append(titulo, estado, fecha)

        const selector = document.createElement('select')
        selector.className = 'form-select form-select-sm w-auto'
        selector.setAttribute('aria-label', `Estado de ${titulo.textContent}`)
        selector.disabled = !puedeRRHH

        for (const valor of ESTADOS_DOCUMENTO) {
            const opcion = document.createElement('option')
            opcion.value = valor
            opcion.textContent = valor
            opcion.selected = valor === documento.status
            selector.append(opcion)
        }
        selector.addEventListener('change', () => cambiarEstadoDocumento(documento, selector, idEmpleado))

        fila.append(informacion, selector)
        fragmento.append(fila)
    }

    lista.replaceChildren(fragmento)
}

async function cambiarEstadoDocumento(documento, selector, idEmpleado) {
    const estadoNuevo = selector.value
    const estadoAnterior = documento.status
    selector.disabled = true
    setText('estadoExpediente', 'Actualizando documento...')

    try {
        const resultado = await window.HORIZON_API.actualizarDocumento(documento.id, estadoNuevo)
        documento.status = estadoNuevo
        documento.updated_at = resultado?.documento?.updated_at ?? new Date().toISOString()
        await Promise.all([cargarDocumentosEmpleado(idEmpleado), actualizarKpiExpedientes()])
        setText('estadoExpediente', resultado?.message ?? 'Documento actualizado')
    } catch (error) {
        console.error('Error al actualizar el documento:', error)
        if (error.status === 403) {
            sinPermisosContratos('Sin permisos para actualizar documentos')
            await cargarDocumentosEmpleado(idEmpleado)
            return
        } else {
            setText('estadoExpediente', error.message ?? 'No se pudo actualizar el documento')
            selector.value = estadoAnterior
            selector.disabled = false
        }
    }
}

const COLUMNAS_IMPORTACION = {
    nombre: 'name', name: 'name',
    apellido: 'last_name', apellidos: 'last_name', last_name: 'last_name', lastname: 'last_name',
    email: 'email', correo: 'email',
    password: 'password', password_temporal: 'password',
    puesto: 'position', position: 'position',
    departamento: 'department', department: 'department',
    sede: 'sede',
    tipo_contrato: 'contract_type', tipo_de_contrato: 'contract_type',
    contract_type: 'contract_type', contracttype: 'contract_type',
    salario: 'salary', salary: 'salary'
}

const CAMPOS_REQUERIDOS_IMPORTACION = [
    'name', 'last_name', 'email', 'position', 'sede', 'department', 'contract_type', 'salary'
]

function normalizarEncabezadoImportacion(texto) {
    return String(texto)
        .replace(/^\uFEFF/, '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s-]+/g, '_')
}

function detectarDelimitadorCsv(texto) {
    const primeraLinea = texto.split(/\r?\n/, 1)[0] ?? ''
    let entreComillas = false
    let puntosYComa = 0
    let comas = 0

    for (let indice = 0; indice < primeraLinea.length; indice++) {
        const caracter = primeraLinea[indice]
        if (caracter === '"') entreComillas = !entreComillas
        else if (!entreComillas && caracter === ';') puntosYComa++
        else if (!entreComillas && caracter === ',') comas++
    }

    return puntosYComa >= comas ? ';' : ','
}

// Parser mínimo para el CSV que exporta el panel: respeta comillas dobles,
// separador `;` (o `,`), BOM UTF-8 y saltos de línea CRLF.
function parsearCsv(texto) {
    const contenido = String(texto).replace(/^\uFEFF/, '')
    const delimitador = detectarDelimitadorCsv(contenido)
    const filas = []
    let fila = []
    let celda = ''
    let entreComillas = false

    for (let indice = 0; indice < contenido.length; indice++) {
        const caracter = contenido[indice]

        if (caracter === '"') {
            if (entreComillas && contenido[indice + 1] === '"') {
                celda += '"'
                indice++
            } else {
                entreComillas = !entreComillas
            }
        } else if (!entreComillas && caracter === delimitador) {
            fila.push(celda)
            celda = ''
        } else if (!entreComillas && (caracter === '\n' || caracter === '\r')) {
            if (caracter === '\r' && contenido[indice + 1] === '\n') indice++
            fila.push(celda)
            if (fila.some((valor) => valor.trim() !== '')) filas.push(fila)
            fila = []
            celda = ''
        } else {
            celda += caracter
        }
    }

    if (celda !== '' || fila.length) {
        fila.push(celda)
        if (fila.some((valor) => valor.trim() !== '')) filas.push(fila)
    }

    return filas
}

function normalizarSalarioImportacion(valor) {
    const texto = String(valor).trim()
    if (/^\d{1,3}(\.\d{3})+$/.test(texto)) return texto.replace(/\./g, '')
    if (/^\d+,\d{2}$/.test(texto)) return texto.replace(',', '.')
    return texto
}

function convertirFilasImportacion(filas) {
    if (!filas.length) throw new Error('El archivo CSV está vacío')

    const cabeceras = filas[0].map(normalizarEncabezadoImportacion)
    const indices = {}
    cabeceras.forEach((cabecera, indice) => {
        const campo = COLUMNAS_IMPORTACION[cabecera]
        if (campo && indices[campo] === undefined) indices[campo] = indice
    })

    const faltantes = CAMPOS_REQUERIDOS_IMPORTACION.filter((campo) => indices[campo] === undefined)
    if (faltantes.length) throw new Error(`Faltan columnas: ${faltantes.join(', ')}`)

    const empleados = []
    for (let indice = 1; indice < filas.length; indice++) {
        const celdas = filas[indice]
        const empleado = {}
        for (const [campo, posicion] of Object.entries(indices)) {
            const valor = (celdas[posicion] ?? '').trim()
            if (!valor) continue
            empleado[campo] = campo === 'salary' ? normalizarSalarioImportacion(valor) : valor
        }
        empleados.push(empleado)
    }

    if (!empleados.length) throw new Error('El CSV no tiene filas de empleados')
    if (empleados.length > 100) throw new Error('Se pueden importar hasta 100 empleados a la vez')
    return empleados
}

function construirTablaImportacion(filas, incluirPassword = false) {
    const tabla = document.createElement('table')
    tabla.className = 'table table-sm table-striped mb-0'

    const cabecera = document.createElement('thead')
    const filaCabecera = document.createElement('tr')
    const titulos = incluirPassword
        ? ['Fila', 'Correo', 'Resultado', 'Detalle']
        : ['Nombre', 'Correo', 'Puesto', 'Salario']

    for (const titulo of titulos) {
        const columna = document.createElement('th')
        columna.textContent = titulo
        filaCabecera.append(columna)
    }
    cabecera.append(filaCabecera)

    const cuerpo = document.createElement('tbody')
    for (const fila of filas) {
        const filaTabla = document.createElement('tr')
        const valores = incluirPassword
            ? [
                String(fila.fila ?? ''),
                fila.email ?? '—',
                fila.ok ? 'Importado' : 'Fallido',
                fila.ok
                    ? (fila.temporaryPassword ? `Contraseña temporal: ${fila.temporaryPassword}` : '')
                    : (fila.error ?? '')
            ]
            : [
                [fila.name, fila.last_name].filter(Boolean).join(' '),
                fila.email ?? '',
                fila.position ?? '',
                fila.salary ?? ''
            ]

        for (const valor of valores) {
            const celda = document.createElement('td')
            celda.textContent = valor
            filaTabla.append(celda)
        }
        cuerpo.append(filaTabla)
    }

    tabla.append(cabecera, cuerpo)
    return tabla
}

const PLANTILLA_IMPORTACION = [
    'nombre;apellido;email;puesto;departamento;sede;tipo_contrato;salario',
    'Ana;Ramírez;ana.ramirez@example.com;Diseñadora;Tecnología;CENTRO;INDEFINIDO;2500000'
].join('\r\n') + '\r\n'

function descargarPlantillaImportacion() {
    const contenido = new Blob([`\uFEFF${PLANTILLA_IMPORTACION}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(contenido)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'plantilla-importar-empleados.csv'
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
    URL.revokeObjectURL(url)
}

function abrirModalImportacion() {
    const modal = document.getElementById('modalImportarEmpleados')
    if (modal && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(modal).show()
    }
}

async function prepararImportacion(archivo) {
    if (!puedeAdmin || !archivo) return

    ocultarAlerta('alertaImportacion')
    setText('estadoImportacion', 'Leyendo archivo...')

    try {
        filasImportacion = convertirFilasImportacion(parsearCsv(await archivo.text()))
        nombreArchivoImportacion = archivo.name || 'empleados.csv'

        const ayuda = document.getElementById('ayudaFormatoImportacion')
        if (ayuda) ayuda.open = false
        setText('resumenImportacion',
            `${filasImportacion.length} ${filasImportacion.length === 1 ? 'empleado listo' : 'empleados listos'} para importar desde ${nombreArchivoImportacion}. Si el CSV no trae contraseña, el backend generará una temporal.`
        )
        const titulo = document.getElementById('tituloVistaPrevia')
        if (titulo) titulo.hidden = false
        const previa = document.getElementById('vistaPreviaImportacion')
        if (previa) {
            previa.hidden = false
            previa.replaceChildren(construirTablaImportacion(filasImportacion.slice(0, 5)))
        }
        const resultados = document.getElementById('resultadosImportacion')
        if (resultados) {
            resultados.hidden = true
            resultados.replaceChildren()
        }
        const boton = document.getElementById('btnConfirmarImportacion')
        if (boton) {
            boton.hidden = false
            boton.disabled = false
        }
        setText('estadoImportacion', `${filasImportacion.length} filas listas para importar`)
    } catch (error) {
        filasImportacion = []
        mostrarAlerta('alertaImportacion', error?.message ?? 'No se pudo leer el CSV', 'danger')
        setText('estadoImportacion', 'No se pudo leer el CSV')
    }

    abrirModalImportacion()
}

async function recargarTrasImportacion() {
    pagina = 1
    const nombres = ['empleados', 'indicadores']
    const peticiones = await Promise.allSettled([
        cargarEmpleados(),
        cargarIndicadores()
    ])

    peticiones.forEach((peticion, indice) => {
        if (peticion.status === 'rejected') {
            console.error(`Error al recargar ${nombres[indice]}:`, peticion.reason)
        }
    })
}

async function ejecutarImportacion() {
    if (!puedeAdmin || !filasImportacion.length) {
        mostrarAlerta('alertaImportacion', 'No hay filas válidas para importar', 'danger')
        return
    }

    const boton = document.getElementById('btnConfirmarImportacion')
    if (boton) boton.disabled = true
    ocultarAlerta('alertaImportacion')
    setText('estadoImportacion', `Importando ${filasImportacion.length} empleados...`)

    try {
        const resultado = await window.HORIZON_API.importarEmpleados(filasImportacion)
        const resultados = Array.isArray(resultado?.resultados) ? resultado.resultados : []
        const insertados = Number(resultado?.insertados ?? 0)
        const fallidos = Number(resultado?.fallidos ?? 0)

        setText('resumenImportacion',
            `${insertados} ${insertados === 1 ? 'empleado importado' : 'empleados importados'}, ${fallidos} ${fallidos === 1 ? 'fallido' : 'fallidos'} de ${resultado?.total ?? filasImportacion.length} filas.`
        )
        const titulo = document.getElementById('tituloVistaPrevia')
        if (titulo) titulo.hidden = true
        const previa = document.getElementById('vistaPreviaImportacion')
        if (previa) previa.hidden = true

        const destino = document.getElementById('resultadosImportacion')
        if (destino) {
            const nota = document.createElement('p')
            nota.className = 'small text-body-tertiary'
            nota.textContent = 'Las contraseñas temporales solo se muestran en esta respuesta: cópialas ahora.'
            destino.hidden = false
            destino.replaceChildren(nota, construirTablaImportacion(resultados, true))
        }
        if (boton) boton.hidden = true
        setText('estadoImportacion', `Importación finalizada: ${insertados} importados, ${fallidos} fallidos`)

        await recargarTrasImportacion()
    } catch (error) {
        console.error('Error al importar empleados:', error)

        if (error.status === 403) {
            puedeAdmin = false
            configurarImportacion()
            mostrarAlerta('alertaImportacion', 'Sin permisos para importar empleados', 'danger')
            setText('estadoImportacion', 'Sin permisos para importar')
            return
        }
        if (error.status === 401) return

        const mensaje = erroresDeValidacion(error, {}, 'No se pudo importar el CSV')
        mostrarAlerta('alertaImportacion', mensaje, 'danger')
        setText('estadoImportacion', 'No se pudo importar el CSV')
    } finally {
        if (boton) boton.disabled = false
    }
}

function configurarImportacion() {
    const grupo = document.getElementById('grupoImportar')
    if (grupo) grupo.hidden = !puedeAdmin

    const archivo = document.getElementById('formFile')
    if (archivo) {
        // El input permanece oculto: el label "Importar CSV" es el único control
        // visible y es el que abre el selector de archivos.
        archivo.hidden = true
        if (archivo.dataset.configurado !== 'true') {
            archivo.addEventListener('change', async (evento) => {
                const seleccionado = evento.target?.files?.[0]
                if (!seleccionado) return
                await prepararImportacion(seleccionado)
                evento.target.value = ''
            })
            archivo.dataset.configurado = 'true'
        }
    }

    const boton = document.getElementById('btnConfirmarImportacion')
    if (boton && boton.dataset.configurado !== 'true') {
        boton.addEventListener('click', ejecutarImportacion)
        boton.dataset.configurado = 'true'
    }

    const formato = document.getElementById('btnFormatoCsv')
    if (formato && formato.dataset.configurado !== 'true') {
        formato.addEventListener('click', () => {
            const ayuda = document.getElementById('ayudaFormatoImportacion')
            if (ayuda) ayuda.open = true
            const confirmar = document.getElementById('btnConfirmarImportacion')
            if (confirmar) confirmar.hidden = true
            abrirModalImportacion()
        })
        formato.dataset.configurado = 'true'
    }

    setText('ejemploCsvImportacion', PLANTILLA_IMPORTACION.trimEnd())
    const plantilla = document.getElementById('btnDescargarPlantilla')
    if (plantilla && plantilla.dataset.configurado !== 'true') {
        plantilla.addEventListener('click', descargarPlantillaImportacion)
        plantilla.dataset.configurado = 'true'
    }

    importacionConfigurada = true
}

async function cargarDocumentosEmpleado(idEmpleado) {
    const seccion = document.getElementById('detalleExpedienteContenido')
    const lista = document.getElementById('listaDocumentosEmpleado')
    if (!seccion || !lista) return

    const solicitud = ++solicitudExpediente
    seccion.hidden = false
    setText('estadoExpediente', '')
    lista.textContent = 'Cargando documentos...'

    try {
        const datos = await window.HORIZON_API.getExpedientesDetalle()
        if (solicitud !== solicitudExpediente) return
        renderizarDocumentosEmpleado(Array.isArray(datos) ? datos : [], idEmpleado)
    } catch (error) {
        if (solicitud !== solicitudExpediente) return
        console.error('Error al cargar el expediente:', error)
        lista.textContent = 'No se pudo cargar el expediente'
        setText('estadoExpediente', 'No se pudo cargar el expediente')
    }
}

// `abrir: false` se usa al recargar la ficha tras una escritura: actualiza el
// contenido sin volver a mostrar una modal que el usuario pudo cerrar.
async function verDetalle(id, { abrir = true } = {}) {
    if (!id) return

    empleadoSeleccionado = String(id)
    empleadoSeleccionadoNombre = ''
    configurarAccionesContrato()

    const modalElemento = document.getElementById('detalleEmpleado')
    const contenido = document.getElementById('detalleEmpleadoContenido')
    const titulo = document.getElementById('detalleEmpleadoTitulo')
    if (!modalElemento || !contenido) return

    contenido.textContent = 'Cargando...'
    if (titulo) titulo.textContent = 'Empleado'

    const expediente = document.getElementById('detalleExpedienteContenido')
    if (expediente) expediente.hidden = true
    setText('estadoExpediente', '')

    if (abrir && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(modalElemento).show()
    }

    try {
        const data = await window.HORIZON_API.getEmployeeById(id)
        const empleado = data?.employee ?? {}
        const nombre = nombreCompleto(empleado) || identidad(empleado) || 'Empleado'
        if (titulo) titulo.textContent = nombre
        empleadoSeleccionadoNombre = nombre
        configurarAccionesContrato()
        contenido.replaceChildren(crearDetalle(empleado))
        await cargarDocumentosEmpleado(id)
    } catch (error) {
        console.error('Error al cargar el detalle del empleado:', error)
        contenido.textContent = error.message
        const expediente = document.getElementById('detalleExpedienteContenido')
        if (expediente) expediente.hidden = true
    }
}

// La búsqueda global del encabezado usa esta función para abrir la modal en
// lugar de recargar la página con el empleado como filtro.
window.verDetalle = verDetalle

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
        const temporal = resultado?.result?.temporaryPassword ?? resultado?.temporaryPassword
        mostrarRespuesta(
            temporal
                ? `Empleado registrado. Contraseña temporal: ${temporal}`
                : 'Empleado registrado correctamente',
            'success'
        )
        formulario.reset()
        const buscador = document.getElementById('buscarEmpleados')
        if (buscador) buscador.value = ''
        pagina = 1
        await Promise.all([cargarCatalogos(), cargarEmpleados(), cargarIndicadores()])
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
    // La búsqueda global del encabezado puede abrir el directorio con ?q=...
    const qInicial = new URLSearchParams(window.location.search).get('q')
    if (qInicial) {
        const buscador = document.getElementById('buscarEmpleados')
        if (buscador) buscador.value = qInicial
    }

    cargarCatalogos()
    cargarEmpleados()
    cargarIndicadores()

    document.getElementById('selectorSede')?.addEventListener('change', actualizarOpcionesDepartamentos)

    document.getElementById('buscarEmpleados')?.addEventListener('input', () => {
        clearTimeout(temporizadorBusqueda)
        temporizadorBusqueda = setTimeout(() => {
            pagina = 1
            cargarEmpleados()
        }, 250)
    })

    const buscadorEmpleados = document.getElementById('buscarEmpleados')
    const botonBuscarEmpleados = document.getElementById('btnBuscarEmpleadosMovil')
    botonBuscarEmpleados?.addEventListener('click', () => {
        const abierto = buscadorEmpleados?.classList.toggle('mobile-search-open') ?? false
        botonBuscarEmpleados.setAttribute('aria-expanded', String(abierto))
        if (abierto) buscadorEmpleados?.focus()
    })

    document.getElementById('paginacionEmpleados')?.addEventListener('click', (evento) => {
        const boton = evento.target.closest('button[data-pagina]')
        if (!boton || boton.disabled) return

        const destino = Number(boton.dataset.pagina)
        if (!Number.isInteger(destino) || destino === pagina) return

        pagina = destino
        cargarEmpleados()
    })

    document.getElementById('formularioRegistro')?.addEventListener('submit', registrarEmpleado)
})
