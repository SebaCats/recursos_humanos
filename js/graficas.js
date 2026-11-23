/**
 * Gráfica de altas de contrato del resumen.
 * `resumen.js` obtiene los datos del periodo activo (12 meses o semana actual)
 * y llama a `window.iniciarGraficas(evolucion, periodo)`. El cliente del API
 * garantiza la serie completa; si no llegan datos se pinta en cero.
 */

function etiquetaFecha(fecha) {
    if (typeof fecha !== 'string') return fecha ?? ''

    if (/^\d{4}-\d{2}$/.test(fecha)) {
        const texto = new Intl.DateTimeFormat('es-CO', { month: 'short', timeZone: 'UTC' })
            .format(new Date(`${fecha}-01T00:00:00Z`))
        return texto.charAt(0).toUpperCase() + texto.slice(1)
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const texto = new Intl.DateTimeFormat('es-CO', { weekday: 'short', timeZone: 'UTC' })
            .format(new Date(`${fecha}T00:00:00Z`))
        return texto.charAt(0).toUpperCase() + texto.slice(1)
    }

    return fecha
}

function prepararDatos(evolucion, periodo) {
    const normalizar = periodo === 'semana'
        ? window.HORIZON_API?.normalizarEvolucionSemana
        : window.HORIZON_API?.normalizarEvolucion
    const filas = normalizar?.(evolucion) ?? []

    return {
        etiquetas: filas.map((fila) => etiquetaFecha(fila.fecha)),
        valores: filas.map((fila) => Number(fila.cantidad ?? 0))
    }
}

function iniciarGraficas(evolucion, periodo = 'mes') {
    if (typeof Chart === 'undefined') return

    const lienzo = document.getElementById('myChart')
    if (!lienzo) return

    const datos = prepararDatos(evolucion, periodo)

    // Evita el error "Canvas is already in use" al volver a renderizar la vista.
    const instanciaPrevia = Chart.getChart(lienzo)
    if (instanciaPrevia) instanciaPrevia.destroy()

    const contexto = lienzo.getContext('2d')
    const degradado = contexto.createLinearGradient(0, 0, 0, 250)
    degradado.addColorStop(0, 'rgba(13, 110, 253, 0.28)')
    degradado.addColorStop(1, 'rgba(13, 110, 253, 0)')

    new Chart(lienzo, {
        type: 'line',
        data: {
            labels: datos.etiquetas,
            datasets: [
                {
                    label: 'Altas de contrato',
                    data: datos.valores,
                    borderColor: '#0d6efd',
                    backgroundColor: degradado,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: '#0d6efd'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (contexto) => `${contexto.parsed.y} contratos`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.06)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    })
}

window.iniciarGraficas = iniciarGraficas
