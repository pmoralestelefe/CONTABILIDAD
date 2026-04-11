let db = JSON.parse(localStorage.getItem('pac_db_v4')) || {
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
    const efec = parseFloat(document.getElementById('h-efectivo').value) || 0;
    const banc = parseFloat(document.getElementById('h-banco').value) || 0;
    db.cajas.efectivo += efec;
    db.cajas.banco += banc;
    guardar();
    document.getElementById('h-efectivo').value = '';
    document.getElementById('h-banco').value = '';
}

function crearCliente() {
    const nombre = document.getElementById('cli-nombre').value;
    const coti = parseFloat(document.getElementById('cli-coti').value);
    const pago = parseFloat(document.getElementById('cli-pago').value) || 0;
    const metodo = document.getElementById('cli-metodo').value;

    if (nombre && !isNaN(coti)) {
        db.clientes.push({
            id: Date.now(),
            nombre: nombre,
            coti: coti,
            pagos: [{ monto: pago, metodo: metodo, fecha: new Date().toLocaleDateString() }]
        });
        afectarCaja(metodo, pago, 'sumar');
        guardar();
        document.getElementById('cli-nombre').value = '';
        document.getElementById('cli-coti').value = '';
        document.getElementById('cli-pago').value = '';
    }
}

function registrarNuevoPago(id) {
    const monto = parseFloat(prompt("Monto recibido:"));
    const metodo = prompt("Método (Efectivo/Banco/Tarjeta):").toLowerCase();
    if (!isNaN(monto)) {
        const cli = db.clientes.find(c => c.id === id);
        cli.pagos.push({ monto: monto, metodo: metodo, fecha: new Date().toLocaleDateString() });
        afectarCaja(metodo, monto, 'sumar');
        guardar();
    }
}

function crearGastoRetiro() {
    const tipo = document.getElementById('gasto-tipo').value;
    const det = document.getElementById('gasto-detalle').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const origen = document.getElementById('gasto-origen').value;

    if (!isNaN(monto) && det) {
        db.movimientos.push({ tipo, det, monto, origen, fecha: new Date().toLocaleDateString() });
        afectarCaja(origen, monto, 'restar');
        guardar();
        document.getElementById('gasto-detalle').value = '';
        document.getElementById('gasto-monto').value = '';
    }
}

function afectarCaja(caja, monto, op) {
    let k = 'efectivo';
    if (caja.includes('ban')) k = 'banco';
    if (caja.includes('tar')) k = 'tarjetas';
    if (caja.includes('fon')) k = 'fondo';
    if (op === 'sumar') db.cajas[k] += monto; else db.cajas[k] -= monto;
}

function guardar() {
    localStorage.setItem('pac_db_v4', JSON.stringify(db));
    render();
}

function render() {
    document.getElementById('caja-efectivo').innerText = `$${Math.round(db.cajas.efectivo).toLocaleString()}`;
    document.getElementById('caja-banco').innerText = `$${Math.round(db.cajas.banco).toLocaleString()}`;
    document.getElementById('caja-tarjetas').innerText = `$${Math.round(db.cajas.tarjetas).toLocaleString()}`;
    document.getElementById('caja-fondo').innerText = `$${Math.round(db.cajas.fondo).toLocaleString()}`;

    const contCli = document.getElementById('lista-clientes-container');
    contCli.innerHTML = db.clientes.map(c => {
        const pagado = c.pagos.reduce((acc, p) => acc + p.monto, 0);
        const debe = c.coti - pagado;
        return `
            <div class="cliente-item">
                <div class="cliente-header" onclick="toggleDetalle(this)">
                    <strong>${c.nombre}</strong>
                    <span style="color:${debe > 0 ? 'orange' : '#22c55e'}">${debe > 0 ? 'Debe: $' + debe.toLocaleString() : 'PAGADO'}</span>
                </div>
                <div class="cliente-detalle">
                    <button class="btn btn-blue" onclick="registrarNuevoPago(${c.id})">+ Cargar Pago</button>
                    <div style="font-size:11px; margin-top:10px">
                        ${c.pagos.map(p => `${p.fecha}: $${p.monto} (${p.metodo})`).join('<br>')}
                    </div>
                </div>
            </div>`;
    }).join('');

    const retP = db.movimientos.filter(m => m.tipo === 'Pablo').reduce((acc, m) => acc + m.monto, 0);
    const retF = db.movimientos.filter(m => m.tipo === 'Fer').reduce((acc, m) => acc + m.monto, 0);
    document.getElementById('ret-pablo').innerText = `$${retP.toLocaleString()}`;
    document.getElementById('ret-fer').innerText = `$${retF.toLocaleString()}`;

    document.getElementById('body-gastos').innerHTML = db.movimientos.map(m => `
        <tr><td>${m.fecha}</td><td>${m.tipo}: ${m.det}</td><td style="color:#ef4444">-$${m.monto}</td></tr>
    `).reverse().join('');
}

function toggleDetalle(el) {
    const d = el.nextElementSibling;
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
}

render();
