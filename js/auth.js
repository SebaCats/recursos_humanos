async function verificarSesion() {
    try {
        const data = await window.HORIZON_API.checkSession()
        console.log('Usuario autenticado:', data.user)
        document.body.style.visibility = 'visible'
    } catch (error) {
        console.error('Error validando la sesión:', error)
        // request() ya redirige cuando el fallo es un 401. Si es un error de
        // red u otro estado, redirigimos también para no dejar el panel oculto.
        if (error.status !== 401) {
            window.location.replace('./login.html')
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
