async function verificarSesion() {
    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            method: 'GET',
            credentials: 'include' // Obligatorio para enviar la cookie
        });

        if (!response.ok) {
            // Si el backend dice 401, lo mandamos al login
            window.location.href = '/login.html';
        } else {
            // Si todo está bien, mostramos el contenido de la página
            document.body.style.display = 'block';
        }
    } catch (error) {
        console.error("Error validando sesión", error);
        window.location.href = '/login.html';
    }
}

// Ejecutar inmediatamente
verificarSesion();