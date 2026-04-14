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

// VARIABLES DE CONTROL
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
        // CORRECCIÓN/MIGRACIÓN: Forzamos que si es la primera vez o formato viejo, inicie en ABRIL (2026-04)
        if (data.cajas && !data.meses) {
            const p = "2026-04"; // Forzado a Abril como pediste
            masterDB = {
                periodoActual: p,
                meses: {}
            };
            masterDB.meses[p] = data;
            delete masterDB.meses[p].periodo;
            set(dbRef, masterDB); 
            return; 
        }

        masterDB = data;
        if(!masterDB.meses) masterDB.meses = {};

        // Si no hay un periodo actual definido, usamos Abril 2026
        periodoSeleccionado = masterDB.periodoActual || "2026-04";
        
        const elPeriodo = document.getElementById('periodo-actual');
        if (elPeriodo && elPeriodo.value !== periodoSeleccionado) {
            elPeriodo.value = periodoSeleccionado;
        }

        cargarMes(periodoSeleccionado);
    }
});

// FUNCIÓN DE CARGA E HERENCIA
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

// 4. FUNCIONES DE LÓGICA (Sin cambios)
window.verTab = function(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    if(id !== 'detalle') {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(event && event.currentTarget) event.currentTarget.classList.add('active');
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
    if(!confirm("¿ESTÁS SEGURO? Se resetearán todas las CAJAS a $0 y se limpiarán retiros.")) return;
    db.cajas = { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 };
    db.retiros = { pablo: 0, fer: 0 };
    db.gastosPubli = 0; 
    db.historialRetiros = []; 
    db.clientes = (db.clientes || []).filter(c => !c.terminado);
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
        cli.pagos.push({ monto, met, fecha: new Date().toLocaleDateString() });
        db.cajas[met] = (db.cajas[met] || 0) + monto;
        actualizar();
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

window.acreditarTarjeta = function() {
    const m = parseFloat(document.getElementById('trans-monto').value);
    if (m > 0 && m <= (db.cajas.tarjetas || 0)) {
        db.cajas.tarjetas -= m; db.cajas.banco += m;
        actualizar();
    }
};

window.verDetalle = function(item) {
    document.getElementById('titulo-detalle').innerText = `Movimientos: ${item}`;
    let html = '';
    if (['banco', 'efectivo', 'tarjetas'].includes(item)) {
        const movs = [];
        (db.clientes || []).forEach(c => {
            (c.pagos || []).forEach(p => {
                if (p.met === item) movs.push({ cliente: c.nom, tel: c.tel || 'Sin número', monto: p.monto, fecha: p.fecha });
            });
        });
        html = movs.length === 0 ? '<p>No hay movimientos.</p>' : movs.map(m => `
            <div style="border-bottom: 1px solid #334155; padding: 12px 0;">
                <div style="display:flex; justify-content:space-between;"><strong>${m.cliente}</strong><span>${m.fecha}</span></div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;"><div style="color:#94a3b8;">📞 ${m.tel}</div><div style="color:#22c55e;">+ $${m.monto.toLocaleString()}</div></div>
            </div>`).join('');
    } else if (['pablo', 'fer', 'publicidad'].includes(item)) {
        const tipoFiltro = item === 'publicidad' ? 'Publicidad' : (item.charAt(0).toUpperCase() + item.slice(1));
        const movs = (db.historialRetiros || []).filter(h => h.tipo === tipoFiltro);
        html = movs.length === 0 ? '<p>No hay movimientos.</p>' : movs.map(m => `
            <div style="border-bottom: 1px solid #334155; padding: 12px 0;">
                <div style="display:flex; justify-content:space-between;"><strong>${m.detalle || 'Retiro'}</strong><span>${m.fecha}</span></div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;"><div style="color:#94a3b8;">Desde: ${m.origen.toUpperCase()}</div><div style="color:var(--red);">- $${m.monto.toLocaleString()}</div></div>
            </div>`).join('');
    }
    document.getElementById('lista-detalle').innerHTML = html;
    verTab('detalle'); 
};

window.exportarPDF = function() {
    const tmp = document.createElement('div');
    tmp.style.padding = '30px'; tmp.style.color = '#000'; tmp.style.background = '#fff';
    let html = `<h1 style="text-align:center;">PORTONES AUTOMÁTICOS CÓRDOBA</h1><h2 style="text-align:center;">Reporte: ${db.periodo}</h2><hr>`;
    html += `<p>Banco: $${db.cajas.banco.toLocaleString()} | Efectivo: $${db.cajas.efectivo.toLocaleString()}</p>`;
    html += `<p>Retiro Pablo: $${db.retiros.pablo.toLocaleString()} | Retiro Fer: $${db.retiros.fer.toLocaleString()}</p><hr><h3>Obras</h3>`;
    db.clientes.forEach(c => {
        const pagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        html += `<div><strong>${c.nom}</strong>: Debe $${(c.coti - pagado).toLocaleString()}</div>`;
    });
    tmp.innerHTML = html;
    html2pdf().set({ margin: 10, filename: `PAC-${db.periodo}.pdf` }).from(tmp).save();
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

    cont.innerHTML = (db.clientes || []).filter(c => {
        if (!c.terminado || !c.fechaFinalizado) return true;
        return c.fechaFinalizado.substring(0, 7) === db.periodo;
    }).map(c => {
        const totalPagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const deudaTotal = c.coti - totalPagado;
        const totalMat = (c.materiales || []).reduce((a, b) => a + b.costo, 0);
        const listaMat = (c.materiales || []).map(m => `<li>${m.det}: $${m.costo}</li>`).join('');
        
        return `
            <div class="hoja-cliente" style="${c.terminado ? 'border-left: 8px solid #22c55e;' : ''}">
                <div style="display:flex; justify-content:space-between;"><h3>${c.nom}</h3><input type="date" value="${c.fechaFinalizado || ''}" onchange="guardarFechaFin(${c.id}, this.value)"></div>
                <p>Deuda: <strong style="color:var(--red);">$${deudaTotal.toLocaleString()}</strong> | Ganancia: $${(c.coti-totalMat).toLocaleString()}</p>
                <ul>${listaMat || '<li>Sin gastos</li>'}</ul>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    <div><input type="number" id="p-mon-${c.id}" placeholder="$"><select id="p-met-${c.id}"><option value="banco">Banco</option><option value="efectivo">Efe</option><option value="tarjetas">Tarjeta</option></select><button onclick="cargarPago(${c.id})" class="btn btn-blue" style="width:100%">Cobrar</button></div>
                    <div><input type="text" id="m-det-${c.id}" placeholder="Mat"><input type="number" id="m-cos-${c.id}" placeholder="$"><select id="m-ori-${c.id}"><option value="fondo">Fondo</option><option value="banco">Banco</option><option value="efectivo">Efe</option></select><button onclick="cargarMaterial(${c.id})" class="btn btn-red" style="width:100%">Gastar</button></div>
                </div>
                <button onclick="toggleTerminado(${c.id})" style="width:100%; margin-top:10px; background:${c.terminado ? '#64748b' : '#22c55e'}; color:white; border:none; padding:5px; border-radius:5px;">${c.terminado ? 'Reabrir' : 'Finalizar'}</button>
            </div>`;
    }).join('');
}

// CALCULADORA (Sin cambios)
window.toggleCalculadora = function() {
    const calc = document.getElementById('calculadora-modal');
    const btn = document.getElementById('btn-abrir-calc');
    if (calc.style.display === 'none') { calc.style.display = 'block'; btn.style.display = 'none'; }
    else { calc.style.display = 'none'; btn.style.display = 'flex'; }
};
window.calcInput = function(val) { document.getElementById('calc-display').value += val; };
window.calcClear = function() { document.getElementById('calc-display').value = ""; };
window.calcEval = function() {
    const display = document.getElementById('calc-display');
    try {
        let expr = display.value.replace(/×/g, '*').replace(/÷/g, '/');
        if(/^[0-9+\-*/.() ]+$/.test(expr)){
            let res = Function('"use strict";return (' + expr + ')')();
            display.value = Number.isInteger(res) ? res : res.toFixed(2);
        }
    } catch(e) { display.value = "Error"; }
};
