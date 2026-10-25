const API_URL_EMPLEADOS = 'http://localhost:3000/api/empleadosByDepartamento'
const API_URL_TOTAL = 'http://localhost:3000/api/totalSalario'

// 2. El backend valida el JWT del encabezado Authorization (no usa cookies)
function opcionesFetch() {
    const token = localStorage.getItem('token');

    return {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };
}

async function empleadoPorDepartamento() {
    const response = await fetch(API_URL_EMPLEADOS, opcionesFetch());

    if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener los departamentos`);
    }

    return response.json();
}

async function totalSalario() {
    const response = await fetch(API_URL_TOTAL, opcionesFetch());

    if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener el total de salario`);
    }

    return response.json();
}

empleadoPorDepartamento().then(data => {
    if (!Array.isArray(data)) {
        throw new Error('La respuesta de departamentos no es un arreglo');
    }

    // 1. Calcular el total de empleados
    // Asegúrate de que "cantidad" sea la propiedad que envía tu backend
    const totalPlantilla = data.reduce((acc, departamento) => acc + departamento.cantidad, 0);

    const plantillaActiva = document.getElementById('plantillaActiva');
    if (plantillaActiva) {
        plantillaActiva.textContent = `${totalPlantilla}`;
    }

    // 2. Actualizar el texto del total en el HTML
    const totalPlantillaText = document.getElementById('totalPlantillaText');
    if (totalPlantillaText) {
        totalPlantillaText.textContent = `${totalPlantilla} personas - plantilla actual`;
    }

    // 3. Obtener el contenedor y limpiarlo
    const progressDiv = document.getElementById('progressDiv');
    if (!progressDiv) {
        return;
    }

    progressDiv.innerHTML = '';

    // 4. Iterar y renderizar cada departamento respetando tu diseño HTML
    data.forEach(departamento => {
        // Calcular el porcentaje (redondeado sin decimales para que se vea como en tu ejemplo)
        const porcentaje = totalPlantilla > 0 ? Math.round((departamento.cantidad / totalPlantilla) * 100) : 0;

        progressDiv.innerHTML += `
            <div class="d-flex justify-content-between">
                <small>${departamento.nombre}</small>
                <small>${departamento.cantidad} - ${porcentaje}%</small>
            </div>
            <div class="progress" role="progressbar" aria-label="Progreso ${departamento.nombre}" aria-valuenow="${porcentaje}"
                aria-valuemin="0" aria-valuemax="100">
                <div class="progress-bar" style="width: ${porcentaje}%"></div>
            </div>
        `;
    });
}).catch(error => {
    console.error("Error al cargar los departamentos:", error);
});

totalSalario().then(data => {
    const totalNomina = document.getElementById('totalNomina');
    if (totalNomina && data && data.total !== undefined) {
        totalNomina.textContent = `$${data.total}`;
    }
}).catch(error => {
    console.error("Error al cargar el total de la nomina:", error);
});
