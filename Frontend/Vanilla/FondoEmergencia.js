import { initGlobalComponents } from './Global/app.js';
import {
    calcularFondoSugerido,
    formatoCOP,
    obtenerMetaFondoUsuario,
    guardarMetaFondoUsuario,
    calcularAvanceFondo
} from './fondoEmergenciaService.js';
import { obtenerCuentas } from './cuentasService.js';

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();

    // Indicador de avance
    const textoSeguridad = document.getElementById('textoSeguridad');
    const badgeSeguridad = document.getElementById('badgeSeguridad');
    const avanceSaldoActual = document.getElementById('avanceSaldoActual');
    const avanceCuentaDesc = document.getElementById('avanceCuentaDesc');
    const avanceMetaMonto = document.getElementById('avanceMetaMonto');
    const avanceCoberturaMeses = document.getElementById('avanceCoberturaMeses');
    const avanceMontoFaltante = document.getElementById('avanceMontoFaltante');
    const avanceMesesCubiertos = document.getElementById('avanceMesesCubiertos');
    const avancePorcentajeTexto = document.getElementById('avancePorcentajeTexto');
    const avanceFillProgreso = document.getElementById('avanceFillProgreso');

    // Calculadora
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

    async function actualizarIndicadorAvance() {
        try {
            const avance = await calcularAvanceFondo();

            if (avanceSaldoActual) avanceSaldoActual.textContent = formatoCOP.format(avance.saldoActual);
            if (avanceMetaMonto) avanceMetaMonto.textContent = formatoCOP.format(avance.meta);
            if (avanceMontoFaltante) {
                if (avance.meta === 0) {
                    avanceMontoFaltante.textContent = '$ 0';
                    avanceMontoFaltante.classList.remove('color-verde');
                } else if (avance.montoFaltante === 0) {
                    avanceMontoFaltante.textContent = 'Meta Completada';
                    avanceMontoFaltante.classList.add('color-verde');
                } else {
                    avanceMontoFaltante.textContent = formatoCOP.format(avance.montoFaltante);
                    avanceMontoFaltante.classList.remove('color-verde');
                }
            }

            if (avancePorcentajeTexto) {
                avancePorcentajeTexto.textContent = `${avance.porcentajeReal}% completado`;
            }

            if (avanceFillProgreso) {
                avanceFillProgreso.style.width = `${avance.porcentajeAvance}%`;
            }

            if (avanceMesesCubiertos) {
                avanceMesesCubiertos.textContent = `${avance.mesesCubiertos} meses cubiertos`;
            }

            if (avanceCoberturaMeses) {
                avanceCoberturaMeses.textContent = avance.meta > 0 ? `Meta para ${avance.mesesCobertura || 6} meses` : 'Sin meta definida';
            }

            if (avanceCuentaDesc) {
                if (avance.cuentaVinculada) {
                    avanceCuentaDesc.textContent = `${avance.cuentaVinculada.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta'} •••• ${String(avance.cuentaVinculada.numero || '').slice(-4)}`;
                } else {
                    avanceCuentaDesc.textContent = 'Sin cuenta vinculada';
                }
            }

            if (badgeSeguridad && textoSeguridad) {
                textoSeguridad.textContent = avance.nivelSeguridad;
                badgeSeguridad.className = `fe-badge-seguridad ${avance.claseSeguridad}`;
            }
        } catch (e) {
            console.error('Error al actualizar indicador de avance', e);
        }
    }

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

    // Cargar cuentas del usuario y meta guardada (solo Ahorros y Corriente, sin Tarjetas de Crédito)
    async function inicializarDatosMeta() {
        try {
            const cuentas = await obtenerCuentas();
            const cuentasPermitidas = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');

            if (cuentasPermitidas.length === 0) {
                selectCuentaVinculada.innerHTML = `<option value="">No tienes cuentas monetarias disponibles</option>`;
                return;
            }

            metaActual = await obtenerMetaFondoUsuario();

            selectCuentaVinculada.innerHTML = `
                <option value="" disabled ${!metaActual || !metaActual.cuentaVinculadaId ? 'selected' : ''}>Selecciona una cuenta</option>
                ${cuentasPermitidas.map(c => `
                    <option value="${c.id}" ${metaActual && String(metaActual.cuentaVinculadaId) === String(c.id) ? 'selected' : ''}>
                        ${c.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} · •••• ${String(c.numero || '').slice(-4)} (${formatoCOP.format(c.saldo)})
                    </option>
                `).join('')}
            `;

            if (metaActual) {
                if (metaActual.gastosFijos && metaActual.gastosFijos > 0) {
                    inputGastos.value = new Intl.NumberFormat('es-CO').format(metaActual.gastosFijos);
                }
                if (metaActual.metaMonto && metaActual.metaMonto > 0) {
                    inputMetaPersonalizada.value = new Intl.NumberFormat('es-CO').format(metaActual.metaMonto);
                }
            }
        } catch (e) {
            console.error('Error al inicializar cuentas o meta de fondo', e);
        }
    }

    // Permitir previsualizar o actualizar el indicador al cambiar de cuenta vinculada
    selectCuentaVinculada.addEventListener('change', async () => {
        const cuentas = await obtenerCuentas();
        const seleccionada = cuentas.find(c => String(c.id) === String(selectCuentaVinculada.value) && (c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE'));
        if (seleccionada && avanceSaldoActual) {
            avanceSaldoActual.textContent = formatoCOP.format(seleccionada.saldo);
            if (avanceCuentaDesc) {
                avanceCuentaDesc.textContent = `${seleccionada.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} •••• ${String(seleccionada.numero || '').slice(-4)}`;
            }
            const montoMeta = Number(inputMetaPersonalizada.value.replace(/\D/g, '')) || (metaActual ? metaActual.metaMonto : 0);
            const saldo = Number(seleccionada.saldo) || 0;
            const faltante = montoMeta > 0 ? Math.max(0, montoMeta - saldo) : 0;
            if (avanceMontoFaltante) {
                avanceMontoFaltante.textContent = montoMeta > 0 ? (faltante === 0 ? 'Meta Completada' : formatoCOP.format(faltante)) : '$ 0';
            }
            const porcentaje = montoMeta > 0 ? Math.round((saldo / montoMeta) * 100) : 0;
            if (avancePorcentajeTexto) {
                avancePorcentajeTexto.textContent = `${porcentaje}% completado`;
            }
            if (avanceFillProgreso) {
                avanceFillProgreso.style.width = `${Math.min(100, porcentaje)}%`;
            }
            const gastos = Number(inputGastos.value.replace(/\D/g, '')) || 0;
            if (avanceMesesCubiertos) {
                avanceMesesCubiertos.textContent = gastos > 0 ? `${(saldo / gastos).toFixed(1)} meses cubiertos` : '0 meses cubiertos';
            }
        }
    });

    formDefinirMeta.addEventListener('submit', async (e) => {
        e.preventDefault();
        const montoMeta = Number(inputMetaPersonalizada.value.replace(/\D/g, ''));
        const gastos = Number(inputGastos.value.replace(/\D/g, '')) || 0;
        const ctaId = selectCuentaVinculada.value;

        if (!ctaId) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Cuenta Requerida',
                    text: 'Debes seleccionar una cuenta de ahorros o corriente para vincular tu fondo de emergencia.',
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            } else {
                alert('Debes seleccionar una cuenta de ahorros o corriente para vincular tu fondo de emergencia.');
            }
            return;
        }

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

            await actualizarIndicadorAvance();
        } catch (err) {
            alert(err.message);
        }
    });

    recalcularCalculadora();
    await inicializarDatosMeta();
    await actualizarIndicadorAvance();
});
