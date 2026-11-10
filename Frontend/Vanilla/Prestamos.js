// Vanilla/Prestamos.js
import { calcularCuotaPrestamo, evaluarViabilidadPrestamo, registrarSolicitudPrestamo, buscarPrestamoPorRadicado, pagarCuotaPrestamo, TASA_INTERES_MENSUAL } from './prestamosService.js';
import { obtenerUsuarioAutenticado, obtenerCuentas } from './cuentasService.js';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatearConPuntos = (val) => {
    const soloNumeros = String(val).replace(/\D/g, '');
    if (!soloNumeros) return '';
    return new Intl.NumberFormat('es-CO').format(Number(soloNumeros));
};

const ocultarNumeroCuenta = (num) => {
    const digitos = String(num || '').replace(/\D/g, '');
    const ultimos4 = digitos.slice(-4) || '••••';
    return `•••• ${ultimos4}`;
};

export async function initPrestamosView() {
    if (!document.getElementById('prestamos-css-theme')) {
        const link = document.createElement('link');
        link.id = 'prestamos-css-theme';
        link.rel = 'stylesheet';
        link.href = '../Style/Prestamos.css';
        document.head.appendChild(link);
    }

    const usuarioActivo = obtenerUsuarioAutenticado();
    if (!usuarioActivo) {
        window.location.href = '../index.html';
        return;
    }

    // 1. SISTEMA GLOBAL DE PESTAÑAS POR DELEGACIÓN DE EVENTOS (A prueba de SPA)
    if (!window._prestamosTabListenerInitialized) {
        window._prestamosTabListenerInitialized = true;
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.prestamo-tab-btn');
            if (tabBtn) {
                e.preventDefault();
                const targetId = tabBtn.getAttribute('data-tab');
                
                const container = tabBtn.closest('.prestamo-container');
                if (!container) return;

                const tabBtns = container.querySelectorAll('.prestamo-tab-btn');
                const tabContents = container.querySelectorAll('.prestamo-tab-content');

                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => {
                    c.style.display = 'none';
                    c.classList.remove('active');
                });

                tabBtn.classList.add('active');
                const targetContent = container.querySelector(`#${targetId}`);
                if (targetContent) {
                    targetContent.style.display = 'block';
                    targetContent.classList.add('active');
                }

                if (targetId === 'tab-dashboard') {
                    renderizarDashboardCreditos();
                }
            }

            // Conectar comparador con simulador (HU-27)
            const btnComparativa = e.target.closest('.btn-elegir-comparativa');
            if (btnComparativa) {
                const tipo = btnComparativa.getAttribute('data-tipo');
                const selectTipo = document.getElementById('selectTipoCredito');
                const tabSolicitudBtn = document.querySelector('[data-tab="tab-solicitud"]');
                
                if (selectTipo && tabSolicitudBtn) {
                    selectTipo.value = tipo;
                    tabSolicitudBtn.click();
                    if (typeof window.actualizarSimulacionDinamica === 'function') {
                        window.actualizarSimulacionDinamica();
                    }
                }
            }
        });
    }

    // Renderizar dashboard inicial al entrar a la vista
    renderizarDashboardCreditos();

    // 2. SIMULADOR Y FORMULARIO (HU-14)
    const formPrestamo = document.getElementById('formPrestamo');
    const inputMonto = document.getElementById('prestamoMonto');
    const selectPlazo = document.getElementById('prestamoPlazo');
    const selectTipoCredito = document.getElementById('selectTipoCredito');
    const inputConcepto = document.getElementById('prestamoConcepto');
    const checkTerminos = document.getElementById('checkTerminos');

    const lblCuotaEstimada = document.getElementById('lblCuotaEstimada');
    const lblTotalPagar = document.getElementById('lblTotalPagar');
    const lblEstadoEval = document.getElementById('lblEstadoEval');
    const lblTasaAplicada = document.getElementById('lblTasaAplicada');

    const obtenerTasaActual = () => {
        const tipo = selectTipoCredito ? selectTipoCredito.value : 'libre';
        if (tipo === 'vehiculo') return { em: 0.0138, texto: '1.38% Mensual (18% E.A.)' };
        if (tipo === 'hipotecario') return { em: 0.0110, texto: '1.10% Mensual (14% E.A.)' };
        return { em: TASA_INTERES_MENSUAL, texto: '1.8% Mensual (24% E.A.)' };
    };

    const leerMonto = () => Number(String(inputMonto ? inputMonto.value : '').replace(/\D/g, '')) || 0;

    window.actualizarSimulacionDinamica = () => {
        if (!inputMonto) return;
        const monto = leerMonto();
        const meses = Number(selectPlazo ? selectPlazo.value : 12);
        const tasaInfo = obtenerTasaActual();

        if (lblTasaAplicada) lblTasaAplicada.textContent = tasaInfo.texto;

        if (monto <= 0) {
            if (lblCuotaEstimada) lblCuotaEstimada.textContent = '$ 0';
            if (lblTotalPagar) lblTotalPagar.textContent = '$ 0';
            if (lblEstadoEval) {
                lblEstadoEval.textContent = 'Ingrese un monto válido';
                lblEstadoEval.style.color = '#94a3b8';
            }
            return;
        }

        const cuota = calcularCuotaPrestamo(monto, meses, tasaInfo.em);
        const totalPagar = cuota * meses;
        const evaluacion = evaluarViabilidadPrestamo(monto);

        if (lblCuotaEstimada) lblCuotaEstimada.textContent = formatoCOP.format(cuota);
        if (lblTotalPagar) lblTotalPagar.textContent = formatoCOP.format(totalPagar);
        if (lblEstadoEval) {
            lblEstadoEval.textContent = `${evaluacion.estado}: ${evaluacion.mensaje}`;
            lblEstadoEval.style.color = evaluacion.color;
        }
    };

    if (inputMonto) {
        inputMonto.addEventListener('input', () => {
            const val = leerMonto();
            inputMonto.value = val > 0 ? formatearConPuntos(val) : '';
            window.actualizarSimulacionDinamica();
        });
    }

    if (selectPlazo) selectPlazo.addEventListener('change', window.actualizarSimulacionDinamica);
    if (selectTipoCredito) selectTipoCredito.addEventListener('change', window.actualizarSimulacionDinamica);

    const quickAmountBtns = document.querySelectorAll('.btn-quick-amount');
    quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const valor = btn.getAttribute('data-valor');
            if (inputMonto) {
                inputMonto.value = formatearConPuntos(valor);
                if (typeof window.actualizarSimulacionDinamica === 'function') {
                    window.actualizarSimulacionDinamica();
                }
            }
        });
    });

    // Enviar solicitud de préstamo
    if (formPrestamo) {
        formPrestamo.addEventListener('submit', (e) => {
            e.preventDefault();

            if (checkTerminos && !checkTerminos.checked) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Términos y Condiciones',
                    text: 'Debes aceptar los términos y condiciones para continuar con la solicitud.',
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            const monto = leerMonto();
            const meses = Number(selectPlazo.value);
            const tipoId = selectTipoCredito.value;
            const concepto = inputConcepto ? inputConcepto.value.trim() : '';

            if (monto < 500000) {
                Swal.fire({ icon: 'warning', title: 'Monto mínimo', text: 'El valor mínimo es $ 500.000 COP.', background: '#12151c', color: '#fff', confirmButtonColor: '#e5a93c' });
                return;
            }

            const tasaInfo = obtenerTasaActual();
            const cuotaMensual = calcularCuotaPrestamo(monto, meses, tasaInfo.em);
            const evaluacion = evaluarViabilidadPrestamo(monto);

            if (evaluacion.estado === 'RECHAZADO') {
                Swal.fire({ icon: 'error', title: 'Solicitud No Viable', text: evaluacion.mensaje, background: '#12151c', color: '#fff', confirmButtonColor: '#e5a93c' });
                return;
            }

            try {
                const solicitudCreada = registrarSolicitudPrestamo({ monto, meses, cuotaMensual, estadoEvaluacion: evaluacion, concepto, tipoId });

                Swal.fire({
                    icon: 'success',
                    title: '¡Solicitud Registrada!',
                    html: `
                        <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px;">
                            <p><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${solicitudCreada.radicado}</span></p>
                            <p><strong>Estado:</strong> <span style="color: ${evaluacion.color};">${solicitudCreada.estado}</span></p>
                            <p><strong>Cuota Mensual:</strong> ${formatoCOP.format(solicitudCreada.cuotaMensual)}</p>
                        </div>
                    `,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                }).then(() => {
                    formPrestamo.reset();
                    window.actualizarSimulacionDinamica();
                    const tabDashboard = document.querySelector('[data-tab="tab-dashboard"]');
                    if (tabDashboard) tabDashboard.click();
                });
            } catch (error) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Cuenta Requerida',
                    text: error.message,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            }
        });
    }

    // 3. CONSULTA POR RADICADO (HU-14)
    const btnConsultar = document.getElementById('btnConsultarRadicado');
    const inputRadicado = document.getElementById('inputBuscarRadicado');
    const boxResultadoRadicado = document.getElementById('resultadoRadicadoBox');

    if (btnConsultar && inputRadicado && boxResultadoRadicado) {
        btnConsultar.addEventListener('click', () => {
            const radVal = inputRadicado.value.trim();
            const encontrado = buscarPrestamoPorRadicado(radVal);

            if (!encontrado) {
                boxResultadoRadicado.innerHTML = `<p style="color: #f87171; text-align: center; margin: 1.5rem 0;">No se encontró ningún préstamo con el radicado: ${radVal}</p>`;
                return;
            }

            boxResultadoRadicado.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                    <p style="margin:0;"><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${encontrado.radicado}</span></p>
                    <p style="margin:0;"><strong>Concepto:</strong> ${encontrado.concepto}</p>
                    <p style="margin:0;"><strong>Monto Solicitado:</strong> ${formatoCOP.format(encontrado.monto)}</p>
                    <p style="margin:0;"><strong>Plazo:</strong> ${encontrado.meses} meses</p>
                    <p style="margin:0;"><strong>Cuota Mensual:</strong> ${formatoCOP.format(encontrado.cuotaMensual)}</p>
                    <p style="margin:0;"><strong>Estado Actual:</strong> <span style="color: #34d399; font-weight: bold;">${encontrado.estado}</span></p>
                    <p style="margin:0; font-size: 0.8rem; color: #94a3b8;">${encontrado.mensajeEstado}</p>
                </div>
            `;
        });
    }
}

// 4. DASHBOARD DE CRÉDITOS ACTIVOS Y PAGO DE CUOTAS (HU-16)
function renderizarDashboardCreditos() {
    const contenedor = document.getElementById('dashboardCreditosList');
    if (!contenedor) return;

    let prestamos = [];
    try {
        prestamos = JSON.parse(localStorage.getItem('finara_prestamos')) || [];
    } catch {
        prestamos = [];
    }

    const activos = prestamos.filter(p => p.activo);

    if (activos.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 10px;">No tienes créditos o préstamos activos en este momento.</p>
                <button type="button" class="btn-solicitar-prestamo" onclick="document.querySelector('[data-tab=\\'tab-solicitud\\']').click()" style="max-width: 220px; margin: 0 auto;">Simular un Préstamo</button>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = activos.map(p => {
        const cuotasRestantes = p.meses - p.cuotasPagadas;
        const saldoPendiente = cuotasRestantes * p.cuotaMensual;
        const tasaMostrar = p.tasaInteres || '1.8% E.M. (24% E.A.)';

        return `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.2rem; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: var(--text-white); font-size: 1.05rem;">${p.concepto}</strong>
                    <span style="font-family: monospace; color: var(--gold-main); font-size: 0.85rem;">${p.radicado}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; font-size: 0.85rem; color: var(--text-muted);">
                    <div>Monto Inicial: <strong style="color: #fff;">${formatoCOP.format(p.monto)}</strong></div>
                    <div>Cuota Mensual: <strong style="color: #e5a93c;">${formatoCOP.format(p.cuotaMensual)}</strong></div>
                    <div>Tasa de Interés: <strong style="color: #fff;">${tasaMostrar}</strong></div>
                    <div>Progreso: <strong style="color: #34d399;">${p.cuotasPagadas} / ${p.meses} cuotas</strong></div>
                    <div>Saldo Pendiente: <strong style="color: #fff;">${formatoCOP.format(saldoPendiente)}</strong></div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 5px;">
                    <button type="button" class="btn-pagar-cuota-action" data-radicado="${p.radicado}" style="background: rgba(229, 169, 60, 0.15); border: 1px solid rgba(229, 169, 60, 0.4); color: var(--gold-main); padding: 8px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">Pagar Cuota Mensual</button>
                </div>
            </div>
        `;
    }).join('');

    // Vinculación directa de eventos
    contenedor.querySelectorAll('.btn-pagar-cuota-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const radicado = btn.getAttribute('data-radicado');
            if (radicado) {
                abrirModalPagoCuota(radicado);
            }
        });
    });
}

function abrirModalPagoCuota(radicado) {
    let prestamos = JSON.parse(localStorage.getItem('finara_prestamos')) || [];
    const prestamo = prestamos.find(p => p.radicado === radicado);
    if (!prestamo) return;

    const cuotasRestantes = prestamo.meses - prestamo.cuotasPagadas;
    const saldoTotalPendiente = cuotasRestantes * prestamo.cuotaMensual;

    let cuentasRaw = [];
    try {
        cuentasRaw = JSON.parse(localStorage.getItem('finara_cuentas')) || obtenerCuentas() || [];
    } catch {
        cuentasRaw = [];
    }

    const listaCuentas = Array.isArray(cuentasRaw) ? cuentasRaw : Object.values(cuentasRaw);
    const cuentasValidas = listaCuentas.filter(c => {
        const tipoStr = String(c.tipo || '').toLowerCase();
        return tipoStr.includes('ahorro') || tipoStr.includes('corriente');
    });

    Swal.fire({
        title: 'Pagar Crédito o Cuota',
        html: `
            <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 12px;">
                <p style="margin:0;"><strong>Radicado:</strong> <span style="color: #e5a93c;">${prestamo.radicado}</span></p>
                
                <div class="prestamo-campo">
                    <label style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 6px; display: block;">Tipo de Pago:</label>
                    <select id="selectTipoPago" style="background: rgba(0,0,0,0.4); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px; width: 100%;">
                        <option value="cuota">Pagar Cuota Mensual (${formatoCOP.format(prestamo.cuotaMensual)})</option>
                        <option value="total">Pagar Totalidad del Préstamo (${formatoCOP.format(saldoTotalPendiente)})</option>
                    </select>
                </div>

                <div class="prestamo-campo" style="margin-top: 4px;">
                    <label style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 6px; display: block;">Selecciona la cuenta de pago:</label>
                    <div id="cuentasCardsContainer" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto;">
                        ${cuentasValidas.length > 0 ? cuentasValidas.map((c, index) => {
                            const digitos = String(c.numero || c.id || '').replace(/\D/g, '');
                            const numeroOculto = `•••• ${digitos.slice(-4)}`;
                            const tipoLabel = String(c.tipo || 'CUENTA').toUpperCase();
                            const saldoNum = Number(c.saldo) || 0;
                            return `
                                <div class="cuenta-card-opcion ${index === 0 ? 'selected' : ''}" data-id="${c.id || c.numero}" style="background: rgba(0,0,0,0.4); border: 1px solid ${index === 0 ? 'var(--gold-main, #e5a93c)' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 10px 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;">
                                    <div>
                                        <strong style="color: #fff; font-size: 0.88rem; display: block;">${tipoLabel} - ${numeroOculto}</strong>
                                        <span style="color: #94a3b8; font-size: 0.78rem;">Saldo disponible:</span>
                                    </div>
                                    <span style="color: #34d399; font-weight: bold; font-size: 0.9rem;">${formatoCOP.format(saldoNum)}</span>
                                </div>
                            `;
                        }).join('') : '<p style="color: #94a3b8; text-align: center;">No hay cuentas disponibles</p>'}
                    </div>
                    <input type="hidden" id="cuentaSeleccionadaId" value="${cuentasValidas.length > 0 ? (cuentasValidas[0].id || cuentasValidas[0].numero) : ''}">
                </div>
            </div>
        `,
        background: '#12151c',
        color: '#fff',
        showCancelButton: true,
        confirmButtonText: 'Confirmar y Pagar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e5a93c',
        cancelButtonColor: '#334155',
        didOpen: () => {
            const cards = Swal.getHtmlContainer().querySelectorAll('.cuenta-card-opcion');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    cards.forEach(c => {
                        c.style.borderColor = 'rgba(255,255,255,0.1)';
                        c.style.background = 'rgba(0,0,0,0.4)';
                    });
                    card.style.borderColor = 'var(--gold-main, #e5a93c)';
                    card.style.background = 'rgba(229, 169, 60, 0.08)';
                    document.getElementById('cuentaSeleccionadaId').value = card.getAttribute('data-id');
                });
            });
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const cuentaId = document.getElementById('cuentaSeleccionadaId').value;
            const tipoPago = document.getElementById('selectTipoPago').value;
            
            if (!cuentaId) {
                Swal.fire({ icon: 'warning', title: 'Cuenta requerida', text: 'Por favor selecciona una cuenta para realizar el pago.', background: '#12151c', color: '#fff', confirmButtonColor: '#e5a93c' });
                return;
            }

            const esTotal = tipoPago === 'total';
            const resultadoPago = pagarCuotaPrestamo(radicado, cuentaId, esTotal);

            if (!resultadoPago.success) {
                Swal.fire({ icon: 'error', title: 'Error en el Pago', text: resultadoPago.message, background: '#12151c', color: '#fff', confirmButtonColor: '#e5a93c' });
                return;
            }

            Swal.fire({
                icon: 'success',
                title: esTotal ? '¡Préstamo Cancelado en su Totalidad!' : '¡Pago Exitoso!',
                text: esTotal ? 'Has pagado la totalidad del crédito. El préstamo ha quedado saldado.' : 'La cuota ha sido debitada de tu cuenta y registrada en tus movimientos.',
                background: '#12151c',
                color: '#fff',
                confirmButtonColor: '#e5a93c'
            }).then(() => {
                renderizarDashboardCreditos();
            });
        }
    });
}

window.abrirModalPagoCuotaGlobal = (radicado) => {
    abrirModalPagoCuota(radicado);
};