import { initGlobalComponents } from './Global/app.js';
import {
    calcularFondoSugerido,
    formatoCOP,
    obtenerMetaFondoUsuario,
    guardarMetaFondoUsuario
} from './fondoEmergenciaService.js';
import { obtenerCuentas } from './cuentasService.js';

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();

    const inputGastos = document.getElementById('inputGastosFijos');
    const selectorMeses = document.getElementById('selectorMeses');
    const montoSugeridoCalc = document.getElementById('montoSugeridoCalc');
    const pillCobertura = document.getElementById('pillCobertura');
    const resMinimo3m = document.getElementById('resMinimo3m');
    const resOptimo6m = document.getElementById('resOptimo6m');

    // Elementos de Definición de Meta
    const formDefinirMeta = document.getElementById('formDefinirMeta');
    const inputMetaPersonalizada = document.getElementById('inputMetaPersonalizada');
    const selectCuentaVinculada = document.getElementById('selectCuentaVinculada');
    const btnUsarSugerido = document.getElementById('btnUsarSugerido');

    let mesesSeleccionados = 6;
    let metaActual = null;

    function recalcularCalculadora() {
        const valLimpio = Number(inputGastos.value.replace(/\D/g, '')) || 0;
        const res = calcularFondoSugerido(valLimpio, mesesSeleccionados);

        montoSugeridoCalc.textContent = formatoCOP.format(res.totalSugerido);
        pillCobertura.textContent = `Cobertura para ${mesesSeleccionados} meses`;
        resMinimo3m.textContent = formatoCOP.format(res.coberturaMinima);
        resOptimo6m.textContent = formatoCOP.format(res.coberturaRecomendada);
    }

    inputGastos.addEventListener('input', () => {
        const digitos = inputGastos.value.replace(/\D/g, '').slice(0, 11);
        inputGastos.value = digitos ? new Intl.NumberFormat('es-CO').format(Number(digitos)) : '';
        recalcularCalculadora();
    });

    selectorMeses.querySelectorAll('.btn-meses').forEach(btn => {
        btn.addEventListener('click', () => {
            selectorMeses.querySelectorAll('.btn-meses').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mesesSeleccionados = Number(btn.getAttribute('data-meses')) || 3;
            recalcularCalculadora();
        });
    });

    // Formatear input de meta personalizada
    inputMetaPersonalizada.addEventListener('input', () => {
        const digitos = inputMetaPersonalizada.value.replace(/\D/g, '').slice(0, 11);
        inputMetaPersonalizada.value = digitos ? new Intl.NumberFormat('es-CO').format(Number(digitos)) : '';
    });

    btnUsarSugerido.addEventListener('click', () => {
        const valLimpio = Number(inputGastos.value.replace(/\D/g, '')) || 0;
        const res = calcularFondoSugerido(valLimpio, mesesSeleccionados);
        inputMetaPersonalizada.value = new Intl.NumberFormat('es-CO').format(res.totalSugerido);
    });

    // Cargar cuentas del usuario y meta guardada
    async function inicializarDatosMeta() {
        try {
            const cuentas = await obtenerCuentas();
            selectCuentaVinculada.innerHTML = cuentas.map(c => `
                <option value="${c.id}">
                    ${c.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : (c.tipo === 'CORRIENTE' ? 'Cuenta Corriente' : 'Tarjeta')} · •••• ${String(c.numero || '').slice(-4)} (${formatoCOP.format(c.saldo)})
                </option>
            `).join('');

            metaActual = await obtenerMetaFondoUsuario();
            if (metaActual) {
                inputMetaPersonalizada.value = new Intl.NumberFormat('es-CO').format(metaActual.metaMonto);
                if (metaActual.cuentaVinculadaId) {
                    selectCuentaVinculada.value = metaActual.cuentaVinculadaId;
                }
            }
        } catch (e) {
            console.error('Error al inicializar cuentas o meta de fondo', e);
        }
    }

    formDefinirMeta.addEventListener('submit', async (e) => {
        e.preventDefault();
        const montoMeta = Number(inputMetaPersonalizada.value.replace(/\D/g, ''));
        const gastos = Number(inputGastos.value.replace(/\D/g, '')) || 1800000;
        const ctaId = selectCuentaVinculada.value;

        if (!montoMeta || montoMeta <= 0) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Monto de Meta Inválido',
                    text: 'Por favor ingresa un monto objetivo mayor a cero.',
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            }
            return;
        }

        try {
            await guardarMetaFondoUsuario({
                metaMonto: montoMeta,
                gastosFijos: gastos,
                mesesCobertura: mesesSeleccionados,
                cuentaId: ctaId
            });

            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Meta Definida!',
                    text: `Tu fondo de emergencia ha sido fijado en ${formatoCOP.format(montoMeta)} y vinculado exitosamente a tu cuenta.`,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            }
        } catch (err) {
            alert(err.message);
        }
    });

    recalcularCalculadora();
    await inicializarDatosMeta();
});
