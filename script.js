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

let db = {
    cajas: { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 },
    retiros: { pablo: 0, fer: 0 },
    clientes: [],
    historialRetiros: [], // Nuevo arreglo para guardar el detalle de Pablo y Fer
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
        db = data;
        if (db.periodo) {
            const el = document.getElementById('periodo-actual');
            if(el) el.value = db.periodo;
        }
        render();
    }
});

function actualizar() { set(dbRef, db); }

// 4. FUNCIONES DE LA APP
window.verTab = function(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    
    // Solo actualiza botones si no estamos en la pestaña interna de detalle
    if(id !== 'detalle') {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(event && event.currentTarget) event.currentTarget.classList.add('active');
    }
    
    document.getElementById('tab-' + id).style.display = 'block';
};

window.cambiarPeriodo = function() {
    const nuevoPeriodo = document.getElementById('periodo-actual').value;
    if (nuevoPeriodo) {
        db.periodo = nuevoPeriodo;
        actualizar(); 
    }
};

window.resetMes = function() {
    if(!confirm("¿ESTÁS SEGURO? Se resetearán todas las CAJAS a $0, se borrarán retiros y clientes finalizados. Solo quedarán obras activas con deuda.")) return;
    
    const mesActual = db.periodo;
    
    // 1. Resetear todas las cajas a Cero
    db.cajas = { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 };

    // 2. Reset de retiros de socios y su historial
    db.retiros = { pablo: 0, fer: 0 };
    db.historialRetiros = []; // Limpiamos el listado de detalle al resetear el mes

    // 3. Filtrar clientes: se quedan solo los que NO terminaron
    db.clientes = (db.clientes || []).filter(c => {
        return !c.terminado; 
    }).map(c => {
        // Calculamos cuánto nos deben al momento del reset y lo guardamos como base
        const pagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        c.deudaHeredada = c.coti - pagado;
        // Limpiamos movimientos para el mes nuevo
        c.pagos = [];
        c.materiales = [];
        return c;
    });
    
    actualizar();
    alert("Sistema reseteado a $0. Solo se conservan las obras en curso.");
};

window.crearCliente = function() {
    const nom = document.getElementById('c-nom').value;
    const tel = document.getElementById('c-tel').value; // Recuperamos el telefono
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

window.nuevoGastoGral = function() {
    const tipo = document.getElementById('g-tipo').value;
    const monto = parseFloat(document.getElementById('g-mon').value);
    const origen = document.getElementById('g-ori').value;
    if (monto) {
        if(!db.historialRetiros) db.historialRetiros = [];
        
        if (tipo === 'Pablo') db.retiros.pablo += monto;
        else if (tipo === 'Fer') db.retiros.fer += monto;
        
        // Guardamos el movimiento para el detalle (Aplica a retiros y gastos generales)
        db.historialRetiros.push({ tipo, monto, origen, fecha: new Date().toLocaleDateString() });
        
        db.cajas[origen] -= monto;
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

// NUEVA FUNCIÓN: VER DETALLE DE MOVIMIENTOS
window.verDetalle = function(item) {
    document.getElementById('titulo-detalle').innerText = `Movimientos: ${item}`;
    let html = '';
    
    if (['banco', 'efectivo', 'tarjetas'].includes(item)) {
        // Buscar pagos ingresados por los clientes en esta caja
        const movs = [];
        (db.clientes || []).forEach(c => {
            (c.pagos || []).forEach(p => {
                if (p.met === item) {
                    movs.push({
                        cliente: c.nom,
                        tel: c.tel || 'Sin número',
                        monto: p.monto,
                        fecha: p.fecha
                    });
                }
            });
        });
        
        if (movs.length === 0) {
            html = '<p style="color: #94a3b8;">No hay pagos de clientes registrados en esta cuenta.</p>';
        } else {
            html = movs.map(m => `
                <div style="border-bottom: 1px solid #334155; padding: 12px 0;">
                    <div style="display:flex; justify-content:space-between; align-items: center;">
                        <strong style="font-size: 16px;">${m.cliente}</strong>
                        <span style="font-size: 12px; color: #94a3b8;">${m.fecha}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items: center; margin-top: 5px;">
                        <div style="color: #94a3b8; font-size: 13px;">📞 ${m.tel}</div>
                        <div style="color: #22c55e; font-weight: bold;">+ $${m.monto.toLocaleString()}</div>
                    </div>
                </div>
            `).join('');
        }
    } else if (['pablo', 'fer'].includes(item)) {
        // Filtrar retiros del historial
        const nombreCapitalizado = item.charAt(0).toUpperCase() + item.slice(1);
        const movs = (db.historialRetiros || []).filter(h => h.tipo === nombreCapitalizado);
        
        if (movs.length === 0) {
            html = '<p style="color: #94a3b8;">No hay retiros registrados.</p>';
        } else {
            html = movs.map(m => `
                <div style="border-bottom: 1px solid #334155; padding: 12px 0;">
                    <div style="display:flex; justify-content:space-between; align-items: center;">
                        <strong style="font-size: 16px;">Retiro de Socios</strong>
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
    verTab('detalle'); // Llama a la pestaña oculta
};


// 5. PDF Y RENDER
window.exportarPDF = function() {
    const tmp = document.createElement('div');
    tmp.style.padding = '30px';
    tmp.style.color = '#000';
    tmp.style.background = '#fff';

    let html = `
        <h1 style="text-align:center; color:#3b82f6;">PORTONES AUTOMÁTICOS CÓRDOBA</h1>
        <h2 style="text-align:center;">Reporte: ${db.periodo}</h2>
        <hr>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
                <td><strong>Banco:</strong> $${db.cajas.banco.toLocaleString()}</td>
                <td><strong>Efectivo:</strong> $${db.cajas.efectivo.toLocaleString()}</td>
            </tr>
            <tr>
                <td><strong>Tarjetas:</strong> $${(db.cajas.tarjetas || 0).toLocaleString()}</td>
                <td><strong>Fondo:</strong> $${db.cajas.fondo.toLocaleString()}</td>
            </tr>
        </table>
        <p><strong>Retiro Pablo:</strong> $${db.retiros.pablo.toLocaleString()}</p>
        <p><strong>Retiro Fer:</strong> $${db.retiros.fer.toLocaleString()}</p>
        <hr>
        <h3>Estado de Obras</h3>`;

    db.clientes.forEach(c => {
        const pagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const deudaActual = c.coti - pagado;
        html += `
            <div style="border-bottom:1px solid #ccc; padding:10px 0;">
                <strong>${c.nom}</strong> ${c.terminado ? '(FINALIZADA)' : '(ACTIVA)'}<br>
                Coti: $${c.coti.toLocaleString()} | Cobrado: $${pagado.toLocaleString()} | <strong>Debe: $${deudaActual.toLocaleString()}</strong><br>
                ${c.fechaFinalizado ? `<small>Finalizado: ${c.fechaFinalizado}</small>` : ''}
            </div>`;
    });

    tmp.innerHTML = html;
    
    const opciones = {
        margin: 10,
        filename: `PAC-Reporte-${db.periodo}.pdf`,
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

    const cont = document.getElementById('contenedor-clientes');
    if(!cont) return;

    const mesSeleccionado = db.periodo;

    cont.innerHTML = (db.clientes || []).filter(c => {
        if (!c.terminado || !c.fechaFinalizado) return true;
        const mesFinalizado = c.fechaFinalizado.substring(0, 7);
        return mesFinalizado === mesSeleccionado;
    }).map(c => {
        const totalPagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const deudaTotal = c.coti - totalPagado;
        const listaMat = (c.materiales || []).map(m => `<li style="font-size:11px;">${m.det}: $${m.costo.toLocaleString()}</li>`).join('');
        
        return `
            <div class="hoja-cliente" style="${c.terminado ? 'border-left: 8px solid #22c55e; opacity: 0.8;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">${c.nom}</h3>
                    <input type="date" value="${c.fechaFinalizado || ''}" onchange="guardarFechaFin(${c.id}, this.value)" style="width:auto; padding:2px;">
                </div>
                <p style="margin:5px 0;">Deuda: <strong style="color:var(--red);">$${deudaTotal.toLocaleString()}</strong></p>
                <div style="background:rgba(0,0,0,0.1); padding:5px; border-radius:5px; margin-bottom:10px;">
                    <ul style="margin:0; padding-left:15px;">${listaMat || '<li style="font-size:10px;">Sin gastos</li>'}</ul>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                    <div>
                        <input type="number" id="p-mon-${c.id}" placeholder="Cobro $">
                        <select id="p-met-${c.id}"><option value="banco">Banco</option><option value="efectivo">Efe</option><option value="tarjetas">Tarjeta</option></select>
                        <button onclick="cargarPago(${c.id})" class="btn btn-blue" style="width:100%; padding:5px; margin-top:3px;">Cobrar</button>
                    </div>
                    <div>
                        <input type="text" id="m-det-${c.id}" placeholder="Detalle">
                        <input type="number" id="m-cos-${c.id}" placeholder="Gasto $">
                        <select id="m-ori-${c.id}"><option value="fondo">Fondo</option><option value="banco">Banco</option></select>
                        <button onclick="cargarMaterial(${c.id})" class="btn btn-red" style="width:100%; padding:5px; margin-top:3px;">Gastar</button>
                    </div>
                </div>
                <button onclick="toggleTerminado(${c.id})" style="width:100%; margin-top:10px; background:${c.terminado ? '#64748b' : '#22c55e'}; color:white; border:none; padding:5px; border-radius:5px;">
                    ${c.terminado ? 'Reabrir Obra' : 'Finalizar Obra'}
                </button>
            </div>`;
    }).join('');
}
