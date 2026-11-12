// Vanilla/Prestamos.js
import { 
    calcularCuotaPrestamo, 
    evaluarViabilidadPrestamo, 
    registrarSolicitudPrestamo, 
    buscarPrestamoPorRadicado, 
    pagarCuotaPrestamo, 
    obtenerPrestamosUsuario,
    calcularSaldoCapital,
    obtenerTasaNumericaPorTipo,
    TASA_INTERES_MENSUAL 
} from './prestamosService.js';
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

/**
 * Escapar texto seguro para prevenir inyecciones XSS
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Calcula la fecha de pago de la próxima cuota y los días restantes
 */
function calcularProximaFechaPago(prestamo) {
    const fechaBase = new Date(prestamo.fechaDesembolso || prestamo.fecha || Date.now());
    const cuotaSiguiente = (Number(prestamo.cuotasPagadas) || 0) + 1;

    // Sumar N meses a la fecha base
    const proximaFecha = new Date(fechaBase);
    proximaFecha.setMonth(proximaFecha.getMonth() + cuotaSiguiente);

    const ahora = new Date();
    // Diferencia en días
    const diffMs = proximaFecha.getTime() - ahora.getTime();
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let claseBadge = 'badge-vigente';
    let textoDias = `Faltan ${diasRestantes} días`;

    if (diasRestantes < 0) {
        claseBadge = 'badge-vencida';
        textoDias = `Vencida hace ${Math.abs(diasRestantes)} días`;
    } else if (diasRestantes <= 7) {
        claseBadge = 'badge-urgente';
        textoDias = diasRestantes === 0 ? '¡Vence hoy!' : `¡Faltan solo ${diasRestantes} días!`;
    }

    const formatoFechaStr = proximaFecha.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return {
        fechaFormateada: formatoFechaStr,
        diasRestantes,
        textoDias,
        claseBadge
    };
}

let filtroSolicitudesActual = 'TODOS';
let manejadorActualizacionPrestamos = null;
let manejadorStoragePrestamos = null;

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

    // 1. SISTEMA GLOBAL DE PESTAÑAS
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
                    renderizarSolicitudesCredito(filtroSolicitudesActual);
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

    // Limpieza de listeners previos para evitar duplicación
    if (manejadorActualizacionPrestamos) {
        window.removeEventListener('finara:prestamos-actualizados', manejadorActualizacionPrestamos);
    }
    if (manejadorStoragePrestamos) {
        window.removeEventListener('storage', manejadorStoragePrestamos);
    }

    // 4. ACTUALIZACIÓN EN TIEMPO REAL (CustomEvent y Storage para otras pestañas)
    manejadorActualizacionPrestamos = () => {
        renderizarDashboardCreditos();
        renderizarSolicitudesCredito(filtroSolicitudesActual);
    };

    manejadorStoragePrestamos = (e) => {
        if (e.key === 'finara_prestamos' || e.key === 'finara_cuentas') {
            renderizarDashboardCreditos();
            renderizarSolicitudesCredito(filtroSolicitudesActual);
        }
    };

    window.addEventListener('finara:prestamos-actualizados', manejadorActualizacionPrestamos);
    window.addEventListener('storage', manejadorStoragePrestamos);

    // Renderizar dashboard y solicitudes iniciales
    renderizarDashboardCreditos();
    renderizarSolicitudesCredito(filtroSolicitudesActual);
    configurarFiltrosSolicitudes();

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

            // Requerimiento 5: Si es RECHAZADO, se registra en el historial pero sin desembolso
            try {
                const solicitudCreada = registrarSolicitudPrestamo({ 
                    monto, 
                    meses, 
                    cuotaMensual, 
                    estadoEvaluacion: evaluacion, 
                    concepto, 
                    tipoId 
                });

                if (evaluacion.estado === 'RECHAZADO') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Solicitud No Viable',
                        html: `
                            <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px;">
                                <p style="margin:0 0 6px 0;"><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${escapeHTML(solicitudCreada.radicado)}</span></p>
                                <p style="margin:0 0 6px 0;"><strong>Estado:</strong> <span style="color: #f87171; font-weight: bold;">RECHAZADO</span></p>
                                <p style="margin:0; font-size: 0.85rem; color: #94a3b8;">${escapeHTML(evaluacion.mensaje)}</p>
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
                    return;
                }

                Swal.fire({
                    icon: 'success',
                    title: '¡Solicitud Registrada!',
                    html: `
                        <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 14px; border-radius: 12px;">
                            <p style="margin:0 0 6px 0;"><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${escapeHTML(solicitudCreada.radicado)}</span></p>
                            <p style="margin:0 0 6px 0;"><strong>Estado:</strong> <span style="color: ${evaluacion.color}; font-weight: bold;">${escapeHTML(solicitudCreada.estado)}</span></p>
                            <p style="margin:0 0 6px 0;"><strong>Cuota Mensual:</strong> ${formatoCOP.format(solicitudCreada.cuotaMensual)}</p>
                            <p style="margin:0; font-size: 0.82rem; color: #94a3b8;">${escapeHTML(evaluacion.mensaje)}</p>
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
                boxResultadoRadicado.innerHTML = `<p style="color: #f87171; text-align: center; margin: 1.5rem 0;">No se encontró ningún préstamo con el radicado: ${escapeHTML(radVal)}</p>`;
                return;
            }

            const colorEstado = encontrado.estado === 'APROBADO' ? '#34d399' : (encontrado.estado === 'RECHAZADO' ? '#f87171' : '#e5a93c');

            boxResultadoRadicado.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
                    <p style="margin:0;"><strong>Radicado:</strong> <span style="color: #e5a93c; font-family: monospace;">${escapeHTML(encontrado.radicado)}</span></p>
                    <p style="margin:0;"><strong>Concepto:</strong> ${escapeHTML(encontrado.concepto)}</p>
                    <p style="margin:0;"><strong>Monto Solicitado:</strong> ${formatoCOP.format(encontrado.monto)}</p>
                    <p style="margin:0;"><strong>Plazo:</strong> ${escapeHTML(encontrado.meses)} meses</p>
                    <p style="margin:0;"><strong>Cuota Mensual:</strong> ${formatoCOP.format(encontrado.cuotaMensual)}</p>
                    <p style="margin:0;"><strong>Estado Actual:</strong> <span style="color: ${colorEstado}; font-weight: bold;">${escapeHTML(encontrado.estado)}</span></p>
                    <p style="margin:0; font-size: 0.8rem; color: #94a3b8;">${escapeHTML(encontrado.mensajeEstado || '')}</p>
                </div>
            `;
        });
    }
}

// 4. DASHBOARD DE CRÉDITOS ACTIVOS (HU-13 / HU-16)
export function renderizarDashboardCreditos() {
    const contenedor = document.getElementById('dashboardCreditosList');
    const badgeContador = document.getElementById('badgeContadorActivos');
    if (!contenedor) return;

    // Préstamos aislados por usuario activo
    const todosPrestamos = obtenerPrestamosUsuario();
    const activos = todosPrestamos.filter(p => p.activo && p.estado !== 'PAGADO');

    if (badgeContador) {
        badgeContador.textContent = `${activos.length} Activo${activos.length === 1 ? '' : 's'}`;
    }

    // Requerimiento 6: Si el usuario NO tiene ningún préstamo ni solicitud, mostrar estado vacío completo
    if (todosPrestamos.length === 0) {
        contenedor.innerHTML = `
            <div class="prestamo-empty-state">
                <div class="prestamo-empty-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
                <h4>Aún no tienes solicitudes ni préstamos activos</h4>
                <p>Simula tu crédito en minutos con desembolso inmediato a tu cuenta o compara nuestras alternativas de financiación.</p>
                <div class="prestamo-empty-actions">
                    <button type="button" class="btn-solicitar-prestamo btn-ir-solicitud">
                        <i class="fa-solid fa-plus"></i> Solicitar un préstamo
                    </button>
                    <button type="button" class="btn-prestamo-secundario btn-ir-comparador">
                        <i class="fa-solid fa-scale-balanced"></i> Ver comparador de créditos
                    </button>
                </div>
            </div>
        `;

        contenedor.querySelector('.btn-ir-solicitud')?.addEventListener('click', () => {
            document.querySelector('[data-tab="tab-solicitud"]')?.click();
        });
        contenedor.querySelector('.btn-ir-comparador')?.addEventListener('click', () => {
            document.querySelector('[data-tab="tab-comparador"]')?.click();
        });
        return;
    }

    // Si tiene solicitudes pero ninguna activa (ej: pendientes o rechazadas)
    if (activos.length === 0) {
        contenedor.innerHTML = `
            <div class="prestamo-empty-state">
                <div class="prestamo-empty-icon" style="background: rgba(229, 169, 60, 0.1);"><i class="fa-solid fa-clipboard-check"></i></div>
                <h4>No tienes créditos activos en este momento</h4>
                <p>Revisa más abajo el estado de tus solicitudes o postúlate a un nuevo crédito bancario.</p>
                <div class="prestamo-empty-actions">
                    <button type="button" class="btn-solicitar-prestamo btn-ir-solicitud">
                        <i class="fa-solid fa-plus"></i> Solicitar un préstamo
                    </button>
                </div>
            </div>
        `;
        contenedor.querySelector('.btn-ir-solicitud')?.addEventListener('click', () => {
            document.querySelector('[data-tab="tab-solicitud"]')?.click();
        });
        return;
    }

    contenedor.innerHTML = activos.map(p => {
        const cuotasRestantes = Math.max(0, p.meses - p.cuotasPagadas);
        const totalRestantePagar = cuotasRestantes * p.cuotaMensual;
        const tasaNumerica = obtenerTasaNumericaPorTipo(p.tipoId);
        const saldoCapitalRestante = calcularSaldoCapital(p.monto, p.meses, tasaNumerica, p.cuotasPagadas);
        const porcentajeProgreso = Math.min(100, Math.round((p.cuotasPagadas / p.meses) * 100));
        const proximaFecha = calcularProximaFechaPago(p);
        const tasaMostrar = p.tasaInteres || '1.8% E.M. (24% E.A.)';
        const cantidadPagos = Array.isArray(p.pagos) ? p.pagos.length : 0;

        return `
            <div class="prestamo-card-activo" data-radicado="${escapeHTML(p.radicado)}">
                <div class="prestamo-card-activo-head">
                    <div>
                        <strong class="prestamo-card-titulo">${escapeHTML(p.concepto || 'Crédito de Consumo')}</strong>
                        <span class="prestamo-card-subradicado">${escapeHTML(p.radicado)}</span>
                    </div>
                    <div class="prestamo-due-badge ${proximaFecha.claseBadge}" title="Fecha límite de tu próxima cuota">
                        <i class="fa-regular fa-clock"></i> Próx. Cuota: ${proximaFecha.fechaFormateada} (${proximaFecha.textoDias})
                    </div>
                </div>

                <div class="prestamo-card-metricas">
                    <div class="prestamo-metrica-item">
                        <span>Saldo Capital Pendiente:</span>
                        <strong class="valor-capital">${formatoCOP.format(saldoCapitalRestante)}</strong>
                        <small class="prestamo-subtexto">Total restante: ${formatoCOP.format(totalRestantePagar)}</small>
                    </div>
                    <div class="prestamo-metrica-item">
                        <span>Valor Cuota Mensual:</span>
                        <strong class="valor-cuota">${formatoCOP.format(p.cuotaMensual)}</strong>
                        <small class="prestamo-subtexto">Tasa: ${escapeHTML(tasaMostrar)}</small>
                    </div>
                    <div class="prestamo-metrica-item">
                        <span>Progreso de Amortización:</span>
                        <strong class="valor-progreso">${p.cuotasPagadas} de ${p.meses} cuotas</strong>
                        <div class="prestamo-progress-bar-bg">
                            <div class="prestamo-progress-bar-fill" style="width: ${porcentajeProgreso}%;"></div>
                        </div>
                    </div>
                </div>

                <div class="prestamo-card-activo-footer">
                    <button type="button" class="btn-ver-historial-pagos" data-radicado="${escapeHTML(p.radicado)}">
                        <i class="fa-solid fa-list-check"></i> Historial de pagos (${cantidadPagos})
                    </button>
                    <button type="button" class="btn-solicitar-prestamo btn-pagar-cuota-action" data-radicado="${escapeHTML(p.radicado)}">
                        <i class="fa-solid fa-credit-card"></i> Pagar Cuota Mensual
                    </button>
                </div>

                <!-- Contenedor desplegable del historial de pagos -->
                <div id="historial-${escapeHTML(p.radicado)}" class="prestamo-historial-pagos-box" style="display: none;">
                    ${renderizarTablaPagosHTML(p.pagos)}
                </div>
            </div>
        `;
    }).join('');

    // Listeners de pagar cuota
    contenedor.querySelectorAll('.btn-pagar-cuota-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const radicado = btn.getAttribute('data-radicado');
            if (radicado) abrirModalPagoCuota(radicado);
        });
    });

    // Listeners para desplegar historial de pagos
    contenedor.querySelectorAll('.btn-ver-historial-pagos').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const radicado = btn.getAttribute('data-radicado');
            const box = document.getElementById(`historial-${radicado}`);
            if (box) {
                const visible = box.style.display !== 'none';
                box.style.display = visible ? 'none' : 'block';
                btn.classList.toggle('active', !visible);
            }
        });
    });
}

function renderizarTablaPagosHTML(pagos) {
    if (!Array.isArray(pagos) || pagos.length === 0) {
        return `<p class="prestamo-historial-empty"><i class="fa-solid fa-circle-info"></i> Aún no has realizado pagos en este crédito.</p>`;
    }

    return `
        <div class="prestamo-table-wrapper">
            <table class="prestamo-table">
                <thead>
                    <tr>
                        <th>Fecha y Hora</th>
                        <th>Cuota</th>
                        <th>Valor Pagado</th>
                        <th>Cuenta Origen</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagos.map(pago => {
                        const fechaStr = new Date(pago.fecha).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        const tipoTexto = pago.tipo === 'TOTAL' ? 'Pago Total' : `Cuota ${pago.numeroCuota}`;
                        const cuentaMask = ocultarNumeroCuenta(pago.cuentaNumero);

                        return `
                            <tr>
                                <td>${fechaStr}</td>
                                <td><strong>${tipoTexto}</strong></td>
                                <td style="color: #34d399; font-weight: 600;">${formatoCOP.format(pago.valor)}</td>
                                <td>${cuentaMask}</td>
                                <td><span class="prestamo-badge-estado badge-aprobado">Aplicado</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 5. SECCIÓN MIS SOLICITUDES CON FILTRO (HU-13)
export function renderizarSolicitudesCredito(filtro = 'TODOS') {
    const contenedor = document.getElementById('listaSolicitudesContainer');
    const seccionFinalizados = document.getElementById('seccionCreditosFinalizados');
    const contFinalizados = document.getElementById('listaCreditosPagados');
    const badgePagados = document.getElementById('badgeContadorPagados');

    if (!contenedor) return;

    const todos = obtenerPrestamosUsuario();
    let filtrados = todos;

    if (filtro !== 'TODOS') {
        filtrados = todos.filter(p => p.estado === filtro);
    }

    if (filtrados.length === 0) {
        contenedor.innerHTML = `<p class="prestamo-loading-text" style="text-align: center; margin: 1.5rem 0;">No se encontraron solicitudes con el filtro: <strong>${escapeHTML(filtro)}</strong></p>`;
    } else {
        contenedor.innerHTML = filtrados.map(sol => {
            const fechaStr = new Date(sol.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
            let badgeClass = 'badge-revision';
            let labelEstado = 'En Revisión';

            if (sol.estado === 'APROBADO') {
                badgeClass = 'badge-aprobado';
                labelEstado = 'Aprobado';
            } else if (sol.estado === 'RECHAZADO') {
                badgeClass = 'badge-rechazado';
                labelEstado = 'Rechazado';
            } else if (sol.estado === 'PAGADO') {
                badgeClass = 'badge-pagado';
                labelEstado = 'Finalizado';
            }

            return `
                <div class="prestamo-solicitud-card">
                    <div class="prestamo-solicitud-main">
                        <div>
                            <span class="prestamo-badge-estado ${badgeClass}">${labelEstado}</span>
                            <strong class="prestamo-solicitud-concepto">${escapeHTML(sol.concepto || 'Crédito')}</strong>
                            <small class="prestamo-solicitud-radicado">${escapeHTML(sol.radicado)} · ${fechaStr}</small>
                        </div>
                        <div class="prestamo-solicitud-monto-box">
                            <span class="monto-valor">${formatoCOP.format(sol.monto)}</span>
                            <small class="monto-cuota">${sol.meses} meses · Cuota: ${formatoCOP.format(sol.cuotaMensual)}</small>
                        </div>
                    </div>
                    ${sol.mensajeEstado ? `<p class="prestamo-solicitud-mensaje">${escapeHTML(sol.mensajeEstado)}</p>` : ''}
                </div>
            `;
        }).join('');
    }

    // Manejo de la sección de Créditos Finalizados (Pagados)
    if (seccionFinalizados && contFinalizados) {
        const pagados = todos.filter(p => p.estado === 'PAGADO');
        if (pagados.length > 0) {
            seccionFinalizados.style.display = 'block';
            if (badgePagados) badgePagados.textContent = `${pagados.length} Pagado${pagados.length === 1 ? '' : 's'}`;
            contFinalizados.innerHTML = pagados.map(p => `
                <div class="prestamo-card-activo" style="border-left: 4px solid #64748b;">
                    <div class="prestamo-card-activo-head">
                        <div>
                            <strong class="prestamo-card-titulo">${escapeHTML(p.concepto)}</strong>
                            <span class="prestamo-card-subradicado">${escapeHTML(p.radicado)}</span>
                        </div>
                        <span class="prestamo-badge-estado badge-pagado">Crédito Totalmente Saldado</span>
                    </div>
                    <div style="font-size: 0.85rem; color: #94a3b8; display: flex; gap: 20px; flex-wrap: wrap;">
                        <div>Monto financiado: <strong style="color:#fff;">${formatoCOP.format(p.monto)}</strong></div>
                        <div>Cuotas pagadas: <strong style="color:#34d399;">${p.cuotasPagadas} de ${p.meses}</strong></div>
                    </div>
                    <div style="margin-top: 10px;">
                        <button type="button" class="btn-ver-historial-pagos" data-radicado="${escapeHTML(p.radicado)}">
                            <i class="fa-solid fa-receipt"></i> Ver historial de pagos (${Array.isArray(p.pagos) ? p.pagos.length : 0})
                        </button>
                    </div>
                    <div id="historial-${escapeHTML(p.radicado)}" class="prestamo-historial-pagos-box" style="display: none;">
                        ${renderizarTablaPagosHTML(p.pagos)}
                    </div>
                </div>
            `).join('');

            contFinalizados.querySelectorAll('.btn-ver-historial-pagos').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const rad = btn.getAttribute('data-radicado');
                    const box = document.getElementById(`historial-${rad}`);
                    if (box) {
                        const visible = box.style.display !== 'none';
                        box.style.display = visible ? 'none' : 'block';
                    }
                });
            });
        } else {
            seccionFinalizados.style.display = 'none';
        }
    }
}

function configurarFiltrosSolicitudes() {
    const btns = document.querySelectorAll('.btn-filtro-solicitud');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtroSolicitudesActual = btn.getAttribute('data-filtro') || 'TODOS';
            renderizarSolicitudesCredito(filtroSolicitudesActual);
        });
    });
}

function abrirModalPagoCuota(radicado) {
    let prestamos = obtenerPrestamosUsuario();
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
        return (tipoStr.includes('ahorro') || tipoStr.includes('corriente')) && c.estado !== 'INACTIVA';
    });

    Swal.fire({
        title: 'Pagar Crédito o Cuota',
        html: `
            <div style="text-align: left; font-size: 0.9rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 12px;">
                <p style="margin:0;"><strong>Radicado:</strong> <span style="color: #e5a93c;">${escapeHTML(prestamo.radicado)}</span></p>
                
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
                            const numeroOculto = ocultarNumeroCuenta(c.numero || c.id);
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
                        }).join('') : '<p style="color: #94a3b8; text-align: center;">No hay cuentas con fondos disponibles</p>'}
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
                renderizarSolicitudesCredito(filtroSolicitudesActual);
            });
        }
    });
}

window.abrirModalPagoCuotaGlobal = (radicado) => {
    abrirModalPagoCuota(radicado);
};
