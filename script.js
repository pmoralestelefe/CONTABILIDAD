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

function guardarHerencia() {
    const e = parseFloat(document.getElementById('h-efectivo').value) || 0;
    const b = parseFloat(document.getElementById('h-banco').value) || 0;
    db.cajas.efectivo += e;
    db.cajas.banco += b;
    guardar();
    alert("Saldos iniciales cargados.");
}

function crearCliente() {
    const nombre = document.getElementById('cli-nombre').value;
    const coti = parseFloat(document.getElementById('cli-coti').value);
    const pago = parseFloat(document.getElementById('cli-pago').value) || 0;
    const metodo = document.getElementById('cli-metodo').value;

    if (nombre && !isNaN(coti)) {
        db.clientes.push({
            id: Date.now(),
            nombre, coti,
            pagos: [{ monto: pago, metodo, fecha: new Date().toLocaleDateString() }]
        });
        afectarCaja(metodo, pago, 'sumar');
        guardar();
        document.getElementById('cli-nombre').value = '';
        document.getElementById('cli-coti').value = '';
        document.getElementById('cli-pago').value = '';
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

function crearGastoRetiro() {
    const tipo = document.getElementById('gasto-tipo').value;
    const detalle = document.getElementById('gasto-detalle').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const origen = document.getElementById('gasto-origen').value;

    if (!isNaN(monto) && detalle) {
        db.movimientos.push({ tipo, detalle, monto, origen, fecha: new Date().toLocaleDateString() });
        afectarCaja(origen, monto, 'restar');
        guardar();
        document.getElementById('gasto-detalle').value = '';
        document.getElementById('gasto-monto').value = '';
    }
}

function afectarCaja(caja, monto, operacion) {
    let clave = 'efectivo';
    if (caja.includes('ban')) clave = 'banco';
    if (caja.includes('tar')) clave = 'tarjetas';
    if (caja.includes('fon')) clave = 'fondo';
    if (operacion === 'sumar') db.cajas[clave] += monto;
    else db.cajas[clave] -= monto;
}

function guardar() {
    localStorage.setItem('pac_db_v3', JSON.stringify(db));
    render();
}

function render() {
    document.getElementById('caja-efectivo').innerText = `$${Math.round(db.cajas.efectivo).toLocaleString()}`;
    document.getElementById('caja-banco').innerText = `$${Math.round(db.cajas.banco).toLocaleString()}`;
    document.getElementById('caja-tarjetas').innerText = `$${Math.round(db.cajas.tarjetas).toLocaleString()}`;
    document.getElementById('caja-fondo').innerText = `$${Math.round(db.cajas.fondo).toLocaleString()}`;

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
                    <button class="btn btn-blue" onclick="registrarNuevoPago(${c.id})">+ Cargar Pago</button>
                    <div style="margin-top:10px; font-size:11px">
                        ${c.pagos.map(p => `${p.fecha}: $${p.monto} (${p.metodo})`).join('<br>')}
                    </div>
                </div>
            </div>`;
    }).join('');

    const retP = db.movimientos.filter(m => m.tipo === 'Pablo').reduce((acc, m) => acc + m.monto, 0);
    const retF = db.movimientos.filter(m => m.tipo === 'Fer').reduce((acc, m) => acc + m.monto, 0);
    document.getElementById('ret-pablo').innerText = `$${retP.toLocaleString()}`;
    document.getElementById('ret-fer').innerText = `$${retF.toLocaleString()}`;

    document.getElementById('body-gastos').innerHTML = db.movimientos.map((m, i) => `
        <tr><td>${m.fecha}</td><td>${m.tipo}: ${m.detalle}</td><td>$${m.monto}</td><td>${m.origen}</td></tr>
    `).reverse().join('');
}

function toggleDetalle(el) {
    const d = el.nextElementSibling;
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
}

function ejecutarTransferencia() {
    const monto = parseFloat(document.getElementById('monto-transferir').value);
    const tipo = document.getElementById('tipo-transferencia').value;
    if (!isNaN(monto)) {
        if (tipo === 'banco-fondo' && db.cajas.banco >= monto) {
            db.cajas.banco -= monto; db.cajas.fondo += monto;
        } else if (tipo === 'tarjeta-banco' && db.cajas.tarjetas >= monto) {
            db.cajas.tarjetas -= monto; db.cajas.banco += monto;
        }
        guardar();
    }
}

function borrarTodo() { if(confirm("¿Borrar todo?")) { localStorage.clear(); location.reload(); } }

render();
