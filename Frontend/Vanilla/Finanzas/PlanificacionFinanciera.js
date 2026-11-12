/**
 * PlanificacionFinanciera.js
 * Controlador principal de la vista de Planificación Financiera Mensual (HU-30).
 * Maneja el plan presupuestal mensual (ingresos estimados, asignaciones y ahorro)
 * y la vista comparativa en vivo contra los movimientos bancarios reales de Finara.
 */

import {
    CATEGORIAS_INGRESO,
    CATEGORIAS_GASTO,
    formatoCOP,
    obtenerPeriodoActual,
    obtenerPlanUsuario,
    guardarPlan,
    copiarPlanMesAnterior,
    importarDesdePresupuesto,
    limpiarPlan,
    calcularResumenPlan,
    compararPlanVsReal
} from './planificacionFinancieraService.js';

const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Convierte 'YYYY-MM' en formato legible (ej. 'Noviembre 2026').
 */
function formatearPeriodoTexto(periodo) {
    if (!periodo) return '';
    const [year, month] = periodo.split('-');
    const mIndex = parseInt(month, 10) - 1;
    const nombreMes = NOMBRES_MESES[mIndex] || month;
    return `${nombreMes} ${year}`;
}

/**
 * Desplaza un periodo YYYY-MM en N meses.
 */
function desplazarPeriodo(periodo, offset) {
    const [yearStr, monthStr] = periodo.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + offset;

    while (month > 12) {
        month -= 12;
        year += 1;
    }
    while (month < 1) {
        month += 12;
        year -= 1;
    }

    return `${year}-${String(month).padStart(2, '0')}`;
}

export async function initPlanificacionFinancieraView() {
    let periodoActivo = obtenerPeriodoActual();
    let tabActiva = 'planificador';

    // 1. REFERENCIAS AL DOM
    const btnMesAnterior = document.getElementById('btnPfMesAnterior');
    const btnMesSiguiente = document.getElementById('btnPfMesSiguiente');
    const btnMesHoy = document.getElementById('btnPfMesHoy');
    const labelPeriodo = document.getElementById('pfPeriodoTextoLabel');
    const inputPeriodo = document.getElementById('pfPeriodoInput');

    const tabBtnPlanificador = document.getElementById('tabBtnPlanificador');
    const tabBtnComparativa = document.getElementById('tabBtnComparativa');
    const vistaPlanificador = document.getElementById('pfVistaPlanificador');
    const vistaComparativa = document.getElementById('pfVistaComparativa');

    // Botones de acción del planificador
    const btnGuardarPlan = document.getElementById('btnPfGuardarPlan');
    const btnCopiarMesAnterior = document.getElementById('btnPfCopiarMesAnterior');
    const btnImportarPresupuesto = document.getElementById('btnPfImportarPresupuesto');
    const btnLimpiarPlan = document.getElementById('btnPfLimpiarPlan');

    // Elementos de resumen del planificador
    const pfResumenIngresos = document.getElementById('pfResumenIngresos');
    const pfResumenAsignado = document.getElementById('pfResumenAsignado');
    const pfResumenAhorro = document.getElementById('pfResumenAhorro');
    const pfBadgeSaldoContainer = document.getElementById('pfBadgeSaldoContainer');
    const pfDistPctTotal = document.getElementById('pfDistPctTotal');
    const pfBarraDistribucion = document.getElementById('pfBarraDistribucion');
    const pfLeyendaDistribucion = document.getElementById('pfLeyendaDistribucion');
    const pfTotalIngresosCol = document.getElementById('pfTotalIngresosCol');
    const pfTotalAsignacionesCol = document.getElementById('pfTotalAsignacionesCol');

    const contenedorIngresos = document.getElementById('pfContenedorIngresos');
    const contenedorAsignaciones = document.getElementById('pfContenedorAsignaciones');
    const inputMetaAhorro = document.getElementById('pfInputMetaAhorro');

    // Elementos de la vista comparativa
    const emptyStateComparativa = document.getElementById('pfComparativaEmptyState');
    const contenidoComparativa = document.getElementById('pfComparativaContenido');
    const btnCrearPlanDesdeEmpty = document.getElementById('btnPfCrearPlanDesdeEmpty');

    const kpiIngresosReal = document.getElementById('pfKpiIngresosReal');
    const kpiIngresosEst = document.getElementById('pfKpiIngresosEst');
    const kpiIngresosDif = document.getElementById('pfKpiIngresosDif');

    const kpiGastosReal = document.getElementById('pfKpiGastosReal');
    const kpiGastosPlan = document.getElementById('pfKpiGastosPlan');
    const kpiGastosDif = document.getElementById('pfKpiGastosDif');

    const kpiAhorroReal = document.getElementById('pfKpiAhorroReal');
    const kpiAhorroPlan = document.getElementById('pfKpiAhorroPlan');
    const kpiAhorroDif = document.getElementById('pfKpiAhorroDif');

    const kpiCumplimientoPct = document.getElementById('pfKpiCumplimientoPct');
    const kpiCumplimientoMsg = document.getElementById('pfKpiCumplimientoMsg');

    const bannerRitmoContainer = document.getElementById('pfBannerRitmoContainer');
    const contenedorMensajes = document.getElementById('pfMensajesAsesoria');
    const tablaComparativaBody = document.getElementById('pfTablaComparativaBody');
    const tablaComparativaFooter = document.getElementById('pfTablaComparativaFooter');

    // 2. CONSTRUIR ESTRUCTURA DINÁMICA DE FORMULARIOS
    function inicializarEstructuraFormularios() {
        // Ingresos
        if (contenedorIngresos) {
            contenedorIngresos.innerHTML = '';
            CATEGORIAS_INGRESO.forEach(cat => {
                const row = document.createElement('div');
                row.className = 'pf-category-row';
                row.innerHTML = `
                    <div class="pf-category-icon-box" style="background: ${cat.color};">
                        <i class="fa-solid ${cat.icono}"></i>
                    </div>
                    <div class="pf-category-info">
                        <span class="pf-category-name" title="${cat.nombre}">${cat.nombre}</span>
                        <span class="pf-category-pct" id="pct_ingreso_${cat.id}">0% del total</span>
                    </div>
                    <div class="pf-category-input-wrapper">
                        <span class="pf-input-prefix">$</span>
                        <input type="number"
                               class="pf-input-number pf-input-ingreso"
                               data-categoria="${cat.id}"
                               placeholder="0"
                               min="0"
                               step="any"
                               aria-label="${cat.nombre}">
                    </div>
                `;
                contenedorIngresos.appendChild(row);
            });
        }

        // Asignaciones de Gasto
        if (contenedorAsignaciones) {
            contenedorAsignaciones.innerHTML = '';
            CATEGORIAS_GASTO.forEach(cat => {
                const row = document.createElement('div');
                row.className = 'pf-category-row';
                row.innerHTML = `
                    <div class="pf-category-icon-box" style="background: ${cat.color};">
                        <i class="fa-solid ${cat.icono}"></i>
                    </div>
                    <div class="pf-category-info">
                        <span class="pf-category-name" title="${cat.nombre}">${cat.nombre}</span>
                        <span class="pf-category-pct" id="pct_gasto_${cat.id}">0% de ingresos</span>
                    </div>
                    <div class="pf-category-input-wrapper">
                        <span class="pf-input-prefix">$</span>
                        <input type="number"
                               class="pf-input-number pf-input-gasto"
                               data-categoria="${cat.id}"
                               placeholder="0"
                               min="0"
                               step="any"
                               aria-label="${cat.nombre}">
                    </div>
                `;
                contenedorAsignaciones.appendChild(row);
            });
        }
    }

    inicializarEstructuraFormularios();

    // 3. LECTURA Y ACTUALIZACIÓN EN VIVO DEL PLAN
    function recolectarDatosPlan() {
        const ingresosEstimados = [];
        document.querySelectorAll('.pf-input-ingreso').forEach(inp => {
            const cat = inp.getAttribute('data-categoria');
            const monto = Math.max(0, parseFloat(inp.value) || 0);
            ingresosEstimados.push({ categoria: cat, monto });
        });

        const asignaciones = [];
        document.querySelectorAll('.pf-input-gasto').forEach(inp => {
            const cat = inp.getAttribute('data-categoria');
            const monto = Math.max(0, parseFloat(inp.value) || 0);
            asignaciones.push({ categoria: cat, monto });
        });

        const metaAhorro = Math.max(0, parseFloat(inputMetaAhorro ? inputMetaAhorro.value : 0) || 0);

        return {
            ingresosEstimados,
            asignaciones,
            metaAhorro
        };
    }

    function actualizarCalculosEnVivo() {
        const planActual = recolectarDatosPlan();
        const resumen = calcularResumenPlan(planActual);

        // Actualizar cifras numéricas
        if (pfResumenIngresos) pfResumenIngresos.textContent = formatoCOP.format(resumen.totalIngresos);
        if (pfResumenAsignado) pfResumenAsignado.textContent = formatoCOP.format(resumen.totalAsignado);
        if (pfResumenAhorro) pfResumenAhorro.textContent = formatoCOP.format(resumen.metaAhorro);

        if (pfTotalIngresosCol) pfTotalIngresosCol.textContent = formatoCOP.format(resumen.totalIngresos);
        if (pfTotalAsignacionesCol) pfTotalAsignacionesCol.textContent = formatoCOP.format(resumen.totalAsignado);

        // Actualizar badge de saldo por asignar
        if (pfBadgeSaldoContainer) {
            let badgeClass = 'pf-badge-neutro';
            let iconClass = 'fa-circle-notch';
            let textoEstado = formatoCOP.format(resumen.saldoPorAsignar);

            if (resumen.estadoSaldo === 'equilibrado') {
                badgeClass = 'pf-badge-equilibrado';
                iconClass = 'fa-check';
                textoEstado = `${formatoCOP.format(0)} (Equilibrado)`;
            } else if (resumen.estadoSaldo === 'sobrante') {
                badgeClass = 'pf-badge-sobrante';
                iconClass = 'fa-arrow-trend-up';
                textoEstado = `+${formatoCOP.format(resumen.saldoPorAsignar)} (Sin asignar)`;
            } else if (resumen.estadoSaldo === 'deficit') {
                badgeClass = 'pf-badge-deficit';
                iconClass = 'fa-triangle-exclamation';
                textoEstado = `${formatoCOP.format(resumen.saldoPorAsignar)} (Déficit)`;
            }

            pfBadgeSaldoContainer.innerHTML = `
                <span class="pf-balance-badge ${badgeClass}" id="pfBadgeSaldo">
                    <i class="fa-solid ${iconClass}"></i>
                    ${textoEstado}
                </span>
            `;
        }

        // Actualizar porcentajes por categoría de ingreso
        planActual.ingresosEstimados.forEach(item => {
            const el = document.getElementById(`pct_ingreso_${item.categoria}`);
            if (el) {
                const pct = resumen.totalIngresos > 0 ? (item.monto / resumen.totalIngresos) * 100 : 0;
                el.textContent = `${pct.toFixed(1)}% del total`;
            }
        });

        // Actualizar porcentajes por categoría de gasto
        planActual.asignaciones.forEach(item => {
            const el = document.getElementById(`pct_gasto_${item.categoria}`);
            if (el) {
                const pct = resumen.porcentajes[item.categoria] || 0;
                el.textContent = `${pct.toFixed(1)}% de ingresos`;
            }
        });

        // Actualizar barra multi-segmento de distribución
        if (pfBarraDistribucion && pfLeyendaDistribucion && pfDistPctTotal) {
            pfBarraDistribucion.innerHTML = '';
            pfLeyendaDistribucion.innerHTML = '';

            const pctTotalComprometido = resumen.totalIngresos > 0
                ? Math.min(100, (resumen.totalComprometido / resumen.totalIngresos) * 100)
                : 0;

            pfDistPctTotal.textContent = `${pctTotalComprometido.toFixed(1)}% Comprometido`;

            // Segmentos por categoría con monto > 0
            CATEGORIAS_GASTO.forEach(cat => {
                const item = planActual.asignaciones.find(a => a.categoria === cat.id);
                const monto = item ? item.monto : 0;
                if (monto > 0 && resumen.totalIngresos > 0) {
                    const pct = (monto / resumen.totalIngresos) * 100;
                    const seg = document.createElement('div');
                    seg.className = 'pf-distribucion-segment';
                    seg.style.width = `${pct}%`;
                    seg.style.background = cat.color;
                    seg.title = `${cat.nombre}: ${formatoCOP.format(monto)} (${pct.toFixed(1)}%)`;
                    pfBarraDistribucion.appendChild(seg);

                    // Leyenda
                    const ley = document.createElement('div');
                    ley.className = 'pf-leyenda-item';
                    ley.innerHTML = `
                        <span class="pf-leyenda-dot" style="background: ${cat.color};"></span>
                        <span>${cat.nombre} (${pct.toFixed(0)}%)</span>
                    `;
                    pfLeyendaDistribucion.appendChild(ley);
                }
            });

            // Segmento de Ahorro
            if (resumen.metaAhorro > 0 && resumen.totalIngresos > 0) {
                const pct = (resumen.metaAhorro / resumen.totalIngresos) * 100;
                const seg = document.createElement('div');
                seg.className = 'pf-distribucion-segment';
                seg.style.width = `${pct}%`;
                seg.style.background = '#0284c7';
                seg.title = `Meta de Ahorro: ${formatoCOP.format(resumen.metaAhorro)} (${pct.toFixed(1)}%)`;
                pfBarraDistribucion.appendChild(seg);

                const ley = document.createElement('div');
                ley.className = 'pf-leyenda-item';
                ley.innerHTML = `
                    <span class="pf-leyenda-dot" style="background: #0284c7;"></span>
                    <span>Ahorro (${pct.toFixed(0)}%)</span>
                `;
                pfLeyendaDistribucion.appendChild(ley);
            }

            // Segmento sin asignar si sobra
            if (resumen.saldoPorAsignar > 0 && resumen.totalIngresos > 0) {
                const pct = (resumen.saldoPorAsignar / resumen.totalIngresos) * 100;
                const seg = document.createElement('div');
                seg.className = 'pf-distribucion-segment';
                seg.style.width = `${pct}%`;
                seg.style.background = '#e2e8f0';
                seg.title = `Sin Asignar: ${formatoCOP.format(resumen.saldoPorAsignar)} (${pct.toFixed(1)}%)`;
                pfBarraDistribucion.appendChild(seg);

                const ley = document.createElement('div');
                ley.className = 'pf-leyenda-item';
                ley.innerHTML = `
                    <span class="pf-leyenda-dot" style="background: #cbd5e1;"></span>
                    <span>Sin Asignar (${pct.toFixed(0)}%)</span>
                `;
                pfLeyendaDistribucion.appendChild(ley);
            }
        }
    }

    // 4. CARGA DE DATOS DEL PERIODO EN EL FORMULARIO
    function cargarPlanEnFormulario(periodo) {
        const plan = obtenerPlanUsuario(periodo);

        // Mapear ingresos
        const mapIngresos = {};
        if (plan && Array.isArray(plan.ingresosEstimados)) {
            plan.ingresosEstimados.forEach(i => { mapIngresos[i.categoria] = i.monto; });
        }

        document.querySelectorAll('.pf-input-ingreso').forEach(inp => {
            const cat = inp.getAttribute('data-categoria');
            const val = mapIngresos[cat];
            inp.value = (val !== undefined && val !== null && val > 0) ? val : '';
        });

        // Mapear gastos
        const mapGastos = {};
        if (plan && Array.isArray(plan.asignaciones)) {
            plan.asignaciones.forEach(a => { mapGastos[a.categoria] = a.monto; });
        }

        document.querySelectorAll('.pf-input-gasto').forEach(inp => {
            const cat = inp.getAttribute('data-categoria');
            const val = mapGastos[cat];
            inp.value = (val !== undefined && val !== null && val > 0) ? val : '';
        });

        // Meta de ahorro
        if (inputMetaAhorro) {
            inputMetaAhorro.value = (plan && plan.metaAhorro > 0) ? plan.metaAhorro : '';
        }

        actualizarCalculosEnVivo();
    }

    // 5. RENDERIZADO DE LA VISTA COMPARATIVA
    async function renderizarComparativa(periodo) {
        const comp = await compararPlanVsReal(periodo);

        // Verificar si el periodo actual es un mes futuro
        const periodoActual = obtenerPeriodoActual();
        const esFuturo = periodo > periodoActual;

        if (!comp.tienePlan && !esFuturo) {
            if (emptyStateComparativa) emptyStateComparativa.classList.remove('pf-hidden');
            if (contenidoComparativa) contenidoComparativa.classList.add('pf-hidden');
            return;
        }

        if (emptyStateComparativa) emptyStateComparativa.classList.add('pf-hidden');
        if (contenidoComparativa) contenidoComparativa.classList.remove('pf-hidden');

        // Actualizar KPIs
        if (kpiIngresosReal) kpiIngresosReal.textContent = formatoCOP.format(comp.resumen.ingresosReales);
        if (kpiIngresosEst) kpiIngresosEst.textContent = formatoCOP.format(comp.resumen.ingresosEstimados);
        if (kpiIngresosDif) {
            const dif = comp.resumen.difIngresos;
            kpiIngresosDif.textContent = `${dif >= 0 ? '+' : ''}${formatoCOP.format(dif)}`;
            kpiIngresosDif.className = dif >= 0 ? 'pf-text-bold pf-color-positive' : 'pf-text-bold pf-color-negative';
        }

        if (kpiGastosReal) kpiGastosReal.textContent = formatoCOP.format(comp.resumen.gastoReal);
        if (kpiGastosPlan) kpiGastosPlan.textContent = formatoCOP.format(comp.resumen.gastoPlanificado);
        if (kpiGastosDif) {
            const dif = comp.resumen.difGasto;
            // Para gasto: diferencia positiva significa ahorro (verde), negativa sobregasto (rojo)
            kpiGastosDif.textContent = dif >= 0 ? `Ahorro: +${formatoCOP.format(dif)}` : `Excedido: ${formatoCOP.format(dif)}`;
            kpiGastosDif.className = dif >= 0 ? 'pf-text-bold pf-color-positive' : 'pf-text-bold pf-color-negative';
        }

        if (kpiAhorroReal) kpiAhorroReal.textContent = formatoCOP.format(comp.resumen.ahorroReal);
        if (kpiAhorroPlan) kpiAhorroPlan.textContent = formatoCOP.format(comp.resumen.ahorroPlanificado);
        if (kpiAhorroDif) {
            const dif = comp.resumen.difAhorro;
            kpiAhorroDif.textContent = `${dif >= 0 ? '+' : ''}${formatoCOP.format(dif)}`;
            kpiAhorroDif.className = dif >= 0 ? 'pf-text-bold pf-color-positive' : 'pf-text-bold pf-color-negative';
        }

        if (kpiCumplimientoPct) kpiCumplimientoPct.textContent = `${comp.resumen.porcentajeCumplimiento}%`;
        if (kpiCumplimientoMsg) {
            if (comp.resumen.porcentajeCumplimiento >= 90) {
                kpiCumplimientoMsg.textContent = 'Cumplimiento óptimo';
                kpiCumplimientoMsg.style.color = 'var(--pf-status-green)';
            } else if (comp.resumen.porcentajeCumplimiento >= 70) {
                kpiCumplimientoMsg.textContent = 'Moderado con sobrecostos';
                kpiCumplimientoMsg.style.color = 'var(--pf-status-yellow)';
            } else {
                kpiCumplimientoMsg.textContent = 'Presupuesto desbordado';
                kpiCumplimientoMsg.style.color = 'var(--pf-status-red)';
            }
        }

        // Banner de Ritmo de Gasto
        if (bannerRitmoContainer) {
            bannerRitmoContainer.innerHTML = '';
            if (comp.ritmo && comp.ritmo.ritmoAcelerado) {
                const banner = document.createElement('div');
                banner.className = 'pf-banner-ritmo';
                banner.innerHTML = `
                    <i class="fa-solid fa-gauge-high"></i>
                    <div class="pf-banner-ritmo-text">
                        <h4>Alerta de Ritmo de Gasto (Día ${comp.ritmo.diaActual} de ${comp.ritmo.diasEnMes})</h4>
                        <p>
                            Has gastado ${formatoCOP.format(comp.resumen.gastoReal)} de tus ${formatoCOP.format(comp.resumen.gastoPlanificado)} planificados.
                            El gasto proporcional esperado para la fecha es de ${formatoCOP.format(comp.ritmo.gastoEsperadoFecha)},
                            por lo que llevas un adelanto de gasto de <strong>+${formatoCOP.format(comp.ritmo.diferenciaRitmo)}</strong>.
                        </p>
                    </div>
                `;
                bannerRitmoContainer.appendChild(banner);
            }
        }

        // Mensajes Automáticos
        if (contenedorMensajes) {
            contenedorMensajes.innerHTML = '';
            comp.mensajes.forEach(msg => {
                const card = document.createElement('div');
                let cssClass = 'pf-msg-info';
                if (msg.tipo === 'alerta') cssClass = 'pf-msg-alerta';
                else if (msg.tipo === 'advertencia') cssClass = 'pf-msg-advertencia';
                else if (msg.tipo === 'exito') cssClass = 'pf-msg-exito';

                card.className = `pf-mensaje-card ${cssClass}`;
                card.innerHTML = `
                    <i class="fa-solid ${msg.icono}"></i>
                    <div>${msg.texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
                `;
                contenedorMensajes.appendChild(card);
            });
        }

        // Tabla comparativa
        if (tablaComparativaBody) {
            tablaComparativaBody.innerHTML = '';

            comp.filas.forEach(fila => {
                const tr = document.createElement('tr');

                // Badge de estado
                let badgeHtml = '';
                let fillBarColor = fila.color || '#10b981';

                if (fila.estado === 'dentro') {
                    badgeHtml = `<span class="pf-status-badge status-dentro"><i class="fa-solid fa-circle-check"></i> Dentro</span>`;
                    fillBarColor = '#10b981';
                } else if (fila.estado === 'limite') {
                    badgeHtml = `<span class="pf-status-badge status-limite"><i class="fa-solid fa-clock"></i> Cerca del límite</span>`;
                    fillBarColor = '#f59e0b';
                } else if (fila.estado === 'excedido') {
                    badgeHtml = `<span class="pf-status-badge status-excedido"><i class="fa-solid fa-circle-exclamation"></i> Excedido</span>`;
                    fillBarColor = '#ef4444';
                } else if (fila.estado === 'sin_plan') {
                    badgeHtml = `<span class="pf-status-badge status-sin_plan"><i class="fa-solid fa-circle-question"></i> Sin plan</span>`;
                    fillBarColor = '#94a3b8';
                } else {
                    badgeHtml = `<span class="pf-status-badge status-neutro"><i class="fa-solid fa-minus"></i> $ 0</span>`;
                }

                const pctProgresoBarra = Math.min(100, fila.porcentaje);
                const difClase = fila.diferencia >= 0 ? 'pf-color-positive' : 'pf-color-negative';
                const difSigno = fila.diferencia > 0 ? '+' : '';

                tr.innerHTML = `
                    <td>
                        <div class="pf-table-category-cell">
                            <i class="fa-solid ${fila.icono}" style="background: ${fila.color};"></i>
                            <span>${fila.nombre}</span>
                        </div>
                    </td>
                    <td class="pf-text-right pf-text-bold">${formatoCOP.format(fila.planificado)}</td>
                    <td class="pf-text-right pf-text-bold">${formatoCOP.format(fila.ejecutado)}</td>
                    <td class="pf-text-right pf-text-bold ${difClase}">
                        ${difSigno}${formatoCOP.format(fila.diferencia)}
                    </td>
                    <td>
                        <div class="pf-progress-cell">
                            <div class="pf-table-progress-track">
                                <div class="pf-table-progress-fill" style="width: ${pctProgresoBarra}%; background: ${fillBarColor};"></div>
                            </div>
                            <small class="pf-text-muted">${fila.porcentaje.toFixed(1)}%</small>
                        </div>
                    </td>
                    <td>${badgeHtml}</td>
                `;

                tablaComparativaBody.appendChild(tr);
            });
        }

        // Footer de la tabla comparativa con totales
        if (tablaComparativaFooter) {
            const difGasto = comp.resumen.difGasto;
            const difClase = difGasto >= 0 ? 'pf-color-positive' : 'pf-color-negative';
            const difSigno = difGasto > 0 ? '+' : '';

            tablaComparativaFooter.innerHTML = `
                <tr style="background: var(--pf-bg-surface); font-weight: 700; border-top: 2px solid var(--pf-border-color);">
                    <td style="padding: 1rem 1.25rem;">TOTAL GASTOS</td>
                    <td class="pf-text-right" style="padding: 1rem 1.25rem;">${formatoCOP.format(comp.resumen.gastoPlanificado)}</td>
                    <td class="pf-text-right" style="padding: 1rem 1.25rem;">${formatoCOP.format(comp.resumen.gastoReal)}</td>
                    <td class="pf-text-right ${difClase}" style="padding: 1rem 1.25rem;">
                        ${difSigno}${formatoCOP.format(difGasto)}
                    </td>
                    <td colspan="2" style="padding: 1rem 1.25rem;">
                        <small class="pf-text-muted">
                            ${comp.resumen.gastoPlanificado > 0 ? ((comp.resumen.gastoReal / comp.resumen.gastoPlanificado) * 100).toFixed(1) : 0}% de ejecución global
                        </small>
                    </td>
                </tr>
            `;
        }
    }

    // 6. ACTUALIZACIÓN DEL PERIODO EN UI
    function actualizarPeriodoUI(nuevoPeriodo) {
        periodoActivo = nuevoPeriodo;
        if (labelPeriodo) labelPeriodo.textContent = formatearPeriodoTexto(periodoActivo);
        if (inputPeriodo) inputPeriodo.value = periodoActivo;

        cargarPlanEnFormulario(periodoActivo);
        if (tabActiva === 'comparativa') {
            renderizarComparativa(periodoActivo);
        }
    }

    actualizarPeriodoUI(periodoActivo);

    // 7. EVENT LISTENERS
    // Navegación de mes
    if (btnMesAnterior) {
        btnMesAnterior.addEventListener('click', () => {
            actualizarPeriodoUI(desplazarPeriodo(periodoActivo, -1));
        });
    }

    if (btnMesSiguiente) {
        btnMesSiguiente.addEventListener('click', () => {
            actualizarPeriodoUI(desplazarPeriodo(periodoActivo, 1));
        });
    }

    if (btnMesHoy) {
        btnMesHoy.addEventListener('click', () => {
            actualizarPeriodoUI(obtenerPeriodoActual());
        });
    }

    // Input en vivo de montos
    document.addEventListener('input', (e) => {
        if (e.target && (e.target.classList.contains('pf-input-ingreso') ||
                         e.target.classList.contains('pf-input-gasto') ||
                         e.target.id === 'pfInputMetaAhorro')) {
            actualizarCalculosEnVivo();
        }
    });

    // Pestañas
    if (tabBtnPlanificador && tabBtnComparativa) {
        tabBtnPlanificador.addEventListener('click', () => {
            tabActiva = 'planificador';
            tabBtnPlanificador.classList.add('pf-tab-active');
            tabBtnComparativa.classList.remove('pf-tab-active');
            vistaPlanificador.classList.remove('pf-hidden');
            vistaComparativa.classList.add('pf-hidden');
        });

        tabBtnComparativa.addEventListener('click', () => {
            tabActiva = 'comparativa';
            tabBtnComparativa.classList.add('pf-tab-active');
            tabBtnPlanificador.classList.remove('pf-tab-active');
            vistaComparativa.classList.remove('pf-hidden');
            vistaPlanificador.classList.add('pf-hidden');
            renderizarComparativa(periodoActivo);
        });
    }

    if (btnCrearPlanDesdeEmpty) {
        btnCrearPlanDesdeEmpty.addEventListener('click', () => {
            if (tabBtnPlanificador) tabBtnPlanificador.click();
        });
    }

    // 8. ACCIONES DEL PLANIFICADOR
    // Guardar plan
    if (btnGuardarPlan) {
        btnGuardarPlan.addEventListener('click', async () => {
            const plan = recolectarDatosPlan();
            const resumen = calcularResumenPlan(plan);

            if (resumen.estadoSaldo === 'deficit') {
                const result = await Swal.fire({
                    title: '¿Guardar con déficit?',
                    html: `El total asignado y meta de ahorro superan tus ingresos en <strong>${formatoCOP.format(Math.abs(resumen.saldoPorAsignar))}</strong>. ¿Deseas guardar este plan de todas formas?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, guardar',
                    cancelButtonText: 'Revisar montos',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981',
                    cancelButtonColor: '#64748b'
                });

                if (!result.isConfirmed) return;
            }

            guardarPlan(periodoActivo, plan);

            Swal.fire({
                title: '¡Plan guardado!',
                text: `El plan para ${formatearPeriodoTexto(periodoActivo)} ha sido actualizado correctamente.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#10b981'
            });

            actualizarCalculosEnVivo();
        });
    }

    // Copiar mes anterior
    if (btnCopiarMesAnterior) {
        btnCopiarMesAnterior.addEventListener('click', async () => {
            const periodoPrevio = desplazarPeriodo(periodoActivo, -1);
            const planPrevio = obtenerPlanUsuario(periodoPrevio);

            if (!planPrevio) {
                Swal.fire({
                    title: 'Sin datos previos',
                    text: `No hay ningún plan guardado para el mes anterior (${formatearPeriodoTexto(periodoPrevio)}).`,
                    icon: 'info',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
                return;
            }

            const confirmacion = await Swal.fire({
                title: '¿Copiar plan del mes anterior?',
                text: `Se sobreescribirán las asignaciones del mes actual con las de ${formatearPeriodoTexto(periodoPrevio)}.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, copiar',
                cancelButtonText: 'Cancelar',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#64748b'
            });

            if (confirmacion.isConfirmed) {
                copiarPlanMesAnterior(periodoActivo);
                cargarPlanEnFormulario(periodoActivo);

                Swal.fire({
                    title: '¡Plan copiado!',
                    text: `Se importó la planificación de ${formatearPeriodoTexto(periodoPrevio)}.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
            }
        });
    }

    // Importar desde Presupuestos
    if (btnImportarPresupuesto) {
        btnImportarPresupuesto.addEventListener('click', async () => {
            const { hayDatos, plan } = importarDesdePresupuesto(periodoActivo);

            if (!hayDatos) {
                Swal.fire({
                    title: 'Sin registros en Presupuestos',
                    text: `No se encontraron ingresos ni gastos registrados en el módulo de Presupuestos para ${formatearPeriodoTexto(periodoActivo)}.`,
                    icon: 'info',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
                return;
            }

            const confirmacion = await Swal.fire({
                title: '¿Importar desde Presupuestos?',
                text: `Se precargarán los montos registrados en el módulo de Presupuestos para ${formatearPeriodoTexto(periodoActivo)}.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, importar',
                cancelButtonText: 'Cancelar',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#64748b'
            });

            if (confirmacion.isConfirmed) {
                guardarPlan(periodoActivo, plan);
                cargarPlanEnFormulario(periodoActivo);

                Swal.fire({
                    title: '¡Importación exitosa!',
                    text: 'Los montos fueron precargados según tus registros de presupuesto.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
            }
        });
    }

    // Limpiar plan
    if (btnLimpiarPlan) {
        btnLimpiarPlan.addEventListener('click', async () => {
            const confirmacion = await Swal.fire({
                title: '¿Limpiar este plan?',
                text: `Se restablecerán a cero todos los campos del plan para ${formatearPeriodoTexto(periodoActivo)}.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, limpiar',
                cancelButtonText: 'Cancelar',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b'
            });

            if (confirmacion.isConfirmed) {
                limpiarPlan(periodoActivo);
                cargarPlanEnFormulario(periodoActivo);

                Swal.fire({
                    title: 'Plan limpiado',
                    text: 'Todos los campos han sido restablecidos.',
                    icon: 'info',
                    timer: 1800,
                    showConfirmButton: false,
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
            }
        });
    }
}
