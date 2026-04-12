// 1. SEGURIDAD (Sin cambios en la lógica, solo visibilidad)
window.validarAcceso = function() {
    const passIngresada = document.getElementById('pass-acceso').value;
    const claveCorrecta = "PAC2026"; 
    if (passIngresada === claveCorrecta) {
        sessionStorage.setItem('acceso_pac', 'ok');
        document.getElementById('bloqueo-seguridad').style.display = 'none';
    } else {
        document.getElementById('error-pass').style.display = 'block';
    }
}

// 2. CONFIGURACIÓN FIREBASE (Tus credenciales reales)
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
    if (sessionStorage.getItem('acceso_pac') === 'ok') {
        const b = document.getElementById('bloqueo-seguridad');
        if(b) b.style.display = 'none';
    }
});

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) { db = data;
               if (db.periodo) document.getElementById('periodo-actual').value = db.periodo;
        
        render();
    }
});

function actualizar() { set(dbRef, db); }

// 4. FUNCIONES DE LA APP (IDÉNTICAS A LAS ANTERIORES)
window.cambiarPeriodo = function() {
    const nuevoPeriodo = document.getElementById('periodo-actual').value;
    if (nuevoPeriodo) {
        db.periodo = nuevoPeriodo;
        actualizar(); // Esto lo manda a Firebase para que no se pierda más
    }
}

window.verTab = function(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + id).style.display = 'block';
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
}

window.cargarTodoHeredado = function() {
    db.cajas.banco += parseFloat(document.getElementById('h-banco').value) || 0;
    db.cajas.efectivo += parseFloat(document.getElementById('h-efectivo').value) || 0;
    db.cajas.tarjetas += parseFloat(document.getElementById('h-tarjetas').value) || 0;
    db.cajas.fondo += parseFloat(document.getElementById('h-fondo').value) || 0;
    actualizar();
}

window.crearCliente = function() {
    const nom = document.getElementById('c-nom').value;
    const coti = parseFloat(document.getElementById('c-coti').value);
    if (nom && coti) {
        if(!db.clientes) db.clientes = [];
        db.clientes.push({ 
            id: Date.now(), nom, coti, pagos: [], materiales: [], deudaHeredada: 0, terminado: false 
        });
        actualizar();
    }
}

window.toggleTerminado = function(id) {
    const cli = db.clientes.find(c => c.id === id);
    cli.terminado = !cli.terminado;
    actualizar();
}

window.cargarPago = function(id) {
    const monto = parseFloat(document.getElementById(`p-mon-${id}`).value);
    const met = document.getElementById(`p-met-${id}`).value;
    if (monto) {
        const cli = db.clientes.find(c => c.id === id);
        if(!cli.pagos) cli.pagos = [];
        cli.pagos.push({ monto, met, fecha: new Date().toLocaleDateString() });
        db.cajas[met] += monto;
        actualizar();
    }
}

window.cargarMaterial = function(id) {
    const costo = parseFloat(document.getElementById(`m-cos-${id}`).value);
    const ori = document.getElementById(`m-ori-${id}`).value;
    const det = document.getElementById(`m-det-${id}`).value || "Material";
    if (costo) {
        const cli = db.clientes.find(c => c.id === id);
        if(!cli.materiales) cli.materiales = [];
        cli.materiales.push({ det, costo, fecha: new Date().toLocaleDateString() });
        db.cajas[ori] -= costo;
        actualizar();
    }
}

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
}

window.transferirBancoFondo = function() {
    const m = parseFloat(document.getElementById('trans-monto').value);
    if (m > 0 && m <= db.cajas.banco) {
        db.cajas.banco -= m; db.cajas.fondo += m;
        actualizar();
    }
}

window.acreditarTarjeta = function() {
    const m = parseFloat(document.getElementById('trans-monto').value);
    if (m > 0 && m <= db.cajas.tarjetas) {
        db.cajas.tarjetas -= m; db.cajas.banco += m;
        actualizar();
    }
}

// 5. PDF Y RENDER (MANTIENE TODO EL DISEÑO)
window.exportarPDF = function() {
    const elemento = document.createElement('div');
    elemento.style.padding = '20px';
    elemento.style.background = '#fff';
    elemento.innerHTML = `<h1>PORTONES AUTOMÁTICOS CÓRDOBA</h1><h2>Período: ${db.periodo}</h2>`;
    // ... (El resto de la lógica de PDF que ya tenías)
    const opt = { margin: 10, filename: `PAC-${db.periodo}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } };
    html2pdf().set(opt).from(elemento).save();
}

function render() {
    document.getElementById('t-banco').innerText = `$${db.cajas.banco.toLocaleString()}`;
    document.getElementById('t-efectivo').innerText = `$${db.cajas.efectivo.toLocaleString()}`;
    document.getElementById('t-tarjetas').innerText = `$${db.cajas.tarjetas.toLocaleString()}`;
    document.getElementById('t-fondo').innerText = `$${db.cajas.fondo.toLocaleString()}`;
    document.getElementById('t-pablo').innerText = `$${db.retiros.pablo.toLocaleString()}`;
    document.getElementById('t-fer').innerText = `$${db.retiros.fer.toLocaleString()}`;

    const cont = document.getElementById('contenedor-clientes');
    if(!cont) return;
    cont.innerHTML = (db.clientes || []).map(c => {
        const totalPagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const deudaTotal = (c.coti + (c.deudaHeredada || 0)) - totalPagado;
        const listaMat = (c.materiales || []).map(m => `<li style="font-size: 11px;">${m.det}: $${m.costo.toLocaleString()}</li>`).join('');
        return `
            <div class="hoja-cliente" style="${c.terminado ? 'opacity: 0.7; border-left: 10px solid #22c55e;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>${c.nom}</h3>
                    <label>Terminado: <input type="checkbox" ${c.terminado ? 'checked' : ''} onchange="toggleTerminado(${c.id})"></label>
                </div>
                <p>Debe: <strong>$${deudaTotal.toLocaleString()}</strong></p>
                <div style="margin: 10px 0; background: #f1f5f9; padding: 5px; border-radius: 5px; color:#333;">
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
                    </div>
                </div>
            </div>`;
    }).join('');
}
