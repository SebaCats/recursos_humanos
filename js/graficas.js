/**
 * Inicialización de las gráficas de Chart.js dentro de la página inyectada.
 * Se expone como `window.iniciarGraficas` y lo invoca el enrutador tras cada render.
 */
const EVOLUCION_PLANTILLA = {
    etiquetas: ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'],
    valores: [228, 231, 235, 238, 241, 244, 245, 250]
}

function iniciarGraficas() {
    if (typeof Chart === 'undefined') return

    const lienzo = document.getElementById('myChart')
    if (!lienzo) return

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
            labels: EVOLUCION_PLANTILLA.etiquetas,
            datasets: [
                {
                    label: 'Personas activas',
                    data: EVOLUCION_PLANTILLA.valores,
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
                        label: (contexto) => `${contexto.parsed.y} personas`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    suggestedMin: 220,
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
