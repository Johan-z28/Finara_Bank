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
        const credito = cuentas.find(c => c.tipo === 'TARJETA_CREDITO') || null;

        const saldoAhorros = Number(ahorros.saldo) || 0;
        const saldoCorriente = Number(corriente.saldo) || 0;
        const cupoCredito = credito ? (Number(credito.saldo) || 0) : 0;
        const total = saldoAhorros + saldoCorriente;

        const elAhorrosTotal = document.getElementById('montoAhorrosTotal');
        const elCorrienteTotal = document.getElementById('montoCorrienteTotal');
        const elCreditoTotal = document.getElementById('montoCreditoTotal');
        const elSaldoConsolidado = document.getElementById('saldoTotalConsolidado');
        const elPorcentajeAhorros = document.getElementById('porcentajeAhorros');
        const elPorcentajeCorriente = document.getElementById('porcentajeCorriente');
        const elPorcentajeCredito = document.getElementById('porcentajeCredito');
        const segAhorros = document.getElementById('segAhorros');
        const segCorriente = document.getElementById('segCorriente');
        const segCredito = document.getElementById('segCredito');
        const itemLeyendaCredito = document.getElementById('itemLeyendaCredito');

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

        const tieneAhorros = Boolean(cuentas.find(c => c.tipo === 'AHORROS'));
        const tieneCorriente = Boolean(cuentas.find(c => c.tipo === 'CORRIENTE'));
        const itemLeyendaAhorros = document.getElementById('itemLeyendaAhorros');
        const itemLeyendaCorriente = document.getElementById('itemLeyendaCorriente');

        if (itemLeyendaAhorros) {
            if (tieneAhorros) itemLeyendaAhorros.classList.remove('hidden');
            else itemLeyendaAhorros.classList.add('hidden');
        }
        if (itemLeyendaCorriente) {
            if (tieneCorriente) itemLeyendaCorriente.classList.remove('hidden');
            else itemLeyendaCorriente.classList.add('hidden');
        }

        // Si existe tarjeta de crédito aprobada, mostrar su indicador en la analítica
        if (credito && itemLeyendaCredito) {
            itemLeyendaCredito.classList.remove('hidden');
            if (segCredito) segCredito.classList.remove('hidden');

            const totalConCredito = total + cupoCredito;
            if (totalConCredito > 0) {
                const pctAhorros = Math.round((saldoAhorros / totalConCredito) * 100);
                const pctCorriente = Math.round((saldoCorriente / totalConCredito) * 100);
                const pctCredito = Math.max(0, 100 - pctAhorros - pctCorriente);

                if (elPorcentajeAhorros) elPorcentajeAhorros.textContent = `${pctAhorros}%`;
                if (elPorcentajeCorriente) elPorcentajeCorriente.textContent = `${pctCorriente}%`;
                if (elPorcentajeCredito) elPorcentajeCredito.textContent = `${pctCredito}%`;
                if (segAhorros) {
                    segAhorros.style.width = tieneAhorros ? `${pctAhorros}%` : '0%';
                    segAhorros.classList.toggle('hidden', !tieneAhorros);
                }
                if (segCorriente) {
                    segCorriente.style.width = tieneCorriente ? `${pctCorriente}%` : '0%';
                    segCorriente.classList.toggle('hidden', !tieneCorriente);
                }
                if (segCredito) segCredito.style.width = `${pctCredito}%`;
            }
        } else {
            if (itemLeyendaCredito) itemLeyendaCredito.classList.add('hidden');
            if (segCredito) {
                segCredito.classList.add('hidden');
                segCredito.style.width = '0%';
            }

            if (segAhorros) {
                segAhorros.classList.toggle('hidden', !tieneAhorros);
                segAhorros.style.width = tieneAhorros && !tieneCorriente ? '100%' : (tieneAhorros && total > 0 ? `${Math.round((saldoAhorros / total) * 100)}%` : '0%');
            }
            if (segCorriente) {
                segCorriente.classList.toggle('hidden', !tieneCorriente);
                segCorriente.style.width = tieneCorriente && !tieneAhorros ? '100%' : (tieneCorriente && total > 0 ? `${Math.round((saldoCorriente / total) * 100)}%` : '0%');
            }

            const pctAhorros = tieneAhorros ? (total > 0 ? Math.round((saldoAhorros / total) * 100) : (tieneCorriente ? 50 : 100)) : 0;
            const pctCorriente = tieneCorriente ? (total > 0 ? 100 - pctAhorros : (tieneAhorros ? 50 : 100)) : 0;

            if (elPorcentajeAhorros) elPorcentajeAhorros.textContent = `${pctAhorros}%`;
            if (elPorcentajeCorriente) elPorcentajeCorriente.textContent = `${pctCorriente}%`;
        }
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
                actualizarAnalitica();
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