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

    checkSession: () => request('/check-session'),

    getEmpleadosByDepartamento: () => request('/api/empleadosByDepartamento'),

    getTotalSalario: () => request('/api/totalSalario'),

    getEmployees: () => request('/employee/getAll'),

    createEmployee: (empleado) => request('/employee/create', {
        method: 'POST',
        body: empleado
    })
})
