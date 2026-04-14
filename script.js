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
// SE AGREGÓ 'get' PARA PODER LEER EL MES ANTERIOR
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db_firebase = getDatabase(app);

let db = {
    cajas: { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 },
    retiros: { pablo: 0, fer: 0 },
    gastosPubli: 0, 
    clientes: [],
    historialRetiros: [], 
    periodo: ""
};

// VARIABLES GLOBALES PARA MANEJAR EL MES ACTIVO
let currentMes = "2026-04"; // Arranca por defecto en Abril 2026
let unsubscribe = null; // Para poder cambiar de mes sin cruzar datos

// 3. INICIO Y SINCRONIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem('acceso_pac') === 'ok') {
        const b = document.getElementById('bloqueo-seguridad');
        if(b) b.style.display = 'none';
    }

    // Cargar el último mes que el usuario vio, o por defecto arranca en Abril 2026
    currentMes = localStorage.getItem('ultimoMesPAC') || "2026-04";
    const el = document.getElementById('periodo-actual');
    if (el) el.value = currentMes;
    
    // Iniciar la escucha de datos para el mes correspondiente
    escucharMes(currentMes);
});

// FUNCIÓN PARA OBTENER EXACTAMENTE EL MES ANTERIOR AL QUE SE CREA
function getMesAnterior(mes) {
    const [y, m] = mes.split('-');
    let year = parseInt(y);
    let month = parseInt(m);
    month -= 1;
    if (month === 0) {
        month = 12;
        year -= 1;
    }
    return `${year}-${month.toString().padStart(2, '0')}`;
}

// FUNCIÓN QUE ESCUCHA LOS CAMBIOS DEL MES SELECCIONADO
function escucharMes(mes) {
    if (unsubscribe) unsubscribe(); // Deja de escuchar el mes viejo
    
    const mesRef = ref(db_firebase, `contabilidad/meses/${mes}`);
    unsubscribe = onValue(mesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) { 
            db = data;
            if(!db.gastosPubli) db.gastosPubli = 0; 
            if(!db.historialRetiros) db.historialRetiros = [];
            if(!db.periodo) db.periodo = mes;

            const el = document.getElementById('periodo-actual');
            if(el && el.value !== mes) el.value = mes;
            
            render();
        } else {
            // Si el mes NO existe en Firebase, lo creamos heredando lo del mes pasado
            inicializarNuevoMes(mes);
        }
    });
}

// FUNCIÓN QUE CREA UN MES NUEVO Y HEREDA SALDOS Y OBRAS
async function inicializarNuevoMes(mes) {
    const mesAnterior = getMesAnterior(mes);
    const prevRef = ref(db_firebase, `contabilidad/meses/${mesAnterior}`);
    const snapshot = await get(prevRef);
    let oldData = snapshot.val();

    let newData = {
        cajas: { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 },
        retiros: { pablo: 0, fer: 0 }, // QUEDAN EN 0
        gastosPubli: 0, // QUEDAN EN 0
        clientes: [],
        historialRetiros: [], // SE LIMPIA EL HISTORIAL DE RETIROS
        periodo: mes
    };

    if (oldData) {
        // HEREDAR CAJAS EXACTAMENTE COMO QUEDARON
        if (oldData.cajas) newData.cajas = { ...oldData.cajas };
        
        // HEREDAR SOLO LOS CLIENTES QUE NO ESTÁN TERMINADOS
        if (oldData.clientes) {
            newData.clientes = oldData.clientes.filter(c => !c.terminado).map(c => {
                let newC = JSON.parse(JSON.stringify(c)); // Copia profunda para no alterar datos viejos
                const pagado = (newC.pagos || []).reduce((a, b) => a + b.monto, 0);
                newC.deudaHeredada = newC.coti - pagado;
                newC.pagos = [];
                newC.materiales = [];
                return newC;
            });
        }
    }

    // Guardar el nuevo mes. Esto disparará automáticamente onValue() de arriba.
    await set(ref(db_firebase, `contabilidad/meses/${mes}`), newData);
}

// NUEVO ACTUALIZAR QUE GUARDA EN EL NODO DEL MES ACTUAL
function actualizar() { 
    set(ref(db_firebase, `contabilidad/meses/${currentMes}`), db); 
}


// 4. FUNCIONES DE LA APP
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
    if (nuevoPeriodo && nuevoPeriodo !== currentMes) {
        currentMes = nuevoPeriodo;
        localStorage.setItem('ultimoMesPAC', currentMes);
        escucharMes(currentMes);
    }
};

window.resetMes = function() {
    if(!confirm("¿ESTÁS SEGURO? Se resetearán todas las CAJAS a $0, se borrarán retiros y clientes finalizados. Solo quedarán obras activas con deuda.")) return;
    
    db.cajas = { banco: 0, efectivo: 0, tarjetas: 0, fondo: 0 };
    db.retiros = { pablo: 0, fer: 0 };
    db.gastosPubli = 0; 
    db.historialRetiros = []; 

    db.clientes = (db.clientes || []).filter(c => {
        return !c.terminado; 
    }).map(c => {
        const pagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        c.deudaHeredada = c.coti - pagado;
        c.pagos = [];
        c.materiales = [];
        return c;
    });
    
    actualizar();
    alert("Sistema reseteado a $0. Solo se conservan las obras en curso.");
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
        db.historialRetiros.push({
            tipo: 'Publicidad',
            detalle: det,
            monto: m,
            origen: ori,
            fecha: new Date().toLocaleDateString()
        });
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
        alert(`Se cargó correctamente el movimiento de $${monto}`);
        
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

// VER DETALLE
window.verDetalle = function(item) {
    document.getElementById('titulo-detalle').innerText = `Movimientos: ${item}`;
    let html = '';
    
    if (['banco', 'efectivo', 'tarjetas'].includes(item)) {
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
    } else if (['pablo', 'fer', 'publicidad'].includes(item)) {
        const tipoFiltro = item === 'publicidad' ? 'Publicidad' : (item.charAt(0).toUpperCase() + item.slice(1));
        const movs = (db.historialRetiros || []).filter(h => h.tipo === tipoFiltro);
        
        if (movs.length === 0) {
            html = '<p style="color: #94a3b8;">No hay movimientos registrados.</p>';
        } else {
            html = movs.map(m => `
                <div style="border-bottom: 1px solid #334155; padding: 12px 0;">
                    <div style="display:flex; justify-content:space-between; align-items: center;">
                        <strong style="font-size: 16px;">${m.detalle || (item === 'publicidad' ? 'Gasto General' : 'Retiro de Socios')}</strong>
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
        <p><strong>Publicidad / Otros:</strong> $${(db.gastosPubli || 0).toLocaleString()}</p>
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
    
    const elPubli = document.getElementById('t-publicidad');
    if(elPubli) elPubli.innerText = `$${(db.gastosPubli || 0).toLocaleString()}`;

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
        
        const totalMateriales = (c.materiales || []).reduce((a, b) => a + b.costo, 0);
        const gananciaNeta = c.coti - totalMateriales;
        
        const listaMat = (c.materiales || []).map(m => `<li style="font-size:11px;">${m.det}: $${m.costo.toLocaleString()}</li>`).join('');
        
        return `
            <div class="hoja-cliente" style="${c.terminado ? 'border-left: 8px solid #22c55e; opacity: 0.8;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0;">${c.nom}</h3>
                    <input type="date" value="${c.fechaFinalizado || ''}" onchange="guardarFechaFin(${c.id}, this.value)" style="width:auto; padding:2px;">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <p style="margin:0;">Deuda: <strong style="color:var(--red);">$${deudaTotal.toLocaleString()}</strong></p>
                    <p style="margin:0;">Ganancia: <strong style="color:#22c55e;">$${gananciaNeta.toLocaleString()}</strong></p>
                </div>
                <div style="background:rgba(0,0,0,0.1); padding:5px; border-radius:5px; margin-bottom:10px; margin-top: 10px;">
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
                        <select id="m-ori-${c.id}">
                            <option value="fondo">Fondo</option>
                            <option value="banco">Banco</option>
                            <option
