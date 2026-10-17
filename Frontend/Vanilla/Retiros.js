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
    const boxDetalles = document.getElementById('accountDetailsBox');
    const badgeTipo = document.getElementById('accountTypeBadge');
    const txtSaldoActual = document.getElementById('accountCurrentBalance');
    const rowSobregiro = document.getElementById('overdraftLine');
    const txtSobregiroLimite = document.getElementById('accountOverdraftLimit');
    const txtCupoDisponible = document.getElementById('accountAvailableBalance');
    const txtReglaHint = document.getElementById('accountRuleHint');

    const inputMonto = document.getElementById('montoRetirar');
    const btnMaxAmount = document.getElementById('btnMaxAmount');
    const chipsMonto = document.querySelectorAll('.chip-monto');
    const helperMonto = document.getElementById('helperMonto');

    const boxBreakdown = document.getElementById('breakdownBox');
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
                const tipoTexto = c.tipo === 'CORRIENTE' ? 'Cuenta Corriente' : (c.tipo === 'AHORROS' || c.tipo === 'DEBITO' ? 'Cuenta de Ahorros' : c.tipo);
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

        if (!cuentaSeleccionada) {
            if (boxDetalles) boxDetalles.style.display = 'none';
            actualizarBreakdown();
            return;
        }

        if (boxDetalles) boxDetalles.style.display = 'flex';
        const tipo = String(cuentaSeleccionada.tipo || '').toUpperCase();
        const saldo = Number(cuentaSeleccionada.saldo) || 0;
        const disponible = calcularDisponibleRetiro(cuentaSeleccionada);

        if (tipo.includes('CORRIENTE')) {
            if (badgeTipo) { badgeTipo.textContent = 'Cuenta Corriente'; badgeTipo.className = 'account-badge account-badge--corriente'; }
            if (rowSobregiro) rowSobregiro.style.display = 'flex';
            if (txtSobregiroLimite) txtSobregiroLimite.textContent = formatoCOP.format(Math.max(saldo, 0) * 0.20);
            if (txtReglaHint) txtReglaHint.textContent = 'Permite un sobregiro de hasta el 20% sobre tu saldo actual.';
        } else {
            if (badgeTipo) { badgeTipo.textContent = 'Cuenta de Ahorros'; badgeTipo.className = 'account-badge'; }
            if (rowSobregiro) rowSobregiro.style.display = 'none';
            if (txtReglaHint) txtReglaHint.textContent = 'Al retirar, se liquida y abona el interés del 1.5% mensual sobre tu saldo.';
        }

        if (txtSaldoActual) txtSaldoActual.textContent = formatoCOP.format(saldo);
        if (txtCupoDisponible) txtCupoDisponible.textContent = formatoCOP.format(disponible);

        actualizarBreakdown();
    }

    selectCuenta.onchange = actualizarDetallesCuenta;

    function leerMonto() {
        return Number(inputMonto.value) || 0;
    }

    function actualizarChipsActivos(montoActual) {
        chipsMonto.forEach(chip => {
            const val = Number(chip.dataset.monto);
            chip.classList.toggle('activo', val === montoActual);
        });
    }

    if (inputMonto) {
        inputMonto.oninput = () => {
            const monto = leerMonto();
            actualizarChipsActivos(monto);
            actualizarBreakdown();
        };
    }

    chipsMonto.forEach(chip => {
        chip.onclick = () => {
            const monto = Number(chip.dataset.monto);
            if (inputMonto) {
                inputMonto.value = monto;
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
                inputMonto.value = disponible;
                actualizarChipsActivos(disponible);
                actualizarBreakdown();
                inputMonto.focus();
            }
        };
    }

    function actualizarBreakdown() {
        const monto = leerMonto();
        if (!cuentaSeleccionada || monto <= 0) {
            if (boxBreakdown) boxBreakdown.style.display = 'none';
            if (helperMonto) { helperMonto.textContent = 'Monto mínimo por retiro: $ 10.000 COP'; helperMonto.style.color = '#8a8f99'; }
            return;
        }

        if (boxBreakdown) boxBreakdown.style.display = 'flex';
        const liq = liquidarRetiro(cuentaSeleccionada, monto);

        if (bdMontoSolicitado) bdMontoSolicitado.textContent = formatoCOP.format(monto);
        if (liq.interesGenerado > 0) {
            if (bdRowInteres) bdRowInteres.style.display = 'flex';
            if (bdInteresGenerado) bdInteresGenerado.textContent = `+ ${formatoCOP.format(liq.interesGenerado)}`;
        } else if (bdRowInteres) {
            bdRowInteres.style.display = 'none';
        }

        if (liq.usaSobregiro) {
            if (bdRowSobregiro) bdRowSobregiro.style.display = 'flex';
            if (bdSobregiroUsado) bdSobregiroUsado.textContent = formatoCOP.format(liq.sobregiroUsado);
        } else if (bdRowSobregiro) {
            bdRowSobregiro.style.display = 'none';
        }

        if (bdTotalDebitado) bdTotalDebitado.textContent = formatoCOP.format(monto);

        if (liq.valido) {
            if (bdNuevoSaldo) { bdNuevoSaldo.textContent = formatoCOP.format(liq.nuevoSaldo); bdNuevoSaldo.style.color = liq.nuevoSaldo < 0 ? '#f87171' : '#10b981'; }
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