// Vanilla/Consignar.js

export async function initConsignarView() {
    configurarVistaConsignar();
}

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const soloDigitos = v => String(v ?? '').replace(/\D/g, '');
const ultimos4 = num => String(num).replace(/\D/g, '').slice(-4);

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

    const selectDestino = document.getElementById('cuentaDestinoSelect');
    const inputMonto = document.getElementById('montoConsignar');
    const sideSaldoTxt = document.getElementById('sideSaldoTxt');
    const sideSubTxt = document.getElementById('sideSubTxt');
    const sideDestinoTxt = document.getElementById('sideDestinoTxt');
    const sideMontoTxt = document.getElementById('sideMontoTxt');
    const sideSaldoBadge = document.getElementById('sideSaldoBadge');

    let cuentasUsuario = obtenerTarjetasDelUsuarioUnicas(usuarioActivo);

    function actualizarResumenLateral() {
        const montoRaw = inputMonto ? Number(inputMonto.value.replace(/\D/g, '')) || 0 : 0;
        if (sideMontoTxt) sideMontoTxt.textContent = formatoCOP.format(montoRaw);

        if (!selectDestino || selectDestino.selectedIndex < 0) return;
        const numCuenta = selectDestino.value;
        const cuentaSel = cuentasUsuario.find(c => soloDigitos(c.numero) === numCuenta);

        if (cuentaSel) {
            const tipoRaw = String(cuentaSel.tipo || 'AHORROS').toUpperCase();
            let tipoLabel = 'Cuenta de Ahorros';
            if (tipoRaw.includes('CORRIENTE')) tipoLabel = 'Cuenta Corriente';
            if (tipoRaw.includes('CREDITO') || tipoRaw.includes('CRÉDITO')) tipoLabel = 'Tarjeta de Crédito';

            const saldoVal = Number(cuentaSel.saldo !== undefined ? cuentaSel.saldo : (cuentaSel.cupoDisponible || 0));
            if (sideSaldoTxt) sideSaldoTxt.textContent = formatoCOP.format(saldoVal);
            if (sideSubTxt) sideSubTxt.textContent = `${tipoLabel} · •••• ${ultimos4(cuentaSel.numero)}`;
            if (sideDestinoTxt) sideDestinoTxt.innerHTML = `<span style="color: #ffffff; font-weight: 700;">${tipoLabel} (••${ultimos4(cuentaSel.numero)})</span>`;

            const estaBloq = Boolean(cuentaSel.bloqueada || cuentaSel.estado === 'BLOQUEADA');
            if (sideSaldoBadge) {
                sideSaldoBadge.textContent = estaBloq ? 'Bloqueada' : 'Activa';
                sideSaldoBadge.className = `tr-side-card__badge ${estaBloq ? 'badge--bloqueada' : 'badge--activa'}`;
            }
        }
    }

    poblarSelectorTarjetasDestino(usuarioActivo, selectDestino);
    actualizarResumenLateral();

    if (selectDestino) {
        selectDestino.addEventListener('change', actualizarResumenLateral);
    }

    if (inputMonto) {
        inputMonto.addEventListener('input', () => {
            const digitos = inputMonto.value.replace(/\D/g, '').slice(0, 12);
            const num = Number(digitos) || 0;
            inputMonto.value = digitos ? new Intl.NumberFormat('es-CO').format(num) : '';
            actualizarResumenLateral();
        });
    }

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
                u.correo === emailLogueado || u.email === emailLogueado || u.username === emailLogueado || u.nombre === emailLogueado
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

function obtenerTarjetasDelUsuarioUnicas(usuario) {
    if (!usuario) return [];
    const usernameActivo = String(usuario.username || '').trim().toLowerCase();
    const correoActivo = String(usuario.correo || usuario.email || '').trim().toLowerCase();
    let cuentasValidas = [];

    try {
        let cuentasGlobales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
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
        if (num && !unicasMap.has(num)) unicasMap.set(num, c);
    }
    return Array.from(unicasMap.values());
}

function poblarSelectorTarjetasDestino(usuario, selectDestino) {
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
        if (tipoLabel === 'DEBITO' || tipoLabel === 'AHORROS') tipoLabel = 'Cuenta de Ahorros';
        if (tipoLabel === 'CORRIENTE') tipoLabel = 'Cuenta Corriente';
        if (tipoLabel === 'TARJETA_CREDITO' || tipoLabel === 'CREDITO') tipoLabel = 'Tarjeta de Crédito';

        option.textContent = `${tipoLabel} · •••• ${numLimpio.slice(-4)}`;
        selectDestino.appendChild(option);
    });
}

function generarComprobanteConsignacion({ referencia, fecha, tipoProducto, numero, monto, nuevoSaldo, concepto }) {
    const previo = document.getElementById('impresionVoucher');
    if (previo) previo.remove();

    const rutaLogo = '../Style/image/Logo_finara.svg';
    let logoDataUrl = rutaLogo;
    
    fetch(rutaLogo).then(r => r.text()).then(svg => {
        logoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }).catch(() => {});

    const voucher = document.createElement('div');
    voucher.id = 'impresionVoucher';
    voucher.style.cssText = `
        display: none;
        background: #121620 !important;
        color: #ffffff !important;
        padding: 30px !important;
        font-family: 'Poppins', Arial, sans-serif !important;
        width: 100% !important;
        max-width: 520px !important;
        height: auto !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        border: 1px solid rgba(229, 169, 60, 0.4);
        border-radius: 18px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    `;

    voucher.innerHTML = `
        <!-- Encabezado con Logo y Estado -->
        <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; padding-bottom: 15px !important; margin-bottom: 20px !important;">
            <img src="${logoDataUrl}" alt="Finara Bank Logo" style="height: 36px !important; width: auto !important; display: block !important;">
            <div style="font-size: 10px !important; font-weight: 700 !important; color: #34d399 !important; background: rgba(52, 211, 153, 0.15) !important; border: 1px solid rgba(52, 211, 153, 0.3) !important; padding: 5px 12px !important; border-radius: 20px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important;">
                ✓ Consignación Exitosa
            </div>
        </div>

        <!-- Título -->
        <div style="text-align: center !important; margin-bottom: 20px !important;">
            <h2 style="font-size: 19px !important; color: #ffffff !important; font-weight: 700 !important; margin: 0 0 3px 0 !important;">Comprobante de Consignación</h2>
            <p style="font-size: 11px !important; color: #94a3b8 !important; margin: 0 !important;">Finara Bank Digital · Certificación de Operación</p>
        </div>

        <!-- Bloque de Monto Destacado (Dorado Finara) -->
        <div style="background: rgba(229, 169, 60, 0.1) !important; border: 1px solid rgba(229, 169, 60, 0.35) !important; border-radius: 14px !important; padding: 18px !important; text-align: center !important; margin-bottom: 20px !important;">
            <div style="font-size: 11px !important; font-weight: 600 !important; color: #e5a93c !important; text-transform: uppercase !important; margin-bottom: 3px !important; letter-spacing: 0.5px !important;">Monto Recargado</div>
            <div style="font-size: 26px !important; font-weight: 800 !important; color: #e5a93c !important;">${formatoCOP.format(monto)}</div>
        </div>

        <!-- Detalles con visibilidad y bloques seguros -->
        <div style="background: rgba(0, 0, 0, 0.25) !important; border: 1px solid rgba(255, 255, 255, 0.06) !important; border-radius: 14px !important; padding: 10px 18px !important; margin-bottom: 20px !important; font-size: 12px !important;">
            <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 10px 0 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;">
                <span style="color: #94a3b8 !important; font-weight: 500 !important;">Referencia</span>
                <strong style="color: #ffffff !important; font-family: monospace !important; font-size: 13px !important;">${referencia}</strong>
            </div>
            <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 10px 0 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;">
                <span style="color: #94a3b8 !important; font-weight: 500 !important;">Fecha y hora</span>
                <strong style="color: #ffffff !important;">${formatoFechaHora.format(new Date(fecha))}</strong>
            </div>
            <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 10px 0 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;">
                <span style="color: #94a3b8 !important; font-weight: 500 !important;">Producto Abonado</span>
                <strong style="color: #ffffff !important;">${tipoProducto} · •••• ${ultimos4(numero)}</strong>
            </div>
            <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 10px 0 !important; border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;">
                <span style="color: #94a3b8 !important; font-weight: 500 !important;">Concepto</span>
                <strong style="color: #ffffff !important;">${concepto || 'Recarga de saldo'}</strong>
            </div>
            <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; padding: 10px 0 !important;">
                <span style="color: #94a3b8 !important; font-weight: 500 !important;">Nuevo Saldo / Cupo</span>
                <strong style="color: #34d399 !important; font-weight: 700 !important;">${formatoCOP.format(nuevoSaldo)}</strong>
            </div>
        </div>

        <!-- Nota al pie -->
        <div style="text-align: center !important; font-size: 10px !important; color: #64748b !important; border-top: 1px dashed rgba(255, 255, 255, 0.1) !important; padding-top: 12px !important; line-height: 1.4 !important;">
            Este documento es un comprobante digital válido emitido por Finara Bank S.A.<br>
            Garantizado bajo estrictos estándares de seguridad y cifrado digital.
        </div>
    `;

    document.body.appendChild(voucher);
    setTimeout(() => {
        window.print();
        voucher.remove();
    }, 200);
}

function procesarRecargaPropia(usuarioActivo) {
    const inputMonto = document.getElementById('montoConsignar');
    const monto = inputMonto ? parseFloat(inputMonto.value.replace(/\D/g, '')) : 0;
    const selectDestino = document.getElementById('cuentaDestinoSelect');
    const numeroSeleccionado = selectDestino ? selectDestino.value : '';
    const conceptoInput = document.getElementById('descripcionConsignacion');
    const concepto = conceptoInput ? conceptoInput.value.trim() : '';

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
        }
        return;
    }

    let cuentas = obtenerTarjetasDelUsuarioUnicas(usuarioActivo);
    let cuentaSeleccionada = cuentas.find(c => soloDigitos(c.numero) === numeroSeleccionado);
    let tipoProducto = cuentaSeleccionada ? (cuentaSeleccionada.tipo || 'AHORROS').toUpperCase() : 'AHORROS';
    let esCredito = tipoProducto.includes("CREDITO") || tipoProducto.includes("CRÉDITO");

    let todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    const usernameRef = usuarioActivo.username || usuarioActivo.correo || 'usuario';
    const referencia = `CON-${Math.floor(100000 + Math.random() * 900000)}`;
    const fechaActual = new Date().toISOString();

    if (esCredito) {
        const cupoMaximoOriginal = parseFloat(cuentaSeleccionada?.cupoMaximo || cuentaSeleccionada?.cupoInicial) || 3000000;
        let cupoActual = Number(cuentaSeleccionada?.saldo !== undefined ? cuentaSeleccionada.saldo : (cuentaSeleccionada?.cupoDisponible || cupoMaximoOriginal));
        const deudaPendienteReal = Math.max(0, cupoMaximoOriginal - cupoActual);

        if (deudaPendienteReal <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Abono no permitido',
                text: 'Tu Tarjeta de Crédito tiene el cupo al 100% y no posee deuda pendiente.',
                background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c'
            });
            return;
        }

        if (monto > deudaPendienteReal) {
            Swal.fire({
                icon: 'warning',
                title: 'Exceso de Pago',
                text: `El monto excede la deuda pendiente. Máximo a abonar: $ ${deudaPendienteReal.toLocaleString('es-CO')} COP.`,
                background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c'
            });
            return;
        }

        let nuevaDeuda = Math.max(0, parseFloat(cuentaSeleccionada?.deudaActual || deudaPendienteReal) - monto);
        let nuevoCupo = Math.min(cupoMaximoOriginal, cupoActual + monto);

        todasLasCuentas = todasLasCuentas.map(cta => {
            if (soloDigitos(cta.numero) === numeroSeleccionado) {
                cta.saldo = nuevoCupo;
                cta.cupoDisponible = nuevoCupo;
                cta.deudaActual = nuevaDeuda;
            }
            return cta;
        });
        localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

        Swal.fire({
            icon: 'success',
            title: '¡Abono a Tarjeta Exitoso!',
            html: `Has abonado <strong>$ ${monto.toLocaleString('es-CO')} COP</strong> a tu tarjeta.<br>Cupo disponible: <strong>$ ${nuevoCupo.toLocaleString('es-CO')} COP</strong>.`,
            background: '#12151c',
            color: '#ffffff',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-file-pdf"></i> Descargar Comprobante',
            denyButtonText: '<i class="fa-solid fa-wallet"></i> Ver saldos',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#e5a93c',
            denyButtonColor: '#303238',
            cancelButtonColor: '#1f2430',
            width: '540px'
        }).then((result) => {
            if (result.isConfirmed) {
                generarComprobanteConsignacion({
                    referencia, fecha: fechaActual, tipoProducto: 'Tarjeta de Crédito', numero: numeroSeleccionado, monto, nuevoSaldo: nuevoCupo, concepto
                });
            } else if (result.isDenied) {
                const linkSaldos = document.querySelector('[data-view="saldos"]');
                if (linkSaldos) linkSaldos.click();
                else window.location.href = './app.html#saldos';
            }
        });

    } else {
        let saldoActual = cuentaSeleccionada ? Number(cuentaSeleccionada.saldo || 0) : 0;
        let nuevoSaldo = saldoActual + monto;

        todasLasCuentas = todasLasCuentas.map(cta => {
            if (soloDigitos(cta.numero) === numeroSeleccionado) {
                cta.saldo = nuevoSaldo;
            }
            return cta;
        });
        localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

        try {
            let movimientos = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
            movimientos.unshift({
                id: `MOV-${Date.now()}`,
                cuentaId: numeroSeleccionado,
                cuentaNumero: numeroSeleccionado,
                fecha: fechaActual,
                descripcion: `Consignación a ${tipoProducto}`,
                categoria: 'Consignación',
                tipo: 'INGRESO',
                valor: monto,
                usuario: usernameRef
            });
            localStorage.setItem('finara_movimientos', JSON.stringify(movimientos));
        } catch (e) {
            console.error("Error al registrar movimiento:", e);
        }

        Swal.fire({
            icon: 'success',
            title: '¡Recarga Exitosa!',
            html: `Has recargado <strong>$ ${monto.toLocaleString('es-CO')} COP</strong>.<br>Nuevo saldo: <strong>$ ${nuevoSaldo.toLocaleString('es-CO')} COP</strong>.`,
            background: '#12151c',
            color: '#ffffff',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-file-pdf"></i> Descargar Comprobante',
            denyButtonText: '<i class="fa-solid fa-wallet"></i> Ver saldos',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#e5a93c',
            denyButtonColor: '#303238',
            cancelButtonColor: '#1f2430',
            width: '540px'
        }).then((result) => {
            if (result.isConfirmed) {
                generarComprobanteConsignacion({
                    referencia, fecha: fechaActual, tipoProducto: tipoProducto === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente', numero: numeroSeleccionado, monto, nuevoSaldo, concepto
                });
            } else if (result.isDenied) {
                const linkSaldos = document.querySelector('[data-view="saldos"]');
                if (linkSaldos) linkSaldos.click();
                else window.location.href = './app.html#saldos';
            }
        });
    }
}