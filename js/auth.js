async function verificarSesion() {
    // 1. Obtenemos el token guardado en el localStorage durante el login
    const token = localStorage.getItem('token');

    // Si no hay token localmente, lo mandamos al login de inmediato
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // <--- Vital para que tu middleware lo valide
            }
        });

        if (!response.ok) {
            // Si el token expiró o no es válido, limpiamos y mandamos al login
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        } else {
            // Sesión válida: mostramos el contenido de la página index.html
            document.body.style.display = 'block';
        }
    } catch (error) {
        console.error("Error validando sesión:", error);
        window.location.href = '/login.html';
    }
}

// Cierre de sesión: elimina el token y vuelve al login.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-logout]').forEach((enlace) => {
        enlace.addEventListener('click', (evento) => {
            evento.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    });
});

// Ejecutar inmediatamente al cargar la página
verificarSesion();
