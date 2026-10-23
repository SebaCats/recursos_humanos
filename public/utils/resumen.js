async function empleadoPorDepartamento() {
    const response = await fetch('http://localhost:4000/empleadosByDepartamento');
    const empleados = await response.json();
    return empleados;
}

async function totalSalario() {
    const response = await fetch('http://localhost:4000/totalSalario');
    const total = await response.json();
    return total;
}

empleadoPorDepartamento().then(data => {
    // 1. Calcular el total de empleados
    // Asegúrate de que "cantidad" sea la propiedad que envía tu backend
    const totalPlantilla = data.reduce((acc, departamento) => acc + departamento.cantidad, 0);

    document.getElementById('plantillaActiva').textContent = `${totalPlantilla}`

    // 2. Actualizar el texto del total en el HTML
    document.getElementById('totalPlantillaText').textContent = `${totalPlantilla} personas - plantilla actual`;

    // 3. Obtener el contenedor y limpiarlo
    const progressDiv = document.getElementById('progressDiv');
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
    document.getElementById('totalNomina').textContent = `$${data.total}`
}).catch(error => {
    console.error("Error al cargar el total de la nomina:", error);
});