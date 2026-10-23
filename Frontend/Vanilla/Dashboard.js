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
    const contTarjetasFisicas = document.getElementById('dashTarjetasFisicas');

    if (!contCuentas) return;

    try {
        const cuentas = await obtenerCuentas();
        const activas = (cuentas || []).filter(c => c && c.estado !== 'INACTIVA');

        // Calcular saldo consolidado excluyendo tarjetas de crédito para fondos líquidos
        const saldoConsolidado = activas.reduce((acc, c) => {
            if (c.tipo === 'TARJETA_CREDITO') return acc;
            const num = typeof c.saldo === 'number' ? c.saldo : Number(String(c.saldo || 0).replace(/[^0-9.-]+/g, ""));
            return acc + (isNaN(num) ? 0 : num);
        }, 0);

        if (elSaldoTotal) elSaldoTotal.textContent = formatoCOP.format(saldoConsolidado);
        if (elTotalProductos) elTotalProductos.textContent = activas.length;

        // 1. RENDERIZAR MINIATURAS DE TARJETAS FÍSICAS EN EL DASHBOARD
        if (contTarjetasFisicas) {
            if (activas.length === 0) {
                contTarjetasFisicas.removeAttribute('data-count');
                contTarjetasFisicas.innerHTML = `
                    <div class="dash-empty-card" data-view="solicitarproductos">
                        <i class="fa-solid fa-plus-circle"></i>
                        <span>Solicitar mi primera tarjeta Finara</span>
                    </div>
                `;
            } else {
                // Orden idéntico a Saldos: Crédito siempre al final (extremo derecho), Débito y Corriente a su izquierda
                const cuentasOrdenadas = [...activas].sort((a, b) => {
                    const esCreditoA = a.tipo === 'TARJETA_CREDITO';
                    const esCreditoB = b.tipo === 'TARJETA_CREDITO';
                    if (esCreditoA && !esCreditoB) return 1;
                    if (!esCreditoA && esCreditoB) return -1;
                    const ordenTipos = { AHORROS: 1, CORRIENTE: 2 };
                    return (ordenTipos[a.tipo] || 99) - (ordenTipos[b.tipo] || 99);
                });

                contTarjetasFisicas.setAttribute('data-count', String(cuentasOrdenadas.length));

                contTarjetasFisicas.innerHTML = cuentasOrdenadas.map(c => {
                    const numLimpio = String(c.numero || '').replace(/\D/g, '').slice(-4);
                    let claseColor = 'mini-card--gold';
                    let tagTexto = 'Débito';
                    let logo = '../Style/image/Logo_finara_black.svg';

                    if (c.tipo === 'CORRIENTE') {
                        claseColor = 'mini-card--platinum';
                        tagTexto = 'Corriente';
                    } else if (c.tipo === 'TARJETA_CREDITO') {
                        claseColor = 'mini-card--black';
                        tagTexto = 'Crédito';
                        logo = '../Style/image/Logo_finara.svg';
                    }

                    const saldoVal = typeof c.saldo === 'number' ? c.saldo : Number(String(c.saldo || 0).replace(/[^0-9.-]+/g, ""));

                    return `
                        <div class="dash-mini-card ${claseColor}">
                            <div class="mini-card-head">
                                <img src="${logo}" alt="Logo Finara" class="mini-card-logo">
                                <span class="mini-card-tag">${tagTexto}</span>
                            </div>
                            <div class="mini-card-chip"></div>
                            <div class="mini-card-body">
                                <span class="mini-card-number">•••• •••• •••• ${numLimpio}</span>
                                <strong class="mini-card-amount">${formatoCOP.format(saldoVal)}</strong>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 2. RENDERIZAR LISTA DE PRODUCTOS
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
        const res = await obtenerMovimientos({ periodo: 'todo', tamano: 5, pagina: 1 });
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


