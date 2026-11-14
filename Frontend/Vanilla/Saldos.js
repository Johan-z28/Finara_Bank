// Vanilla/Saldos.js
import { obtenerCuentas, SesionExpiradaError } from './cuentasService.js';
import { crearCuentaCard } from './CuentaCard.js';

const CLAVE_PRIVACIDAD = 'saldosOcultos';

export async function initSaldosView() {
    const lista = document.getElementById('cuentasLista');
    const estado = document.getElementById('cuentasEstado');
    
    if (!lista) return;

    let ocultar = localStorage.getItem(CLAVE_PRIVACIDAD) === 'true';
    let cuentas = [];

    const pintarOjo = () => {
        const btnOjo = document.getElementById('toggleSaldos');
        if (!btnOjo) return;
        const icono = btnOjo.querySelector('i');
        if (icono) {
            icono.className = ocultar ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        }
        btnOjo.setAttribute('aria-pressed', String(ocultar));
        btnOjo.setAttribute('aria-label', ocultar ? 'Mostrar saldos' : 'Ocultar saldos');
    };

    const formatoCOP = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
    });

    const actualizarAnalitica = () => {
        const ahorros = cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return (t.includes('AHORRO') || t.includes('DEBITO') || t.includes('DÉBITO')) && c.estado !== 'INACTIVA';
        });

        const corriente = cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('CORRIENTE') && c.estado !== 'INACTIVA';
        });

        const credito = cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return (t.includes('CREDITO') || t.includes('CRÉDITO')) && c.estado !== 'INACTIVA';
        });

        const prestamo = cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('PRESTAMO') && c.estado !== 'INACTIVA';
        });

        const limpiarSaldo = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const num = Number(String(val).replace(/[^0-9.-]+/g, ""));
            return isNaN(num) ? 0 : num;
        };

        const saldoAhorros = ahorros ? limpiarSaldo(ahorros.saldo) : 0;
        const saldoCorriente = corriente ? limpiarSaldo(corriente.saldo) : 0;
        const cupoCredito = credito ? limpiarSaldo(credito.saldo || credito.cupoDisponible) : 0;
        
        // El patrimonio consolidado suma cuentas de efectivo (Ahorros y Corriente)
        const totalConsolidado = saldoAhorros + saldoCorriente;
        const sumaTotalLiquidez = totalConsolidado + (credito ? cupoCredito : 0);

        const elCreditoTotal = document.getElementById('montoCreditoTotal');
        const elAhorrosTotal = document.getElementById('montoAhorrosTotal');
        const elCorrienteTotal = document.getElementById('montoCorrienteTotal');
        const elSaldoConsolidado = document.getElementById('saldoTotalConsolidado');

        const elPctCredito = document.getElementById('porcentajeCredito');
        const elPctAhorros = document.getElementById('porcentajeAhorros');
        const elPctCorriente = document.getElementById('porcentajeCorriente');

        const segCredito = document.getElementById('segCredito');
        const segAhorros = document.getElementById('segAhorros');
        const segCorriente = document.getElementById('segCorriente');

        const itemCreditoLeyenda = elCreditoTotal ? elCreditoTotal.closest('.leyenda-item') : null;
        const itemAhorrosLeyenda = elAhorrosTotal ? elAhorrosTotal.closest('.leyenda-item') : null;
        const itemCorrienteLeyenda = elCorrienteTotal ? elCorrienteTotal.closest('.leyenda-item') : null;

        if (itemCreditoLeyenda) itemCreditoLeyenda.style.display = credito ? 'block' : 'none';
        if (itemAhorrosLeyenda) itemAhorrosLeyenda.style.display = ahorros ? 'block' : 'none';
        if (itemCorrienteLeyenda) itemCorrienteLeyenda.style.display = corriente ? 'block' : 'none';

        if (segCredito) segCredito.style.display = credito ? 'block' : 'none';
        if (segAhorros) segAhorros.style.display = ahorros ? 'block' : 'none';
        if (segCorriente) segCorriente.style.display = corriente ? 'block' : 'none';

        if (ocultar) {
            if (elCreditoTotal) elCreditoTotal.textContent = '$ ••••••';
            if (elAhorrosTotal) elAhorrosTotal.textContent = '$ ••••••';
            if (elCorrienteTotal) elCorrienteTotal.textContent = '$ ••••••';
            if (elSaldoConsolidado) elSaldoConsolidado.textContent = '$ ••••••';
        } else {
            if (elCreditoTotal) elCreditoTotal.textContent = formatoCOP.format(cupoCredito);
            if (elAhorrosTotal) elAhorrosTotal.textContent = formatoCOP.format(saldoAhorros);
            if (elCorrienteTotal) elCorrienteTotal.textContent = formatoCOP.format(saldoCorriente);
            if (elSaldoConsolidado) elSaldoConsolidado.textContent = formatoCOP.format(totalConsolidado);
        }

        let pctCredito = 0;
        let pctAhorros = 0;
        let pctCorriente = 0;

        if (sumaTotalLiquidez > 0) {
            if (credito) pctCredito = Math.round((cupoCredito / sumaTotalLiquidez) * 100);
            if (ahorros) pctAhorros = Math.round((saldoAhorros / sumaTotalLiquidez) * 100);
            
            const activosCount = [credito, ahorros, corriente].filter(Boolean).length;
            if (activosCount === 1) {
                if (credito) pctCredito = 100;
                if (ahorros) pctAhorros = 100;
                if (corriente) pctCorriente = 100;
            } else {
                pctCorriente = Math.max(0, 100 - (pctCredito + pctAhorros));
            }
        }

        if (elPctCredito) elPctCredito.textContent = `${pctCredito}%`;
        if (elPctAhorros) elPctAhorros.textContent = `${pctAhorros}%`;
        if (elPctCorriente) elPctCorriente.textContent = `${pctCorriente}%`;

        if (segCredito) segCredito.style.width = `${pctCredito}%`;
        if (segAhorros) segAhorros.style.width = `${pctAhorros}%`;
        if (segCorriente) segCorriente.style.width = `${pctCorriente}%`;
    };

    const pintarCuentas = () => {
        const nodos = cuentas.map(c => {
            try {
                return crearCuentaCard(c, { 
                    ocultarSaldo: ocultar,
                    onEstadoCambiado: cargar
                });
            } catch (err) {
                return null;
            }
        }).filter(Boolean);

        lista.replaceChildren(...nodos);
        actualizarAnalitica();
    };

    async function cargar() {
        if (estado) estado.classList.add('hidden');
        lista.setAttribute('aria-busy', 'true');

        try {
            cuentas = await obtenerCuentas();
            pintarCuentas();
        } catch (err) {
            lista.replaceChildren();
            if (err instanceof SesionExpiradaError) {
                window.location.href = '../index.html';
                return;
            }
        } finally {
            lista.setAttribute('aria-busy', 'false');
        }
    }

    document.addEventListener('click', (e) => {
        const btnToggle = e.target.closest('#toggleSaldos');
        if (btnToggle) {
            e.preventDefault();
            ocultar = !ocultar;
            localStorage.setItem(CLAVE_PRIVACIDAD, String(ocultar));
            pintarOjo();
            pintarCuentas();
            return;
        }
    });

    pintarOjo();
    await cargar();
}