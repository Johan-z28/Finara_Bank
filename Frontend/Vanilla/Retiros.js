// Vanilla/Retiros.js
import {
    formatoCOP,
    calcularDisponibleRetiro,
    liquidarRetiro,
    validarRetiro,
    ejecutarRetiro
} from './retirosService.js';
import { obtenerCuentas as obtenerCuentasUsuario, obtenerUsuarioAutenticado } from './cuentasService.js';

let actualizarCampana = () => {};
import('./notificaciones.js')
    .then(modNotif => {
        if (modNotif && modNotif.actualizarCampana) {
            actualizarCampana = modNotif.actualizarCampana;
        }
    })
    .catch(() => {});

const ultimos4 = numero => String(numero).replace(/\D/g, '').slice(-4);

const formatearNumeroConPuntos = (val) => {
    const soloNumeros = String(val).replace(/\D/g, '');
    if (!soloNumeros) return '';
    return new Intl.NumberFormat('es-CO').format(Number(soloNumeros));
};

export async function initRetirosView() {
    const usuarioActivo = obtenerUsuarioAutenticado();
    if (!usuarioActivo) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'Sesión Requerida',
                text: 'Debes iniciar sesión para realizar retiros de dinero.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            }).then(() => {
                window.location.href = '../index.html';
            });
        } else {
            window.location.href = '../index.html';
        }
        return;
    }

    const selectCuenta = document.getElementById('cuentaOrigenSelect');
    const badgeTipo = document.getElementById('accountTypeBadge');
    const txtSaldoActual = document.getElementById('accountCurrentBalance');
    const txtReglaHint = document.getElementById('accountRuleHint');

    const inputMonto = document.getElementById('montoRetirar');
    const btnMaxAmount = document.getElementById('btnMaxAmount');
    const chipsMonto = document.querySelectorAll('.chip-monto');
    const helperMonto = document.getElementById('helperMonto');

    const bdMontoSolicitado = document.getElementById('bdMontoSolicitado');
    const bdRowInteres = document.getElementById('bdRowInteres');
    const bdInteresGenerado = document.getElementById('bdInteresGenerado');
    const bdRowSobregiro = document.getElementById('bdRowSobregiro');
    const bdSobregiroUsado = document.getElementById('bdSobregiroUsado');
    const bdTotalDebitado = document.getElementById('bdTotalDebitado');
    const bdNuevoSaldo = document.getElementById('bdNuevoSaldo');

    const inputConcepto = document.getElementById('conceptoRetiro');
    const formRetiro = document.getElementById('formRetiro');
    const btnSubmit = document.getElementById('btnSubmitWithdraw');

    if (!selectCuenta || !formRetiro) return;

    let cuentas = [];
    let cuentaSeleccionada = null;

    async function cargarCuentas() {
        try {
            let rawCuentas = [];
            try {
                rawCuentas = await obtenerCuentasUsuario();
            } catch (e) {
                rawCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
            }

            if (!rawCuentas || rawCuentas.length === 0) {
                const cuentasGlobales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
                const perfil = JSON.parse(localStorage.getItem('userProfile')) || {};
                rawCuentas = cuentasGlobales.filter(c => c && (c.username === perfil.username || c.correo === perfil.correo || !c.username));
            }

            cuentas = (rawCuentas || []).filter(c => c && c.estado !== 'INACTIVA' && c.estado !== 'CANCELADA');

            if (cuentas.length === 0) {
                selectCuenta.innerHTML = '<option value="" disabled selected>No tienes cuentas disponibles para retiro</option>';
                return;
            }

            selectCuenta.innerHTML = '<option value="" disabled selected>Selecciona tu cuenta...</option>';
            cuentas.forEach(c => {
                const tipoUpper = String(c.tipo || '').toUpperCase();
                let tipoTexto = c.tipo;
                if (tipoUpper.includes('CORRIENTE')) tipoTexto = 'Cuenta Corriente';
                else if (tipoUpper.includes('CREDITO') || tipoUpper.includes('CRÉDITO')) tipoTexto = 'Tarjeta de Crédito';
                else if (tipoUpper.includes('AHORRO') || tipoUpper.includes('DEBITO')) tipoTexto = 'Cuenta de Ahorros';

                const saldoVal = Number(c.saldo !== undefined ? c.saldo : 0);
                const opt = document.createElement('option');
                opt.value = c.id || c.numero;
                opt.textContent = `${tipoTexto} · •••• ${ultimos4(c.numero)} (Saldo: ${formatoCOP.format(saldoVal)})`;
                selectCuenta.appendChild(opt);
            });

            if (cuentas.length > 0) {
                selectCuenta.value = cuentas[0].id || cuentas[0].numero;
                actualizarDetallesCuenta();
            }
        } catch (err) {
            console.error('Error cargando cuentas:', err);
            selectCuenta.innerHTML = '<option value="" disabled selected>Error al cargar cuentas</option>';
        }
    }

    function actualizarDetallesCuenta() {
        const id = selectCuenta.value;
        cuentaSeleccionada = cuentas.find(c => String(c.id) === String(id) || String(c.numero) === String(id));

        // Forzar ocultamiento absoluto al cambiar de cuenta
        if (bdRowInteres) bdRowInteres.style.setProperty('display', 'none', 'important');
        if (bdRowSobregiro) bdRowSobregiro.style.setProperty('display', 'none', 'important');

        if (!cuentaSeleccionada) {
            actualizarBreakdown();
            return;
        }

        const tipo = String(cuentaSeleccionada.tipo || '').toUpperCase();
        const saldo = Number(cuentaSeleccionada.saldo) || 0;

        let tipoLabel = 'Cuenta de Ahorros';
        let reglaTexto = '¡Beneficio de Ahorro! Se abona un rendimiento del 1.5% mensual sobre tu saldo actual al realizar retiros.';

        if (tipo.includes('CREDITO') || tipo.includes('CRÉDITO')) {
            tipoLabel = 'Tarjeta de Crédito';
            reglaTexto = 'Avance de efectivo permitido de hasta el 50% de tu cupo disponible.';
            if (badgeTipo) { badgeTipo.textContent = 'Activa'; badgeTipo.className = 'tr-side-card__badge badge--activa'; }
        } else if (tipo.includes('CORRIENTE')) {
            tipoLabel = 'Cuenta Corriente';
            reglaTexto = 'Permite un sobregiro de hasta el 20% sobre tu saldo actual.';
            if (badgeTipo) { badgeTipo.textContent = 'Activa'; badgeTipo.className = 'tr-side-card__badge badge--activa'; }
        } else {
            tipoLabel = 'Cuenta de Ahorros';
            if (badgeTipo) { badgeTipo.textContent = 'Activa'; badgeTipo.className = 'tr-side-card__badge badge--activa'; }
        }

        if (txtSaldoActual) txtSaldoActual.textContent = formatoCOP.format(saldo);
        const subTxt = document.getElementById('accountSubTxt');
        if (subTxt) subTxt.textContent = `${tipoLabel} · •••• ${ultimos4(cuentaSeleccionada.numero)}`;
        if (txtReglaHint) txtReglaHint.textContent = reglaTexto;

        actualizarBreakdown();
    }

    selectCuenta.onchange = actualizarDetallesCuenta;

    function leerMonto() {
        if (!inputMonto) return 0;
        const numLimpio = String(inputMonto.value).replace(/\D/g, '');
        return Number(numLimpio) || 0;
    }

    function actualizarChipsActivos(montoActual) {
        chipsMonto.forEach(chip => {
            const val = Number(chip.dataset.monto);
            chip.classList.toggle('activo', val === montoActual);
        });
    }

    if (inputMonto) {
        inputMonto.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

        inputMonto.oninput = () => {
            const montoVal = leerMonto();
            if (montoVal > 0) {
                inputMonto.value = formatearNumeroConPuntos(montoVal);
            } else {
                inputMonto.value = '';
            }
            actualizarChipsActivos(montoVal);
            actualizarBreakdown();
        };
    }

    chipsMonto.forEach(chip => {
        chip.onclick = () => {
            const monto = Number(chip.dataset.monto);
            if (inputMonto) {
                inputMonto.value = formatearNumeroConPuntos(monto);
                actualizarChipsActivos(monto);
                actualizarBreakdown();
                inputMonto.focus();
            }
        };
    });

    if (btnMaxAmount) {
        btnMaxAmount.onclick = () => {
            if (!cuentaSeleccionada) return;
            const disponible = calcularDisponibleRetiro(cuentaSeleccionada);
            if (disponible > 0 && inputMonto) {
                inputMonto.value = formatearNumeroConPuntos(disponible);
                actualizarChipsActivos(disponible);
                actualizarBreakdown();
                inputMonto.focus();
            }
        };
    }

    function actualizarBreakdown() {
        const monto = leerMonto();
        
        // Asegurar que comiencen ocultas
        if (bdRowInteres) bdRowInteres.style.setProperty('display', 'none', 'important');
        if (bdRowSobregiro) bdRowSobregiro.style.setProperty('display', 'none', 'important');

        if (!cuentaSeleccionada || monto <= 0) {
            if (bdMontoSolicitado) bdMontoSolicitado.textContent = '$ 0';
            if (bdTotalDebitado) bdTotalDebitado.textContent = '$ 0';
            if (bdNuevoSaldo) bdNuevoSaldo.textContent = '$ 0';
            if (helperMonto) { helperMonto.textContent = 'Monto mínimo por retiro: $ 10.000 COP'; helperMonto.style.color = '#8a8f99'; }
            return;
        }

        const tipo = String(cuentaSeleccionada.tipo || '').toUpperCase();
        const liq = liquidarRetiro(cuentaSeleccionada, monto);

        if (bdMontoSolicitado) bdMontoSolicitado.textContent = formatoCOP.format(monto);
        
        // Control exclusivo y estricto por tipo de cuenta
        if (tipo.includes('AHORRO') || tipo.includes('DEBITO')) {
            if (bdRowInteres) bdRowInteres.style.setProperty('display', 'flex', 'important');
            if (bdInteresGenerado) {
                bdInteresGenerado.textContent = `+ ${formatoCOP.format(liq.interesGenerado || (monto * 0.015))} (1.5%)`;
                bdInteresGenerado.style.color = '#10b981';
            }
        } else if (tipo.includes('CORRIENTE')) {
            if (liq.usaSobregiro) {
                if (bdRowSobregiro) bdRowSobregiro.style.setProperty('display', 'flex', 'important');
                if (bdSobregiroUsado) bdSobregiroUsado.textContent = formatoCOP.format(liq.sobregiroUsado);
            }
        }

        if (bdTotalDebitado) bdTotalDebitado.textContent = formatoCOP.format(monto);

        if (liq.valido) {
            if (bdNuevoSaldo) { 
                bdNuevoSaldo.textContent = formatoCOP.format(liq.nuevoSaldo); 
                bdNuevoSaldo.style.color = liq.nuevoSaldo < 0 ? '#f87171' : '#10b981'; 
            }
            if (helperMonto) { helperMonto.textContent = 'Monto válido para procesar.'; helperMonto.style.color = '#10b981'; }
        } else {
            if (bdNuevoSaldo) { bdNuevoSaldo.textContent = 'Fondos insuficientes'; bdNuevoSaldo.style.color = '#f87171'; }
            if (helperMonto) { helperMonto.textContent = liq.mensaje; helperMonto.style.color = '#f87171'; }
        }
    }

    formRetiro.onsubmit = async (e) => {
        e.preventDefault();

        if (!cuentaSeleccionada) {
            Swal.fire({
                icon: 'warning',
                title: 'Cuenta Requerida',
                text: 'Por favor, selecciona una cuenta de origen.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        const monto = leerMonto();
        const v = validarRetiro({ cuenta: cuentaSeleccionada, monto });
        if (!v.ok) {
            Swal.fire({
                icon: 'error',
                title: 'No se puede procesar el retiro',
                text: v.mensaje,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        const confirmResult = await Swal.fire({
            icon: 'question',
            title: '¿Confirmar Retiro?',
            html: `¿Estás seguro de retirar <strong>${formatoCOP.format(monto)}</strong>?`,
            showCancelButton: true,
            confirmButtonText: 'Sí, retirar',
            cancelButtonText: 'Cancelar',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });

        if (!confirmResult.isConfirmed) return;

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
        }

        try {
            const resultado = await ejecutarRetiro({
                cuentaId: cuentaSeleccionada.id || cuentaSeleccionada.numero,
                monto,
                concepto: inputConcepto ? inputConcepto.value.trim() : ''
            });

            if (typeof actualizarCampana === 'function') {
                actualizarCampana();
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Retiro Exitoso!',
                text: `Has retirado ${formatoCOP.format(monto)}. Nuevo saldo: ${formatoCOP.format(resultado.nuevoSaldo)}`,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });

            if (inputMonto) inputMonto.value = '';
            if (inputConcepto) inputConcepto.value = '';
            actualizarChipsActivos(0);
            await cargarCuentas();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error en la transacción',
                text: err.message || 'No se pudo completar el retiro.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar y Procesar Retiro';
            }
        }
    };

    await cargarCuentas();
}