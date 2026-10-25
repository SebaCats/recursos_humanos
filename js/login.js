document.getElementById('loginForm').addEventListener('submit', async (evento) => {
    // 1. Evita que la página intente recargarse al enviar el formulario
    evento.preventDefault();

    // 2. Capturamos los datos que el usuario escribió
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const mensajeError = document.getElementById('mensajeError');

    try {
        // 3. Enviamos los datos al backend
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }) // Enviamos los datos en formato JSON
        });

        // 4. Revisamos la respuesta del backend
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Login fallido: Mostramos el mensaje de error del backend
            mensajeError.textContent = data.message || data.mensaje || data.error || 'Credenciales incorrectas';
            mensajeError.style.display = 'block';

            return
        }
        // Redirigimos al index
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al intentar iniciar sesión:', error);
        mensajeError.textContent = 'Error de conexión con el servidor.';
        mensajeError.style.display = 'block';
    }
});