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
    getEvolucionContrataciones: () => request('/api/evolucionContrataciones')
})
