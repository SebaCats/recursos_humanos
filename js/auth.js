const ETIQUETAS_NIVEL = {
    GUEST: 'Empleado',
    RRHH: 'RRHH',
    ADMIN: 'Administrador'
}

function textoElemento(id, texto) {
    const elemento = document.getElementById(id)
    if (elemento) elemento.textContent = texto
}

function iniciales(usuario) {
    const nombre = [usuario?.name, usuario?.lastName ?? usuario?.last_name]
        .filter(Boolean).join(' ').trim()
    if (!nombre) return '—'
    return nombre.split(/\s+/).slice(0, 2).map((parte) => parte.charAt(0).toUpperCase()).join('')
}

async function verificarSesion() {
    try {
        const data = await window.HORIZON_API.checkSession()
        const usuario = data?.user ?? {}
        textoElemento('nombreUsuario',
            [usuario.name, usuario.lastName ?? usuario.last_name].filter(Boolean).join(' ') || usuario.email || 'Usuario')
        textoElemento('avatarUsuario', iniciales(usuario))

        try {
            const permisos = await window.HORIZON_API.getPermisos()
            textoElemento('rolUsuario', ETIQUETAS_NIVEL[permisos?.nivel] ?? permisos?.nivel ?? 'Sin rol asignado')
        } catch (error) {
            console.error('Error al cargar el rol:', error)
            textoElemento('rolUsuario', 'Rol no disponible')
        }

        document.body.style.visibility = 'visible'
    } catch (error) {
        console.error('Error validando la sesión:', error)
        // Solo un 401 invalida la sesión. Un 403 (o un fallo de red) no debe
        // enviar al login: el panel sigue visible y muestra su propio estado.
        document.body.style.visibility = 'visible'
        if (error.status === 403) {
            document.querySelectorAll('[data-permisos-insuficientes]').forEach((elemento) => {
                elemento.textContent = 'No tienes permisos para realizar esta acción'
                elemento.classList.remove('d-none')
            })
        }
    }
}

async function cerrarSesion() {
    document.querySelectorAll('[data-logout]').forEach((enlace) => {
        enlace.addEventListener('click', async (evento) => {
            evento.preventDefault()

            try {
                await window.HORIZON_API.logout()
            } catch (error) {
                console.error('Error al cerrar sesión:', error)
            } finally {
                window.location.replace('./login.html')
            }
        })
    })
}

document.addEventListener('DOMContentLoaded', () => {
    // Oculta el panel mientras se valida la sesión. No tocamos `display`
    // porque el body usa d-flex para el layout.
    document.body.style.visibility = 'hidden'
    verificarSesion()
    cerrarSesion()
})
