// Vanilla/Seguimiento.js
// Controlador para HU-31: Seguimiento financiero (#42)
// Renderiza el dashboard histórico interactivo con Chart.js y gestiona el filtrado por periodos pasados.

import { initGlobalComponents } from './Global/app.js';
import {
    formatoCOP,
    obtenerEvolucionFinanciera
} from './seguimientoFinancieroService.js';

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();

    // Elementos KPI
    const kpiTotalIngresos = document.getElementById('kpiTotalIngresos');
    const kpiPromedioIngresos = document.getElementById('kpiPromedioIngresos');
    const kpiTotalGastos = document.getElementById('kpiTotalGastos');
    const kpiPromedioGastos = document.getElementById('kpiPromedioGastos');
    const kpiTotalAhorro = document.getElementById('kpiTotalAhorro');
    const kpiPromedioAhorro = document.getElementById('kpiPromedioAhorro');
    const kpiTasaAhorro = document.getElementById('kpiTasaAhorro');
    const kpiEstadoSaludBadge = document.getElementById('kpiEstadoSaludBadge');

    // Elementos Comparativa
    const varIngresosTexto = document.getElementById('varIngresosTexto');
    const varIngresosIcono = document.getElementById('varIngresosIcono');
    const varGastosTexto = document.getElementById('varGastosTexto');
    const varGastosIcono = document.getElementById('varGastosIcono');
    const varAhorroTexto = document.getElementById('varAhorroTexto');
    const varAhorroIcono = document.getElementById('varAhorroIcono');
    const diagnosticoTexto = document.getElementById('diagnosticoTexto');
    const comparativaSubtitulo = document.getElementById('comparativaSubtitulo');

    // Tabla
    const tbodyDetalleHistorico = document.getElementById('tbodyDetalleHistorico');

    // Filtros
    const selectorFiltrosPeriodo = document.getElementById('selectorFiltrosPeriodo');

    // Instancias de Chart.js
    let chartEvolucion = null;
    let chartTasa = null;
    let chartDistribucion = null;

    let periodoActual = '6m';

    // Inicializar o refrescar gráficos con Chart.js
    function renderizarGraficos(evolucion) {
        const labels = evolucion.series.map(s => s.mesCorto);
        const dataIngresos = evolucion.series.map(s => s.ingresos);
        const dataGastos = evolucion.series.map(s => s.gastos);
        const dataAhorro = evolucion.series.map(s => s.ahorro);
        const dataTasas = evolucion.series.map(s => s.tasaAhorro);

        const ctxEvolucion = document.getElementById('chartEvolucionHistorica');
        const ctxTasa = document.getElementById('chartTasaAhorro');
        const ctxDistribucion = document.getElementById('chartDistribucionPeriodo');

        // Configuración de estilo Finara Bank (Dark + Gold + Emerald)
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = 'inherit';

        // 1. Gráfico de Evolución Principal (Ingresos, Gastos, Ahorro)
        if (chartEvolucion) chartEvolucion.destroy();
        if (ctxEvolucion) {
            chartEvolucion = new Chart(ctxEvolucion, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Ingresos',
                            data: dataIngresos,
                            backgroundColor: 'rgba(52, 211, 153, 0.75)',
                            borderColor: '#34d399',
                            borderWidth: 1.5,
                            borderRadius: 6
                        },
                        {
                            label: 'Gastos',
                            data: dataGastos,
                            backgroundColor: 'rgba(248, 113, 113, 0.75)',
                            borderColor: '#f87171',
                            borderWidth: 1.5,
                            borderRadius: 6
                        },
                        {
                            label: 'Ahorro Neto',
                            data: dataAhorro,
                            type: 'line',
                            borderColor: '#e5a93c',
                            backgroundColor: 'rgba(229, 169, 60, 0.15)',
                            fill: true,
                            tension: 0.35,
                            borderWidth: 3,
                            pointBackgroundColor: '#e5a93c',
                            pointRadius: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${formatoCOP.format(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: {
                                callback: (v) => `$ ${(v / 1000000).toFixed(1)}M`
                            }
                        }
                    }
                }
            });
        }

        // 2. Gráfico de Tasa de Ahorro (%)
        if (chartTasa) chartTasa.destroy();
        if (ctxTasa) {
            chartTasa = new Chart(ctxTasa, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Tasa de Ahorro (%)',
                            data: dataTasas,
                            borderColor: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2.5,
                            pointBackgroundColor: '#38bdf8',
                            pointRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `Tasa de Ahorro: ${ctx.raw}%`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                        y: {
                            min: 0,
                            suggestedMax: 50,
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: {
                                callback: (v) => `${v}%`
                            }
                        }
                    }
                }
            });
        }

        // 3. Gráfico de Distribución del Periodo (Doughnut)
        if (chartDistribucion) chartDistribucion.destroy();
        if (ctxDistribucion) {
            chartDistribucion = new Chart(ctxDistribucion, {
                type: 'doughnut',
                data: {
                    labels: ['Gastos Totales', 'Ahorro Neto Total'],
                    datasets: [
                        {
                            data: [evolucion.totales.gastos, evolucion.totales.ahorro],
                            backgroundColor: ['rgba(248, 113, 113, 0.85)', 'rgba(229, 169, 60, 0.85)'],
                            borderColor: ['#f87171', '#e5a93c'],
                            borderWidth: 1.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12, padding: 15 }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.label}: ${formatoCOP.format(ctx.raw)}`
                            }
                        }
                    },
                    cutout: '68%'
                }
            });
        }
    }

    // Actualiza la tabla mensual detallada
    function renderizarTabla(series) {
        if (!tbodyDetalleHistorico) return;

        tbodyDetalleHistorico.innerHTML = series.map(s => {
            const esSuperavit = s.ahorro >= 0;
            return `
                <tr>
                    <td><strong>${s.etiqueta}</strong></td>
                    <td class="color-verde">${formatoCOP.format(s.ingresos)}</td>
                    <td class="color-rojo">${formatoCOP.format(s.gastos)}</td>
                    <td class="color-dorado">${formatoCOP.format(s.ahorro)}</td>
                    <td>${s.tasaAhorro}%</td>
                    <td>
                        <span class="badge-balance ${esSuperavit ? 'positivo' : 'negativo'}">
                            ${esSuperavit ? 'Superávit' : 'Déficit'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Carga los datos y actualiza toda la interfaz
    async function cargarDashboard(periodo) {
        try {
            const evolucion = await obtenerEvolucionFinanciera(periodo);

            // KPIs
            kpiTotalIngresos.textContent = formatoCOP.format(evolucion.totales.ingresos);
            kpiPromedioIngresos.textContent = `Promedio: ${formatoCOP.format(evolucion.promedios.ingresos)}/mes`;

            kpiTotalGastos.textContent = formatoCOP.format(evolucion.totales.gastos);
            kpiPromedioGastos.textContent = `Promedio: ${formatoCOP.format(evolucion.promedios.gastos)}/mes`;

            kpiTotalAhorro.textContent = formatoCOP.format(evolucion.totales.ahorro);
            kpiPromedioAhorro.textContent = `Promedio: ${formatoCOP.format(evolucion.promedios.ahorro)}/mes`;

            kpiTasaAhorro.textContent = `${evolucion.totales.tasaAhorroGlobal}%`;

            if (evolucion.estadoSalud === 'excelente') {
                kpiEstadoSaludBadge.textContent = '🌟 Salud Excelente (>30%)';
            } else if (evolucion.estadoSalud === 'alerta') {
                kpiEstadoSaludBadge.textContent = '⚠️ Tasa de Ahorro Baja (<15%)';
            } else {
                kpiEstadoSaludBadge.textContent = '✅ Salud Financiera Estable';
            }

            // Comparativa
            if (evolucion.comparativaUltimoMes) {
                const c = evolucion.comparativaUltimoMes;
                comparativaSubtitulo.textContent = `Comparando ${c.mesActual} respecto a ${c.mesPrevio}`;

                varIngresosTexto.textContent = `${c.varIngresos >= 0 ? '+' : ''}${c.varIngresos}%`;
                varIngresosIcono.className = `fa-solid ${c.varIngresos >= 0 ? 'fa-arrow-up positivo' : 'fa-arrow-down negativo'}`;

                varGastosTexto.textContent = `${c.varGastos >= 0 ? '+' : ''}${c.varGastos}%`;
                varGastosIcono.className = `fa-solid ${c.varGastos <= 0 ? 'fa-arrow-down positivo' : 'fa-arrow-up negativo'}`;

                varAhorroTexto.textContent = `${c.varAhorro >= 0 ? '+' : ''}${c.varAhorro}%`;
                varAhorroIcono.className = `fa-solid ${c.varAhorro >= 0 ? 'fa-arrow-up positivo' : 'fa-arrow-down negativo'}`;
            }

            diagnosticoTexto.textContent = evolucion.diagnostico;

            // Gráficos y Tabla
            renderizarGraficos(evolucion);
            renderizarTabla(evolucion.series);
        } catch (e) {
            console.error('Error al cargar dashboard de seguimiento financiero', e);
        }
    }

    // Listeners para botones de filtrado de periodos pasados (Criterio 2)
    selectorFiltrosPeriodo.querySelectorAll('.btn-periodo').forEach(btn => {
        btn.addEventListener('click', () => {
            selectorFiltrosPeriodo.querySelectorAll('.btn-periodo').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            periodoActual = btn.getAttribute('data-periodo');
            cargarDashboard(periodoActual);
        });
    });

    // Carga inicial (6 meses por defecto)
    await cargarDashboard(periodoActual);
});
