import { initGlobalComponents } from './Global/app.js';
import {
    formatoCOP,
    calcularDisponibleRetiro,
    liquidarRetiro,
    validarRetiro,
    ejecutarRetiro,
    TASA_INTERES_AHORROS,
    TOPE_SOBREGIRO_CORRIENTE
} from './retirosService.js';
import { obtenerCuentas as obtenerCuentasUsuario, obtenerUsuarioAutenticado, SesionExpiradaError } from './cuentasService.js';

let actualizarCampana = () => {};
import('./notificaciones.js')
    .then(modNotif => {
        if (modNotif && modNotif.actualizarCampana) {
            actualizarCampana = modNotif.actualizarCampana;
        }
    })
    .catch(() => {});

const ultimos4 = numero => String(numero).replace(/\D/g, '').slice(-4);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar componentes globales (Navbar, Sidebar, Chatbot, Perfil)
    try {
        initGlobalComponents();
    } catch (e) {
        console.warn('Componentes globales omitidos:', e);
    }

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

    // 2. Elementos del DOM
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

    let cuentas = [];
    let cuentaSeleccionada = null;

    // 3. Cargar cuentas reales del usuario
    async function cargarCuentas() {
        try {
            const rawCuentas = await obtenerCuentasUsuario();
            // Filtrar productos aptos para retiro (Ahorros y Corriente prioritarias)
            cuentas = (rawCuentas || []).filter(c => c && c.estado !== 'INACTIVA' && c.estado !== 'CANCELADA');

            if (cuentas.length === 0) {
                selectCuenta.innerHTML = '<option value="" disabled selected>No tienes cuentas disponibles para retiro</option>';
                return;
            }

            selectCuenta.innerHTML = '<option value="" disabled selected>Selecciona tu cuenta...</option>';
            cuentas.forEach(c => {
                const tipoTexto = c.tipo === 'CORRIENTE' ? 'Cuenta Corriente' : (c.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : c.tipo);
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${tipoTexto} · •••• ${ultimos4(c.numero)} (Saldo: ${formatoCOP.format(c.saldo)})`;
                selectCuenta.appendChild(opt);
            });

            // Seleccionar por defecto la primera cuenta
            if (cuentas.length > 0) {
                selectCuenta.value = cuentas[0].id;
                actualizarDetallesCuenta();
            }
        } catch (err) {
            console.error('Error cargando cuentas:', err);
            if (err instanceof SesionExpiradaError) {
                window.location.href = '../index.html';
                return;
            }
            selectCuenta.innerHTML = '<option value="" disabled selected>Error al cargar cuentas</option>';
        }
    }

    // 4. Actualizar detalles de la cuenta seleccionada en UI
    function actualizarDetallesCuenta() {
        const id = selectCuenta.value;
        cuentaSeleccionada = cuentas.find(c => String(c.id) === String(id));

        if (!cuentaSeleccionada) {
            boxDetalles.style.display = 'none';
            actualizarBreakdown();
            return;
        }

        boxDetalles.style.display = 'flex';
        const tipo = String(cuentaSeleccionada.tipo || '').toUpperCase();
        const saldo = Number(cuentaSeleccionada.saldo) || 0;
        const disponible = calcularDisponibleRetiro(cuentaSeleccionada);

        if (tipo.includes('CORRIENTE')) {
            badgeTipo.textContent = 'Cuenta Corriente';
            badgeTipo.className = 'account-badge account-badge--corriente';
            rowSobregiro.style.display = 'flex';
            const sobregiroMax = Math.max(saldo, 0) * TOPE_SOBREGIRO_CORRIENTE;
            txtSobregiroLimite.textContent = formatoCOP.format(sobregiroMax);
            txtReglaHint.textContent = 'Permite un sobregiro de hasta el 20% sobre tu saldo actual para brindarte liquidez inmediata.';
        } else if (tipo.includes('AHORRO')) {
            badgeTipo.textContent = 'Cuenta de Ahorros';
            badgeTipo.className = 'account-badge';
            rowSobregiro.style.display = 'none';
            txtReglaHint.textContent = 'Al retirar, se liquida y abona el interés del 1.5% mensual sobre tu saldo.';
        } else {
            badgeTipo.textContent = cuentaSeleccionada.tipo;
            badgeTipo.className = 'account-badge';
            rowSobregiro.style.display = 'none';
            txtReglaHint.textContent = 'Retiro directo según condiciones de cupo y producto.';
        }

        txtSaldoActual.textContent = formatoCOP.format(saldo);
        txtCupoDisponible.textContent = formatoCOP.format(disponible);

        actualizarBreakdown();
    }

    selectCuenta.addEventListener('change', actualizarDetallesCuenta);

    // 5. Gestión del monto a retirar
    function leerMonto() {
        return Number(inputMonto.value) || 0;
    }

    function actualizarChipsActivos(montoActual) {
        chipsMonto.forEach(chip => {
            const val = Number(chip.dataset.monto);
            chip.classList.toggle('activo', val === montoActual);
        });
    }

    inputMonto.addEventListener('input', () => {
        const monto = leerMonto();
        actualizarChipsActivos(monto);
        actualizarBreakdown();
    });

    chipsMonto.forEach(chip => {
        chip.addEventListener('click', () => {
            const monto = Number(chip.dataset.monto);
            inputMonto.value = monto;
            actualizarChipsActivos(monto);
            actualizarBreakdown();
            inputMonto.focus();
        });
    });

    if (btnMaxAmount) {
        btnMaxAmount.addEventListener('click', () => {
            if (!cuentaSeleccionada) return;
            const disponible = calcularDisponibleRetiro(cuentaSeleccionada);
            if (disponible > 0) {
                inputMonto.value = disponible;
                actualizarChipsActivos(disponible);
                actualizarBreakdown();
                inputMonto.focus();
            }
        });
    }

    // 6. Simulación y desglose en tiempo real
    function actualizarBreakdown() {
        const monto = leerMonto();
        if (!cuentaSeleccionada || monto <= 0) {
            boxBreakdown.style.display = 'none';
            helperMonto.textContent = 'Monto mínimo por retiro: $ 10.000 COP';
            helperMonto.style.color = '#8a8f99';
            return;
        }

        boxBreakdown.style.display = 'flex';
        const liq = liquidarRetiro(cuentaSeleccionada, monto);

        bdMontoSolicitado.textContent = formatoCOP.format(monto);

        if (liq.interesGenerado > 0) {
            bdRowInteres.style.display = 'flex';
            bdInteresGenerado.textContent = `+ ${formatoCOP.format(liq.interesGenerado)}`;
        } else {
            bdRowInteres.style.display = 'none';
        }

        if (liq.usaSobregiro) {
            bdRowSobregiro.style.display = 'flex';
            bdSobregiroUsado.textContent = formatoCOP.format(liq.sobregiroUsado);
        } else {
            bdRowSobregiro.style.display = 'none';
        }

        bdTotalDebitado.textContent = formatoCOP.format(monto);

        if (liq.valido) {
            bdNuevoSaldo.textContent = formatoCOP.format(liq.nuevoSaldo);
            bdNuevoSaldo.style.color = liq.nuevoSaldo < 0 ? '#f87171' : '#10b981';
            helperMonto.textContent = 'Monto válido para procesar.';
            helperMonto.style.color = '#10b981';
        } else {
            bdNuevoSaldo.textContent = 'Fondos insuficientes';
            bdNuevoSaldo.style.color = '#f87171';
            helperMonto.textContent = liq.mensaje;
            helperMonto.style.color = '#f87171';
        }
    }

    // 7. Envío y procesamiento del retiro
    formRetiro.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!cuentaSeleccionada) {
            Swal.fire({
                icon: 'warning',
                title: 'Cuenta Requerida',
                text: 'Por favor, selecciona una cuenta de origen para realizar el retiro.',
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

        const liq = v.liquidacion;
        const confirmResult = await Swal.fire({
            icon: 'question',
            title: '¿Confirmar Retiro?',
            html: `
                <div style="text-align: left; font-size: 0.95rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 8px;">
                    <div><strong>Cuenta:</strong> ${cuentaSeleccionada.tipo} (•••• ${ultimos4(cuentaSeleccionada.numero)})</div>
                    <div><strong>Monto a retirar:</strong> <span style="color: #e5a93c; font-weight: 700;">${formatoCOP.format(monto)}</span></div>
                    ${liq.interesGenerado > 0 ? `<div><strong>Interés 1.5% abonado:</strong> <span style="color: #10b981;">+ ${formatoCOP.format(liq.interesGenerado)}</span></div>` : ''}
                    ${liq.usaSobregiro ? `<div><strong>Uso de sobregiro:</strong> <span style="color: #38bdf8;">${formatoCOP.format(liq.sobregiroUsado)}</span></div>` : ''}
                    <div><strong>Nuevo saldo estimado:</strong> <span style="color: #ffffff; font-weight: 600;">${formatoCOP.format(liq.nuevoSaldo)}</span></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Sí, retirar dinero',
            cancelButtonText: 'Cancelar',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c',
            cancelButtonColor: '#64748b'
        });

        if (!confirmResult.isConfirmed) return;

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando Retiro...';

        try {
            const resultado = await ejecutarRetiro({
                cuentaId: cuentaSeleccionada.id,
                monto,
                concepto: inputConcepto.value.trim()
            });

            actualizarCampana();

            let extraHtml = '';
            if (resultado.interesGenerado > 0) {
                extraHtml += `<br><span style="color: #10b981; font-size: 0.9rem;">✨ Se liquidó un rendimiento del 1.5% mensual (+ ${formatoCOP.format(resultado.interesGenerado)}).</span>`;
            }
            if (resultado.usaSobregiro) {
                extraHtml += `<br><span style="color: #38bdf8; font-size: 0.9rem;">⚠️ Esta operación utilizó ${formatoCOP.format(resultado.sobregiroUsado)} de tu sobregiro del 20%.</span>`;
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Retiro Exitoso!',
                html: `
                    <div style="text-align: center; font-size: 1rem; color: #cbd5e1; margin-bottom: 12px;">
                        Has retirado exitosamente <strong>${formatoCOP.format(monto)}</strong> de tu cuenta.
                        ${extraHtml}
                    </div>
                    <div style="background: rgba(18, 21, 28, 0.8); border: 1px solid #1f2430; border-radius: 10px; padding: 14px; text-align: left; font-size: 0.85rem; color: #94a3b8; display: flex; flex-direction: column; gap: 6px;">
                        <div><strong style="color: #ffffff;">Número de referencia:</strong> ${resultado.referencia}</div>
                        <div><strong style="color: #ffffff;">Nuevo saldo disponible:</strong> <span style="color: #e5a93c; font-weight: 700;">${formatoCOP.format(resultado.nuevoSaldo)}</span></div>
                        <div><strong style="color: #ffffff;">Fecha:</strong> ${new Date(resultado.fecha).toLocaleString('es-CO')}</div>
                    </div>
                `,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c',
                confirmButtonText: 'Aceptar'
            });

            // Limpiar formulario y refrescar saldos en vivo
            inputMonto.value = '';
            inputConcepto.value = '';
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
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirmar y Procesar Retiro';
        }
    });

    // Cargar inicial
    await cargarCuentas();
});