import { initGlobalComponents } from './Global/app.js';

document.addEventListener('DOMContentLoaded', () => {
    initGlobalComponents();

    // 1. Obtener el usuario activo de forma infalible
    const usuarioActivo = obtenerUsuarioActivoReal();

    if (!usuarioActivo) {
        Swal.fire({
            icon: 'warning',
            title: 'Sesión requerida',
            text: 'Debes iniciar sesión para realizar una consignación.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        }).then(() => {
            window.location.href = "Login.html";
        });
        return;
    }

    // 2. Pintar el nombre del usuario en la barra superior
    const greetingName = document.getElementById('greetingName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const nombreReal = usuarioActivo.nombre || usuarioActivo.username || "Usuario";

    if (greetingName) greetingName.textContent = nombreReal;
    if (dropdownUserName) dropdownUserName.textContent = nombreReal;

    // 3. Poblar el select de origen con las tarjetas aprobadas reales
    poblarSelectorTarjetas(usuarioActivo);

    // 4. Manejar el formulario de consignación
    const formConsignacion = document.getElementById('formConsignacion');
    if (formConsignacion) {
        formConsignacion.addEventListener('submit', (e) => {
            e.preventDefault();
            procesarConsignacionFinal(usuarioActivo);
        });
    }
});

// Función idéntica a la que usa tu app para recuperar el usuario logueado
function obtenerUsuarioActivoReal() {
    const perfilDirecto = JSON.parse(localStorage.getItem("userProfile"));
    if (perfilDirecto) return perfilDirecto;

    const emailLogueado = localStorage.getItem("usuarioLogueado") || localStorage.getItem("emailSesion");
    const listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    if (emailLogueado) {
        const encontrado = listaUsuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado);
        if (encontrado) return encontrado;
    }

    const userDirecto = JSON.parse(localStorage.getItem("usuarioActivo"));
    if (userDirecto) return userDirecto;

    if (listaUsuarios.length > 0) {
        return listaUsuarios[listaUsuarios.length - 1];
    }
    return null;
}

function poblarSelectorTarjetas(usuario) {
    const selectOrigen = document.getElementById('cuentaOrigen');
    if (!selectOrigen) return;

    selectOrigen.innerHTML = '';

    // Extraer el array de tarjetas aprobadas según la estructura real de cart.docx
    const tarjetas = usuario.tarjetasAprobadas || [];

    if (tarjetas.length > 0) {
        tarjetas.forEach((tarjeta, index) => {
            const option = document.createElement('option');
            option.value = index;

            const titulo = tarjeta.titulo || "Tarjeta Finara";
            const tipo = tarjeta.tipo ? `(${tarjeta.tipo.toUpperCase()})` : "";
            const saldoMostrado = usuario.saldoDisponible || "$ 0";

            option.textContent = `${titulo} ${tipo} - Saldo: ${saldoMostrado}`;
            selectOrigen.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = 'general';
        option.textContent = `Cuenta General Principal - Saldo: ${usuario.saldoDisponible || '$ 0'}`;
        selectOrigen.appendChild(option);
    }
}

function procesarConsignacionFinal(usuarioActivo) {
    const montoInput = document.getElementById('montoConsignar').value;
    const monto = parseFloat(montoInput);
    const cuentaDestino = document.getElementById('cuentaDestino').value.trim();

    if (!monto || monto < 10000) {
        Swal.fire({
            icon: 'warning',
            title: 'Monto inválido',
            text: 'El monto mínimo de consignación es de $ 10.000 COP.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
        return;
    }

    if (!cuentaDestino) {
        Swal.fire({
            icon: 'warning',
            title: 'Destino requerido',
            text: 'Por favor ingresa la cuenta o correo del destinatario.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
        return;
    }

    // Calcular el nuevo saldo
    let saldoActualNum = 0;
    if (usuarioActivo.saldoDisponible) {
        saldoActualNum = parseFloat(usuarioActivo.saldoDisponible.replace(/[^0-9.-]+/g,"")) || 0;
    }
    saldoActualNum += monto;

    usuarioActivo.saldoDisponible = `$ ${saldoActualNum.toLocaleString('es-CO')}`;
    usuarioActivo.ultimaActividad = "Hace un momento";

    // Actualizar el perfil en localStorage y la lista global
    localStorage.setItem('userProfile', JSON.stringify(usuarioActivo));

    let listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    listaUsuarios = listaUsuarios.map(u => {
        if (u.correo === usuarioActivo.correo || u.username === usuarioActivo.username) {
            return usuarioActivo;
        }
        return u;
    });
    localStorage.setItem("finara_usuarios_local", JSON.stringify(listaUsuarios));

    Swal.fire({
        icon: 'success',
        title: '¡Consignación Exitosa!',
        html: `Se han acreditado <strong>$ ${monto.toLocaleString('es-CO')} COP</strong> a la cuenta destino <strong>${cuentaDestino}</strong>.<br><br>Tu nuevo saldo disponible es: <span style="color: #38bdf8;">${usuarioActivo.saldoDisponible}</span>`,
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c'
    }).then(() => {
        location.reload();
    });
}