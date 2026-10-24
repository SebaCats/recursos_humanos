document.getElementById('loginForm').addEventListener('submit', async (evento) => {
    // 1. Evita que la página intente recargarse al enviar el formulario
    evento.preventDefault(); 

    // 2. Capturamos los datos que el usuario escribió
    const usuario = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const mensajeError = document.getElementById('mensajeError');

    try {
        // 3. Enviamos los datos al backend
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // OBLIGATORIO: Permite que el servidor nos envíe la cookie de sesión
            body: JSON.stringify({ usuario, password }) // Enviamos los datos en formato JSON
        });

        const data = await response.json();

        // 4. Revisamos la respuesta del backend
        if (response.ok) {
            // Login exitoso: El backend ya guardó la cookie, así que lo enviamos al index
            window.location.href = '/index.html';
        } else {
            // Login fallido: Mostramos el mensaje de error del backend
            mensajeError.textContent = data.error || 'Credenciales incorrectas';
            mensajeError.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al intentar iniciar sesión:', error);
        mensajeError.textContent = 'Error de conexión con el servidor.';
        mensajeError.style.display = 'block';
    }
});