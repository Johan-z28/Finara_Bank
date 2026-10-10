import { initGlobalComponents } from './Global/app.js';
import { obtenerCuentas, SesionExpiradaError } from './cuentasService.js';
import { crearCuentaCard } from './CuentaCard.js';

const CLAVE_PRIVACIDAD = 'saldosOcultos';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa componentes globales (menú, perfil, etc.)
    initGlobalComponents();

    const lista = document.getElementById('cuentasLista');
    const estado = document.getElementById('cuentasEstado');
    const btnOjo = document.getElementById('toggleSaldos');
    let ocultar = localStorage.getItem(CLAVE_PRIVACIDAD) === 'true';
    let cuentas = [];

    const pintarOjo = () => {
        btnOjo.querySelector('i').className = ocultar ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        btnOjo.setAttribute('aria-pressed', String(ocultar));
        btnOjo.setAttribute('aria-label', ocultar ? 'Mostrar saldos' : 'Ocultar saldos');
    };

    const mostrarEstado = (mensaje, { reintentar = false } = {}) => {
        estado.replaceChildren();
        const p = document.createElement('p');
        p.textContent = mensaje;
        estado.appendChild(p);
        if (reintentar) {
            const b = document.createElement('button');
            b.className = 'btn-reintentar';
            b.textContent = 'Reintentar';
            b.addEventListener('click', cargar);
            estado.appendChild(b);
        }
        estado.classList.remove('hidden');
    };

    const formatoCOP = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
    });

    const actualizarAnalitica = () => {
        const ahorros = cuentas.find(c => c.tipo === 'AHORROS') || { saldo: 0 };
        const corriente = cuentas.find(c => c.tipo === 'CORRIENTE') || { saldo: 0 };
        const saldoAhorros = Number(ahorros.saldo) || 0;
        const saldoCorriente = Number(corriente.saldo) || 0;
        const total = saldoAhorros + saldoCorriente;

        const elAhorrosTotal = document.getElementById('montoAhorrosTotal');
        const elCorrienteTotal = document.getElementById('montoCorrienteTotal');
        const elSaldoConsolidado = document.getElementById('saldoTotalConsolidado');
        const elPorcentajeAhorros = document.getElementById('porcentajeAhorros');
        const elPorcentajeCorriente = document.getElementById('porcentajeCorriente');
        const segAhorros = document.getElementById('segAhorros');
        const segCorriente = document.getElementById('segCorriente');

        if (ocultar) {
            if (elAhorrosTotal) elAhorrosTotal.textContent = '$ ••••••';
            if (elCorrienteTotal) elCorrienteTotal.textContent = '$ ••••••';
            if (elSaldoConsolidado) elSaldoConsolidado.textContent = '$ ••••••';
        } else {
            if (elAhorrosTotal) elAhorrosTotal.textContent = formatoCOP.format(saldoAhorros);
            if (elCorrienteTotal) elCorrienteTotal.textContent = formatoCOP.format(saldoCorriente);
            if (elSaldoConsolidado) elSaldoConsolidado.textContent = formatoCOP.format(total);
        }

        const pctAhorros = total > 0 ? Math.round((saldoAhorros / total) * 100) : 50;
        const pctCorriente = total > 0 ? 100 - pctAhorros : 50;

        if (elPorcentajeAhorros) elPorcentajeAhorros.textContent = `${pctAhorros}%`;
        if (elPorcentajeCorriente) elPorcentajeCorriente.textContent = `${pctCorriente}%`;
        if (segAhorros) segAhorros.style.width = `${pctAhorros}%`;
        if (segCorriente) segCorriente.style.width = `${pctCorriente}%`;
    };

    const pintarCuentas = () => {
        lista.replaceChildren(...cuentas.map(c => crearCuentaCard(c, { ocultarSaldo: ocultar })));
        actualizarAnalitica();
    };

    async function cargar() {
        estado.classList.add('hidden');
        lista.setAttribute('aria-busy', 'true');
        lista.replaceChildren(...Array.from({ length: 3 }, () => {
            const s = document.createElement('div');
            s.className = 'cuenta-card cuenta-card--skeleton';
            return s;
        }));

        try {
            cuentas = await obtenerCuentas();
            if (!cuentas.length) {
                lista.replaceChildren();
                mostrarEstado('Aún no tienes cuentas asociadas.');
            } else {
                pintarCuentas();
            }
        } catch (err) {
            lista.replaceChildren();
            if (err instanceof SesionExpiradaError) {
                window.location.href = '../index.html';
                return;
            }
            mostrarEstado('No pudimos cargar tus cuentas. Intenta de nuevo.', { reintentar: true });
        } finally {
            lista.setAttribute('aria-busy', 'false');
        }
    }

    btnOjo.addEventListener('click', () => {
        ocultar = !ocultar;
        localStorage.setItem(CLAVE_PRIVACIDAD, String(ocultar));
        pintarOjo();
        pintarCuentas();
    });

    pintarOjo();
    cargar();
});