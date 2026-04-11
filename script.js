let db = JSON.parse(localStorage.getItem('pac_db_v3')) || {
    cajas: { efectivo: 0, banco: 0, tarjetas: 0, fondo: 0 },
    clientes: [],
    movimientos: []
};

function cambiarPestaña(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
}

// --- LOGICA DE CAJAS INICIALES ---
function guardarHerencia() {
    const e = parseFloat(document.getElementById('h-efectivo').value) || 0;
    const b = parseFloat(document.getElementById('h-banco').value) || 0;
    
    db.cajas.efectivo += e;
    db.cajas.banco += b;
    
    document.getElementById('h-efectivo').value = '';
    document.getElementById('h-banco').value = '';
    
    alert(`Carga inicial exitosa: $${e} en Efectivo y $${b} en Banco.`);
    guardar();
}

// --- LOGICA DE CLIENTES ---
function crearCliente() {
    const nombre = document.getElementById('cli-nombre').value;
    const coti = parseFloat(document.getElementById('cli-coti').value);
    const pago = parseFloat(document.getElementById('cli-pago').value) || 0;
    const metodo = document.getElementById('cli-metodo').value;

    if (nombre && !isNaN(coti)) {
        const cli = {
            id: Date.now(),
            nombre, coti,
            pagos: [{ monto: pago, metodo, fecha: new Date().toLocaleDateString() }],
            materiales: []
        };
        db.clientes.push(cli);
        afectarCaja(metodo, pago, 'sumar');
        
        document.getElementById('cli-nombre').value = '';
        document.getElementById('cli-coti').value = '';
        document.getElementById('cli-pago').value = '';
        guardar();
    } else {
        alert("Por favor completa Nombre y Cotización.");
    }
}

function registrarNuevoPago(id) {
    const monto = parseFloat(prompt("Monto del nuevo pago:"));
    const metodo = prompt("Método (Efectivo/Banco/Tarjeta):").toLowerCase();
    if (!isNaN(monto)) {
        const cli = db.clientes.find(c => c.id === id);
        cli.pagos.push({ monto, metodo, fecha: new Date().toLocaleDateString() });
        afectarCaja(metodo, monto, 'sumar');
        guardar();
    }
}

// --- LOGICA DE MOVIMIENTOS ---
function crearGastoRetiro() {
    const tipo = document.getElementById('gasto-tipo').value;
    const detalle = document.getElementById('gasto-detalle').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const origen = document.getElementById('gasto-origen').value;

    if (!isNaN(monto) && detalle) {
        db.movimientos.push({ tipo, detalle, monto, origen, fecha: new Date().toLocaleDateString() });
        afectarCaja(origen, monto, 'restar');
        
        document.getElementById('gasto-detalle').value = '';
        document.getElementById('gasto-monto').value = '';
        guardar();
    } else {
        alert("Completa detalle y monto.");
    }
}

// --- MOTOR DE CAJAS ---
function afectarCaja(caja, monto, operacion) {
    let clave = 'efectivo';
    if (caja.includes('ban')) clave = 'banco';
    if (caja.includes('tar')) clave = 'tarjetas';
    if (caja.includes('fon')) clave = 'fondo';

    if (operacion === 'sumar') db.cajas[clave] += monto;
    else db.cajas[clave] -= monto;
}

function ejecutarTransferencia() {
    const monto = parseFloat(document.getElementById('monto-transferir').value);
    const tipo = document.getElementById('tipo-transferencia').value;
    
    if (!isNaN(monto)) {
        if (tipo === 'banco-fondo' && db.cajas.banco >= monto) {
            db.cajas.banco -= monto; db.cajas.fondo += monto;
        } else if (tipo === 'tarjeta-banco' && db.cajas.tarjetas >= monto) {
            db.cajas.tarjetas -= monto; db.cajas.banco += monto;
        } else {
            alert("No hay saldo suficiente para transferir.");
            return;
        }
        document.getElementById('monto-transferir').value = '';
        guardar();
    }
}

function guardar() {
    localStorage.setItem('pac_db_v3', JSON.stringify(db));
    render();
}

function render() {
    // Dashboard
    document.getElementById('caja-efectivo').innerText = `$${Math.round(db.cajas.efectivo).toLocaleString('es-AR')}`;
    document.getElementById('caja-banco').innerText = `$${Math.round(db.cajas.banco).toLocaleString('es-AR')}`;
    document.getElementById('caja-tarjetas').innerText = `$${Math.round(db.cajas.tarjetas).toLocaleString('es-AR')}`;
    document.getElementById('caja-fondo').innerText = `$${Math.round(db.cajas.fondo).toLocaleString('es-AR')}`;

    // Clientes
    const contCli = document.getElementById('lista-clientes-container');
    contCli.innerHTML = db.clientes.map(c => {
        const totalPagado = c.pagos.reduce((acc, p) => acc + p.monto, 0);
        const deuda = c.coti - totalPagado;
        return `
            <div class="cliente-item">
                <div class="cliente-header" onclick="toggleDetalle(this)">
                    <strong>${c.nombre}</strong>
                    <span style="color:${deuda > 0 ? 'var(--yellow)' : 'var(--green)'}">
                        ${deuda > 0 ? 'Debe: $' + deuda.toLocaleString() : 'PAGADO'} ▾
                    </span>
                </div>
                <div class="cliente-detalle">
                    <p>Total Obra: $${c.coti.toLocaleString()}</p>
                    <button class="btn btn-blue" onclick="registrarNuevoPago(${c.id})">+ Cargar Pago</button>
                    <div style="margin-top:10px; font-size:11px; color:#94a3b8">
                        <strong>Historial de Pagos:</strong>
                        ${c.pagos.map(p => `<br>${p.fecha}: $${p.monto} (${p.metodo})`).join('')}
                    </div>
                    <button onclick="eliminarCliente(${c.id})" style="margin-top:10px; color:red; background:none; border:none; cursor:pointer; font-size:10px">Eliminar Obra</button>
                </div>
            </div>
        `;
    }).join('');

    // Retiros
    const retP = db.movimientos.filter(m => m.tipo === 'Pablo').reduce((acc, m) => acc + m.monto, 0);
    const retF = db.movimientos.filter(m => m.tipo === 'Fer').reduce((acc, m) => acc + m.monto, 0);
    document.getElementById('ret-pablo').innerText = `$${retP.toLocaleString()}`;
    document.getElementById('ret-fer').innerText = `$${retF.toLocaleString()}`;

    // Tabla Movimientos
    document.getElementById('body-gastos').innerHTML = db.movimientos.map((m, i) => `
        <tr>
            <td>${m.fecha}</td>
            <td><strong>${m.tipo}</strong>: ${m.detalle}</td>
            <td style="color:var(--red)">$${m.monto.toLocaleString()}</td>
            <td>${m.origen}</td>
            <td><button onclick="eliminarMov(${i})" style="background:none; border:none; cursor:pointer">❌</button></td>
        </tr>
    `).sort().reverse().join('');
}

function toggleDetalle(el) {
    const d = el.nextElementSibling;
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
}

function eliminarCliente(id) { if(confirm("¿Eliminar obra?")) { db.clientes = db.clientes.filter(c => c.id !== id); guardar(); } }
function eliminarMov(i) { db.movimientos.splice(i, 1); guardar(); }
function borrarTodo() { if(confirm("¿Cerrar mes y borrar todo?")) { localStorage.clear(); location.reload(); } }

function exportarPDFContador() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("PAC - REPORTE MENSUAL", 10, 10);
    doc.text(`Efectivo: $${db.cajas.efectivo}`, 10, 30);
    doc.text(`Banco: $${db.cajas.banco}`, 10, 40);
    doc.text(`Retiros Pablo: $${document.getElementById('ret-pablo').innerText}`, 10, 60);
    doc.text(`Retiros Fer: $${document.getElementById('ret-fer').innerText}`, 10, 70);
    doc.save("Reporte_PAC.pdf");
}

render();
