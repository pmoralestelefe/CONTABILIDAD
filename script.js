let obras = JSON.parse(localStorage.getItem('pac_obras')) || [];
let gastos = JSON.parse(localStorage.getItem('pac_gastos')) || [];

function calcularTotales() {
    let gananciaBruta = obras.reduce((acc, obra) => acc + (obra.cotizado - obra.gastosDir), 0);
    let totalGastosOp = gastos.reduce((acc, gasto) => acc + gasto.monto, 0);
    let netoReal = gananciaBruta - totalGastosOp;

    document.getElementById('total-ganancia').innerText = `$${gananciaBruta.toLocaleString('es-AR')}`;
    document.getElementById('total-gastos').innerText = `$${totalGastosOp.toLocaleString('es-AR')}`;
    document.getElementById('ganancia-individual').innerText = `$${(netoReal / 2).toLocaleString('es-AR')}`;
    
    renderizarTablas();
}

function renderizarTablas() {
    const listaObras = document.getElementById('lista-obras');
    listaObras.innerHTML = obras.map((o, index) => `
        <tr>
            <td>${o.cliente}</td>
            <td>$${o.cotizado.toLocaleString()}</td>
            <td>$${o.gastosDir.toLocaleString()}</td>
            <td class="positivo">$${(o.cotizado - o.gastosDir).toLocaleString()}</td>
            <td><button onclick="eliminarObra(${index})">❌</button></td>
        </tr>
    `).join('');

    const listaGastos = document.getElementById('lista-gastos');
    listaGastos.innerHTML = gastos.map((g, index) => `
        <tr>
            <td>${g.concepto}</td>
            <td class="negativo">$${g.monto.toLocaleString()}</td>
            <td>${g.fecha}</td>
            <td><button onclick="eliminarGasto(${index})">❌</button></td>
        </tr>
    `).join('');
}

// Funciones para agregar datos (Simplificadas para prompt de prueba)
function mostrarModalObra() {
    let cliente = prompt("Nombre del Cliente:");
    let cotizado = parseFloat(prompt("Monto Cotizado:"));
    let gastosDir = parseFloat(prompt("Gastos Directos (materiales):"));
    if(cliente && cotizado) {
        obras.push({cliente, cotizado, gastosDir});
        guardarYRecalcular();
    }
}

function mostrarModalGasto() {
    let concepto = prompt("Concepto del Gasto:");
    let monto = parseFloat(prompt("Monto:"));
    if(concepto && monto) {
        gastos.push({concepto, monto, fecha: new Date().toLocaleDateString()});
        guardarYRecalcular();
    }
}

function guardarYRecalcular() {
    localStorage.setItem('pac_obras', JSON.stringify(obras));
    localStorage.setItem('pac_gastos', JSON.stringify(gastos));
    calcularTotales();
}

function eliminarObra(i) { obras.splice(i, 1); guardarYRecalcular(); }
function eliminarGasto(i) { gastos.splice(i, 1); guardarYRecalcular(); }

// Inicio
document.getElementById('fecha-actual').innerText = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
calcularTotales();