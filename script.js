let db = JSON.parse(localStorage.getItem('pac_db_v8')) || {
    cajas: { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 },
    retiros: { pablo: 0, fer: 0 },
    clientes: [],
    periodo: ""
};

window.onload = () => {
    if (!db.periodo) {
        const hoy = new Date();
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        db.periodo = `${hoy.getFullYear()}-${mes}`;
    }
    const inputPeriodo = document.getElementById('periodo-actual');
    if(inputPeriodo) inputPeriodo.value = db.periodo;
    render();
};

function cambiarPeriodo() {
    db.periodo = document.getElementById('periodo-actual').value;
    actualizar();
}

function verTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + id).style.display = 'block';
    if(event) event.currentTarget.classList.add('active');
}

function cargarTodoHeredado() {
    db.cajas.banco += parseFloat(document.getElementById('h-banco').value) || 0;
    db.cajas.efectivo += parseFloat(document.getElementById('h-efectivo').value) || 0;
    db.cajas.tarjetas += parseFloat(document.getElementById('h-tarjetas').value) || 0;
    db.cajas.fondo += parseFloat(document.getElementById('h-fondo').value) || 0;
    document.getElementById('h-banco').value = '';
    document.getElementById('h-efectivo').value = '';
    document.getElementById('h-tarjetas').value = '';
    document.getElementById('h-fondo').value = '';
    actualizar();
}

function resetearMes() {
    if(confirm("¿Resetear mes? Se borrarán Retiros y SOLO los Clientes TERMINADOS de la lista de trabajo. Las cajas se mantienen.")) {
        db.retiros.pablo = 0;
        db.retiros.fer = 0;
        db.clientes = db.clientes.filter(c => !c.terminado);
        actualizar();
    }
}

function crearCliente() {
    const nom = document.getElementById('c-nom').value;
    const tel = document.getElementById('c-tel').value;
    const coti = parseFloat(document.getElementById('c-coti').value);
    const her = parseFloat(document.getElementById('c-heredado').value) || 0;
    
    if (nom && coti) {
        db.clientes.push({ 
            id: Date.now(), nom, tel, coti, 
            pagos: [], materiales: [], deudaHeredada: her, terminado: false 
        });
        document.getElementById('c-nom').value = '';
        document.getElementById('c-tel').value = '';
        document.getElementById('c-coti').value = '';
        document.getElementById('c-heredado').value = '';
        actualizar();
    }
}

function toggleTerminado(id) {
    const cli = db.clientes.find(c => c.id === id);
    cli.terminado = !cli.terminado;
    actualizar();
}

function cargarPago(id) {
    const monto = parseFloat(document.getElementById(`p-mon-${id}`).value);
    const met = document.getElementById(`p-met-${id}`).value;
    if (monto) {
        const cli = db.clientes.find(c => c.id === id);
        cli.pagos.push({ monto, met, fecha: new Date().toLocaleDateString() });
        db.cajas[met] += monto;
        document.getElementById(`p-mon-${id}`).value = '';
        actualizar();
    }
}

function cargarMaterial(id) {
    const det = document.getElementById(`m-det-${id}`).value;
    const costo = parseFloat(document.getElementById(`m-cos-${id}`).value);
    const ori = document.getElementById(`m-ori-${id}`).value;
    if (det && costo) {
        const cli = db.clientes.find(c => c.id === id);
        cli.materiales.push({ det, costo, fecha: new Date().toLocaleDateString() });
        db.cajas[ori] -= costo;
        document.getElementById(`m-det-${id}`).value = '';
        document.getElementById(`m-cos-${id}`).value = '';
        actualizar();
    }
}

function nuevoGastoGral() {
    const tipo = document.getElementById('g-tipo').value;
    const monto = parseFloat(document.getElementById('g-mon').value);
    const origen = document.getElementById('g-ori').value;
    if (monto) {
        if (tipo === 'Pablo') db.retiros.pablo += monto;
        else if (tipo === 'Fer') db.retiros.fer += monto;
        db.cajas[origen] -= monto;
        document.getElementById('g-mon').value = '';
        actualizar();
    }
}

function transferirBancoFondo() {
    const m = parseFloat(document.getElementById('trans-monto').value);
    if (m > 0 && m <= db.cajas.banco) {
        db.cajas.banco -= m; db.cajas.fondo += m;
        document.getElementById('trans-monto').value = '';
        actualizar();
    }
}

function acreditarTarjeta() {
    const m = parseFloat(document.getElementById('trans-monto').value);
    if (m > 0 && m <= db.cajas.tarjetas) {
        db.cajas.tarjetas -= m; db.cajas.banco += m;
        document.getElementById('trans-monto').value = '';
        actualizar();
    }
}

function exportarPDF() {
    const elemento = document.createElement('div');
    elemento.style.padding = '20px';
    elemento.style.fontFamily = 'Arial, sans-serif';
    elemento.style.color = '#000';
    elemento.style.background = '#fff';

    let htmlClientes = db.clientes.map(c => {
        const pagado = c.pagos.reduce((a, b) => a + b.monto, 0);
        const deudaTotal = (c.coti + c.deudaHeredada) - pagado;
        return `
            <div style="margin-top: 20px; border: 1px solid #000; padding: 10px;">
                <h3 style="margin-top:0;">Cliente: ${c.nom} ${c.terminado ? '(TERMINADO)' : '(EN CURSO)'}</h3>
                <p>Coti: $${c.coti.toLocaleString()} | Deuda Ant: $${c.deudaHeredada.toLocaleString()}</p>
                <p>Pagado: $${pagado.toLocaleString()} | <strong>Debe: $${deudaTotal.toLocaleString()}</strong></p>
                <table style="width:100%; border-collapse: collapse; font-size: 10px; margin-top:10px;">
                    <tr style="background:#ddd; border: 1px solid #000;"><th>Fecha</th><th>Concepto</th><th>Costo</th></tr>
                    ${c.materiales.map(m => `<tr><td style="border: 1px solid #000; padding:3px;">${m.fecha}</td><td style="border: 1px solid #000; padding:3px;">${m.det}</td><td style="border: 1px solid #000; padding:3px;">$${m.costo.toLocaleString()}</td></tr>`).join('')}
                </table>
            </div>`;
    }).join('');

    elemento.innerHTML = `
        <h1 style="text-align:center;">MEGAFILM PAC</h1>
        <h2 style="text-align:center;">Período: ${db.periodo}</h2>
        <div style="border: 2px solid #000; padding: 10px; margin-bottom: 20px;">
            <p><strong>Banco:</strong> $${db.cajas.banco.toLocaleString()} | <strong>Efe:</strong> $${db.cajas.efectivo.toLocaleString()}</p>
            <p><strong>Tarj:</strong> $${db.cajas.tarjetas.toLocaleString()} | <strong>Fondo:</strong> $${db.cajas.fondo.toLocaleString()}</p>
            <hr>
            <p><strong>Pablo:</strong> $${db.retiros.pablo.toLocaleString()} | <strong>Fer:</strong> $${db.retiros.fer.toLocaleString()}</p>
        </div>
        ${htmlClientes}
    `;

    const opt = { margin: 10, filename: `Reporte-${db.periodo}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(elemento).save();
}

function actualizar() {
    localStorage.setItem('pac_db_v8', JSON.stringify(db));
    render();
}

function render() {
    document.getElementById('t-banco').innerText = `$${db.cajas.banco.toLocaleString()}`;
    document.getElementById('t-efectivo').innerText = `$${db.cajas.efectivo.toLocaleString()}`;
    document.getElementById('t-tarjetas').innerText = `$${db.cajas.tarjetas.toLocaleString()}`;
    document.getElementById('t-fondo').innerText = `$${db.cajas.fondo.toLocaleString()}`;
    document.getElementById('t-pablo').innerText = `$${db.retiros.pablo.toLocaleString()}`;
    document.getElementById('t-fer').innerText = `$${db.retiros.fer.toLocaleString()}`;

    const cont = document.getElementById('contenedor-clientes');
    cont.innerHTML = db.clientes.map(c => {
        const totalPagado = c.pagos.reduce((a, b) => a + b.monto, 0);
        const deudaTotal = (c.coti + c.deudaHeredada) - totalPagado;
        const listaMat = c.materiales.map(m => `<li style="font-size: 11px;">${m.det}: $${m.costo.toLocaleString()}</li>`).join('');

        return `
            <div class="hoja-cliente" style="${c.terminado ? 'opacity: 0.7; border-left: 10px solid #22c55e;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${c.nom}</h3>
                    <label style="font-weight: bold; font-size: 14px; color: ${c.terminado ? '#22c55e' : '#ef4444'};">
                        Terminado: <input type="checkbox" ${c.terminado ? 'checked' : ''} onchange="toggleTerminado(${c.id})"> 
                        ${c.terminado ? 'SÍ' : 'NO'}
                    </label>
                </div>
                <p>Debe: <strong>$${deudaTotal.toLocaleString()}</strong></p>
                <div style="margin: 10px 0; background: #f1f5f9; padding: 5px; border-radius: 5px;">
                    <ul style="margin: 0; padding-left: 15px;">${listaMat || '<li style="font-size:11px;">Sin gastos</li>'}</ul>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                    <div>
                        <input type="number" id="p-mon-${c.id}" placeholder="Cobro $">
                        <select id="p-met-${c.id}"><option value="banco">Banco</option><option value="efectivo">Efe</option></select>
                        <button onclick="cargarPago(${c.id})" class="btn btn-blue" style="width:100%; padding:5px;">Cobrar</button>
                    </div>
                    <div>
                        <input type="number" id="m-cos-${c.id}" placeholder="Gasto $">
                        <select id="m-ori-${c.id}"><option value="fondo">Fondo</option><option value="efectivo">Efe</option></select>
                        <button onclick="cargarMaterial(${c.id})" class="btn btn-red" style="width:100%; padding:5px;">Gastar</button>
                        <input type="hidden" id="m-det-${c.id}" value="Material">
                    </div>
                </div>
            </div>`;
    }).join('');
}
