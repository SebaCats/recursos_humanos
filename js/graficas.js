/**
 * Gráfica de altas y plantilla activa del resumen.
 * En la vista mensual se muestran las altas por mes (barras) y la plantilla
 * acumulada (línea). La vista semanal mantiene solo las altas por día.
 * `resumen.js` obtiene los datos del periodo activo y llama a
 * `window.iniciarGraficas(evolucion, periodo)`.
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
        valores: filas.map((fila) => Number(fila.cantidad ?? 0)),
        plantilla: filas.map((fila) => Number(fila.plantilla ?? 0))
    }
}

function iniciarGraficas(evolucion, periodo = 'mes') {
    if (typeof Chart === 'undefined') return

    const lienzo = document.getElementById('myChart')
    if (!lienzo) return

    const esSemana = periodo === 'semana'
    const datos = prepararDatos(evolucion, periodo)

    // Evita el error "Canvas is already in use" al volver a renderizar la vista.
    const instanciaPrevia = Chart.getChart(lienzo)
    if (instanciaPrevia) instanciaPrevia.destroy()

    const contexto = lienzo.getContext('2d')
    const degradado = contexto.createLinearGradient(0, 0, 0, 250)
    degradado.addColorStop(0, 'rgba(13, 110, 253, 0.28)')
    degradado.addColorStop(1, 'rgba(13, 110, 253, 0)')

    const datasets = esSemana
        ? [{
            label: 'Altas del día',
            data: datos.valores,
            unidad: 'contratos',
            borderColor: '#0d6efd',
            backgroundColor: degradado,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#0d6efd'
        }]
        : [
            {
                type: 'bar',
                label: 'Altas del mes',
                data: datos.valores,
                unidad: 'contratos',
                backgroundColor: 'rgba(13, 110, 253, 0.55)',
                borderColor: '#0d6efd',
                borderWidth: 1,
                borderRadius: 4,
                maxBarThickness: 26,
                order: 2
            },
            {
                type: 'line',
                label: 'Plantilla activa',
                data: datos.plantilla,
                unidad: 'personas',
                borderColor: '#198754',
                backgroundColor: 'rgba(25, 135, 84, 0.08)',
                fill: false,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#198754',
                order: 1
            }
        ]

    new Chart(lienzo, {
        type: esSemana ? 'line' : 'bar',
        data: {
            labels: datos.etiquetas,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: !esSemana },
                tooltip: {
                    callbacks: {
                        label: (contexto) =>
                            `${contexto.dataset.label}: ${contexto.parsed.y} ${contexto.dataset.unidad ?? ''}`.trim()
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
