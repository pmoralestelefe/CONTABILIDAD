// 1. CONFIGURACIÓN DE SEGURIDAD
window.validarAcceso = function() {
    const passIngresada = document.getElementById('pass-acceso').value;
    const claveCorrecta = "PAC2026"; 
    if (passIngresada === claveCorrecta) {
        sessionStorage.setItem('acceso_pac', 'ok');
        document.getElementById('bloqueo-seguridad').style.display = 'none';
    } else {
        document.getElementById('error-pass').style.display = 'block';
    }
};

// 2. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBnXQE-0Qxd1oRtY5jhaxuZ3ISMiOVhgNs",
    authDomain: "contabilidad-pac.firebaseapp.com",
    databaseURL: "https://contabilidad-pac-default-rtdb.firebaseio.com",
    projectId: "contabilidad-pac",
    storageBucket: "contabilidad-pac.firebasestorage.app",
    messagingSenderId: "74465692200",
    appId: "1:74465692200:web:764e4243b94dd2886b431d"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db_firebase = getDatabase(app);
const dbRef = ref(db_firebase, 'contabilidad');

let masterDB = {}; 
let periodoSeleccionado = ""; 

let db = {
    cajas: { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 },
    retiros: { pablo: 0, fer: 0 },
    gastosPubli: 0, 
    clientes: [],
    historialRetiros: [], 
    periodo: ""
};

// 3. INICIO Y SINCRONIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem('acceso_pac') === 'ok') {
        const b = document.getElementById('bloqueo-seguridad');
        if(b) b.style.display = 'none';
    }
});

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { 
        if (data.cajas && !data.meses) {
            const p = data.periodo || new Date().toISOString().slice(0,7);
            masterDB = { periodoActual: p, meses: {} };
            masterDB.meses[p] = data;
            delete masterDB.meses[p].periodo; 
            set(dbRef, masterDB); 
            return; 
        }

        masterDB = data;
        if(!masterDB.meses) masterDB.meses = {};
        periodoSeleccionado = masterDB.periodoActual || new Date().toISOString().slice(0,7);
        const elPeriodo = document.getElementById('periodo-actual');
        if (elPeriodo && elPeriodo.value !== periodoSeleccionado) {
            elPeriodo.value = periodoSeleccionado;
        }
        cargarMes(periodoSeleccionado);
    }
});

function cargarMes(mes) {
    if (!masterDB.meses) masterDB.meses = {};
    if (!masterDB.meses[mes]) {
        const mesesExistentes = Object.keys(masterDB.meses).sort();
        let mesAnterior = null;
        for(let i = mesesExistentes.length - 1; i >= 0; i--) {
            if(mesesExistentes[i] < mes) {
                mesAnterior = mesesExistentes[i];
                break;
            }
        }
        let cajasHeredadas = { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 };
        let clientesHeredados = [];
        if (mesAnterior && masterDB.meses[mesAnterior]) {
            const dbAnt = masterDB.meses[mesAnterior];
            cajasHeredadas = JSON.parse(JSON.stringify(dbAnt.cajas || cajasHeredadas));
            clientesHeredados = (dbAnt.clientes || []).filter(c => !c.terminado).map(c => JSON.parse(JSON.stringify(c)));
        }
        masterDB.meses[mes] = {
            cajas: cajasHeredadas,
            retiros: { pablo: 0, fer: 0 },
            gastosPubli: 0,
            clientes: clientesHeredados,
            historialRetiros: []
        };
        masterDB.periodoActual = mes;
        set(dbRef, masterDB);
        return;
    }
    db = masterDB.meses[mes];
    db.periodo = mes; 
    if(!db.cajas) db.cajas = { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 };
    if(!db.retiros) db.retiros = { pablo: 0, fer: 0 };
    if(!db.gastosPubli) db.gastosPubli = 0;
    if(!db.historialRetiros) db.historialRetiros = [];
    if(!db.clientes) db.clientes = [];
    render();
}

function actualizar() { 
    if (!periodoSeleccionado) return;
    masterDB.meses[periodoSeleccionado] = db;
    masterDB.periodoActual = periodoSeleccionado;
    set(dbRef, masterDB); 
}

// 4. FUNCIONES DE LA APP
window.verTab = function(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    if(id !== 'detalle') {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(event && event.currentTarget && event.currentTarget.classList) event.currentTarget.classList.add('active');
    }
    document.getElementById('tab-' + id).style.display = 'block';
};

window.cambiarPeriodo = function() {
    const nuevoPeriodo = document.getElementById('periodo-actual').value;
    if (nuevoPeriodo) {
        masterDB.periodoActual = nuevoPeriodo;
        set(dbRef, masterDB);
    }
};

window.resetMes = function() {
    if(!confirm("¿ESTÁS SEGURO? Se resetearán todas las CAJAS a $0, se borrarán retiros y clientes finalizados del mes actual.")) return;
    db.cajas = { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 };
    db.retiros = { pablo: 0, fer: 0 };
    db.gastosPubli = 0; 
    db.historialRetiros = []; 
    db.clientes = (db.clientes || []).filter(c => !c.terminado).map(c => {
        const pagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        c.deudaHeredada = c.coti - pagado;
        c.pagos = [];
        c.materiales = [];
        return c;
    });
    actualizar();
};

window.crearCliente = function() {
    const nom = document.getElementById('c-nom').value;
    const tel = document.getElementById('c-tel').value; 
    const coti = parseFloat(document.getElementById('c-coti').value);
    if (nom && coti) {
        if(!db.clientes) db.clientes = [];
        db.clientes.push({ 
            id: Date.now(), nom, tel, coti, pagos: [], materiales: [], deudaHeredada: 0, terminado: false 
        });
        actualizar();
        document.getElementById('c-nom').value = "";
        document.getElementById('c-tel').value = "";
        document.getElementById('c-coti').value = "";
    }
};

// NUEVA FUNCIÓN: ELIMINAR CLIENTE
window.eliminarCliente = function(id) {
    if(confirm("¿Seguro que querés borrar este cliente? Se perderá todo el registro de esta obra.")) {
        db.clientes = db.clientes.filter(c => c.id !== id);
        actualizar();
    }
};

window.toggleTerminado = function(id) {
    const cli = db.clientes.find(c => c.id === id);
    if(cli) {
        cli.terminado = !cli.terminado;
        actualizar();
    }
};

window.guardarFechaFin = function(id, fecha) {
    const cli = db.clientes.find(c => c.id === id);
    if (cli) {
        cli.fechaFinalizado = fecha;
        actualizar();
    }
};

window.cargarPago = function(id) {
    const monto = parseFloat(document.getElementById(`p-mon-${id}`).value);
    const met = document.getElementById(`p-met-${id}`).value;
    if (monto) {
        const cli = db.clientes.find(c => c.id === id);
        if(!cli.pagos) cli.pagos = [];
        cli.pagos.push({ id_pago: Date.now(), monto, met, fecha: new Date().toLocaleDateString() });
        db.cajas[met] = (db.cajas[met] || 0) + monto;
        actualizar();
    }
};

// NUEVA FUNCIÓN: ELIMINAR PAGO (CORRECCIÓN)
window.eliminarPago = function(clienteId, pagoId) {
    if(confirm("¿Eliminar este pago y descontar del saldo?")) {
        const cli = db.clientes.find(c => c.id === clienteId);
        const pagoIdx = cli.pagos.findIndex(p => p.id_pago === pagoId);
        if(pagoIdx > -1) {
            const pago = cli.pagos[pagoIdx];
            db.cajas[pago.met] -= pago.monto; // Restamos el dinero de la caja
            cli.pagos.splice(pagoIdx, 1);
            actualizar();
            verDetalle(pago.met); // Refrescar vista detalle
        }
    }
};

window.cargarMaterial = function(id) {
    const costo = parseFloat(document.getElementById(`m-cos-${id}`).value);
    const ori = document.getElementById(`m-ori-${id}`).value;
    const det = document.getElementById(`m-det-${id}`).value || "Material";
    if (costo) {
        const cli = db.clientes.find(c => c.id === id);
        if(!cli.materiales) cli.materiales = [];
        cli.materiales.push({ det, costo, fecha: new Date().toLocaleDateString() });
        db.cajas[ori] = (db.cajas[ori] || 0) - costo;
        actualizar();
    }
};

window.cargarGastoPublicidad = function() {
    const det = document.getElementById('publi-det').value || 'Publicidad/Otros';
    const m = parseFloat(document.getElementById('publi-monto').value);
    const ori = document.getElementById('publi-ori').value;
    if (m > 0) {
        db.gastosPubli = (db.gastosPubli || 0) + m;
        db.historialRetiros.push({ tipo: 'Publicidad', detalle: det, monto: m, origen: ori, fecha: new Date().toLocaleDateString() });
        db.cajas[ori] -= m;
        document.getElementById('publi-det').value = "";
        document.getElementById('publi-monto').value = "";
        actualizar();
    }
};

window.ajustarSaldo = function() {
    const m = parseFloat(document.getElementById('ajuste-monto').value);
    const caja = document.getElementById('ajuste-caja').value;
    if (m > 0) {
        db.cajas[caja] = (db.cajas[caja] || 0) + m;
        document.getElementById('ajuste-monto').value = "";
        actualizar();
    }
};

window.nuevoGastoGral = function() {
    const tipo = document.getElementById('g-tipo').value;
    const monto = parseFloat(document.getElementById('g-mon').value);
    const origen = document.getElementById('g-ori').value;
    if (monto) {
        if(!db.historialRetiros) db.historialRetiros = [];
        if (tipo === 'Pablo') db.retiros.pablo += monto;
        else if (tipo === 'Fer') db.retiros.fer += monto;
        db.historialRetiros.push({ tipo, monto, origen, fecha: new Date().toLocaleDateString() });
        db.cajas[origen] -= monto;
        document.getElementById('g-mon').value = "";
        actualizar();
    }
};

window.transferirBancoFondo = function() {
    const m = parseFloat(document.getElementById('trans-monto').value);
    if (m > 0 && m <= db.cajas.banco) {
        db.cajas.banco -= m; db.cajas.fondo += m;
        actualizar();
    }
};

// MODIFICADO: ACREDITAR TARJETA CON COMISIÓN
window.acreditarTarjeta = function() {
    const bruto = parseFloat(document.getElementById('trans-monto').value);
    const comision = parseFloat(document.getElementById('trans-comision').value) || 0;
    const neto = bruto - comision;

    if (bruto > 0 && bruto <= (db.cajas.tarjetas || 0)) {
        db.cajas.tarjetas -= bruto; 
        db.cajas.banco += neto;
        // Si hay comisión, la registramos como un gasto automático para que el balance cierre
        if(comision > 0) {
            db.gastosPubli = (db.gastosPubli || 0) + comision;
            db.historialRetiros.push({ tipo: 'Publicidad', detalle: 'Comisión Bancaria Tarjeta', monto: comision, origen: 'banco', fecha: new Date().toLocaleDateString() });
        }
        document.getElementById('trans-monto').value = "";
        document.getElementById('trans-comision').value = "";
        actualizar();
        alert(`Acreditado: $${neto} (Comisión: $${comision})`);
    } else {
        alert("Monto bruto inválido o superior al saldo en Tarjetas.");
    }
};

// MODIFICADO: VER DETALLE CON BORRADO DE PAGOS
window.verDetalle = function(item) {
    document.getElementById('titulo-detalle').innerText = `Movimientos: ${item}`;
    let html = '';
    
    if (['banco', 'efectivo', 'tarjetas'].includes(item)) {
        const movs = [];
        (db.clientes || []).forEach(c => {
            (c.pagos || []).forEach(p => {
                if (p.met === item) {
                    movs.push({ cliente: c.nom, idCli: c.id, idPago: p.id_pago, monto: p.monto, fecha: p.fecha });
                }
            });
        });
        
        if (movs.length === 0) {
            html = '<p style="color: #94a3b8;">No hay pagos reales en esta cuenta.</p>';
        } else {
            html = movs.map(m => `
                <div style="border-bottom: 1px solid #334155; padding: 12px 0; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${m.cliente}</strong><br>
                        <small style="color:#94a3b8">${m.fecha}</small>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="color: #22c55e; font-weight: bold;">+ $${m.monto.toLocaleString()}</span>
                        <button onclick="eliminarPago(${m.idCli}, ${m.idPago})" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:18px;">✕</button>
                    </div>
                </div>
            `).join('');
        }
    } else if (['pablo', 'fer', 'publicidad'].includes(item)) {
        const tipoFiltro = item === 'publicidad' ? 'Publicidad' : (item.charAt(0).toUpperCase() + item.slice(1));
        const movs = (db.historialRetiros || []).filter(h => h.tipo === tipoFiltro);
        if (movs.length === 0) {
            html = '<p style="color: #94a3b8;">No hay movimientos registrados.</p>';
        } else {
            html = movs.map(m => `
                <div style="border-bottom: 1px solid #334155; padding: 12px 0;">
                    <div style="display:flex; justify-content:space-between; align-items: center;">
                        <strong style="font-size: 16px;">${m.detalle || 'Retiro'}</strong>
                        <span style="font-size: 12px; color: #94a3b8;">${m.fecha}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items: center; margin-top: 5px;">
                        <div style="color: #94a3b8; font-size: 13px;">Desde: ${m.origen.toUpperCase()}</div>
                        <div style="color: var(--red); font-weight: bold;">- $${m.monto.toLocaleString()}</div>
                    </div>
                </div>
            `).join('');
        }
    }
    document.getElementById('lista-detalle').innerHTML = html;
    verTab('detalle'); 
};

// 5. PDF Y RENDER
window.exportarPDF = function() {
    const tmp = document.createElement('div');
    tmp.style.padding = '40px'; // Margen para el PDF
    tmp.style.color = '#000';
    tmp.style.background = '#fff';
    tmp.style.fontSize = '12px';

    let html = `
        <h1 style="text-align:center; color:#3b82f6; margin-bottom:5px;">PORTONES AUTOMÁTICOS CÓRDOBA</h1>
        <h3 style="text-align:center; margin-bottom:20px;">Reporte de Periodo: ${db.periodo}</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; border: 1px solid #000;">
            <tr style="background:#eee;">
                <th style="padding:8px; border:1px solid #000;">BANCO</th>
                <th style="padding:8px; border:1px solid #000;">EFECTIVO</th>
                <th style="padding:8px; border:1px solid #000;">TARJETAS</th>
                <th style="padding:8px; border:1px solid #000;">FONDO</th>
            </tr>
            <tr>
                <td style="padding:8px; border:1px solid #000; text-align:center;">$${db.cajas.banco.toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #000; text-align:center;">$${db.cajas.efectivo.toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #000; text-align:center;">$${(db.cajas.tarjetas || 0).toLocaleString()}</td>
                <td style="padding:8px; border:1px solid #000; text-align:center;">$${db.cajas.fondo.toLocaleString()}</td>
            </tr>
        </table>
        <div style="margin-bottom:20px;">
            <p><strong>Retiro Pablo:</strong> $${db.retiros.pablo.toLocaleString()}</p>
            <p><strong>Retiro Fer:</strong> $${db.retiros.fer.toLocaleString()}</p>
            <p><strong>Publicidad / Gastos Grales:</strong> $${(db.gastosPubli || 0).toLocaleString()}</p>
        </div>
        <hr>
        <h3>Estado de Obras / Clientes</h3>`;

    db.clientes.forEach(c => {
        const pagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const deudaActual = c.coti - pagado;
        html += `
            <div style="border-bottom:1px solid #ccc; padding:10px 0; page-break-inside: avoid;">
                <strong>${c.nom}</strong> ${c.terminado ? '(FINALIZADA)' : '(ACTIVA)'}<br>
                Coti: $${c.coti.toLocaleString()} | Cobrado: $${pagado.toLocaleString()} | <strong>Debe: $${deudaActual.toLocaleString()}</strong><br>
                ${c.fechaFinalizado ? `<small>Fecha Obra: ${c.fechaFinalizado}</small>` : ''}
            </div>`;
    });

    tmp.innerHTML = html;
    const opciones = {
        margin: [10, 10, 10, 10],
        filename: `PAC-Reporte-${db.periodo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opciones).from(tmp).save();
};

function render() {
    document.getElementById('t-banco').innerText = `$${db.cajas.banco.toLocaleString()}`;
    document.getElementById('t-efectivo').innerText = `$${db.cajas.efectivo.toLocaleString()}`;
    document.getElementById('t-tarjetas').innerText = `$${(db.cajas.tarjetas || 0).toLocaleString()}`;
    document.getElementById('t-fondo').innerText = `$${db.cajas.fondo.toLocaleString()}`;
    document.getElementById('t-pablo').innerText = `$${db.retiros.pablo.toLocaleString()}`;
    document.getElementById('t-fer').innerText = `$${db.retiros.fer.toLocaleString()}`;
    const elPubli = document.getElementById('t-publicidad');
    if(elPubli) elPubli.innerText = `$${(db.gastosPubli || 0).toLocaleString()}`;

    const cont = document.getElementById('contenedor-clientes');
    if(!cont) return;

    const mesSeleccionado = db.periodo;
    cont.innerHTML = (db.clientes || []).filter(c => {
        if (!c.terminado || !c.fechaFinalizado) return true;
        return c.fechaFinalizado.substring(0, 7) === mesSeleccionado;
    }).map(c => {
        const totalPagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const deudaTotal = c.coti - totalPagado;
        const totalMateriales = (c.materiales || []).reduce((a, b) => a + b.costo, 0);
        const gananciaNeta = c.coti - totalMateriales;
        const listaMat = (c.materiales || []).map(m => `<li style="font-size:11px;">${m.det}: $${m.costo.toLocaleString()}</li>`).join('');
        
        return `
            <div class="hoja-cliente" style="${c.terminado ? 'border-left: 8px solid #22c55e; opacity: 0.8;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">${c.nom}</h3>
                    <button onclick="eliminarCliente(${c.id})" style="background:none; border:none; color:var(--red); font-size:12px; cursor:pointer;">ELIMINAR HOJA</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <p style="margin:0; font-size:13px;">Deuda: <strong style="color:var(--red);">$${deudaTotal.toLocaleString()}</strong></p>
                    <input type="date" value="${c.fechaFinalizado || ''}" onchange="guardarFechaFin(${c.id}, this.value)" style="width:auto; padding:2px; font-size:11px; margin:0;">
                </div>
                <div style="background:rgba(0,0,0,0.1); padding:5px; border-radius:5px; margin-top: 10px;">
                    <ul style="margin:0; padding-left:15px;">${listaMat || '<li style="font-size:10px;">Sin gastos</li>'}</ul>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:10px;">
                    <div>
                        <input type="number" id="p-mon-${c.id}" placeholder="Cobro $">
                        <select id="p-met-${c.id}"><option value="banco">Banco</option><option value="efectivo">Efe</option><option value="tarjetas">Tarjeta</option></select>
                        <button onclick="cargarPago(${c.id})" class="btn btn-blue" style="width:100%; padding:5px;">Cobrar</button>
                    </div>
                    <div>
                        <input type="text" id="m-det-${c.id}" placeholder="Detalle Gasto">
                        <input type="number" id="m-cos-${c.id}" placeholder="Monto $">
                        <button onclick="cargarMaterial(${c.id})" class="btn btn-red" style="width:100%; padding:5px;">Gastar</button>
                        <select id="m-ori-${c.id}" style="margin-top:5px;"><option value="fondo">Fondo</option><option value="banco">Banco</option><option value="efectivo">Efe</option></select>
                    </div>
                </div>
                <button onclick="toggleTerminado(${c.id})" style="width:100%; margin-top:10px; background:${c.terminado ? '#64748b' : '#22c55e'}; color:white; border:none; padding:8px; border-radius:5px; font-weight:bold;">
                    ${c.terminado ? 'Reabrir Obra' : 'Finalizar Obra'}
                </button>
            </div>`;
    }).join('');
}

// CALCULADORA
window.toggleCalculadora = function() {
    const calc = document.getElementById('calculadora-modal');
    const btn = document.getElementById('btn-abrir-calc');
    if (calc.style.display === 'none') {
        calc.style.display = 'block';
        btn.style.display = 'none';
    } else {
        calc.style.display = 'none';
        btn.style.display = 'flex';
    }
};
window.calcInput = function(val) {
    const display = document.getElementById('calc-display');
    if (display.value === "Error") display.value = "";
    display.value += val;
};
window.calcClear = function() { document.getElementById('calc-display').value = ""; };
window.calcEval = function() {
    const display = document.getElementById('calc-display');
    try {
        let expr = display.value.replace(/×/g, '*').replace(/÷/g, '/');
        if(/^[0-9+\-*/.() ]+$/.test(expr)){
            let res = Function('"use strict";return (' + expr + ')')();
            if(!Number.isInteger(res)) res = res.toFixed(2);
            display.value = res;
        } else { display.value = "Error"; }
    } catch(e) { display.value = "Error"; }
};
