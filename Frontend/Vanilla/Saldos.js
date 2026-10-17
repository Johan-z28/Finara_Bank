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
        // Búsqueda flexible de cuentas compatibles con variaciones de nombres
        const ahorros = cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('AHORRO') || t.includes('DEBITO') || t.includes('DÉBITO');
        }) || { saldo: 0 };

        const corriente = cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('CORRIENTE');
        }) || { saldo: 0 };

        const credito = cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('CREDITO') || t.includes('CRÉDITO');
        }) || null;

        const limpiarSaldo = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const num = Number(String(val).replace(/[^0-9.-]+/g, ""));
            return isNaN(num) ? 0 : num;
        };

        const saldoAhorros = limpiarSaldo(ahorros.saldo);
        const saldoCorriente = limpiarSaldo(corriente.saldo);
        const cupoCredito = credito ? limpiarSaldo(credito.saldo) : 0;
        
        // Suma real combinada de los saldos activos
        const total = saldoAhorros + saldoCorriente;

        const elAhorrosTotal = document.getElementById('montoAhorrosTotal');
        const elCorrienteTotal = document.getElementById('montoCorrienteTotal');
        const elCreditoTotal = document.getElementById('montoCreditoTotal');
        const elSaldoConsolidado = document.getElementById('saldoTotalConsolidado');
        const elPorcentajeAhorros = document.getElementById('porcentajeAhorros');
        const elPorcentajeCorriente = document.getElementById('porcentajeCorriente');
        const segAhorros = document.getElementById('segAhorros');
        const segCorriente = document.getElementById('segCorriente');

        if (ocultar) {
            if (elAhorrosTotal) elAhorrosTotal.textContent = '$ ••••••';
            if (elCorrienteTotal) elCorrienteTotal.textContent = '$ ••••••';
            if (elCreditoTotal) elCreditoTotal.textContent = '$ ••••••';
            if (elSaldoConsolidado) elSaldoConsolidado.textContent = '$ ••••••';
        } else {
            if (elAhorrosTotal) elAhorrosTotal.textContent = formatoCOP.format(saldoAhorros);
            if (elCorrienteTotal) elCorrienteTotal.textContent = formatoCOP.format(saldoCorriente);
            if (elCreditoTotal) elCreditoTotal.textContent = formatoCOP.format(cupoCredito);
            if (elSaldoConsolidado) elSaldoConsolidado.textContent = formatoCOP.format(total);
        }

        const tieneAhorros = saldoAhorros > 0 || Boolean(cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('AHORRO') || t.includes('DEBITO');
        }));
        
        const tieneCorriente = saldoCorriente > 0 || Boolean(cuentas.find(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('CORRIENTE');
        }));

        const itemLeyendaAhorros = document.getElementById('itemLeyendaAhorros');
        const itemLeyendaCorriente = document.getElementById('itemLeyendaCorriente');

        if (itemLeyendaAhorros) itemLeyendaAhorros.classList.toggle('hidden', !tieneAhorros);
        if (itemLeyendaCorriente) itemLeyendaCorriente.classList.toggle('hidden', !tieneCorriente);

        // Cálculo de porcentajes con ajuste visual para diferencias extremas
        let pctAhorros = 0;
        let pctCorriente = 0;

        if (total > 0) {
            pctAhorros = Math.round((saldoAhorros / total) * 100);
            pctCorriente = 100 - pctAhorros;

            if (saldoCorriente > 0 && pctCorriente === 0) {
                pctCorriente = 1;
                pctAhorros = 99;
            }
        } else if (tieneAhorros) {
            pctAhorros = 100;
        }

        if (elPorcentajeAhorros) elPorcentajeAhorros.textContent = `${pctAhorros}%`;
        if (elPorcentajeCorriente) elPorcentajeCorriente.textContent = `${pctCorriente}%`;

        if (segAhorros) {
            segAhorros.style.width = `${pctAhorros}%`;
            segAhorros.classList.toggle('hidden', !tieneAhorros);
        }
        if (segCorriente) {
            segCorriente.style.width = `${pctCorriente}%`;
            segCorriente.classList.toggle('hidden', !tieneCorriente);
        }
    };

    const pintarCuentas = () => {
        const nodos = cuentas.map(c => {
            try {
                return crearCuentaCard(c, { ocultarSaldo: ocultar });
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
        }
    });

    pintarOjo();
    await cargar();
}