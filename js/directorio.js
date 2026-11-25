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
let puedeExportar = false
let exportacionConfigurada = false

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
            puedeExportar = false
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

    boton.hidden = !puedeExportar
    if (exportacionConfigurada) return

    boton.addEventListener('click', descargarEmpleados)
    exportacionConfigurada = true
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

    puedeExportar = ['RRHH', 'ADMIN'].includes(permisos.value?.nivel)
    configurarExportacion()
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

async function verDetalle(id) {
    if (!id) return

    const modalElemento = document.getElementById('detalleEmpleado')
    const contenido = document.getElementById('detalleEmpleadoContenido')
    const titulo = document.getElementById('detalleEmpleadoTitulo')
    if (!modalElemento || !contenido) return

    contenido.textContent = 'Cargando...'
    if (titulo) titulo.textContent = 'Empleado'

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(modalElemento).show()
    }

    try {
        const data = await window.HORIZON_API.getEmployeeById(id)
        const empleado = data?.employee ?? {}
        if (titulo) titulo.textContent = nombreCompleto(empleado) || identidad(empleado) || 'Empleado'
        contenido.replaceChildren(crearDetalle(empleado))
    } catch (error) {
        console.error('Error al cargar el detalle del empleado:', error)
        contenido.textContent = error.message
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
