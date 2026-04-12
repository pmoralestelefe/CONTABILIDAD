// 1. CONFIGURACIÓN DE SEGURIDAD (CONEXIÓN DIRECTA AL BOTÓN)
window.validarAcceso = function() {
    const passIngresada = document.getElementById('pass-acceso').value;
    const claveCorrecta = "PAC2026"; 
    
    if (passIngresada === claveCorrecta) {
        sessionStorage.setItem('acceso_pac', 'ok');
        document.getElementById('bloqueo-seguridad').style.display = 'none';
        console.log("Acceso concedido");
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
    periodo: ""
};

// 3. INICIO Y SINCRONIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    // Verificar si ya estaba logueado
    if (sessionStorage.getItem('acceso_pac') === 'ok') {
        const b = document.getElementById('bloqueo-seguridad');
        if(b) b.style.display = 'none';
    }
});

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { 
        db = data;
        if (db.periodo && document.getElementById('periodo-actual')) {
            document.getElementById('periodo-actual').value = db.periodo;
        }
        render();
    }
});

function actualizar() { set(dbRef, db); }

// 4. FUNCIONES GLOBALES (PARA QUE EL HTML LAS VEA)
window.verTab = function(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + id).style.display = 'block';
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
};

window.cambiarPeriodo = function() {
    const nuevoPeriodo = document.getElementById('periodo-actual').value;
    if (nuevoPeriodo) {
        db.periodo = nuevoPeriodo;
        actualizar(); 
    }
};

window.crearCliente = function() {
    const nom = document.getElementById('c-nom').value;
    const coti = parseFloat(document.getElementById('c-coti').value);
    if (nom && coti) {
        if(!db.clientes) db.clientes = [];
        db.clientes.push({ 
            id: Date.now(), nom, coti, pagos: [], materiales: [], deudaHeredada: 0, terminado: false 
        });
        actualizar();
        document.getElementById('c-nom').value = "";
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
        if (tipo === 'Pablo') db.retiros.pablo += monto;
        else if (tipo === 'Fer') db.retiros.fer += monto;
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

// 5. PDF Y RENDER
window.exportarPDF = function() {
    const elemento = document.createElement('div');
    elemento.style.padding = '30px';
    elemento.style.background = '#fff';
    elemento.style.color = '#333';

    let html = `<h1 style="text-align:center">PORTONES AUTOMÁTICOS CÓRDOBA</h1>
                <h2 style="text-align:center">Reporte: ${db.periodo}</h2>
                <hr>
                <h3>Cajas:</h3>
                <p>Banco: $${db.cajas.banco} | Efectivo: $${db.cajas.efectivo} | Tarjetas: $${db.cajas.tarjetas} | Fondo: $${db.cajas.fondo}</p>
                <h3>Retiros:</h3>
                <p>Pablo: $${db.retiros.pablo} | Fer: $${db.retiros.fer}</p>
                <hr>
                <h3>Clientes:</h3>`;

    db.clientes.forEach(c => {
        const pagado = c.pagos.reduce((a,b) => a+b.monto, 0);
        html += `<div style="border-bottom:1px solid #eee; padding:10px;">
                    <strong>${c.nom}</strong> - Cotización: $${c.coti} - Deuda: $${c.coti - pagado}<br>
                    <small>Garantía hasta: ${c.fechaFinalizado || 'No finalizado'}</small>
                 </div>`;
    });

    elemento.innerHTML = html;
    html2pdf().from(elemento).save(`Reporte-${db.periodo}.pdf`);
};

function render() {
    // Actualizar Totales
    if(document.getElementById('t-banco')) document.getElementById('t-banco').innerText = `$${db.cajas.banco.toLocaleString()}`;
    if(document.getElementById('t-efectivo')) document.getElementById('t-efectivo').innerText = `$${db.cajas.efectivo.toLocaleString()}`;
    if(document.getElementById('t-tarjetas')) document.getElementById('t-tarjetas').innerText = `$${(db.cajas.tarjetas || 0).toLocaleString()}`;
    if(document.getElementById('t-fondo')) document.getElementById('t-fondo').innerText = `$${db.cajas.fondo.toLocaleString()}`;
    if(document.getElementById('t-pablo')) document.getElementById('t-pablo').innerText = `$${db.retiros.pablo.toLocaleString()}`;
    if(document.getElementById('t-fer')) document.getElementById('t-fer').innerText = `$${db.retiros.fer.toLocaleString()}`;

    const cont = document.getElementById('contenedor-clientes');
    if(!cont) return;
    
    cont.innerHTML = (db.clientes || []).map(c => {
        const totalPagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const deudaTotal = c.coti - totalPagado;
        const listaMat = (c.materiales || []).map(m => `<li>${m.det}: $${m.costo}</li>`).join('');
        
        return `
            <div class="hoja-cliente" style="${c.terminado ? 'border-left: 5px solid green;' : ''}">
                <div style="display:flex; justify-content:space-between;">
                    <h3>${c.nom}</h3>
                    <input type="date" value="${c.fechaFinalizado || ''}" onchange="guardarFechaFin(${c.id}, this.value)">
                </div>
                <p>Deuda: $${deudaTotal.toLocaleString()}</p>
                <ul>${listaMat}</ul>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <input type="number" id="p-mon-${c.id}" placeholder="Cobro">
                        <select id="p-met-${c.id}"><option value="banco">Banco</option><option value="efectivo">Efectivo</option><option value="tarjetas">Tarjeta</option></select>
                        <button onclick="cargarPago(${c.id})" class="btn btn-blue">Cobrar</button>
                    </div>
                    <div>
                        <input type="text" id="m-det-${c.id}" placeholder="Qué se compró">
                        <input type="number" id="m-cos-${c.id}" placeholder="Costo">
                        <select id="m-ori-${c.id}"><option value="fondo">Fondo</option><option value="banco">Banco</option></select>
                        <button onclick="cargarMaterial(${c.id})" class="btn btn-red">Gasto</button>
                    </div>
                </div>
                <button onclick="toggleTerminado(${c.id})" style="margin-top:10px;">${c.terminado ? 'Reabrir' : 'Finalizar Obra'}</button>
            </div>`;
    }).join('');
}
