// Vanilla/Dashboard.js
import { obtenerCuentas } from './cuentasService.js';
import { obtenerMovimientos } from './movimientosService.js';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' });

export async function initDashboardView() {
    await cargarResumenSaldos();
    await cargarUltimosMovimientos();
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
                <div class="dash-account-item">
                    <div class="dash-account-info">
                        <div class="dash-account-icon">
                            <i class="fa-solid ${c.tipo === 'TARJETA_CREDITO' ? 'fa-credit-card' : 'fa-building-columns'}"></i>
                        </div>
                        <div class="dash-account-details">
                            <strong>${tipoTexto}</strong>
                            <span>•••• ${numLimpio}</span>
                        </div>
                    </div>
                    <strong class="dash-account-balance">${formatoCOP.format(saldoVal)}</strong>
                </div>
            `;
        }).join('');

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