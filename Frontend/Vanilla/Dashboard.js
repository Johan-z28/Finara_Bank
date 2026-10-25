// Vanilla/Dashboard.js
import { obtenerCuentas } from './cuentasService.js';
import { obtenerMovimientos } from './movimientosService.js';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });

export async function initDashboardView() {
    await cargarResumenSaldos();
    await cargarUltimosMovimientos();
    await cargarMiniChart();
}

async function cargarResumenSaldos() {
    const elSaldoTotal = document.getElementById('dashSaldoTotal');
    const elTotalProductos = document.getElementById('dashTotalProductos');
    const contCuentas = document.getElementById('dashListaCuentas');

    if (!contCuentas) return;

    try {
        const cuentas = await obtenerCuentas();
        const activas = (cuentas || []).filter(c => c && c.estado !== 'INACTIVA');

        const saldoConsolidado = activas.reduce((acc, c) => {
            const num = typeof c.saldo === 'number' ? c.saldo : Number(String(c.saldo || 0).replace(/[^0-9.-]+/g, ""));
            return acc + (isNaN(num) ? 0 : num);
        }, 0);

        if (elSaldoTotal) elSaldoTotal.textContent = formatoCOP.format(saldoConsolidado);
        if (elTotalProductos) elTotalProductos.textContent = activas.length;

        if (activas.length === 0) {
            contCuentas.innerHTML = `<p class="dash-empty">No tienes productos activos actualmente.</p>`;
            return;
        }

        contCuentas.innerHTML = activas.map(c => {
            const numLimpio = String(c.numero || '').replace(/\D/g, '').slice(-4);
            const saldoVal = typeof c.saldo === 'number' ? c.saldo : Number(String(c.saldo || 0).replace(/[^0-9.-]+/g, ""));
            const tipoTexto = c.tipo === 'CORRIENTE' ? 'Cuenta Corriente' : (c.tipo === 'TARJETA_CREDITO' ? 'Tarjeta de Crédito' : 'Cuenta de Ahorros');

            return `
                <div class="dash-account-item" data-cuenta-id="${c.id || c.numero}">
                    <div class="dash-account-info">
                        <div class="dash-account-icon">
                            <i class="fa-solid ${c.tipo === 'TARJETA_CREDITO' ? 'fa-credit-card' : 'fa-building-columns'}"></i>
                        </div>
                        <div class="dash-account-details">
                            <strong>${tipoTexto}</strong>
                            <span>•••• ${numLimpio} · Click para detalles</span>
                        </div>
                    </div>
                    <strong class="dash-account-balance">${formatoCOP.format(saldoVal)}</strong>
                </div>
            `;
        }).join('');

        // Acceso rápido a Tarjeta Interactiva (al hacer click muestra popup con detalles)
        contCuentas.querySelectorAll('.dash-account-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.cuentaId;
                const cuenta = activas.find(acc => String(acc.id || acc.numero) === String(id));
                if (cuenta && window.Swal) {
                    const tipoTexto = cuenta.tipo === 'CORRIENTE' ? 'Cuenta Corriente' : (cuenta.tipo === 'TARJETA_CREDITO' ? 'Tarjeta de Crédito' : 'Cuenta de Ahorros');
                    Swal.fire({
                        title: `Detalle de ${tipoTexto}`,
                        html: `
                            <div style="text-align: left; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; font-size: 0.9rem; color: #cbd5e1;">
                                <p style="margin: 6px 0;"><strong>Número:</strong> •••• ${String(cuenta.numero).slice(-4)}</p>
                                <p style="margin: 6px 0;"><strong>Estado:</strong> <span style="color: #34d399;">Activa y Segura</span></p>
                                <p style="margin: 6px 0;"><strong>Saldo Actual:</strong> <span style="color: #e5a93c; font-weight: bold;">${formatoCOP.format(cuenta.saldo || 0)}</span></p>
                            </div>
                        `,
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: 'Entendido'
                    });
                }
            });
        });

    } catch (err) {
        console.error("Error cargando dashboard:", err);
    }
}

async function cargarUltimosMovimientos() {
    const contMovs = document.getElementById('dashListaMovimientos');
    if (!contMovs) return;

    try {
        const res = await obtenerMovimientos({ periodo: '30d', tamano: 4, pagina: 1 });
        const items = res.items || [];

        if (items.length === 0) {
            contMovs.innerHTML = `<p class="dash-empty">Sin transacciones recientes.</p>`;
            return;
        }

        contMovs.innerHTML = items.map(m => {
            const esIngreso = m.tipo === 'INGRESO';
            const f = new Date(m.fecha);
            const fechaStr = !isNaN(f.getTime()) ? formatoFecha.format(f) : 'Hoy';

            return `
                <div class="dash-mov-item">
                    <div class="dash-mov-info">
                        <i class="fa-solid ${esIngreso ? 'fa-arrow-down' : 'fa-arrow-up'} dash-mov-icon dash-mov-icon--${esIngreso ? 'ingreso' : 'egreso'}"></i>
                        <div class="dash-mov-desc">
                            <strong>${m.descripcion || 'Transacción'}</strong>
                            <small>${fechaStr}</small>
                        </div>
                    </div>
                    <strong class="dash-mov-value dash-mov-value--${esIngreso ? 'ingreso' : 'egreso'}">
                        ${esIngreso ? '+' : '−'} ${formatoCOP.format(Number(m.valor) || 0)}
                    </strong>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error al cargar movimientos en el dashboard:", err);
    }
}

async function cargarMiniChart() {
    const contenedorChart = document.getElementById('dashChartBars');
    if (!contenedorChart) return;

    try {
        // Obtenemos los movimientos reales directamente del almacenamiento local
        const movimientosLocales = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
        
        // Agrupar los movimientos reales por día de la semana o mostrar un estado vacío si no hay
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const conteoDias = { 'Dom': { ingresos: 0, egresos: 0 }, 'Lun': { ingresos: 0, egresos: 0 }, 'Mar': { ingresos: 0, egresos: 0 }, 'Mié': { ingresos: 0, egresos: 0 }, 'Jue': { ingresos: 0, egresos: 0 }, 'Vie': { ingresos: 0, egresos: 0 }, 'Sáb': { ingresos: 0, egresos: 0 } };

        movimientosLocales.forEach(m => {
            const f = new Date(m.fecha);
            if (!isNaN(f.getTime())) {
                const nombreDia = dias[f.getDay()];
                const val = Number(m.valor) || 0;
                if (m.tipo === 'INGRESO') {
                    conteoDias[nombreDia].ingresos += val;
                } else {
                    conteoDias[nombreDia].egresos += val;
                }
            }
        });

        const diasOrdenados = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        contenedorChart.innerHTML = diasOrdenados.map(dia => {
            const datos = conteoDias[dia];
            // Alturas proporcionales basadas en los valores reales (con un tope mínimo para estética)
            const maxVal = Math.max(...Object.values(conteoDias).map(d => Math.max(d.ingresos, d.egresos)), 1);
            const alturaIngreso = Math.max(8, Math.min(100, Math.round((datos.ingresos / maxVal) * 90)));
            const alturaEgreso = Math.max(8, Math.min(100, Math.round((datos.egresos / maxVal) * 90)));

            return `
                <div class="dash-chart-bar-group" title="${dia}: Ingresos (${formatoCOP.format(datos.ingresos)}) / Egresos (${formatoCOP.format(datos.egresos)})">
                    <div style="display: flex; gap: 3px; align-items: flex-end; height: 80px; width: 100%; justify-content: center;">
                        <div class="dash-bar-fill" style="height: ${alturaIngreso}%;" title="Ingresos: ${formatoCOP.format(datos.ingresos)}"></div>
                        <div class="dash-bar-fill dash-bar-fill--egreso" style="height: ${alturaEgreso}%;" title="Egresos: ${formatoCOP.format(datos.egresos)}"></div>
                    </div>
                    <span class="dash-chart-label">${dia}</span>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error cargando mini chart con datos reales:", err);
    }
}