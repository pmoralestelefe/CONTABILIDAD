let db = JSON.parse(localStorage.getItem('pac_db_final')) || {
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

function cargarHeredado() {
    const e = parseFloat(document.getElementById('h-efectivo').value) || 0;
    const b = parseFloat(document.getElementById('h-banco').value) || 0;
    db.cajas.efectivo += e;
    db.cajas.banco += b;
    document.getElementById('h-efectivo').value = '';
    document.getElementById('h-banco').value = '';
    actualizar();
}

function nuevoCliente() {
    const nombre = prompt("Nombre del Cliente:");
    const coti = parseFloat(prompt("Total Cotizado ($):"));
    const pago = parseFloat(prompt("Entrega Inicial ($):") || 0);
    const metodo = prompt("Método (Efectivo / Banco / Tarjeta):").toLowerCase();

    if (nombre && !isNaN(coti)) {
        db.clientes.push({
            id: Date.now(),
            nombre, coti,
            pagos: [{ monto: pago, metodo, fecha: new Date().toLocaleDateString() }]
        });
        modificarCaja(metodo, pago, 'sumar');
        actualizar();
    }
}

function agregarPago(id) {
    const monto = parseFloat(prompt("Monto del nuevo pago:"));
    const metodo = prompt("Método (Efectivo / Banco / Tarjeta):").toLowerCase();
    if (!isNaN(monto)) {
        const cli = db.clientes.find(c => c.id === id);
        cli.pagos.push({ monto, metodo, fecha: new Date().toLocaleDateString() });
        modificarCaja(metodo, monto, 'sumar');
        actualizar();
    }
}

function nuevoGasto() {
    const tipo = prompt("¿Es Retiro Pablo, Retiro Fer o Gasto?");
    const monto = parseFloat(prompt("Monto ($):"));
    const origen = prompt("¿De dónde sale? (Fondo / Efectivo / Banco)").toLowerCase();

    if (!isNaN(monto)) {
        db.movimientos.push({ tipo, monto, origen, fecha: new Date().toLocaleDateString() });
        modificarCaja(origen, monto, 'restar');
        actualizar();
    }
}

function modificarCaja(caja, monto, op) {
    let k = caja.includes('efe') ? 'efectivo' : caja.includes('ban') ? 'banco' : caja.includes('tar') ? 'tarjetas' : 'fondo';
    if (op === 'sumar') db.cajas[k] += monto; else db.cajas[k] -= monto;
}

function actualizar() {
    localStorage.setItem('pac_db_final', JSON.stringify(db));
    render();
}

function render() {
    document.getElementById('caja-efectivo').innerText = `$${Math.round(db.cajas.efectivo).toLocaleString()}`;
    document.getElementById('caja-banco').innerText = `$${Math.round(db.cajas.banco).toLocaleString()}`;
    document.getElementById('caja-tarjetas').innerText = `$${Math.round(db.cajas.tarjetas).toLocaleString()}`;
    document.getElementById('caja-fondo').innerText = `$${Math.round(db.cajas.fondo).toLocaleString()}`;

    const cont = document.getElementById('lista-clientes-container');
    cont.innerHTML = db.clientes.map(c => {
        const totalPagado = c.pagos.reduce((acc, p) => acc + p.monto, 0);
        const deuda = c.coti - totalPagado;
        return `
            <div class="cliente-item">
                <div class="cliente-header" onclick="toggleDetalle(this)">
                    <strong>${c.nombre}</strong>
                    <span style="color:${deuda > 0 ? 'orange' : '#22c55e'}">${deuda > 0 ? 'Debe: $' + deuda.toLocaleString() : 'PAGADO'}</span>
                </div>
                <div class="cliente-detalle">
                    <button class="btn btn-blue" onclick="agregarPago(${c.id})">+ Cargar Pago</button>
                    <div style="font-size:11px; margin-top:10px">
                        ${c.pagos.map(p => `${p.fecha}: $${p.monto} (${p.metodo})`).join('<br>')}
                    </div>
                </div>
            </div>`;
    }).join('');

    const retP = db.movimientos.filter(m => m.tipo.toLowerCase().includes('pablo')).reduce((acc, m) => acc + m.monto, 0);
    const retF = db.movimientos.filter(m => m.tipo.toLowerCase().includes('fer')).reduce((acc, m) => acc + m.monto, 0);
    document.getElementById('ret-pablo').innerText = `$${retP.toLocaleString()}`;
    document.getElementById('ret-fer').innerText = `$${retF.toLocaleString()}`;
}

function toggleDetalle(el) {
    const d = el.nextElementSibling;
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
}

render();
