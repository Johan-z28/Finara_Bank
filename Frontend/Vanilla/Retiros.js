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

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const ultimos4 = numero => String(numero).replace(/\D/g, '').slice(-4);
const textoCuenta = c => `${c.tipo} · •••• ${ultimos4(c.numero)}`;

function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
}

function filas(contenedor, items) {
    contenedor.replaceChildren(...items.map(({ label, valor, destacado, negativo }) => {
        const fila = el('div', 'tr-fila-resumen');
        const dd = el('dd', destacado ? 'tr-valor tr-valor--grande' : 'tr-valor');
        dd.textContent = valor;
        if (negativo) dd.style.color = '#f87171';

        fila.append(el('dt', '', label), dd);
        return fila;
    }));
}

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

    // Elementos de pasos y éxito
    const vistas = { 1: document.getElementById('vistaForm'), 2: document.getElementById('vistaResumen'), 3: document.getElementById('vistaExito') };
    const pasos = document.querySelectorAll('.tr-paso');
    const sideInfo = document.querySelector('.withdraw-sidebar-info');
    const btnEditar = document.getElementById('btnEditar');
    const btnConfirmar = document.getElementById('btnConfirmar');
    const btnDescargarPDF = document.getElementById('btnDescargarPDF');
    const btnVerMovimientos = document.getElementById('btnVerMovimientos');
    const btnNueva = document.getElementById('btnNueva');
    const resumenLista = document.getElementById('resumenLista');
    const exitoLista = document.getElementById('exitoLista');

    if (!selectCuenta || !formRetiro) return;

    let cuentas = [];
    let cuentaSeleccionada = null;
    let datosRetiro = null;
    let resultadoFinal = null;
    let enProceso = false;

    function irAPaso(n) {
        Object.entries(vistas).forEach(([k, v]) => {
            if (v) v.classList.toggle('hidden', Number(k) !== n);
        });

        pasos.forEach(p => {
            const num = Number(p.dataset.paso);
            p.classList.toggle('activo', num === n);
            p.classList.toggle('completo', num < n);
            p.setAttribute('aria-current', num === n ? 'step' : 'false');
        });

        if (sideInfo) {
            sideInfo.style.display = n === 1 ? 'flex' : 'none';
        }

        const gridContainer = document.querySelector('.withdraw-container-grid');
        if (gridContainer) {
            gridContainer.style.gridTemplateColumns = n === 1 ? 'minmax(0, 1.8fr) minmax(300px, 1fr)' : '1fr';
        }
    }

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

        const liq = liquidarRetiro(cuentaSeleccionada, monto);
        datosRetiro = {
            cuenta: cuentaSeleccionada,
            monto,
            concepto: inputConcepto ? inputConcepto.value.trim() : '',
            nuevoSaldo: liq.nuevoSaldo
        };

        pintarResumen();
        irAPaso(2);
    };

    function pintarResumen() {
        if (!resumenLista || !datosRetiro) return;
        filas(resumenLista, [
            { label: 'Cuenta de origen', valor: textoCuenta(datosRetiro.cuenta) },
            { label: 'Monto a retirar', valor: formatoCOP.format(datosRetiro.monto), destacado: true },
            { label: 'Concepto', valor: datosRetiro.concepto || 'Sin concepto' },
            { label: 'Nuevo saldo estimado', valor: formatoCOP.format(datosRetiro.nuevoSaldo), negativo: datosRetiro.nuevoSaldo < 0 }
        ]);
    }

    if (btnEditar) btnEditar.onclick = () => irAPaso(1);

    if (btnConfirmar) {
        btnConfirmar.onclick = async () => {
            if (enProceso) return;
            enProceso = true;
            btnConfirmar.disabled = btnEditar.disabled = true;
            btnConfirmar.textContent = 'Procesando...';

            try {
                const resultado = await ejecutarRetiro({
                    cuentaId: datosRetiro.cuenta.id || datosRetiro.cuenta.numero,
                    monto: datosRetiro.monto,
                    concepto: datosRetiro.concepto
                });

                resultadoFinal = {
                    referencia: `RET-${Date.now().toString().slice(-8)}`,
                    fecha: new Date().toISOString(),
                    monto: datosRetiro.monto,
                    cuenta: datosRetiro.cuenta,
                    concepto: datosRetiro.concepto,
                    nuevoSaldo: resultado.nuevoSaldo
                };

                // REGISTRO DE MOVIMIENTOS EN LOCALSTORAGE
                try {
                    let movimientos = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
                    const perfilActivo = JSON.parse(localStorage.getItem('userProfile')) || {};
                    const usuarioActual = perfilActivo.username || perfilActivo.nombre || 'Johan Zapata Cifuentes';
                    const textoConcepto = datosRetiro.concepto ? ` - ${datosRetiro.concepto}` : '';

                    movimientos.unshift({
                        id: `MOV-RET-${Date.now()}`,
                        fecha: new Date().toISOString(),
                        descripcion: `Retiro de efectivo (${textoCuenta(datosRetiro.cuenta)})${textoConcepto}`,
                        categoria: 'Retiro',
                        tipo: 'EGRESO',
                        valor: datosRetiro.monto,
                        cuentaId: datosRetiro.cuenta.id || datosRetiro.cuenta.numero,
                        numeroCuenta: datosRetiro.cuenta.numero,
                        usuario: usuarioActual
                    });

                    localStorage.setItem('finara_movimientos', JSON.stringify(movimientos));
                } catch (e) {
                    console.error("Error al guardar movimientos en localStorage:", e);
                }

                if (typeof actualizarCampana === 'function') {
                    actualizarCampana();
                }

                pintarExito(resultadoFinal);
                irAPaso(3);
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
                enProceso = false;
                btnConfirmar.disabled = btnEditar.disabled = false;
                btnConfirmar.textContent = 'Confirmar retiro';
            }
        };
    }

    function pintarExito(r) {
        if (!exitoLista) return;
        filas(exitoLista, [
            { label: 'Referencia', valor: r.referencia },
            { label: 'Cuenta de origen', valor: textoCuenta(r.cuenta) },
            { label: 'Monto retirado', valor: formatoCOP.format(r.monto), destacado: true },
            { label: 'Concepto', valor: r.concepto || 'Sin concepto' },
            { label: 'Nuevo saldo', valor: formatoCOP.format(r.nuevoSaldo), negativo: r.nuevoSaldo < 0 },
            { label: 'Fecha', valor: formatoFechaHora.format(new Date(r.fecha)) }
        ]);
    }

    if (btnVerMovimientos) {
        btnVerMovimientos.onclick = () => {
            window.location.href = './app.html#movimientos';
        };
    }

    // IMPRESIÓN Y DESCARGA DEL COMPROBANTE EN PDF (VOUCHER OSCURO UNIFICADO)
    if (btnDescargarPDF) {
        btnDescargarPDF.onclick = async () => {
            if (!resultadoFinal) return;

            const previo = document.getElementById('impresionVoucher');
            if (previo) previo.remove();

            const rutaLogo = '../Style/image/Logo_finara.svg';
            let logoDataUrl = rutaLogo;
            try {
                const resp = await fetch(rutaLogo);
                if (resp.ok) {
                    const svgTexto = await resp.text();
                    logoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgTexto)}`;
                }
            } catch (e) {
                console.warn("Cargando ruta del logo SVG...");
            }

            const voucher = document.createElement('div');
            voucher.id = 'impresionVoucher';
            voucher.style.cssText = `
                display: none;
                background: #121620 !important;
                color: #ffffff !important;
                padding: 40px !important;
                font-family: 'Poppins', Arial, sans-serif !important;
                width: 100% !important;
                max-width: 560px !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                border: 1px solid rgba(229, 169, 60, 0.4);
                border-radius: 20px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            `;

            voucher.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 18px; margin-bottom: 25px;">
                    <img src="${logoDataUrl}" alt="Finara Bank Logo" style="height: 38px; width: auto; display: block;">
                    <div style="font-size: 11px; font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.3); padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                        ✓ Retiro Exitoso
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="font-size: 20px; color: #ffffff; font-weight: 700; margin: 0 0 4px 0;">Comprobante de Retiro</h2>
                    <p style="font-size: 11px; color: #94a3b8; margin: 0; letter-spacing: 0.3px;">Finara Bank Digital · Certificación de Operación</p>
                </div>

                <div style="background: rgba(229, 169, 60, 0.1); border: 1px solid rgba(229, 169, 60, 0.35); border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 25px;">
                    <div style="font-size: 11px; font-weight: 600; color: #e5a93c; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Monto Retirado</div>
                    <div style="font-size: 28px; font-weight: 800; color: #e5a93c;">${formatoCOP.format(resultadoFinal.monto)}</div>
                </div>

                <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 14px; padding: 6px 18px; margin-bottom: 25px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Referencia</span>
                        <strong style="color: #ffffff; font-family: monospace; font-size: 13px;">${resultadoFinal.referencia}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Fecha y hora</span>
                        <strong style="color: #ffffff;">${formatoFechaHora.format(new Date(resultadoFinal.fecha))}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Cuenta de origen</span>
                        <strong style="color: #ffffff;">${textoCuenta(resultadoFinal.cuenta)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Concepto</span>
                        <strong style="color: #ffffff;">${resultadoFinal.concepto || 'Sin concepto'}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                        <span style="color: #94a3b8; font-weight: 500;">Nuevo saldo</span>
                        <strong style="color: #34d399;">${formatoCOP.format(resultadoFinal.nuevoSaldo)}</strong>
                    </div>
                </div>

                <div style="text-align: center; font-size: 10px; color: #64748b; border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 15px; line-height: 1.4;">
                    Este documento es un comprobante digital válido emitido por Finara Bank S.A.<br>
                    Garantizado bajo estrictos estándares de seguridad y cifrado digital.
                </div>
            `;

            document.body.appendChild(voucher);

            setTimeout(() => {
                window.print();
                voucher.remove();
            }, 150);
        };
    }

    if (btnNueva) {
        btnNueva.onclick = async () => {
            formRetiro.reset();
            datosRetiro = null;
            resultadoFinal = null;
            if (inputMonto) inputMonto.value = '';
            actualizarChipsActivos(0);
            await cargarCuentas();
            irAPaso(1);
        };
    }

    await cargarCuentas();
}