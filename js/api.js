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

// El backend agrupa por mes y omite los que no tienen altas. Se completan con
// 0 para que la gráfica cubra siempre los últimos 12 meses, mes actual incluido.
function normalizarEvolucion(evolucion) {
    const porMes = new Map()

    if (Array.isArray(evolucion)) {
        for (const fila of evolucion) {
            if (typeof fila?.mes !== 'string') continue
            const mes = fila.mes.slice(0, 7)
            if (!/^\d{4}-\d{2}$/.test(mes)) continue

            const cantidad = Number(fila.cantidad ?? 0)
            porMes.set(mes, (porMes.get(mes) ?? 0) + (Number.isFinite(cantidad) ? cantidad : 0))
        }
    }

    const ahora = new Date()
    return Array.from({ length: MESES_EVOLUCION }, (_, indice) => {
        const fecha = new Date(Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth() - (MESES_EVOLUCION - 1 - indice),
            1
        ))
        const mes = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`
        return { mes, cantidad: porMes.get(mes) ?? 0 }
    })
}

async function request(ruta, opciones = {}) {
    const { body, redirigirSi401 = true, ...init } = opciones

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

    const data = await respuesta.json().catch(() => null)

    if (!respuesta.ok) {
        if (respuesta.status === 401 && redirigirSi401) {
            window.location.replace('./login.html')
        }
        throw new ApiError(mensajeDeError(data, respuesta.status), respuesta.status, data)
    }

    return data
}

window.HORIZON_API = Object.freeze({
    ApiError,
    normalizarEvolucion,

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
        normalizarEvolucion(await request('/api/evolucionContrataciones'))
})
