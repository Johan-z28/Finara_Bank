// Vanilla/FondoEmergencia.js
// Controlador para HU-25: Fondo de Emergencia (#36)

import { initGlobalComponents } from './Global/app.js';
import {
    calcularFondoSugerido,
    formatoCOP
} from './fondoEmergenciaService.js';

document.addEventListener('DOMContentLoaded', () => {
    initGlobalComponents();

    const inputGastos = document.getElementById('inputGastosFijos');
    const selectorMeses = document.getElementById('selectorMeses');
    const montoSugeridoCalc = document.getElementById('montoSugeridoCalc');
    const pillCobertura = document.getElementById('pillCobertura');
    const resMinimo3m = document.getElementById('resMinimo3m');
    const resOptimo6m = document.getElementById('resOptimo6m');

    let mesesSeleccionados = 6;

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

    recalcularCalculadora();
});
