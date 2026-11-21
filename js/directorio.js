const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const etiquetasSede = { NORTH: 'Norte', CENTER: 'Centro', SOUTH: 'Sur' }

let empleados = []
let catalogos = { roles: [], sedes: [], departments: [], contractTypes: [], positions: [] }
let filtros = { department: '', sede: '', contract_type: '' }

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

function actualizarContador(visibles) {
    const contador = document.getElementById('directorioEmpleadosCount')
    if (contador) {
        contador.textContent = visibles === empleados.length
            ? `${formatoNumero.format(empleados.length)} empleados`
            : `Mostrando ${formatoNumero.format(visibles)} de ${formatoNumero.format(empleados.length)} empleados`
    }

    setText(
        'directorioPaginadoText',
        `Mostrando ${formatoNumero.format(visibles)} de ${formatoNumero.format(empleados.length)} empleados`
    )
}

function renderizarEmpleados(filtro = '') {
    const tbody = document.getElementById('directorioEmpleadosBody')
    if (!tbody) return

    const texto = filtro.trim().toLowerCase()
    const visibles = empleados.filter((empleado) => {
        const buscado = `${nombreCompleto(empleado)} ${empleado.email ?? ''} ${empleado.id ?? ''}`.toLowerCase()
        if (texto && !buscado.includes(texto)) return false
        if (filtros.sede && empleado.sede !== filtros.sede) return false
        if (filtros.department && empleado.department !== filtros.department) return false
        if (filtros.contract_type && empleado.contract_type !== filtros.contract_type) return false
        return true
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
    actualizarContador(visibles)
}

async function cargarEmpleados() {
    try {
        const data = await window.HORIZON_API.getEmployees()
        empleados = normalizarEmpleados(data)
        renderizarEmpleados(document.getElementById('buscarEmpleados')?.value ?? '')

        const total = formatoNumero.format(empleados.length)
        setTextSiVacio('directorioPersonasActivas', total)
        setTextSiVacio('navTotalEmpleados', total)
    } catch (error) {
        // El backend responde 404 cuando aún no hay empleados registrados.
        if (error.status === 404) {
            empleados = []
            renderizarEmpleados()
            return
        }

        console.error('Error al cargar el directorio:', error)
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
            renderizarEmpleados(document.getElementById('buscarEmpleados')?.value ?? '')
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

async function cargarIndicadores() {
    const [resumen, evolucion, porSede] = await Promise.allSettled([
        window.HORIZON_API.getResumen(),
        window.HORIZON_API.getEvolucionContrataciones(),
        window.HORIZON_API.getEmpleadosBySede()
    ])

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
    cargarCatalogos()
    cargarEmpleados()
    cargarIndicadores()

    document.getElementById('selectorSede')?.addEventListener('change', actualizarOpcionesDepartamentos)

    document.getElementById('buscarEmpleados')?.addEventListener('input', (evento) => {
        renderizarEmpleados(evento.target.value)
    })

    document.getElementById('formularioRegistro')?.addEventListener('submit', registrarEmpleado)
})
