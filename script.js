let dbActual = JSON.parse(localStorage.getItem('pac_db_v2')) || {
    cajas: { efectivo: 0, banco: 0, tarjetas: 0, fondo: 0 },
    clientes: [],
    movimientos: [],
    herencia: { efectivo: 0, banco: 0 }
};

// --- NAVEGACIÓN ---
function cambiarPestaña(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id).classList.add('active');
}

// --- GESTIÓN DE CAJA HEREDADA ---
function abrirModalCajaHeredada() { document.getElementById('modal-herencia').style.display = 'flex'; }
function cerrarModales() { document.getElementById('modal-herencia').style.display = 'none'; }

function guardarHerencia() {
    const e = parseFloat(document.getElementById('h-efectivo').value) || 0;
    const b = parseFloat(document.getElementById('h-banco').value) || 0;
    dbActual.cajas.efectivo += e;
    dbActual.cajas.banco += b;
    dbActual.herencia = { efectivo: e, banco: b };
    cerrarModales();
    guardar();
}

// --- CLIENTES Y PAGOS ---
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
        dbActual.clientes.push(cli);
        afectarCaja(metodo, pago, 'sumar');
        // Limpiar inputs
        document.getElementById('cli-nombre').value = '';
        document.getElementById('cli-coti').value = '';
        guardar();
    }
}

function registrarNuevoPago(id) {
    const monto = parseFloat(prompt("Monto del nuevo pago:"));
    const metodo = prompt("Método (Efectivo/Banco/Tarjeta):").toLowerCase();
    if (!isNaN(monto)) {
        const cli = dbActual.clientes.find(c => c.id === id);
        cli.pagos.push({ monto, metodo, fecha: new Date().toLocaleDateString() });
        afectarCaja(metodo, monto, 'sumar');
        guardar();
    }
}

// --- GASTOS Y RETIROS ---
function crearGastoRetiro() {
    const tipo = document.getElementById('gasto-tipo').value;
    const detalle = document.getElementById('gasto-detalle').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const origen = document.getElementById('gasto-origen').value;

    if (!isNaN(monto)) {
        dbActual.movimientos.push({ tipo, detalle, monto, origen, fecha: new Date().toLocaleDateString() });
        afectarCaja(origen, monto, 'restar');
        guardar();
    }
}

// --- MOTOR DE CAJAS ---
function afectarCaja(caja, monto, operacion) {
    const c = caja.includes('efe') ? 'efectivo' : caja.includes('ban') ? 'banco' : caja.includes('tar') ? 'tarjetas' : 'fondo';
    if (operacion === 'sumar') dbActual.cajas[c] += monto;
    else dbActual.cajas[c] -= monto;
}

function ejecutarTransferencia() {
    const monto = parseFloat(document.getElementById('monto-transferir').value);
    const tipo = document.getElementById('tipo-transferencia').value;
    if (tipo === 'banco-fondo' && dbActual.cajas.banco >= monto) {
        dbActual.cajas.banco -= monto;
        dbActual.cajas.fondo += monto;
    } else if (tipo === 'tarjeta-banco' && dbActual.cajas.tarjetas >= monto) {
        dbActual.cajas.tarjetas -= monto;
        dbActual.cajas.banco += monto;
    }
    guardar();
}

function guardar() {
    localStorage.setItem('pac_db_v2', JSON.stringify(dbActual));
    render();
}

function render() {
    // Totales
    document.getElementById('caja-efectivo').innerText = `$${dbActual.cajas.efectivo.toLocaleString()}`;
    document.getElementById('caja-banco').innerText = `$${dbActual.cajas.banco.toLocaleString()}`;
    document.getElementById('caja-tarjetas').innerText = `$${dbActual.cajas.tarjetas.toLocaleString()}`;
    document.getElementById('caja-fondo').innerText = `$${dbActual.cajas.fondo.toLocaleString()}`;

    // Clientes
    const container = document.getElementById('lista-clientes-container');
    container.innerHTML = dbActual.clientes.map(c => {
        const totalPagado = c.pagos.reduce((acc, p) => acc + p.monto, 0);
        const faltaCobrar = c.coti - totalPagado;
        return `
            <div class="cliente-item">
                <div class="cliente-header" onclick="toggleDetalle(this)">
                    <strong>${c.nombre}</strong>
                    <span style="color:${faltaCobrar > 0 ? 'orange' : 'var(--green)'}">
                        ${faltaCobrar > 0 ? 'Debe: $' + faltaCobrar.toLocaleString() : 'PAGADO'}
                    </span>
                </div>
                <div class="cliente-detalle" style="display:none">
                    <p>Total Obra: $${c.coti.toLocaleString()}</p>
                    <button onclick="registrarNuevoPago(${c.id})" class="btn-mini">+ Registrar Pago</button>
                    <div class="info-block">
                        <strong>Historial de Pagos:</strong>
                        ${c.pagos.map(p => `<br>${p.fecha}: $${p.monto} (${p.metodo})`).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Retiros
    const retP = dbActual.movimientos.filter(m => m.tipo === 'Pablo').reduce((acc, m) => acc + m.monto, 0);
    const retF = dbActual.movimientos.filter(m => m.tipo === 'Fer').reduce((acc, m) => acc + m.monto, 0);
    document.getElementById('ret-pablo').innerText = `$${retP.toLocaleString()}`;
    document.getElementById('ret-fer').innerText = `$${retF.toLocaleString()}`;

    // Tabla Movimientos
    document.getElementById('body-gastos').innerHTML = dbActual.movimientos.map(m => `
        <tr><td>${m.fecha}</td><td>${m.tipo}: ${m.detalle}</td><td>$${m.monto}</td><td>${m.origen}</td></tr>
    `).join('');
}

function toggleDetalle(el) {
    const d = el.nextElementSibling;
    d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

render();
