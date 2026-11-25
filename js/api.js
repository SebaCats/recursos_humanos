// Cliente único del API de Recursos Humanos.
//
// Todas las peticiones llevan `credentials: 'include'` para enviar la cookie
// HttpOnly de sesión. Las rutas privadas son las que declaran el backend detrás
// del middleware checkSession.
const API_BASE = window.HORIZON_API_BASE ?? ''

class ApiError extends Error {
    constructor(message, status, data) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }
}

function mensajeDeError(data, status) {
    if (data?.message) return data.message
    if (data?.mensaje) return data.mensaje
    if (Array.isArray(data?.errors) && data.errors[0]?.message) {
        return data.errors[0].message
    }
    return status === 401 ? 'Sesión inválida o expirada' : 'Error en la petición'
}

const MESES_EVOLUCION = 12
const DIAS_EVOLUCION = 7

function extraerCantidades(evolucion, campo, longitud) {
    const porFecha = new Map()

    if (Array.isArray(evolucion)) {
        for (const fila of evolucion) {
            const valor = fila?.[campo]
            if (typeof valor !== 'string') continue

            const clave = valor.slice(0, longitud)
            if (!/^\d{4}-\d{2}(-\d{2})?$/.test(clave)) continue

            const cantidad = Number(fila.cantidad ?? 0)
            porFecha.set(clave, (porFecha.get(clave) ?? 0) + (Number.isFinite(cantidad) ? cantidad : 0))
        }
    }

    return porFecha
}

// El backend devuelve los 12 meses con altas y plantilla acumulada. Se vuelve
// a completar por si una versión anterior solo envía los meses con altas: en
// ese caso la plantilla se reconstruye sumando las altas mensuales.
function normalizarEvolucion(evolucion) {
    const porMes = extraerCantidades(evolucion, 'mes', 7)
    const porPlantilla = new Map()

    if (Array.isArray(evolucion)) {
        for (const fila of evolucion) {
            const valor = fila?.mes
            if (typeof valor !== 'string') continue

            const clave = valor.slice(0, 7)
            if (!/^\d{4}-\d{2}$/.test(clave)) continue

            const plantilla = Number(fila.plantilla ?? 0)
            porPlantilla.set(clave, Number.isFinite(plantilla) ? plantilla : 0)
        }
    }

    const ahora = new Date()
    let acumulado = 0

    return Array.from({ length: MESES_EVOLUCION }, (_, indice) => {
        const fecha = new Date(Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth() - (MESES_EVOLUCION - 1 - indice),
            1
        ))
        const clave = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`
        const cantidad = porMes.get(clave) ?? 0

        acumulado = porPlantilla.has(clave)
            ? porPlantilla.get(clave)
            : acumulado + cantidad

        return { fecha: clave, cantidad, plantilla: acumulado }
    })
}

function inicioSemana(fecha) {
    const inicio = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))
    inicio.setUTCDate(inicio.getUTCDate() - ((inicio.getUTCDay() + 6) % 7))
    return inicio
}

// El endpoint semanal ya devuelve los 7 días, pero se normaliza igual para que
// la gráfica tenga una serie continua aunque falte algún día en la respuesta.
function normalizarEvolucionSemana(evolucion) {
    const porDia = extraerCantidades(evolucion, 'fecha', 10)
    const claves = [...porDia.keys()].sort()
    const primera = claves.length ? new Date(`${claves[0]}T00:00:00Z`) : inicioSemana(new Date())
    const inicio = Number.isNaN(primera.getTime()) ? inicioSemana(new Date()) : primera

    return Array.from({ length: DIAS_EVOLUCION }, (_, indice) => {
        const fecha = new Date(inicio)
        fecha.setUTCDate(fecha.getUTCDate() + indice)
        const clave = fecha.toISOString().slice(0, 10)
        return { fecha: clave, cantidad: porDia.get(clave) ?? 0 }
    })
}

async function request(ruta, opciones = {}) {
    const { body, redirigirSi401 = true, formato = 'json', ...init } = opciones
    const binario = formato === 'blob' || formato === 'response'

    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        credentials: 'include',
        ...init,
        ...(body === undefined
            ? {}
            : {
                headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
                body: JSON.stringify(body)
            })
    })

    // Las respuestas binarias no se parsean: solo se lee el JSON cuando la
    // petición falla, para conservar el mensaje y los errores de validación.
    const data = binario ? null : await respuesta.json().catch(() => null)

    if (!respuesta.ok) {
        const cuerpoError = binario ? await respuesta.json().catch(() => null) : data
        if (respuesta.status === 401 && redirigirSi401) {
            window.location.replace('./login.html')
        }
        throw new ApiError(mensajeDeError(cuerpoError, respuesta.status), respuesta.status, cuerpoError)
    }

    if (formato === 'response') return respuesta
    if (formato === 'blob') return respuesta.blob()
    return data
}

window.HORIZON_API = Object.freeze({
    ApiError,
    normalizarEvolucion,
    normalizarEvolucionSemana,

    login: (credenciales) => request('/login', {
        method: 'POST',
        body: credenciales,
        redirigirSi401: false
    }),

    logout: () => request('/logout', { method: 'POST' }),

    // La cuenta se deduce de la cookie de sesión en el backend; el cuerpo solo
    // lleva la contraseña actual y la nueva.
    changePassword: ({ currentPassword, newPassword }) => request('/employee/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword }
    }),

    checkSession: () => request('/check-session'),

    getEmpleadosByDepartamento: () => request('/api/empleadosByDepartamento'),

    getTotalSalario: () => request('/api/totalSalario'),

    getEmployees: () => request('/employee/getAll'),

    // Paginación del directorio. Los filtros se envían al backend para que el
    // total y las páginas se calculen sobre todos los empleados, no solo los
    // que caben en la página actual.
    getEmployeesPage: ({ page = 1, limit = 10, q = '', department = '', sede = '', contract_type = '' } = {}) => {
        const parametros = new URLSearchParams({ page: String(page), limit: String(limit) })
        for (const [clave, valor] of Object.entries({ q, department, sede, contract_type })) {
            if (valor) parametros.set(clave, String(valor))
        }
        return request(`/employee/getPage?${parametros}`)
    },

    getEmployeeById: (id) => request(`/employee/getById/${encodeURIComponent(id)}`),

    createEmployee: (empleado) => request('/employee/create', {
        method: 'POST',
        body: empleado
    }),

    registrarBaja: (baja) => request('/employee/termination', {
        method: 'POST',
        body: baja
    }),

    crearContrato: (contrato) => request('/employee/contract', {
        method: 'POST',
        body: contrato
    }),

    // La importación masiva recibe las filas ya parseadas: el backend valida
    // cada una por separado y devuelve un resultado por fila.
    importarEmpleados: (empleados) => request('/api/importar/empleados', {
        method: 'POST',
        body: { empleados }
    }),

    // Catálogos: una llamada agrupada para formularios y filtros. Las rutas
    // individuales quedan disponibles para cuando se necesite solo una lista.
    getCatalogos: () => request('/api/catalogos'),
    getRoles: () => request('/api/catalogos/roles'),
    getSedes: () => request('/api/catalogos/sedes'),
    getDepartments: () => request('/api/catalogos/departments'),
    getContractTypes: () => request('/api/catalogos/contractTypes'),
    getPositions: () => request('/api/catalogos/positions'),

    // Reportes del panel. Todos devuelven el payload directo.
    getResumen: () => request('/api/resumen'),
    getEmpleadosBySede: () => request('/api/empleadosBySede'),
    getEmpleadosByRole: () => request('/api/empleadosByRole'),
    getEmpleadosByContractType: () => request('/api/empleadosByContractType'),
    getSalarioByDepartamento: () => request('/api/salarioByDepartamento'),
    getEvolucionContrataciones: async () =>
        normalizarEvolucion(await request('/api/evolucionContrataciones')),

    getEvolucionContratacionesSemana: async () =>
        normalizarEvolucionSemana(await request('/api/evolucionContratacionesSemanal')),

    // Indicadores del dashboard que antes estaban hardcodeados.
    getRotacion: () => request('/api/rotacion'),
    getAusentismo: () => request('/api/ausentismo'),
    getContratosPorVencer: () => request('/api/contratosPorVencer'),
    getDecisiones: () => request('/api/decisiones'),
    getActividad: () => request('/api/actividad'),
    getHitos: () => request('/api/hitos'),
    getNomina: () => request('/api/nomina'),
    cerrarNomina: (period) => request(`/api/nomina/${encodeURIComponent(period)}/cerrar`, {
        method: 'POST'
    }),
    getExpedientes: () => request('/api/expedientes'),

    getAusencias: () => request('/api/ausencias'),
    solicitarAusencia: (ausencia) => request('/api/ausencias', {
        method: 'POST',
        body: ausencia
    }),
    aprobarAusencia: (id) => request(`/api/ausencias/${encodeURIComponent(id)}/aprobar`, {
        method: 'POST'
    }),
    rechazarAusencia: (id) => request(`/api/ausencias/${encodeURIComponent(id)}/rechazar`, {
        method: 'POST'
    }),

    // Permisos resueltos por el backend desde la BD, no desde el token.
    getPermisos: () => request('/api/permisos'),

    aprobarDecision: (id) => request(`/api/decisiones/${encodeURIComponent(id)}/aprobar`, {
        method: 'POST'
    }),

    rechazarDecision: (id) => request(`/api/decisiones/${encodeURIComponent(id)}/rechazar`, {
        method: 'POST'
    }),

    crearHito: (hito) => request('/api/hitos', {
        method: 'POST',
        body: hito
    }),

    getExpedientesDetalle: () => request('/api/expedientes/detalle'),

    actualizarDocumento: (id, status) => request(`/api/documentos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { status }
    }),

    buscar: (q, limit = 5, signal) => {
        const parametros = new URLSearchParams({ q, limit: String(limit) })
        return request(`/api/buscar?${parametros}`, { signal })
    },

    // El CSV se descarga en el cliente. Los filtros activos del directorio se
    // envían al backend para exportar exactamente lo que se está viendo.
    exportarEmpleados: async (filtros = {}) => {
        const parametros = new URLSearchParams()
        for (const [clave, valor] of Object.entries(filtros)) {
            if (valor) parametros.set(clave, String(valor))
        }
        const sufijo = parametros.size ? `?${parametros}` : ''
        const respuesta = await request(`/api/exportar/empleados${sufijo}`, {
            formato: 'response'
        })
        const nombreRemoto = /filename="?([^";]+)"?/i.exec(
            respuesta.headers.get('content-disposition') ?? ''
        )?.[1]
        return {
            blob: await respuesta.blob(),
            nombre: nombreRemoto ?? `empleados-${new Date().toISOString().slice(0, 10)}.csv`
        }
    }
})
