// Base de datos inicial
let data = JSON.parse(localStorage.getItem('pac_db')) || {
    clientes: [],
    gastosGrales: [],
    retiros: { Pablo: 0, Fer: 0 },
    cajas: { efectivo: 0, banco: 0, tarjetas: 0, fondo: 0 }
};

// Cambio de pestañas
function cambiarPestaña(id) {
    console.log("Cambiando a pestaña:", id); // Esto nos avisa en consola si funciona
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const pestañaActiva = document.getElementById(id);
    const botonActivo = document.getElementById('btn-' + id);
    
    if (pestañaActiva && botonActivo) {
        pestañaActiva.classList.add('active');
        botonActivo.classList.add('active');
    }
}

// Lógica de Clientes
function nuevoCliente() {
    let nombre = prompt("Nombre del Cliente:");
    let coti = parseFloat(prompt("Total Cotizado ($):"));
    let pago = parseFloat(prompt("¿Cuánto entregó de seña/pago? ($):") || 0);
    let metodo = prompt("¿Cómo pagó? (Efectivo / Banco / Tarjeta)").toLowerCase();

    if (nombre && !isNaN(coti)) {
        let cli = {
            id: Date.now(),
            nombre: nombre,
            coti: coti,
            pagado: pago,
            metodo: metodo,
            materiales: []
        };
        data.clientes.push(cli);
        
        if (metodo.includes("efe")) data.cajas.efectivo += pago;
        else if (metodo.includes("ban")) data.cajas.banco += pago;
        else if (metodo.includes("tar")) data.cajas.tarjetas += pago;

        guardarYRenderizar();
    }
}

function agregarMaterial(idCli) {
    let det = prompt("Material / Insumo:");
    let cost = parseFloat(prompt("Costo ($):"));
    if (det && !isNaN(cost)) {
        let cli = data.clientes.find(c => c.id === idCli);
        cli.materiales.push({ det, cost, fecha: new Date().toLocaleDateString() });
        data.cajas.fondo -= cost;
        guardarYRenderizar();
    }
}

// Lógica de Cajas
function moverBancoAFondo() {
    let monto = parseFloat(prompt("¿Cuánto dinero pasar de Banco a Fondo Común?"));
    if (!isNaN(monto) && monto <= data.cajas.banco) {
        data.cajas.banco -= monto;
        data.cajas.fondo += monto;
        guardarYRenderizar();
    } else { alert("Saldo insuficiente o monto inválido"); }
}

function acreditarTarjeta() {
    let monto = parseFloat(prompt("¿Cuánto dinero de Tarjetas se acreditó en el Banco?"));
    if (!isNaN(monto) && monto <= data.cajas.tarjetas) {
        data.cajas.tarjetas -= monto;
        data.cajas.banco += monto;
        guardarYRenderizar();
    } else { alert("Monto inválido"); }
}

// Gastos y Retiros
function registrarRetiro(socio) {
    let monto = parseFloat(prompt(`¿Cuánto retira ${socio}?`));
    let origen = prompt("¿De dónde saca la plata? (Efectivo / Banco)").toLowerCase();
    let cajaDestino = origen.includes("efe") ? "efectivo" : "banco";

    if (!isNaN(monto) && data.cajas[cajaDestino] >= monto) {
        data.cajas[cajaDestino] -= monto;
        data.retiros[socio] += monto;
        guardarYRenderizar();
    } else { alert("Saldo insuficiente"); }
}

function nuevoGastoGral() {
    let det = prompt("Detalle del gasto (GNC, Publicidad, etc):");
    let monto = parseFloat(prompt("Monto ($):"));
    if (det && !isNaN(monto)) {
        data.gastosGrales.push({ det, monto, fecha: new Date().toLocaleDateString() });
        data.cajas.fondo -= monto;
        guardarYRenderizar();
    }
}

function guardarYRenderizar() {
    localStorage.setItem('pac_db', JSON.stringify(data));
    render();
}

function render() {
    // Actualizar Números de Tesorería
    document.getElementById('caja-efectivo').innerText = `$${Math.round(data.cajas.efectivo).toLocaleString('es-AR')}`;
    document.getElementById('caja-banco').innerText = `$${Math.round(data.cajas.banco).toLocaleString('es-AR')}`;
    document.getElementById('caja-tarjetas').innerText = `$${Math.round(data.cajas.tarjetas).toLocaleString('es-AR')}`;
    document.getElementById('caja-fondo').innerText = `$${Math.round(data.cajas.fondo).toLocaleString('es-AR')}`;
    
    document.getElementById('ret-pablo').innerText = `$${Math.round(data.retiros.Pablo).toLocaleString('es-AR')}`;
    document.getElementById('ret-fer').innerText = `$${Math.round(data.retiros.Fer).toLocaleString('es-AR')}`;

    // Lista de Clientes
    const contCli = document.getElementById('lista-clientes-container');
    contCli.innerHTML = data.clientes.map(c => {
        let totalMat = c.materiales.reduce((acc, m) => acc + m.cost, 0);
        return `
            <div class="cliente-item">
                <div class="cliente-header" onclick="toggleDetalle(this)">
                    <strong>${c.nombre}</strong>
                    <span class="ganancia-tag">Ganancia: $${(c.pagado - totalMat).toLocaleString()} ▾</span>
                </div>
                <div class="cliente-detalle" style="display:none">
                    <p>Cotizado: $${c.coti.toLocaleString()} | Cobrado: $${c.pagado.toLocaleString()} (${c.metodo})</p>
                    <button class="btn btn-blue" onclick="agregarMaterial(${c.id})">+ Cargar Material</button>
                    <table>
                        <thead><tr><th>Material</th><th>Costo</th></tr></thead>
                        <tbody>
                            ${c.materiales.map(m => `<tr><td>${m.det}</td><td>$${m.cost}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    <button onclick="eliminarCli(${c.id})" style="margin-top:10px; color:red; background:none; border:none; cursor:pointer">Eliminar Cliente</button>
                </div>
            </div>
        `;
    }).join('');

    // Gastos Generales
    document.getElementById('body-gastos-grales').innerHTML = data.gastosGrales.map((g, i) => `
        <tr>
            <td>${g.fecha}</td>
            <td>${g.det}</td>
            <td>$${g.monto.toLocaleString()}</td>
            <td><button onclick="eliminarGasto(${i})" style="border:none; background:none; cursor:pointer">❌</button></td>
        </tr>
    `).join('');
}

// Funciones Auxiliares
function toggleDetalle(elemento) {
    const detalle = elemento.nextElementSibling;
    detalle.style.display = detalle.style.display === 'block' ? 'none' : 'block';
}

function eliminarCli(id) {
    if(confirm("¿Eliminar este cliente?")) {
        data.clientes = data.clientes.filter(c => c.id !== id);
        guardarYRenderizar();
    }
}

function eliminarGasto(i) {
    data.gastosGrales.splice(i, 1);
    guardarYRenderizar();
}

function borrarTodo() {
    if(confirm("¿Estás seguro de borrar todos los datos del mes?")) {
        localStorage.clear();
        location.reload();
    }
}

function exportarPDFContador() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("REPORTE PAC - PORTONES AUTOMÁTICOS CÓRDOBA", 10, 10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 20);
    doc.text(`Efectivo: $${data.cajas.efectivo}`, 10, 35);
    doc.text(`Banco: $${data.cajas.banco}`, 10, 45);
    doc.text(`Retiro Pablo: $${data.retiros.Pablo}`, 10, 60);
    doc.text(`Retiro Fer: $${data.retiros.Fer}`, 10, 70);
    doc.save("Reporte_PAC.pdf");
}

// Iniciar
render();
