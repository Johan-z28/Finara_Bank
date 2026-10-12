// Vanilla/Metas.js
// Controlador para HU-28: Asesoría para alcanzar una meta (#39)

import { initGlobalComponents } from './Global/app.js';
import {
    formatoCOP,
    proyectarMeta,
    obtenerMetasUsuario,
    guardarMeta,
    eliminarMeta
} from './metasService.js';
import { obtenerCuentas } from './cuentasService.js';

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();

    // Elementos del Resumen Global
    const totalMontoMetas = document.getElementById('totalMontoMetas');
    const cantMetasTexto = document.getElementById('cantMetasTexto');
    const totalSaldoAsignado = document.getElementById('totalSaldoAsignado');
    const totalBrechaGlobal = document.getElementById('totalBrechaGlobal');
    const progresoGlobalTexto = document.getElementById('progresoGlobalTexto');
    const totalAhorroMensualRequerido = document.getElementById('totalAhorroMensualRequerido');

    // Elementos del Simulador / Proyector
    const simNombreMeta = document.getElementById('simNombreMeta');
    const simCategoriaMeta = document.getElementById('simCategoriaMeta');
    const simMontoObjetivo = document.getElementById('simMontoObjetivo');
    const simPlazoSlider = document.getElementById('simPlazoSlider');
    const simPlazoTexto = document.getElementById('simPlazoTexto');
    const simCuentaAsignada = document.getElementById('simCuentaAsignada');
    const btnGuardarMetaSimulada = document.getElementById('btnGuardarMetaSimulada');
    const btnAbrirModalNuevaMeta = document.getElementById('btnAbrirModalNuevaMeta');

    // Elementos del Panel de Resultado de la Proyección
    const resTituloMeta = document.getElementById('resTituloMeta');
    const resBadgeEstado = document.getElementById('resBadgeEstado');
    const resTextoEstado = document.getElementById('resTextoEstado');
    const resMontoTotal = document.getElementById('resMontoTotal');
    const resPlazoMesesTexto = document.getElementById('resPlazoMesesTexto');
    const resSaldoAsignado = document.getElementById('resSaldoAsignado');
    const resCuentaDesc = document.getElementById('resCuentaDesc');
    const resBrechaRestante = document.getElementById('resBrechaRestante');
    const resPorcentajeAvanceTexto = document.getElementById('resPorcentajeAvanceTexto');
    const barraMetaPorcentaje = document.getElementById('barraMetaPorcentaje');
    const fillMetaProgreso = document.getElementById('fillMetaProgreso');
    const cuotaMensualMonto = document.getElementById('cuotaMensualMonto');
    const cuotaQuincenalMonto = document.getElementById('cuotaQuincenalMonto');
    const cuotaSemanalMonto = document.getElementById('cuotaSemanalMonto');
    const resFechaCumplimiento = document.getElementById('resFechaCumplimiento');

    // Listado de metas
    const contenedorMetasLista = document.getElementById('contenedorMetasLista');

    let cuentasDisponibles = [];
    let metasActuales = [];
    let metaEnEdicionId = null;

    // Inicializar cuentas en el selector (filtrando Ahorros y Corriente, sin Tarjetas de Crédito)
    async function cargarCuentas() {
        try {
            const cuentas = await obtenerCuentas();
            cuentasDisponibles = cuentas.filter(c => c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE');

            if (cuentasDisponibles.length === 0) {
                simCuentaAsignada.innerHTML = `<option value="">No hay cuentas de ahorro o corriente</option>`;
                return;
            }

            simCuentaAsignada.innerHTML = cuentasDisponibles.map(c => `
                <option value="${c.id}">
                    ${c.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} · •••• ${String(c.numero || '').slice(-4)} (${formatoCOP.format(c.saldo)})
                </option>
            `).join('');
        } catch (e) {
            console.error('Error al cargar cuentas para metas', e);
        }
    }

    // Calcula y actualiza en tiempo real la proyección en el panel interactivo
    function actualizarProyeccionEnPantalla() {
        const nombre = simNombreMeta.value.trim() || 'Mi Meta de Ahorro';
        const monto = Number(simMontoObjetivo.value.replace(/\D/g, '')) || 0;
        const plazo = Number(simPlazoSlider.value) || 12;
        const ctaId = simCuentaAsignada.value;

        simPlazoTexto.textContent = plazo;
        const cuentaSeleccionada = cuentasDisponibles.find(c => String(c.id) === String(ctaId)) || cuentasDisponibles[0];
        const saldoAsignado = cuentaSeleccionada ? Number(cuentaSeleccionada.saldo) : 0;

        const proyeccion = proyectarMeta({
            montoObjetivo: monto,
            plazoMeses: plazo,
            saldoAsignado
        });

        // Actualizar textos
        resTituloMeta.textContent = `Proyección: ${nombre}`;
        resMontoTotal.textContent = formatoCOP.format(proyeccion.montoObjetivo);
        resPlazoMesesTexto.textContent = `Plazo de ${proyeccion.plazoMeses} meses`;
        resSaldoAsignado.textContent = formatoCOP.format(proyeccion.saldoAsignado);
        resCuentaDesc.textContent = cuentaSeleccionada
            ? `${cuentaSeleccionada.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} •••• ${String(cuentaSeleccionada.numero || '').slice(-4)}`
            : 'Sin cuenta asignada';

        if (proyeccion.brechaRestante === 0 && proyeccion.montoObjetivo > 0) {
            resBrechaRestante.textContent = '¡Brecha Cubierta!';
            resBrechaRestante.className = 'm-val color-verde';
        } else {
            resBrechaRestante.textContent = formatoCOP.format(proyeccion.brechaRestante);
            resBrechaRestante.className = 'm-val';
        }

        resPorcentajeAvanceTexto.textContent = `${proyeccion.porcentajeReal}% del objetivo`;
        barraMetaPorcentaje.textContent = `${proyeccion.porcentajeReal}%`;
        fillMetaProgreso.style.width = `${proyeccion.porcentajeAvance}%`;

        // Cuotas de ahorro
        cuotaMensualMonto.textContent = formatoCOP.format(proyeccion.ahorroMensualNecesario);
        cuotaQuincenalMonto.textContent = formatoCOP.format(proyeccion.ahorroQuincenalNecesario);
        cuotaSemanalMonto.textContent = formatoCOP.format(proyeccion.ahorroSemanalNecesario);
        const cuotaDiarioMonto = document.getElementById('cuotaDiarioMonto');
        if (cuotaDiarioMonto) cuotaDiarioMonto.textContent = formatoCOP.format(proyeccion.ahorroDiarioNecesario);

        const consejoAsesoriaTexto = document.getElementById('consejoAsesoriaTexto');
        if (consejoAsesoriaTexto) {
            if (proyeccion.completada) {
                consejoAsesoriaTexto.textContent = '¡Felicidades! Tu saldo cubre el 100% de esta meta. Considera asignarlo o definir un nuevo objetivo.';
            } else if (proyeccion.ahorroMensualNecesario > 2000000) {
                consejoAsesoriaTexto.textContent = `Ahorro mensual alto (${formatoCOP.format(proyeccion.ahorroMensualNecesario)}/mes). Puedes aumentar el plazo a más meses para pagar cuotas más cómodas.`;
            } else {
                consejoAsesoriaTexto.textContent = `Para cubrir la brecha de ${formatoCOP.format(proyeccion.brechaRestante)}, programa un ahorro automático de ${formatoCOP.format(proyeccion.ahorroMensualNecesario)} al inicio de cada mes.`;
            }
        }

        resFechaCumplimiento.textContent = proyeccion.fechaEstimadaFin;

        // Estado / Viabilidad
        resTextoEstado.textContent = proyeccion.evaluacion;
        resBadgeEstado.className = `badge-estado ${proyeccion.claseEvaluacion}`;
    }

    // Renderizar tarjetas de metas activas
    function renderizarListaMetas() {
        if (!contenedorMetasLista) return;

        if (metasActuales.length === 0) {
            contenedorMetasLista.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: var(--bg-card-dark); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1); color: var(--text-muted);">
                    <i class="fa-solid fa-bullseye" style="font-size: 2.2rem; color: var(--gold-main); margin-bottom: 0.8rem; display: block;"></i>
                    <p style="margin: 0; font-size: 0.95rem;">Aún no tienes metas activas. Diseña y guarda tu primera meta con el simulador superior.</p>
                </div>
            `;
            return;
        }

        contenedorMetasLista.innerHTML = metasActuales.map(meta => {
            const p = meta.proyeccion;
            return `
                <div class="meta-tarjeta-item ${p.completada ? 'completada' : ''}" data-id="${meta.id}">
                    <div class="meta-item-head">
                        <div>
                            <span class="meta-item-categoria">${meta.categoria || 'General'}</span>
                            <h4 class="meta-item-titulo">${meta.nombreMeta}</h4>
                        </div>
                        <div class="meta-item-acciones">
                            <button class="btn-accion-meta btn-editar-meta" data-id="${meta.id}" title="Cargar en Simulador">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-accion-meta eliminar btn-eliminar-meta" data-id="${meta.id}" title="Eliminar Meta">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>

                    <div class="meta-item-metricas">
                        <div>
                            <span>Objetivo:</span>
                            <strong class="color-dorado">${formatoCOP.format(meta.montoObjetivo)}</strong>
                        </div>
                        <div>
                            <span>Saldo Asignado:</span>
                            <strong class="color-verde">${formatoCOP.format(p.saldoAsignado)}</strong>
                        </div>
                        <div>
                            <span>Brecha:</span>
                            <strong>${p.brechaRestante === 0 ? 'Cubierta' : formatoCOP.format(p.brechaRestante)}</strong>
                        </div>
                        <div>
                            <span>Plazo:</span>
                            <strong>${meta.plazoMeses} meses</strong>
                        </div>
                    </div>

                    <div class="meta-item-barra">
                        <div class="meta-item-barra-info">
                            <span>Progreso</span>
                            <strong class="color-dorado">${p.porcentajeReal}%</strong>
                        </div>
                        <div class="track-meta" style="height: 8px;">
                            <div class="fill-meta" style="width: ${p.porcentajeAvance}%;"></div>
                        </div>
                    </div>

                    <div class="meta-item-plan">
                        <span>Ahorro mensual sugerido:</span>
                        <span class="plan-valor">${formatoCOP.format(p.ahorroMensualNecesario)}/mes</span>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos de edición y eliminación
        contenedorMetasLista.querySelectorAll('.btn-editar-meta').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const meta = metasActuales.find(m => m.id === id);
                if (meta) {
                    metaEnEdicionId = meta.id;
                    simNombreMeta.value = meta.nombreMeta;
                    simCategoriaMeta.value = meta.categoria || 'General';
                    simMontoObjetivo.value = new Intl.NumberFormat('es-CO').format(meta.montoObjetivo);
                    simPlazoSlider.value = meta.plazoMeses;
                    if (meta.cuentaAsignadaId) {
                        simCuentaAsignada.value = meta.cuentaAsignadaId;
                    }
                    actualizarProyeccionEnPantalla();
                    document.querySelector('.seccion-proyeccion-card').scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        contenedorMetasLista.querySelectorAll('.btn-eliminar-meta').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const meta = metasActuales.find(m => m.id === id);
                if (!meta) return;

                if (window.Swal) {
                    const result = await Swal.fire({
                        title: '¿Eliminar Meta?',
                        text: `¿Estás seguro de eliminar la meta "${meta.nombreMeta}"?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar',
                        background: '#12151c',
                        color: '#fff',
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#334155'
                    });

                    if (result.isConfirmed) {
                        await eliminarMeta(id);
                        await recargarDatos();
                        Swal.fire({
                            title: 'Eliminada',
                            text: 'La meta fue removida de tu plan.',
                            icon: 'success',
                            background: '#12151c',
                            color: '#fff',
                            confirmButtonColor: '#e5a93c'
                        });
                    }
                } else if (confirm(`¿Eliminar la meta "${meta.nombreMeta}"?`)) {
                    await eliminarMeta(id);
                    await recargarDatos();
                }
            });
        });
    }

    // Actualizar tarjetas de resumen general
    function actualizarResumenGlobal() {
        const totalObjetivo = metasActuales.reduce((acc, m) => acc + (Number(m.montoObjetivo) || 0), 0);
        const totalSaldo = metasActuales.reduce((acc, m) => acc + (Number(m.proyeccion.saldoAsignado) || 0), 0);
        const totalBrecha = metasActuales.reduce((acc, m) => acc + (Number(m.proyeccion.brechaRestante) || 0), 0);
        const totalMensual = metasActuales.reduce((acc, m) => acc + (Number(m.proyeccion.ahorroMensualNecesario) || 0), 0);

        const porcentajeGlobal = totalObjetivo > 0 ? Math.round((totalSaldo / totalObjetivo) * 100) : 0;

        totalMontoMetas.textContent = formatoCOP.format(totalObjetivo);
        cantMetasTexto.textContent = `${metasActuales.length} ${metasActuales.length === 1 ? 'meta activa' : 'metas activas'}`;
        totalSaldoAsignado.textContent = formatoCOP.format(totalSaldo);
        totalBrechaGlobal.textContent = formatoCOP.format(totalBrecha);
        progresoGlobalTexto.textContent = `${porcentajeGlobal}% alcanzado`;
        totalAhorroMensualRequerido.textContent = formatoCOP.format(totalMensual);
    }

    async function recargarDatos() {
        metasActuales = await obtenerMetasUsuario();
        actualizarResumenGlobal();
        renderizarListaMetas();
    }

    // Eventos del formulario simulador
    simMontoObjetivo.addEventListener('input', () => {
        const digitos = simMontoObjetivo.value.replace(/\D/g, '').slice(0, 12);
        simMontoObjetivo.value = digitos ? new Intl.NumberFormat('es-CO').format(Number(digitos)) : '';
        actualizarProyeccionEnPantalla();
    });

    simPlazoSlider.addEventListener('input', () => {
        actualizarProyeccionEnPantalla();
    });

    simNombreMeta.addEventListener('input', () => {
        actualizarProyeccionEnPantalla();
    });

    simCuentaAsignada.addEventListener('change', () => {
        actualizarProyeccionEnPantalla();
    });

    btnAbrirModalNuevaMeta.addEventListener('click', () => {
        metaEnEdicionId = null;
        simNombreMeta.value = '';
        simMontoObjetivo.value = '10.000.000';
        simPlazoSlider.value = 12;
        actualizarProyeccionEnPantalla();
        simNombreMeta.focus();
        document.querySelector('.seccion-proyeccion-card').scrollIntoView({ behavior: 'smooth' });
    });

    // Guardar meta simulada
    btnGuardarMetaSimulada.addEventListener('click', async () => {
        const nombre = simNombreMeta.value.trim() || 'Meta Financiera';
        const monto = Number(simMontoObjetivo.value.replace(/\D/g, ''));
        const plazo = Number(simPlazoSlider.value) || 12;
        const categoria = simCategoriaMeta.value;
        const cuentaId = simCuentaAsignada.value;

        if (!monto || monto <= 0) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Importe Inválido',
                    text: 'Ingresa un importe objetivo mayor a cero.',
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            }
            return;
        }

        try {
            await guardarMeta({
                id: metaEnEdicionId,
                nombreMeta: nombre,
                categoria,
                montoObjetivo: monto,
                plazoMeses: plazo,
                cuentaAsignadaId: cuentaId
            });

            metaEnEdicionId = null;
            await recargarDatos();

            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Meta Guardada!',
                    text: `La meta "${nombre}" ha sido guardada en tu plan con una proyección de ${plazo} meses.`,
                    background: '#12151c',
                    color: '#fff',
                    confirmButtonColor: '#e5a93c'
                });
            }
        } catch (err) {
            alert(err.message);
        }
    });

    // Inicialización
    await cargarCuentas();
    await recargarDatos();

    // Precargar primera meta en el simulador si existe
    if (metasActuales.length > 0) {
        const primera = metasActuales[0];
        simNombreMeta.value = primera.nombreMeta;
        simCategoriaMeta.value = primera.categoria || 'Vehículo';
        simMontoObjetivo.value = new Intl.NumberFormat('es-CO').format(primera.montoObjetivo);
        simPlazoSlider.value = primera.plazoMeses;
        if (primera.cuentaAsignadaId) {
            simCuentaAsignada.value = primera.cuentaAsignadaId;
        }
    } else {
        simMontoObjetivo.value = '15.000.000';
    }

    actualizarProyeccionEnPantalla();
});
