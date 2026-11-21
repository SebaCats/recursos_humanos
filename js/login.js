document.getElementById('loginForm').addEventListener('submit', async (evento) => {
    evento.preventDefault()

    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const mensajeError = document.getElementById('mensajeError')

    try {
        await window.HORIZON_API.login({ email, password })
        window.location.href = 'index.html'
    } catch (error) {
        console.error('Error al iniciar sesión:', error)
        mensajeError.textContent = error.message || 'Error de conexión con el servidor.'
        mensajeError.style.display = 'block'
    }
})
