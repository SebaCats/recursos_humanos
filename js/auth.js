async function verificarSesion() {
    document.body.style.display = 'none'

    try {
        const response = await fetch(
            'http://localhost:3000/check-session',
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

        document.body.style.display = 'block'
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
                    'http://localhost:3000/logout',
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
