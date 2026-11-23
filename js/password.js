// Cambio de contraseña compartido por index.html y directorio.html.
// El modal ya existe en ambas páginas; aquí solo se conecta con el API.
(() => {
    const formulario = document.getElementById('formCambiarContrasena')
    const actual = document.getElementById('passActual')
    const nueva = document.getElementById('passNueva')
    const confirmar = document.getElementById('passConfirmar')
    const alerta = document.getElementById('alertaCambioPass')
    const botonGuardar = formulario?.querySelector('button[type="submit"]')

    if (!formulario || !actual || !nueva || !confirmar || !botonGuardar) return

    const campos = [actual, nueva, confirmar]

    function limpiarAlerta() {
        alerta.className = 'alert d-none'
        alerta.textContent = ''
    }

    function mostrarAlerta(tipo, mensaje) {
        alerta.className = `alert alert-${tipo}`
        alerta.textContent = mensaje
    }

    function limpiarValidacion() {
        campos.forEach((campo) => campo.classList.remove('is-invalid'))
    }

    function esValido() {
        limpiarValidacion()

        if (!actual.value) actual.classList.add('is-invalid')
        if (nueva.value.length < 8 || nueva.value.length > 72) nueva.classList.add('is-invalid')
        if (!confirmar.value || confirmar.value !== nueva.value) confirmar.classList.add('is-invalid')

        return campos.every((campo) => !campo.classList.contains('is-invalid'))
    }

    document.getElementById('modalCambiarContrasena')?.addEventListener('show.bs.modal', () => {
        formulario.reset()
        limpiarValidacion()
        limpiarAlerta()
    })

    campos.forEach((campo) => {
        campo.addEventListener('input', () => campo.classList.remove('is-invalid'))
    })

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault()
        limpiarAlerta()

        if (!esValido()) return

        botonGuardar.disabled = true
        try {
            await window.HORIZON_API.changePassword({
                currentPassword: actual.value,
                newPassword: nueva.value
            })

            formulario.reset()
            limpiarValidacion()
            mostrarAlerta('success', 'Contraseña actualizada correctamente.')
        } catch (error) {
            mostrarAlerta('danger', error?.message ?? 'No se pudo actualizar la contraseña.')
        } finally {
            botonGuardar.disabled = false
        }
    })
})()
