const formularioLogin = document.getElementById('loginForm')

formularioLogin?.addEventListener('submit', async (evento) => {
    evento.preventDefault()

    const email = document.getElementById('email')?.value.trim() ?? ''
    const password = document.getElementById('password')?.value ?? ''
    const mensajeError = document.getElementById('mensajeError')
    const boton = document.getElementById('botonLogin')

    if (!formularioLogin.reportValidity()) return

    if (mensajeError) {
        mensajeError.hidden = true
        mensajeError.textContent = ''
    }
    if (boton) {
        boton.disabled = true
        boton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Iniciando sesión…'
    }

    try {
        await window.HORIZON_API.login({ email, password })
        window.location.href = 'index.html'
    } catch (error) {
        console.error('Error al iniciar sesión:', error)
        if (mensajeError) {
            mensajeError.textContent = error.message || 'Error de conexión con el servidor.'
            mensajeError.hidden = false
        }
    } finally {
        if (boton) {
            boton.disabled = false
            boton.innerHTML = 'Iniciar sesión <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>'
        }
    }
})
