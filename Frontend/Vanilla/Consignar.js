// Vanilla/Consignar.js

export async function initConsignarView() {
    configurarVistaConsignar();
}

function configurarVistaConsignar() {
    const usuarioActivo = obtenerUsuarioActivoReal();
    if (!usuarioActivo) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'Sesión requerida',
                text: 'Debes iniciar sesión para realizar una consignación.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            }).then(() => {
                window.location.href = "../index.html";
            });
        }
        return;
    }

    const greetingName = document.getElementById('greetingName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const nombreReal = usuarioActivo.nombre || usuarioActivo.username || "Usuario";
    if (greetingName) greetingName.textContent = nombreReal;
    if (dropdownUserName) dropdownUserName.textContent = nombreReal;

    setTimeout(() => {
        poblarSelectorTarjetasDestino(usuarioActivo);
    }, 50);

    const formConsignacion = document.getElementById('formConsignacion');
    if (formConsignacion) {
        formConsignacion.onsubmit = (e) => {
            e.preventDefault();
            procesarRecargaPropia(usuarioActivo);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    configurarVistaConsignar();
});

function obtenerUsuarioActivoReal() {
    try {
        const perfilDirecto = JSON.parse(localStorage.getItem("userProfile"));
        if (perfilDirecto) return perfilDirecto;

        const emailLogueado = localStorage.getItem("usuarioLogueado") || localStorage.getItem("emailSesion") || localStorage.getItem("userName");
        const listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        if (emailLogueado) {
            const encontrado = listaUsuarios.find(u => 
                u.correo === emailLogueado || 
                u.email === emailLogueado || 
                u.username === emailLogueado || 
                u.nombre === emailLogueado
            );
            if (encontrado) return encontrado;
        }

        const userDirecto = JSON.parse(localStorage.getItem("usuarioActivo"));
        if (userDirecto) return userDirecto;

        if (listaUsuarios.length > 0) return listaUsuarios[listaUsuarios.length - 1];
    } catch (e) {
        console.error("Error al obtener usuario activo:", e);
    }
    return null;
}

const soloDigitos = v => String(v ?? '').replace(/\D/g, '');

function obtenerTarjetasDelUsuarioUnicas(usuario) {
    if (!usuario) return [];

    const usernameActivo = String(usuario.username || '').trim().toLowerCase();
    const correoActivo = String(usuario.correo || usuario.email || '').trim().toLowerCase();

    let cuentasValidas = [];

    try {
        const cuentasGlobales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        cuentasValidas = cuentasGlobales.filter(c => {
            if (!c) return false;
            const cUser = String(c.username || c.correo || '').trim().toLowerCase();
            
            if (usernameActivo && cUser === usernameActivo) return true;
            if (correoActivo && cUser === correoActivo) return true;
            return false;
        });
    } catch (e) {
        console.error("Error al leer finara_cuentas:", e);
    }

    if (cuentasValidas.length === 0 && Array.isArray(usuario.cuentas)) {
        cuentasValidas = usuario.cuentas;
    }

    const unicasMap = new Map();
    for (const c of cuentasValidas) {
        const num = soloDigitos(c.numero);
        if (num && !unicasMap.has(num)) {
            unicasMap.set(num, c);
        }
    }

    return Array.from(unicasMap.values());
}

function poblarSelectorTarjetasDestino(usuario) {
    const selectDestino = document.getElementById('cuentaDestinoSelect') || document.querySelector('select');
    if (!selectDestino) return;

    selectDestino.innerHTML = '';
    const cuentas = obtenerTarjetasDelUsuarioUnicas(usuario);

    if (cuentas.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No hay cuentas disponibles para este usuario";
        selectDestino.appendChild(option);
        return;
    }

    cuentas.forEach((cuenta) => {
        const option = document.createElement('option');
        const numLimpio = soloDigitos(cuenta.numero || '');
        option.value = numLimpio;

        let tipoLabel = String(cuenta.tipo || 'AHORROS').toUpperCase();
        if (tipoLabel === 'DEBITO' || tipoLabel === 'AHORROS') tipoLabel = 'CUENTA DE AHORROS';
        if (tipoLabel === 'CORRIENTE') tipoLabel = 'CUENTA CORRIENTE';
        if (tipoLabel === 'TARJETA_CREDITO' || tipoLabel === 'CREDITO') tipoLabel = 'TARJETA DE CRÉDITO';

        const saldoVal = Number(cuenta.saldo !== undefined ? cuenta.saldo : (cuenta.cupoDisponible || 0));

        option.textContent = `${tipoLabel} - [•• ${numLimpio.slice(-4)}] (Saldo actual: $ ${saldoVal.toLocaleString('es-CO')})`;
        selectDestino.appendChild(option);
    });
}

function procesarRecargaPropia(usuarioActivo) {
    const inputMonto = document.getElementById('montoConsignar');
    const monto = inputMonto ? parseFloat(inputMonto.value) : 0;
    const selectDestino = document.getElementById('cuentaDestinoSelect');
    const numeroSeleccionado = selectDestino ? selectDestino.value : '';

    if (!monto || monto < 10000) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'Monto no permitido',
                text: 'El monto mínimo de recarga es de $ 10.000 COP.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
        } else {
            alert("El monto mínimo de recarga es de $ 10.000 COP.");
        }
        return;
    }

    let cuentas = obtenerTarjetasDelUsuarioUnicas(usuarioActivo);
    let cuentaSeleccionada = cuentas.find(c => soloDigitos(c.numero) === numeroSeleccionado);

    let tipoProducto = cuentaSeleccionada ? (cuentaSeleccionada.tipo || 'AHORROS').toUpperCase() : 'AHORROS';
    let saldoActual = cuentaSeleccionada ? Number(cuentaSeleccionada.saldo || 0) : 0;
    let nuevoSaldo = saldoActual + monto;

    let todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    let cuentaEncontrada = false;

    todasLasCuentas = todasLasCuentas.map(cta => {
        const numCta = soloDigitos(cta.numero);
        if (numCta === numeroSeleccionado) {
            cta.saldo = nuevoSaldo;
            cuentaEncontrada = true;
        }
        return cta;
    });

    if (!cuentaEncontrada && numeroSeleccionado) {
        todasLasCuentas.push({
            id: `CTA-${tipoProducto.slice(0, 3)}-${Date.now()}`,
            tipo: tipoProducto === 'DEBITO' ? 'AHORROS' : tipoProducto,
            numero: numeroSeleccionado,
            saldo: nuevoSaldo,
            estado: 'ACTIVA',
            username: usuarioActivo.username || usuarioActivo.correo || 'usuario',
            fechaCreacion: new Date().toISOString()
        });
    }

    localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

    if (usuarioActivo && Array.isArray(usuarioActivo.tarjetasAprobadas)) {
        usuarioActivo.tarjetasAprobadas.forEach(t => {
            if (soloDigitos(t.numeroTarjeta || t.numero) === numeroSeleccionado) {
                t.saldo = nuevoSaldo;
                t.cupoDisponible = nuevoSaldo;
            }
        });
    }
    localStorage.setItem('userProfile', JSON.stringify(usuarioActivo));

    try {
        let movimientos = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
        movimientos.unshift({
            id: `MOV-${Date.now()}`,
            cuentaId: numeroSeleccionado,
            cuentaNumero: numeroSeleccionado,
            cuentaOrigen: numeroSeleccionado,
            fecha: new Date().toISOString(),
            descripcion: `Consignación a ${tipoProducto}`,
            categoria: 'Consignación',
            tipo: 'INGRESO',
            valor: monto,
            usuario: usuarioActivo.correo || usuarioActivo.username
        });
        localStorage.setItem('finara_movimientos', JSON.stringify(movimientos));
    } catch (e) {
        console.error("Error al registrar movimiento:", e);
    }

    if (window.Swal) {
        Swal.fire({
            icon: 'success',
            title: '¡Recarga Exitosa!',
            html: `Has abonado <strong>$ ${monto.toLocaleString('es-CO')} COP</strong>.<br>Nuevo saldo guardado: <strong>$ ${nuevoSaldo.toLocaleString('es-CO')} COP</strong>.`,
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c',
            width: '520px'
        }).then(() => {
            const linkSaldos = document.querySelector('[data-view="saldos"]');
            if (linkSaldos) linkSaldos.click();
            else location.reload();
        });
    } else {
        alert(`¡Recarga Exitosa! Nuevo saldo: $ ${nuevoSaldo.toLocaleString('es-CO')}`);
        location.reload();
    }
}