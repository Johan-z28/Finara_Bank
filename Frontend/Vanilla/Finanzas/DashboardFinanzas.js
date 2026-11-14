// Frontend/Vanilla/Finanzas/DashboardFinanzas.js
// Controlador de vista para el Dashboard General de Finanzas de Finara Bank

import { 
    calcularResumenPresupuesto, 
    obtenerPeriodoActual, 
    formatoCOP 
} from './presupuestoService.js';

import { calcularAvanceFondo } from './FondoEmergenciaService.js';
import { calcularResumenEndeudamiento } from './gestionDeudasService.js';
import { obtenerMetricasGenerales } from './suscripcionesGastosService.js';

export async function initDashboardFinanzasView() {
    // 1. Referencias a elementos clave del DOM en el Dashboard
    const dashIngresosTotal = document.getElementById('dashIngresosTotal');
    const dashGastosTotal = document.getElementById('dashGastosTotal');
    const dashSaldoNeto = document.getElementById('dashSaldoNeto');
    const dashEstadoBalance = document.getElementById('dashEstadoBalance');

    const dashFondoProgresoBar = document.getElementById('dashFondoProgresoBar');
    const dashFondoPorcentaje = document.getElementById('dashFondoPorcentaje');
    const dashFondoSaldoActual = document.getElementById('dashFondoSaldoActual');
    const dashFondoMeta = document.getElementById('dashFondoMeta');

    const dashDeudaTotal = document.getElementById('dashDeudaTotal');
    const dashDeudaCuota = document.getElementById('dashDeudaCuota');
    const dashDeudaBadge = document.getElementById('dashDeudaBadge');

    const dashSuscripcionesTotal = document.getElementById('dashSuscripcionesTotal');
    const dashSuscripcionesMonto = document.getElementById('dashSuscripcionesMonto');
    const dashPagosPendientesCount = document.getElementById('dashPagosPendientesCount');

    // Referencias a las barras del gráfico de flujo
    const barIngresosFill = document.getElementById('barIngresosFill');
    const barGastosFill = document.getElementById('barGastosFill');
    const barBalanceFill = document.getElementById('barBalanceFill');

    // 2. Cargar y procesar datos de los diferentes servicios financieros
    try {
        // A. Resumen de Presupuesto (Periodo Actual)
        const periodoActual = obtenerPeriodoActual();
        const resumenPresupuesto = calcularResumenPresupuesto(periodoActual);

        if (dashIngresosTotal) dashIngresosTotal.textContent = formatoCOP.format(resumenPresupuesto.totalIngresos);
        if (dashGastosTotal) dashGastosTotal.textContent = formatoCOP.format(resumenPresupuesto.totalGastos);
        
        if (dashSaldoNeto) {
            dashSaldoNeto.textContent = formatoCOP.format(resumenPresupuesto.saldoNeto);
            if (resumenPresupuesto.esDeficit) {
                dashSaldoNeto.style.color = '#f87171';
                if (dashEstadoBalance) dashEstadoBalance.textContent = 'Déficit este mes';
            } else if (resumenPresupuesto.esSuperavit) {
                dashSaldoNeto.style.color = '#34d399';
                if (dashEstadoBalance) dashEstadoBalance.textContent = 'Superávit saludable';
            } else {
                dashSaldoNeto.style.color = '#94a3b8';
                if (dashEstadoBalance) dashEstadoBalance.textContent = 'Equilibrio exacto';
            }
        }

        // Calcular alturas relativas para el gráfico de barras estadístico
        const maxVal = Math.max(resumenPresupuesto.totalIngresos, resumenPresupuesto.totalGastos, Math.abs(resumenPresupuesto.saldoNeto), 1);
        if (barIngresosFill) barIngresosFill.style.height = `${Math.min(100, Math.round((resumenPresupuesto.totalIngresos / maxVal) * 100))}%`;
        if (barGastosFill) barGastosFill.style.height = `${Math.min(100, Math.round((resumenPresupuesto.totalGastos / maxVal) * 100))}%`;
        if (barBalanceFill) barBalanceFill.style.height = `${Math.min(100, Math.round((Math.abs(resumenPresupuesto.saldoNeto) / maxVal) * 100))}%`;

        // B. Fondo de Emergencia
        const avanceFondo = await calcularAvanceFondo();
        if (dashFondoSaldoActual) dashFondoSaldoActual.textContent = formatoCOP.format(avanceFondo.saldoActual);
        if (dashFondoMeta) dashFondoMeta.textContent = formatoCOP.format(avanceFondo.meta);
        if (dashFondoPorcentaje) dashFondoPorcentaje.textContent = `${avanceFondo.porcentajeReal}%`;
        if (dashFondoProgresoBar) {
            dashFondoProgresoBar.style.width = `${Math.min(100, avanceFondo.porcentajeAvance)}%`;
        }

        // C. Gestión de Deudas y Endeudamiento
        const resumenDeudas = calcularResumenEndeudamiento();
        if (dashDeudaTotal) dashDeudaTotal.textContent = formatoCOP.format(resumenDeudas.deudaTotal);
        if (dashDeudaCuota) dashDeudaCuota.textContent = `${formatoCOP.format(resumenDeudas.cuotaTotal)} / mes`;
        if (dashDeudaBadge && resumenDeudas.clasificacion) {
            dashDeudaBadge.textContent = resumenDeudas.clasificacion.badge;
            dashDeudaBadge.style.color = resumenDeudas.clasificacion.color;
            dashDeudaBadge.style.background = `${resumenDeudas.clasificacion.color}15`;
        }

        // D. Suscripciones y Pagos
        const metricasSuscripciones = obtenerMetricasGenerales();
        if (dashSuscripcionesTotal) dashSuscripcionesTotal.textContent = `${metricasSuscripciones.totalSuscripcionesActivas} activas`;
        if (dashSuscripcionesMonto) dashSuscripcionesMonto.textContent = `${formatoCOP.format(metricasSuscripciones.gastoFijoMensual)} / mes`;
        if (dashPagosPendientesCount) {
            dashPagosPendientesCount.textContent = `${metricasSuscripciones.cantidadVencidos} vencidos · ${metricasSuscripciones.cantidadProximos} próximos`;
        }

    } catch (e) {
        console.error('Error al inicializar las métricas del Dashboard de Finanzas:', e);
    }
}