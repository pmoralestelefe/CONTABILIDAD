// Base de datos inicial
let data = JSON.parse(localStorage.getItem('pac_db')) || {
    clientes: [],
    gastosGrales: [],
    retiros: { Pablo: 0, Fer: 0 },
    cajas: { efectivo: 0, banco: 0, tarjetas: 0, fondo: 0 }
};

// Cambio de pestañas
function cambiarPestaña(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
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
            nombre,
            coti,
            pagado: pago,
            metodo,
            materiales: []
        };
        data.clientes.push(cli);
        
        // Sumar a la caja correspondiente
        if (metodo.includes("efectivo")) data.cajas.efectivo += pago;
        else if (metodo.includes("banco")) data.cajas.banco += pago;
        else if (metodo.includes("tarjeta")) data.cajas.tarjetas += pago;

        guardar();
    }
}

function agregarMaterial(idCli) {
    let det = prompt("Material / Insumo:");
    let cost = parseFloat(prompt("Costo ($):"));
    if (det && !isNaN(cost)) {
        let cli = data.clientes.find(c => c.id === idCli);
        cli.materiales.push({ det, cost, fecha: new Date().toLocaleDateString() });
        // Los materiales se restan del FONDO COMÚN
        data.cajas.fondo -= cost;
        guardar();
    }
}

// Lógica de Cajas
function moverBancoAFondo() {
    let monto = parseFloat(prompt("¿Cuánto dinero pasar de Banco a Fondo Común?"));
    if (monto <= data.cajas.banco) {
        data.cajas.banco -= monto;
        data.cajas.fondo += monto;
        guardar();
    } else { alert("No hay saldo suficiente en Banco"); }
}

function acreditarTarjeta() {
    let monto = parseFloat(prompt("¿Cuánto dinero de Tarjetas se acreditó en el Banco?"));
    if (monto <= data.cajas.tarjetas) {
        data.cajas.tarjetas -= monto;
        data.cajas.banco += monto;
        guardar();
    } else { alert("No hay ese monto pendiente en Tarjetas"); }
}

// Gastos y Retiros
function registrarRetiro(socio) {
    let monto = parseFloat(prompt(`¿Cuánto retira ${socio}?`));
    let origen = prompt("¿De dónde saca la plata? (Efectivo / Banco)").toLowerCase();
    if (monto && data.cajas[origen] >= monto) {
        data.cajas[origen] -= monto;
        data.retiros[socio] += monto;
        guardar();
    } else { alert("Saldo insuficiente en la caja seleccionada"); }
}

function nuevoGastoGral() {
    let det = prompt("Detalle del gasto (GNC, Publicidad, etc):");
    let monto = parseFloat(prompt("Monto ($):"));
    if (det && monto) {
        data.gastosGrales.push({ det, monto, fecha: new Date().toLocaleDateString() });
        data.cajas.fondo -= monto;
        guardar();
    }
}

// Guardado y Renderizado
function guardar() {
    localStorage.setItem('pac_db', JSON.stringify(data));
    render();
}

function render() {
    // Dashboard
    document.getElementById('caja-efectivo').innerText = `$${Math.round(data.cajas.efectivo).toLocaleString()}`;
    document.getElementById('caja-banco').innerText = `$${Math.round(data.cajas.banco).toLocaleString()}`;
    document.getElementById('caja-tarjetas').innerText = `$${Math.round(data.cajas.tarjetas).toLocaleString()}`;
    document.getElementById('caja-fondo').innerText = `$${Math.round(data.cajas.fondo).toLocaleString()}`;
    document.getElementById('ret-pablo').innerText = `$${Math.round(data.retiros.Pablo).toLocaleString()}`;
    document.getElementById('ret-fer').innerText = `$${Math.round(data.retiros.Fer).toLocaleString()}`;

    // Clientes
    const contCli = document.getElementById('lista-clientes-container');
    contCli.innerHTML = data.clientes.map(c => {
        let totalMat = c.materiales.reduce((acc, m) => acc + m.cost, 0);
        return `
            <div class="cliente-item">
                <div class="cliente-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">
                    <strong>${c.nombre}</strong>
                    <span>Ganancia: $${(c.pagado - totalMat).toLocaleString()} ▾</span>
                </div>
                <div class="cliente-detalle">
                    <p>Cotizado: $${c.coti.toLocaleString()} | Cobrado: $${c.pagado.toLocaleString()} (${c.metodo})</p>
                    <button class="btn btn-blue" onclick="agregarMaterial(${c.id})">+ Cargar Material</button>
                    <table>
                        <thead><tr><th>Material</th><th>Costo</th></tr></thead>
                        <tbody>
                            ${c.materiales.map(m => `<tr><td>${m.det}</td><td>$${m.cost}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    <button class="btn-borrar-todo" onclick="eliminarCli(${c.id})" style="margin-top:10px; font-size:10px">Eliminar Cliente</button>
                </div>
            </div>
        `;
    }).join('');

    // Gastos Grales
    document.getElementById('body-gastos-grales').innerHTML = data.gastosGrales.map((g, i) => `
        <tr><td>${g.fecha}</td><td>${g.det}</td><td>$${g.monto}</td><td><button onclick="eliminarGasto(${i})">❌</button></td></tr>
    `).join('');
}

function eliminarCli(id) { data.clientes = data.clientes.filter(c => c.id !== id); guardar(); }
function eliminarGasto(i) { data.gastosGrales.splice(i, 1); guardar(); }
function borrarTodo() { if(confirm("¿Borrar todo?")) { localStorage.clear(); location.reload(); } }

// Exportar PDF para el Contador
function exportarPDFContador() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte Contable - Portones Automáticos Córdoba", 10, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 30);
    
    doc.text("RESUMEN DE CAJAS:", 10, 45);
    doc.text(`Efectivo: $${data.cajas.efectivo}`, 10, 52);
    doc.text(`Banco: $${data.cajas.banco}`, 10, 59);
    doc.text(`Pendiente Tarjetas: $${data.cajas.tarjetas}`, 10, 66);
    doc.text(`Fondo Común: $${data.cajas.fondo}`, 10, 73);

    doc.text("RETIROS DE SOCIOS:", 10, 85);
    doc.text(`Pablo: $${data.retiros.Pablo}`, 10, 92);
    doc.text(`Fer: $${data.retiros.Fer}`, 10, 99);

    doc.save("Reporte_PAC_Contador.pdf");
}

render();
