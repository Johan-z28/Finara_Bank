import { initGlobalComponents } from './Global/app.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        initGlobalComponents();
    } catch (e) {
        console.warn("Componentes globales omitidos:", e);
    }

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

    // 1. Renderizar nombre y FOTO DE PERFIL REAL (Adiós al icono de NPC)
    const greetingName = document.getElementById('greetingName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const nombreReal = usuarioActivo.nombre || usuarioActivo.username || "Usuario";
    if (greetingName) greetingName.textContent = nombreReal;
    if (dropdownUserName) dropdownUserName.textContent = nombreReal;

    sincronizarAvatarUsuario(usuarioActivo);

    // 2. Menú desplegable y selector de tarjetas exclusivas del usuario
    configurarMenuPerfilManual();
    poblarSelectorTarjetasDestino(usuarioActivo);

    // 3. Formulario de recarga
    const formConsignacion = document.getElementById('formConsignacion');
    if (formConsignacion) {
        formConsignacion.addEventListener('submit', (e) => {
            e.preventDefault();
            procesarRecargaPropia(usuarioActivo);
        });
    }
});

function obtenerUsuarioActivoReal() {
    try {
        const perfilDirecto = JSON.parse(localStorage.getItem("userProfile"));
        if (perfilDirecto) return perfilDirecto;

        const emailLogueado = localStorage.getItem("usuarioLogueado") || localStorage.getItem("emailSesion");
        const listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        if (emailLogueado) {
            const encontrado = listaUsuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado);
            if (encontrado) return encontrado;
        }

        if (listaUsuarios.length > 0) return listaUsuarios[listaUsuarios.length - 1];
    } catch (e) {
        console.error("Error al obtener usuario:", e);
    }
    return null;
}

/**
 * Reemplaza el icono de usuario genérico por la foto real del avatar guardado
 */
function sincronizarAvatarUsuario(usuario) {
    const avatarContainer = document.querySelector('.profile-btn .avatar-placeholder');
    if (avatarContainer && usuario.avatar) {
        avatarContainer.innerHTML = `<img src="${usuario.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    }
}

function configurarMenuPerfilManual() {
    const profileBtn = document.getElementById("profileMenuBtn");
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isActive = profileDropdown.style.display === "block";
            profileDropdown.style.display = isActive ? "none" : "block";
        });
        document.addEventListener("click", (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.style.display = "none";
            }
        });
    }
}

const soloDigitos = v => String(v ?? '').replace(/\D/g, '');

/**
 * Obtiene EXCLUSIVAMENTE las tarjetas del usuario autenticado actual, sin mezclar cuentas ajenas
 */
function obtenerTarjetasDelUsuarioUnicas(usuario) {
    let brutas = [];
    const usernameActual = (usuario.username || usuario.nombre || '').trim().toLowerCase();

    // 1. Tarjetas aprobadas del perfil directo
    if (Array.isArray(usuario.tarjetasAprobadas)) {
        brutas = brutas.concat(usuario.tarjetasAprobadas);
    }
    if (Array.isArray(usuario.cuentas)) {
        brutas = brutas.concat(usuario.cuentas);
    }

    // 2. Filtrar repositorio global asegurando que coincida con su username o correo
    try {
        const cuentasGlobales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        const misCuentasGlobales = cuentasGlobales.filter(c => {
            const cUser = (c.username || '').trim().toLowerCase();
            return cUser === usernameActual || !c.username;
        });
        brutas = brutas.concat(misCuentasGlobales);
    } catch (e) {}

    // Desduplicación estricta
    const unicas = [];
    const numerosVistos = new Set();

    for (const t of brutas) {
        const num = soloDigitos(t.numeroTarjeta || t.numero);
        if (num && !numerosVistos.has(num)) {
            numerosVistos.add(num);
            unicas.push(t);
        }
    }

    return unicas;
}

function poblarSelectorTarjetasDestino(usuario) {
    const selectDestino = document.getElementById('cuentaDestinoSelect');
    if (!selectDestino) return;

    selectDestino.innerHTML = '';
    const tarjetas = obtenerTarjetasDelUsuarioUnicas(usuario);

    if (tarjetas.length > 0) {
        tarjetas.forEach((tarjeta) => {
            const option = document.createElement('option');
            const numLimpio = soloDigitos(tarjeta.numeroTarjeta || tarjeta.numero);
            option.value = numLimpio;

            const tipo = (tarjeta.tipo || 'AHORROS').toUpperCase();
            const saldoVal = Number(tarjeta.saldo || tarjeta.cupoDisponible || 0);

            option.textContent = `${tipo} - [•• ${numLimpio.slice(-4)}] (Saldo actual: $ ${saldoVal.toLocaleString('es-CO')})`;
            selectDestino.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = 'general';
        option.textContent = `Cuenta Principal - Saldo: ${usuario.saldoDisponible || '$ 0'}`;
        selectDestino.appendChild(option);
    }
}

function procesarRecargaPropia(usuarioActivo) {
    const montoInput = document.getElementById('montoConsignar').value;
    const monto = parseFloat(montoInput);
    const selectDestino = document.getElementById('cuentaDestinoSelect');
    const numeroSeleccionado = selectDestino ? selectDestino.value : 'general';

    if (!monto || monto < 10000) {
        Swal.fire({
            icon: 'warning',
            title: 'Monto no permitido',
            text: 'El monto mínimo de recarga es de $ 10.000 COP.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
        return;
    }

    let tarjetas = obtenerTarjetasDelUsuarioUnicas(usuarioActivo);
    let tarjetaSeleccionada = tarjetas.find(t => soloDigitos(t.numeroTarjeta || t.numero) === numeroSeleccionado);

    let tipoProducto = tarjetaSeleccionada ? (tarjetaSeleccionada.tipo || 'AHORROS').toUpperCase() : 'AHORROS';
    let saldoActual = tarjetaSeleccionada ? Number(tarjetaSeleccionada.saldo || tarjetaSeleccionada.cupoDisponible || 0) : 0;
    let nuevoSaldo = saldoActual + monto;

    let mensajeAdicional = '';

    // =========================================================================
    // REGLAS FINANCIERAS
    // =========================================================================
    if (tipoProducto.includes('AHORRO')) {
        let interesesMensuales = nuevoSaldo * 0.015; // 1.5% mensual
        mensajeAdicional = `<br><br>📈 <strong style="color: #e5a93c;">Rendimientos Proyectados:</strong> Con tu nuevo saldo de <strong>$ ${Math.round(nuevoSaldo).toLocaleString('es-CO')} COP</strong>, generarás aproximadamente <strong>$ ${Math.round(interesesMensuales).toLocaleString('es-CO')} COP</strong> de intereses este mes (1.5% T.M.).`;

    } else if (tipoProducto.includes('CORRIENTE')) {
        if (saldoActual < 0) {
            let saldoConsolidado = saldoActual + monto;
            nuevoSaldo = saldoConsolidado;
            mensajeAdicional = `<br><br>💳 <strong style="color: #38bdf8;">Sobregiro Pagado:</strong> Has abonado a tu saldo negativo. Tu nuevo saldo disponible es de <strong>$ ${Math.round(saldoConsolidado).toLocaleString('es-CO')} COP</strong>.`;
        } else {
            mensajeAdicional = `<br><br>💳 Tu Cuenta Corriente se recargó exitosamente.`;
        }

    } else if (tipoProducto.includes('CREDITO') || tipoProducto.includes('CRÉDITO')) {
        let deuda = Number(tarjetaSeleccionada ? tarjetaSeleccionada.deuda : 0);
        if (deuda > 0) {
            let nuevaDeuda = Math.max(0, deuda - monto);
            if (tarjetaSeleccionada) tarjetaSeleccionada.deuda = nuevaDeuda;
            mensajeAdicional = `<br><br>💳 <strong style="color: #38bdf8;">Abono a Tarjeta de Crédito:</strong> Deuda restante: <strong>$ ${Math.round(nuevaDeuda).toLocaleString('es-CO')} COP</strong>.`;
        } else {
            mensajeAdicional = `<br><br>💳 Se ha liberado cupo en tu Tarjeta de Crédito.`;
        }
    }

    // =========================================================================
    // PERSISTENCIA EN CASCADA
    // =========================================================================
    if (Array.isArray(usuarioActivo.tarjetasAprobadas)) {
        usuarioActivo.tarjetasAprobadas.forEach(t => {
            if (soloDigitos(t.numeroTarjeta || t.numero) === numeroSeleccionado) {
                t.saldo = nuevoSaldo;
                t.cupoDisponible = nuevoSaldo;
            }
        });
    }

    if (Array.isArray(usuarioActivo.cuentas)) {
        usuarioActivo.cuentas.forEach(c => {
            if (soloDigitos(c.numero) === numeroSeleccionado) {
                c.saldo = nuevoSaldo;
            }
        });
    }

    let saldoTotalUsuario = (usuarioActivo.tarjetasAprobadas || []).reduce((acc, t) => acc + Number(t.saldo || t.cupoDisponible || 0), 0);
    usuarioActivo.saldoDisponible = `$ ${Math.round(saldoTotalUsuario).toLocaleString('es-CO')}`;
    usuarioActivo.ultimaActividad = "Hace un momento";

    localStorage.setItem('userProfile', JSON.stringify(usuarioActivo));

    let listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    listaUsuarios = listaUsuarios.map(u => (u.correo === usuarioActivo.correo || u.username === usuarioActivo.username) ? usuarioActivo : u);
    localStorage.setItem("finara_usuarios_local", JSON.stringify(listaUsuarios));

    try {
        let cuentasGlobales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        cuentasGlobales.forEach(c => {
            if (soloDigitos(c.numero) === numeroSeleccionado) {
                c.saldo = nuevoSaldo;
            }
        });
        localStorage.setItem('finara_cuentas', JSON.stringify(cuentasGlobales));
    } catch (e) {}

    Swal.fire({
        icon: 'success',
        title: '¡Recarga Exitosa!',
        html: `Has abonado <strong>$ ${monto.toLocaleString('es-CO')} COP</strong>.<br>Nuevo saldo guardado: <strong>$ ${nuevoSaldo.toLocaleString('es-CO')} COP</strong>.${mensajeAdicional}`,
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c',
        width: '520px'
    }).then(() => {
        location.reload();
    });
}