/**
 * Gráfica de altas de contrato del resumen.
 * `resumen.js` obtiene los datos de /api/evolucionContrataciones y llama a
 * `window.iniciarGraficas(evolucion)`. El cliente del API garantiza 12 meses;
 * si no llegan datos se pintan esos 12 meses en cero, sin ejemplos inventados.
 */

function etiquetaMes(mes) {
    if (typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes)) return mes ?? ''
    const texto = new Intl.DateTimeFormat('es-CO', { month: 'short' })
        .format(new Date(`${mes}-01T00:00:00`))
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function prepararDatos(evolucion) {
    const filas = window.HORIZON_API?.normalizarEvolucion?.(evolucion) ?? []

    return {
        etiquetas: filas.map((fila) => etiquetaMes(fila.mes)),
        valores: filas.map((fila) => Number(fila.cantidad ?? 0))
    }
}

function iniciarGraficas(evolucion) {
    if (typeof Chart === 'undefined') return

    const lienzo = document.getElementById('myChart')
    if (!lienzo) return

    const datos = prepararDatos(evolucion)

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
