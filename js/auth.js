async function verificarSesion() {
    try {
        const data = await window.HORIZON_API.checkSession()
        console.log('Usuario autenticado:', data.user)
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
