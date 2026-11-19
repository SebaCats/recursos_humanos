const API_BASE = window.HORIZON_API_BASE ?? ''

async function verificarSesion() {
    // Ocultar sin modificar `display`: el body usa d-flex para el layout.
    document.body.style.visibility = 'hidden'

    try {
        const response = await fetch(
            `${API_BASE}/check-session`,
            {
                method: 'GET',
                credentials: 'include'
            }
        )

        if (!response.ok) {
            window.location.replace('./login.html')
            return
        }

        const data = await response.json()
        console.log('Usuario autenticado:', data.user)

        document.body.style.visibility = 'visible'
    } catch (error) {
        console.error('Error validando el token:', error)
        window.location.replace('./login.html')
    }
}

async function cerrarSesion() {
    document.querySelectorAll('[data-logout]').forEach((enlace) => {
        enlace.addEventListener('click', async (evento) => {
            // detiene el direccionamiento del boton para ejecutar el fetch y luego lo hace
            evento.preventDefault();

            try {
                const response = await fetch(
                    `${API_BASE}/logout`,
                    {
                        method: 'POST',
                        credentials: 'include'
                    }
                );

                if (!response.ok) {
                    console.error('No se pudo cerrar la sesión');
                }
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            } finally {
                window.location.replace('./login.html');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', verificarSesion)

document.addEventListener('DOMContentLoaded', cerrarSesion);
