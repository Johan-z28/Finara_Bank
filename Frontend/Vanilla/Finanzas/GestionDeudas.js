// Frontend/Vanilla/Finanzas/GestionDeudas.js
// Controlador de vista para HU-20: Asesoría sobre Endeudamiento.

import {
    obtenerDatosUsuario,
    guardarIngresoMensual,
    obtenerIngresoDesdePresupuesto,
    crearObligacion,
    actualizarObligacion,
    eliminarObligacion,
    sincronizarObligacionesFinara,
    calcularResumenEndeudamiento,
    generarConsejos,
    simularEstrategia,
    formatoCOP,
    TIPOS_OBLIGACION
} from './gestionDeudasService.js';

export async function initGestionDeudasView() {
    // 1. Obtener referencias del DOM
    const inputIngresoMensual = document.getElementById('inputIngresoMensual');
    const btnUsarPresupuesto = document.getElementById('btnUsarPresupuesto');
    const btnGuardarIngreso = document.getElementById('btnGuardarIngreso');
    const btnSyncFinara = document.getElementById('btnSyncFinara');

    // KPIs
    const kpiDeudaTotal = document.getElementById('kpiDeudaTotal');
    const kpiRelacionAnual = document.getElementById('kpiRelacionAnual');
    const kpiCuotaTotal = document.getElementById('kpiCuotaTotal');
    const kpiInteresesMes = document.getElementById('kpiInteresesMes');
    const kpiNivelEndeudamiento = document.getElementById('kpiNivelEndeudamiento');
    const kpiBadgeSemaforo = document.getElementById('kpiBadgeSemaforo');
    const cardKpiEndeudamiento = document.getElementById('cardKpiEndeudamiento');
    const kpiIngresoLibre = document.getElementById('kpiIngresoLibre');

    // Medidor y Distribución
    const gaugeWrapper = document.getElementById('gaugeWrapper');
    const gaugePercent = document.getElementById('gaugePercent');
    const gaugeStatus = document.getElementById('gaugeStatus');
    const totalObligacionesCount = document.getElementById('totalObligacionesCount');
    const distribucionBarra = document.getElementById('distribucionBarra');
    const distribucionLeyenda = document.getElementById('distribucionLeyenda');
    const timelineLista = document.getElementById('timelineLista');

    // Formulario de Obligaciones
    const formObligacion = document.getElementById('formObligacion');
    const formTitulo = document.getElementById('formTitulo');
    const inputObligacionId = document.getElementById('inputObligacionId');
    const selectTipoObligacion = document.getElementById('selectTipoObligacion');
    const inputEntidad = document.getElementById('inputEntidad');
    const inputSaldoTotal = document.getElementById('inputSaldoTotal');
    const inputCuotaMensual = document.getElementById('inputCuotaMensual');
    const inputTasaEA = document.getElementById('inputTasaEA');
    const inputPlazoMeses = document.getElementById('inputPlazoMeses');
    const btnGuardarObligacion = document.getElementById('btnGuardarObligacion');
    const btnGuardarTexto = document.getElementById('btnGuardarTexto');
    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
    const cuerpoTablaObligaciones = document.getElementById('cuerpoTablaObligaciones');

    // Comparador de Estrategias
    const inputAbonoExtra = document.getElementById('inputAbonoExtra');
    const boxAvalancha = document.getElementById('boxAvalancha');
    const tagMejorAvalancha = document.getElementById('tagMejorAvalancha');
    const estAvalanchaMeses = document.getElementById('estAvalanchaMeses');
    const estAvalanchaIntereses = document.getElementById('estAvalanchaIntereses');
    const estAvalanchaAhorro = document.getElementById('estAvalanchaAhorro');

    const boxBolaNieve = document.getElementById('boxBolaNieve');
    const tagMejorNieve = document.getElementById('tagMejorNieve');
    const estNieveMeses = document.getElementById('estNieveMeses');
    const estNieveIntereses = document.getElementById('estNieveIntereses');
    const estNieveAhorro = document.getElementById('estNieveAhorro');

    // Consejos
    const contenedorConsejos = document.getElementById('contenedorConsejos');

    if (!formObligacion || !inputIngresoMensual) return;

    // Paleta de colores para gráficos de distribución
    const PALETA_COLORES = [
        '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316'
    ];

    let modoEdicion = false;

    // 2. Sincronización inicial de Finara Bank
    try {
        sincronizarObligacionesFinara();
    } catch (e) {
        console.warn('Sincronización inicial de obligaciones:', e);
    }

    // Cargar ingreso actual
    const datosIniciales = obtenerDatosUsuario();
    if (datosIniciales.ingresoMensual > 0) {
        inputIngresoMensual.value = datosIniciales.ingresoMensual;
    }

    /**
     * Sanitiza texto para prevenir XSS
     */
    function escaparTexto(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    /**
     * Resetea el formulario al modo de agregar
     */
    function resetearFormulario() {
        formObligacion.reset();
        inputObligacionId.value = '';
        modoEdicion = false;
        if (formTitulo) formTitulo.textContent = 'Agregar Obligación';
        if (btnGuardarTexto) btnGuardarTexto.textContent = 'Guardar Obligación';
        if (btnCancelarEdicion) btnCancelarEdicion.classList.add('hidden');
    }

    /**
     * Renderiza toda la vista y recalcula métricas
     */
    function renderizarTodo() {
        const datos = obtenerDatosUsuario();
        const resumen = calcularResumenEndeudamiento();

        // 1. KPIs superiores
        if (kpiDeudaTotal) kpiDeudaTotal.textContent = formatoCOP(resumen.deudaTotal);
        if (kpiRelacionAnual) {
            kpiRelacionAnual.textContent = resumen.ingresoValido ? `${resumen.relacionDeudaIngresoAnual}x tu ingreso anual` : 'Requiere ingreso';
        }
        if (kpiCuotaTotal) kpiCuotaTotal.textContent = `${formatoCOP(resumen.cuotaTotal)} / mes`;
        if (kpiInteresesMes) kpiInteresesMes.textContent = `${formatoCOP(resumen.costoInteresesMensual)} / mes`;
        if (kpiIngresoLibre) kpiIngresoLibre.textContent = resumen.ingresoValido ? formatoCOP(resumen.ingresoLibre) : '$ 0';

        // 2. KPI Semáforo de endeudamiento
        if (kpiNivelEndeudamiento) {
            kpiNivelEndeudamiento.textContent = resumen.ingresoValido ? `${resumen.nivelEndeudamiento}%` : 'Sin evaluar';
        }

        if (cardKpiEndeudamiento && resumen.clasificacion) {
            cardKpiEndeudamiento.style.setProperty('--semaforo-color', resumen.clasificacion.color);
        }

        if (kpiBadgeSemaforo) {
            if (resumen.clasificacion) {
                kpiBadgeSemaforo.textContent = resumen.clasificacion.badge;
                kpiBadgeSemaforo.style.color = resumen.clasificacion.color;
            } else {
                kpiBadgeSemaforo.textContent = 'Ingresa tu salario mensual';
                kpiBadgeSemaforo.style.color = '#64748b';
            }
        }

        // 3. Medidor Circular (CSS Conic-Gradient)
        if (gaugeWrapper && gaugePercent && gaugeStatus) {
            const pct = resumen.ingresoValido ? Math.min(100, resumen.nivelEndeudamiento) : 0;
            const color = resumen.clasificacion ? resumen.clasificacion.color : '#cbd5e1';

            gaugeWrapper.style.setProperty('--gauge-percent', `${pct}%`);
            gaugeWrapper.style.setProperty('--gauge-color', color);
            gaugePercent.textContent = resumen.ingresoValido ? `${resumen.nivelEndeudamiento}%` : '--%';

            if (resumen.clasificacion) {
                gaugeStatus.className = `gd-gauge-status ${resumen.clasificacion.clase}`;
                gaugeStatus.innerHTML = `<span>${resumen.clasificacion.badge}</span>`;
            } else {
                gaugeStatus.className = 'gd-gauge-status';
                gaugeStatus.style.background = '#f1f5f9';
                gaugeStatus.style.color = '#64748b';
                gaugeStatus.innerHTML = '<span>Pendiente de ingreso</span>';
            }
        }

        if (totalObligacionesCount) {
            totalObligacionesCount.textContent = `${datos.obligaciones.length} ${datos.obligaciones.length === 1 ? 'obligación' : 'obligaciones'}`;
        }

        // 4. Distribución y Línea de Tiempo
        renderizarDistribucionYTimeline(datos.obligaciones, resumen.deudaTotal);

        // 5. Tabla Consolidada
        renderizarTablaObligaciones(datos.obligaciones);

        // 6. Comparador de Estrategias
        renderizarEstrategias(datos.obligaciones);

        // 7. Consejos y Recomendaciones
        renderizarConsejos(resumen, datos.obligaciones);
    }

    /**
     * Renderiza la barra segmentada y la línea de tiempo
     */
    function renderizarDistribucionYTimeline(obligaciones, deudaTotal) {
        if (!distribucionBarra || !distribucionLeyenda || !timelineLista) return;

        distribucionBarra.innerHTML = '';
        distribucionLeyenda.innerHTML = '';
        timelineLista.innerHTML = '';

        if (!obligaciones || obligaciones.length === 0 || deudaTotal <= 0) {
            distribucionBarra.innerHTML = '<div style="width: 100%; height: 100%; background: #e2e8f0;"></div>';
            distribucionLeyenda.innerHTML = '<span style="font-size: 0.78rem; color: #94a3b8;">No hay obligaciones para graficar.</span>';
            timelineLista.innerHTML = '<div style="font-size: 0.78rem; color: #94a3b8; text-align: center; padding: 1rem;">Sin compromisos vigentes.</div>';
            return;
        }

        // Encontrar plazo máximo para normalizar la línea de tiempo
        const maxPlazo = Math.max(...obligaciones.map(o => Number(o.plazoRestanteMeses) || 1), 1);

        obligaciones.forEach((obl, idx) => {
            const color = PALETA_COLORES[idx % PALETA_COLORES.length];
            const saldo = Number(obl.saldoTotal) || 0;
            const porcentaje = ((saldo / deudaTotal) * 100).toFixed(1);

            // Barra segmentada
            const segmento = document.createElement('div');
            segmento.className = 'gd-barra-segmento';
            segmento.style.width = `${porcentaje}%`;
            segmento.style.background = color;
            segmento.title = `${obl.entidad}: ${porcentaje}% (${formatoCOP(saldo)})`;
            distribucionBarra.appendChild(segmento);

            // Leyenda
            const itemLeyenda = document.createElement('div');
            itemLeyenda.className = 'gd-leyenda-item';
            itemLeyenda.innerHTML = `
                <div class="gd-leyenda-color" style="background: ${color};"></div>
                <span><strong>${escaparTexto(obl.entidad)}:</strong> ${porcentaje}%</span>
            `;
            distribucionLeyenda.appendChild(itemLeyenda);

            // Fila de línea de tiempo
            const meses = Number(obl.plazoRestanteMeses) || 1;
            const timelinePct = Math.min(100, Math.round((meses / maxPlazo) * 100));

            const row = document.createElement('div');
            row.className = 'gd-timeline-row';
            row.innerHTML = `
                <div class="gd-timeline-entidad" title="${escaparTexto(obl.entidad)}">${escaparTexto(obl.entidad)}</div>
                <div class="gd-timeline-bar-track">
                    <div class="gd-timeline-bar-fill" style="width: ${timelinePct}%; background: ${color};"></div>
                </div>
                <div class="gd-timeline-meses">${meses} ${meses === 1 ? 'mes' : 'meses'}</div>
            `;
            timelineLista.appendChild(row);
        });
    }

    /**
     * Renderiza la tabla de obligaciones consolidadas
     */
    function renderizarTablaObligaciones(obligaciones) {
        if (!cuerpoTablaObligaciones) return;
        cuerpoTablaObligaciones.innerHTML = '';

        if (!obligaciones || obligaciones.length === 0) {
            cuerpoTablaObligaciones.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="gd-empty-state">
                            <i class="fa-solid fa-file-invoice"></i>
                            <h3>Sin deudas registradas</h3>
                            <p>Agrega tus obligaciones o haz clic en "Sincronizar Banco" para importar tus créditos y tarjetas de Finara Bank.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        obligaciones.forEach(obl => {
            const esFinara = obl.origen === 'FINARA';
            const metaTipo = TIPOS_OBLIGACION.find(t => t.id === obl.tipo) || { nombre: obl.tipo, icono: 'fa-scale-balanced' };

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid ${metaTipo.icono}" style="color: var(--finanzas-primary, #10b981);"></i>
                        <span>${escaparTexto(obl.entidad)}</span>
                    </div>
                    <div style="font-size: 0.72rem; color: #64748b;">${metaTipo.nombre}</div>
                    ${esFinara ? '<div class="gd-badge-finara"><i class="fa-solid fa-building-columns"></i> Finara Bank</div>' : ''}
                </td>
                <td style="font-weight: 700; white-space: nowrap;">
                    ${formatoCOP(obl.saldoTotal)}
                </td>
                <td style="font-weight: 600; color: #0f172a; white-space: nowrap;">
                    ${formatoCOP(obl.cuotaMensual)}
                </td>
                <td style="white-space: nowrap;">
                    <span style="font-size: 0.78rem; font-weight: 600; color: #475569;">${obl.tasaEA}% E.A.</span>
                </td>
                <td style="white-space: nowrap; color: #64748b; font-size: 0.8rem;">
                    ${obl.plazoRestanteMeses} meses
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div class="gd-action-btns">
                        ${!esFinara ? `
                            <button type="button" class="gd-btn-action btn-edit" data-action="editar" data-id="${obl.id}" title="Editar obligación">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button type="button" class="gd-btn-action btn-delete" data-action="eliminar" data-id="${obl.id}" title="Eliminar obligación">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : `
                            <span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">
                                <i class="fa-solid fa-lock" title="Administrado por Finara Bank"></i> Automático
                            </span>
                        `}
                    </div>
                </td>
            `;

            cuerpoTablaObligaciones.appendChild(fila);
        });
    }

    /**
     * Renderiza el comparador de estrategias (Avalancha vs Bola de Nieve)
     */
    function renderizarEstrategias(obligaciones) {
        const abonoExtra = Math.max(0, parseFloat(inputAbonoExtra?.value) || 0);

        const resAvalancha = simularEstrategia(obligaciones, abonoExtra, 'AVALANCHA');
        const resNieve = simularEstrategia(obligaciones, abonoExtra, 'BOLA_NIEVE');

        // Determinar cuál ahorra más intereses
        const avalanchaGana = resAvalancha.ahorroIntereses >= resNieve.ahorroIntereses;

        if (estAvalanchaMeses) estAvalanchaMeses.textContent = `${resAvalancha.meses} meses`;
        if (estAvalanchaIntereses) estAvalanchaIntereses.textContent = formatoCOP(resAvalancha.totalIntereses);
        if (estAvalanchaAhorro) estAvalanchaAhorro.textContent = formatoCOP(resAvalancha.ahorroIntereses);

        if (estNieveMeses) estNieveMeses.textContent = `${resNieve.meses} meses`;
        if (estNieveIntereses) estNieveIntereses.textContent = formatoCOP(resNieve.totalIntereses);
        if (estNieveAhorro) estNieveAhorro.textContent = formatoCOP(resNieve.ahorroIntereses);

        if (obligaciones.length > 0 && abonoExtra > 0) {
            if (avalanchaGana) {
                boxAvalancha?.classList.add('is-best');
                tagMejorAvalancha?.classList.remove('hidden');
                boxBolaNieve?.classList.remove('is-best');
                tagMejorNieve?.classList.add('hidden');
            } else {
                boxBolaNieve?.classList.add('is-best');
                tagMejorNieve?.classList.remove('hidden');
                boxAvalancha?.classList.remove('is-best');
                tagMejorAvalancha?.classList.add('hidden');
            }
        } else {
            boxAvalancha?.classList.remove('is-best');
            tagMejorAvalancha?.classList.add('hidden');
            boxBolaNieve?.classList.remove('is-best');
            tagMejorNieve?.classList.add('hidden');
        }
    }

    /**
     * Renderiza las tarjetas de consejos dinámicos
     */
    function renderizarConsejos(resumen, obligaciones) {
        if (!contenedorConsejos) return;
        contenedorConsejos.innerHTML = '';

        const consejos = generarConsejos(resumen, obligaciones);

        consejos.forEach(c => {
            const card = document.createElement('div');
            card.className = `gd-consejo-card ${c.tipo}`;
            card.innerHTML = `
                <div class="gd-consejo-icon">
                    <i class="fa-solid ${c.icono}"></i>
                </div>
                <div class="gd-consejo-body">
                    <h4>${escaparTexto(c.titulo)}</h4>
                    <p>${escaparTexto(c.texto)}</p>
                </div>
            `;
            contenedorConsejos.appendChild(card);
        });
    }

    // ==============================================================
    // EVENT LISTENERS
    // ==============================================================

    // Guardar Ingreso Mensual manual
    if (btnGuardarIngreso) {
        btnGuardarIngreso.addEventListener('click', () => {
            const valor = parseFloat(inputIngresoMensual.value) || 0;
            guardarIngresoMensual(valor);
            renderizarTodo();

            if (window.Swal) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Ingreso mensual actualizado',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#12151c',
                    color: '#ffffff'
                });
            }
        });
    }

    // Usar ingresos del presupuesto
    if (btnUsarPresupuesto) {
        btnUsarPresupuesto.addEventListener('click', () => {
            const ingresoPresupuesto = obtenerIngresoDesdePresupuesto();
            if (ingresoPresupuesto > 0) {
                inputIngresoMensual.value = ingresoPresupuesto;
                guardarIngresoMensual(ingresoPresupuesto);
                renderizarTodo();

                if (window.Swal) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Ingresos importados',
                        text: `Se aplicaron ${formatoCOP(ingresoPresupuesto)} correspondientes a tus ingresos de presupuesto activo.`,
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#10b981'
                    });
                }
            } else {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Sin ingresos en presupuesto',
                        text: 'No tienes ingresos registrados en el periodo de Presupuestos. Puedes ingresar el valor manualmente.',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#10b981'
                    });
                }
            }
        });
    }

    // Guardar o Actualizar Obligación
    formObligacion.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            const tipo = selectTipoObligacion.value;
            const entidad = inputEntidad.value.trim();
            const saldoTotal = parseFloat(inputSaldoTotal.value);
            const cuotaMensual = parseFloat(inputCuotaMensual.value);
            const tasaEA = parseFloat(inputTasaEA.value);
            const plazoRestanteMeses = parseInt(inputPlazoMeses.value, 10);

            if (modoEdicion) {
                const id = inputObligacionId.value;
                actualizarObligacion(id, {
                    tipo,
                    entidad,
                    saldoTotal,
                    cuotaMensual,
                    tasaEA,
                    plazoRestanteMeses
                });

                if (window.Swal) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Obligación actualizada',
                        showConfirmButton: false,
                        timer: 2000,
                        background: '#12151c',
                        color: '#ffffff'
                    });
                }
            } else {
                crearObligacion({
                    tipo,
                    entidad,
                    saldoTotal,
                    cuotaMensual,
                    tasaEA,
                    plazoRestanteMeses,
                    origen: 'MANUAL'
                });

                if (window.Swal) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: `Obligación "${entidad}" registrada`,
                        showConfirmButton: false,
                        timer: 2500,
                        background: '#12151c',
                        color: '#ffffff'
                    });
                }
            }

            resetearFormulario();
            renderizarTodo();
        } catch (error) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Atención',
                    text: error.message || 'Verifica los campos obligatorios.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
            } else {
                alert(error.message);
            }
        }
    });

    // Cancelar edición
    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', resetearFormulario);
    }

    // Acciones de la tabla (Editar / Eliminar)
    if (cuerpoTablaObligaciones) {
        cuerpoTablaObligaciones.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const accion = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            const datos = obtenerDatosUsuario();
            const obligacion = datos.obligaciones.find(o => o.id === id);
            if (!obligacion) return;

            if (accion === 'editar') {
                modoEdicion = true;
                inputObligacionId.value = obligacion.id;
                selectTipoObligacion.value = obligacion.tipo;
                inputEntidad.value = obligacion.entidad;
                inputSaldoTotal.value = obligacion.saldoTotal;
                inputCuotaMensual.value = obligacion.cuotaMensual;
                inputTasaEA.value = obligacion.tasaEA;
                inputPlazoMeses.value = obligacion.plazoRestanteMeses;

                if (formTitulo) formTitulo.textContent = 'Editar Obligación';
                if (btnGuardarTexto) btnGuardarTexto.textContent = 'Actualizar Obligación';
                if (btnCancelarEdicion) btnCancelarEdicion.classList.remove('hidden');

                inputEntidad.focus();
            } else if (accion === 'eliminar') {
                const res = await Swal.fire({
                    title: '¿Eliminar obligación?',
                    text: `Se eliminará "${obligacion.entidad}" del cálculo de endeudamiento.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#475569'
                });

                if (res.isConfirmed) {
                    eliminarObligacion(id);
                    if (modoEdicion && inputObligacionId.value === id) resetearFormulario();
                    renderizarTodo();
                }
            }
        });
    }

    // Recalcular simulador al cambiar el abono extra
    if (inputAbonoExtra) {
        inputAbonoExtra.addEventListener('input', () => {
            const datos = obtenerDatosUsuario();
            renderizarEstrategias(datos.obligaciones);
        });
    }

    // Sincronizar productos con Finara Bank
    if (btnSyncFinara) {
        btnSyncFinara.addEventListener('click', () => {
            sincronizarObligacionesFinara();
            renderizarTodo();
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Sincronización completada!',
                    text: 'Tus créditos y tarjetas activas de Finara Bank han sido consolidadas.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
            }
        });
    }

    // 3. Render inicial
    renderizarTodo();
}
