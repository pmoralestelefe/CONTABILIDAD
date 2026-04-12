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

// 4. FUNCIONES DE LA APP (IDÉNTICAS A LAS ANTERIORES + GARANTÍA)
window.cambiarPeriodo = function() {
    const nuevoPeriodo = document.getElementById('periodo-actual').value;
    if (nuevoPeriodo) {
        db.periodo = nuevoPeriodo;
        actualizar(); 
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

window.guardarFechaFin = function(id, fecha) {
    const cli = db.clientes.find(c => c.id === id);
    if (cli) {
        cli.fechaFinalizado = fecha;
        actualizar();
    }
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
    const det = document.getElementById(`m-det-${id}`).value || "Material general";
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

// 5. PDF Y RENDER (ACTUALIZADOS PARA EL CONTADOR Y DETALLES)
window.exportarPDF = function() {
    const elemento = document.createElement('div');
    elemento.style.padding = '30px';
    elemento.style.fontFamily = 'Arial, sans-serif';
    elemento.style.color = '#333';
    elemento.style.background = '#fff';

    let html = `
        <h1 style="color: #3b82f6; text-align: center; margin-bottom: 5px;">PORTONES AUTOMÁTICOS CÓRDOBA</h1>
        <h2 style="text-align: center; color: #555; margin-top: 0; border-bottom: 2px solid #ccc; padding-bottom: 10px;">
            Reporte Contable - Período: ${db.periodo || 'Sin definir'}
        </h2>
        
        <h3>1. Estado de Cajas Generales</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f1f5f9;">
                <th style="border: 1px solid #ccc; padding: 10px;">Banco</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Efectivo</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Tarjetas</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Fondo</th>
            </tr>
            <tr>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: center; font-weight: bold;">$${db.cajas.banco.toLocaleString()}</td>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: center; font-weight: bold;">$${db.cajas.efectivo.toLocaleString()}</td>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: center; font-weight: bold;">$${db.cajas.tarjetas.toLocaleString()}</td>
                <td style="border: 1px solid #ccc; padding: 10px; text-align: center; font-weight: bold;">$${db.cajas.fondo.toLocaleString()}</td>
            </tr>
        </table>

        <h3>2. Retiros de Socios</h3>
        <table style="width: 50%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
                <td style="border: 1px solid #ccc; padding: 8px;"><strong>Pablo:</strong></td>
                <td style="border: 1px solid #ccc; padding: 8px;">$${db.retiros.pablo.toLocaleString()}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ccc; padding: 8px;"><strong>Fer:</strong></td>
                <td style="border: 1px solid #ccc; padding: 8px;">$${db.retiros.fer.toLocaleString()}</td>
            </tr>
        </table>

        <h3>3. Detalle de Clientes y Obras</h3>
    `;

    (db.clientes || []).forEach(c => {
        const totalPagado = (c.pagos || []).reduce((a, b) => a + b.monto, 0);
        const totalGastado = (c.materiales || []).reduce((a, b) => a + b.costo, 0);
        const deudaTotal = (c.coti + (c.deudaHeredada || 0)) - totalPagado;
        
        let detalleGastos = (c.materiales || []).map(m => `<li>${m.det}: $${m.costo.toLocaleString()}</li>`).join('');
        if (!detalleGastos) detalleGastos = "<li>Sin gastos registrados</li>";

        let lineaGarantia = "";
        if (c.fechaFinalizado) {
            let fechaFin = new Date(c.fechaFinalizado + 'T12:00:00');
            fechaFin.setMonth(fechaFin.getMonth() + 6);
            let vencimientoStr = fechaFin.toLocaleDateString('es-AR');
            
            let fechaInicioArr = c.fechaFinalizado.split('-');
            let inicioStr = `${fechaInicioArr[2]}/${fechaInicioArr[1]}/${fechaInicioArr[0]}`;

            lineaGarantia = `
            <div style="margin-top: 8px; padding: 5px; background: #e6f4ea; color: #1e8e3e; border-radius: 4px; font-size: 13px;">
                <strong>Obra Entregada:</strong> ${inicioStr} | <strong>Vencimiento Garantía (6 meses):</strong> ${vencimientoStr}
            </div>`;
        }

        html += `
        <div style="border: 1px solid #cbd5e1; padding: 15px; margin-bottom: 15px; border-radius: 8px; page-break-inside: avoid;">
            <h4 style="margin: 0 0 10px 0; font-size: 18px;">
                ${c.nom} <span style="color: ${c.terminado ? '#22c55e' : '#f59e0b'}; font-size: 14px;">
                ${c.terminado ? '(Terminado)' : '(En proceso)'}</span>
            </h4>
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px;">
                <span><strong>Cotización:</strong> $${c.coti.toLocaleString()}</span>
                <span><strong>Cobrado:</strong> $${totalPagado.toLocaleString()}</span>
                <span style="color: #ef4444;"><strong>Resta cobrar:</strong> $${deudaTotal.toLocaleString()}</span>
            </div>
            <div style="font-size: 13px; background: #f8fafc; padding: 10px; border-radius: 4px;">
                <strong>Detalle de Gastos (Total: $${totalGastado.toLocaleString()})</strong>
                <ul style="margin: 5px 0 0; padding-left: 20px;">${detalleGastos}</ul>
            </div>
            ${lineaGarantia}
        </div>`;
    });

    elemento.innerHTML = html;

    const opt = { 
        margin: 10, 
        filename: `Contabilidad-PAC-${db.periodo}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    html2pdf().set(opt).from(elemento).save();
