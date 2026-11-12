// Frontend/Vanilla/Finanzas/GestionDeudas.js
// Controlador de vista para HU-22: Gestión de Deudas, Suscripciones y Pagos Pendientes.

import {
    obtenerDatosUsuario,
    crearSuscripcion,
    cambiarEstadoSuscripcion,
    eliminarSuscripcion,
    crearPagoPendiente,
    marcarPagoPagado,
    eliminarPagoPendiente,
    sincronizarPagosDesdeProductos,
    obtenerMetricasGenerales,
    calcularCostoMensual,
    calcularCostoAnual,
    obtenerEstadoVencimiento,
    formatoCOP
} from './suscripcionesGastosService.js';

export async function initGestionDeudasView() {
    // 1. Obtener elementos del DOM
    const formSuscripcion = document.getElementById('formRegistroSuscripcion');
    const inputSuscNombre = document.getElementById('inputSuscNombre');
    const selectSuscCategoria = document.getElementById('selectSuscCategoria');
    const selectSuscFrecuencia = document.getElementById('selectSuscFrecuencia');
    const inputSuscMonto = document.getElementById('inputSuscMonto');
    const previewCostoMensual = document.getElementById('previewCostoMensual');
    const previewCostoAnual = document.getElementById('previewCostoAnual');
    const listaSuscripciones = document.getElementById('listaSuscripciones');

    const formPago = document.getElementById('formRegistroPago');
    const inputPagoNombre = document.getElementById('inputPagoNombre');
    const selectPagoTipo = document.getElementById('selectPagoTipo');
    const inputPagoFecha = document.getElementById('inputPagoFecha');
    const inputPagoMonto = document.getElementById('inputPagoMonto');
    const cuerpoTablaPagos = document.getElementById('cuerpoTablaPagos');

    const btnSyncFinara = document.getElementById('btnSyncFinara');
    const filtrosContainer = document.getElementById('filtrosSuscripcion');

    // KPIs
    const kpiGastoFijoMensual = document.getElementById('kpiGastoFijoMensual');
    const kpiGastoFijoAnual = document.getElementById('kpiGastoFijoAnual');
    const kpiAhorroMensual = document.getElementById('kpiAhorroMensual');
    const kpiAhorroAnual = document.getElementById('kpiAhorroAnual');
    const kpiSuscripcionesActivas = document.getElementById('kpiSuscripcionesActivas');
    const kpiPagosAlerta = document.getElementById('kpiPagosAlerta');

    // Contadores
    const badgeTotalSuscripciones = document.getElementById('badgeTotalSuscripciones');
    const badgeTotalPagos = document.getElementById('badgeTotalPagos');
    const contFiltroTodas = document.getElementById('contFiltroTodas');
    const contFiltroActivas = document.getElementById('contFiltroActivas');
    const contFiltroPausadas = document.getElementById('contFiltroPausadas');
    const contFiltroCanceladas = document.getElementById('contFiltroCanceladas');

    // Resumen agenda
    const resumenTotalPorPagar = document.getElementById('resumenTotalPorPagar');
    const resumenTotalPagado = document.getElementById('resumenTotalPagado');
    const resumenVencidos = document.getElementById('resumenVencidos');

    if (!formSuscripcion || !formPago) return;

    // Establecer fecha de vencimiento mínima como hoy
    if (inputPagoFecha) {
        const hoyStr = new Date().toISOString().split('T')[0];
        inputPagoFecha.value = hoyStr;
        inputPagoFecha.min = hoyStr;
    }

    // Estado del filtro
    let filtroEstadoSuscripcion = 'TODAS';

    // 2. Sincronizar automáticamente con productos bancarios (préstamos y tarjetas)
    try {
        sincronizarPagosDesdeProductos();
    } catch (err) {
        console.warn('Sincronización inicial de deudas:', err);
    }

    // Iconos de categorías
    const ICONOS_CATEGORIA = {
        'Streaming': 'fa-film',
        'Membresía': 'fa-dumbbell',
        'Café y snacks': 'fa-mug-saucer',
        'Apps y software': 'fa-mobile-screen',
        'Transporte': 'fa-car-side',
        'Otro': 'fa-receipt'
    };

    /**
     * Sanitiza texto para prevenir inyecciones
     */
    function escaparTexto(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    /**
     * Actualiza la previsualización en vivo mientras el usuario digita en el formulario
     */
    function actualizarPreviewSuscripcion() {
        const monto = parseFloat(inputSuscMonto.value) || 0;
        const frec = selectSuscFrecuencia.value || 'MENSUAL';

        if (monto <= 0) {
            previewCostoMensual.textContent = '$ 0 COP';
            previewCostoAnual.textContent = '$ 0 COP';
            return;
        }

        const suscTemp = { monto, frecuencia: frec };
        const mensual = calcularCostoMensual(suscTemp);
        const anual = calcularCostoAnual(suscTemp);

        previewCostoMensual.textContent = formatoCOP(mensual);
        previewCostoAnual.textContent = formatoCOP(anual);
    }

    /**
     * Renderiza todo el módulo (KPIs, listados, contadores y agenda)
     */
    function renderizarTodo() {
        const datos = obtenerDatosUsuario();
        const metricas = obtenerMetricasGenerales();

        // 1. Actualizar KPIs superiores
        if (kpiGastoFijoMensual) kpiGastoFijoMensual.textContent = formatoCOP(metricas.gastoFijoMensual);
        if (kpiGastoFijoAnual) kpiGastoFijoAnual.textContent = formatoCOP(metricas.costoSuscripcionesAnio + (metricas.totalPorPagar * 12));
        if (kpiAhorroMensual) kpiAhorroMensual.textContent = `${formatoCOP(metricas.ahorroMensual)} / mes`;
        if (kpiAhorroAnual) kpiAhorroAnual.textContent = `${formatoCOP(metricas.ahorroAnual)} / año`;
        if (kpiSuscripcionesActivas) kpiSuscripcionesActivas.textContent = `${metricas.totalSuscripcionesActivas} activas`;
        if (kpiPagosAlerta) {
            kpiPagosAlerta.textContent = `${metricas.cantidadVencidos} vencidos · ${metricas.cantidadProximos} próximos`;
        }

        // 2. Contadores de chips de filtro
        if (contFiltroTodas) contFiltroTodas.textContent = datos.suscripciones.length;
        if (contFiltroActivas) contFiltroActivas.textContent = metricas.totalSuscripcionesActivas;
        if (contFiltroPausadas) contFiltroPausadas.textContent = metricas.totalSuscripcionesPausadas;
        if (contFiltroCanceladas) contFiltroCanceladas.textContent = metricas.totalSuscripcionesCanceladas;
        if (badgeTotalSuscripciones) badgeTotalSuscripciones.textContent = `${datos.suscripciones.length} registradas`;

        // 3. Renderizar listado de suscripciones
        renderizarSuscripciones(datos.suscripciones);

        // 4. Renderizar tabla de agenda de pagos
        renderizarAgendaPagos(datos.pagosPendientes, metricas);
    }

    /**
     * Renderiza el listado de tarjetas de suscripción
     */
    function renderizarSuscripciones(suscripciones) {
        if (!listaSuscripciones) return;
        listaSuscripciones.innerHTML = '';

        if (!suscripciones || suscripciones.length === 0) {
            listaSuscripciones.innerHTML = `
                <div class="gd-empty-state">
                    <i class="fa-solid fa-cookie-bite"></i>
                    <h3>¡Cero vampiros financieros!</h3>
                    <p>No tienes suscripciones ni gastos hormiga registrados. Agrega tus servicios recurrentes para monitorearlos.</p>
                </div>
            `;
            return;
        }

        // Identificar los 3 más costosos entre las activas
        const activasOrdenadas = [...suscripciones]
            .filter(s => (s.estado || 'ACTIVA').toUpperCase() === 'ACTIVA')
            .sort((a, b) => calcularCostoMensual(b) - calcularCostoMensual(a));
        const top3Ids = new Set(activasOrdenadas.slice(0, 3).map(s => s.id));

        // Filtrar según estado seleccionado
        const filtradas = suscripciones.filter(s => {
            if (filtroEstadoSuscripcion === 'TODAS') return true;
            return (s.estado || 'ACTIVA').toUpperCase() === filtroEstadoSuscripcion;
        });

        if (filtradas.length === 0) {
            listaSuscripciones.innerHTML = `
                <div class="gd-empty-state">
                    <i class="fa-solid fa-filter"></i>
                    <h3>No hay registros en esta categoría</h3>
                    <p>No se encontraron suscripciones con estado "${filtroEstadoSuscripcion.toLowerCase()}".</p>
                </div>
            `;
            return;
        }

        filtradas.forEach(s => {
            const estado = (s.estado || 'ACTIVA').toUpperCase();
            const esTop = top3Ids.has(s.id);
            const iconoClase = ICONOS_CATEGORIA[s.categoria] || 'fa-receipt';
            const mensual = calcularCostoMensual(s);
            const anual = calcularCostoAnual(s);

            let badgeHtml = '';
            let accionesHtml = '';

            if (estado === 'ACTIVA') {
                badgeHtml = `<span class="gd-badge gd-badge-activa"><i class="fa-solid fa-circle-check"></i> Activa</span>`;
                accionesHtml = `
                    <button type="button" class="gd-btn-action btn-pause" data-action="pausar" data-id="${s.id}" title="Pausar suscripción">
                        <i class="fa-solid fa-pause"></i>
                    </button>
                    <button type="button" class="gd-btn-action btn-cancel" data-action="cancelar" data-id="${s.id}" title="Cancelar suscripción">
                        <i class="fa-solid fa-ban"></i>
                    </button>
                    <button type="button" class="gd-btn-action btn-delete" data-action="eliminar" data-id="${s.id}" title="Eliminar definitivamente">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            } else if (estado === 'PAUSADA') {
                badgeHtml = `<span class="gd-badge gd-badge-pausada"><i class="fa-solid fa-circle-pause"></i> Pausada</span>`;
                accionesHtml = `
                    <button type="button" class="gd-btn-action btn-resume" data-action="reactivar" data-id="${s.id}" title="Reactivar suscripción">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button type="button" class="gd-btn-action btn-cancel" data-action="cancelar" data-id="${s.id}" title="Cancelar suscripción">
                        <i class="fa-solid fa-ban"></i>
                    </button>
                    <button type="button" class="gd-btn-action btn-delete" data-action="eliminar" data-id="${s.id}" title="Eliminar definitivamente">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            } else {
                badgeHtml = `<span class="gd-badge gd-badge-cancelada"><i class="fa-solid fa-circle-xmark"></i> Cancelada</span>`;
                accionesHtml = `
                    <button type="button" class="gd-btn-action btn-resume" data-action="reactivar" data-id="${s.id}" title="Reactivar suscripción">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                    <button type="button" class="gd-btn-action btn-delete" data-action="eliminar" data-id="${s.id}" title="Eliminar definitivamente">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = `gd-suscripcion-item ${esTop ? 'is-top' : ''}`;
            itemDiv.innerHTML = `
                <div class="gd-suscripcion-left">
                    <div class="gd-cat-icono">
                        <i class="fa-solid ${iconoClase}"></i>
                    </div>
                    <div class="gd-suscripcion-meta">
                        <div class="gd-suscripcion-titulo-row">
                            <span class="gd-suscripcion-nombre">${escaparTexto(s.nombre)}</span>
                            ${esTop ? '<span class="gd-tag-top">Top Gasto</span>' : ''}
                        </div>
                        <div class="gd-suscripcion-detalles">
                            <span>${escaparTexto(s.categoria)}</span>
                            <span>•</span>
                            <span>${s.frecuencia.toLowerCase()}</span>
                            <span>•</span>
                            ${badgeHtml}
                        </div>
                    </div>
                </div>
                <div class="gd-suscripcion-right">
                    <div class="gd-suscripcion-monto">${formatoCOP(mensual)} <span style="font-size:0.7rem; color:#64748b;">/mes</span></div>
                    <div class="gd-suscripcion-anual">${formatoCOP(anual)} /año</div>
                    <div class="gd-item-actions">
                        ${accionesHtml}
                    </div>
                </div>
            `;

            listaSuscripciones.appendChild(itemDiv);
        });
    }

    /**
     * Renderiza la tabla de agenda de pagos pendientes
     */
    function renderizarAgendaPagos(pagos, metricas) {
        if (!cuerpoTablaPagos) return;
        cuerpoTablaPagos.innerHTML = '';

        if (badgeTotalPagos) {
            badgeTotalPagos.textContent = `${metricas.totalPagosPendientes} pendientes`;
        }
        if (resumenTotalPorPagar) resumenTotalPorPagar.textContent = formatoCOP(metricas.totalPorPagar);
        if (resumenTotalPagado) resumenTotalPagado.textContent = formatoCOP(metricas.totalPagado);
        if (resumenVencidos) resumenVencidos.textContent = metricas.cantidadVencidos;

        if (!pagos || pagos.length === 0) {
            cuerpoTablaPagos.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="gd-empty-state" style="padding: 1.8rem 1rem;">
                            <i class="fa-solid fa-calendar-check"></i>
                            <h3>Agenda al día</h3>
                            <p>No tienes compromisos de pago registrados para este periodo.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Ordenar: primero no pagados ordenados por fecha ascendente, luego pagados
        const ordenados = [...pagos].sort((a, b) => {
            if (a.pagado !== b.pagado) return a.pagado ? 1 : -1;
            return new Date(a.fechaVencimiento || 0) - new Date(b.fechaVencimiento || 0);
        });

        ordenados.forEach(p => {
            const semaforo = obtenerEstadoVencimiento(p.fechaVencimiento, p.pagado);
            const esOrigenBank = p.origen === 'PRESTAMO' || p.origen === 'TARJETA';

            const fila = document.createElement('tr');
            if (p.pagado) fila.classList.add('fila-pagada');

            fila.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: #0f172a;">${escaparTexto(p.nombre)}</div>
                    ${esOrigenBank ? '<div class="gd-origen-tag"><i class="fa-solid fa-building-columns"></i> Finara Bank</div>' : ''}
                </td>
                <td style="font-weight: 600; white-space: nowrap;">
                    ${formatoCOP(p.monto)}
                </td>
                <td>
                    <span class="gd-semaforo-badge ${semaforo.clase}">
                        <i class="fa-solid ${p.pagado ? 'fa-check' : (semaforo.estado === 'VENCIDO' ? 'fa-triangle-exclamation' : 'fa-clock')}"></i>
                        ${semaforo.texto}
                    </span>
                    <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">
                        ${p.fechaVencimiento || 'Sin fecha'}
                    </div>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div class="gd-item-actions" style="justify-content: flex-end;">
                        <button type="button" class="gd-btn-action ${p.pagado ? 'btn-resume' : 'btn-pause'}" 
                                data-action="toggle-pago" data-id="${p.id}" data-pagado="${p.pagado}"
                                title="${p.pagado ? 'Desmarcar pago' : 'Marcar como pagado'}">
                            <i class="fa-solid ${p.pagado ? 'fa-rotate-left' : 'fa-check'}"></i>
                        </button>
                        <button type="button" class="gd-btn-action btn-delete" 
                                data-action="eliminar-pago" data-id="${p.id}" title="Eliminar pago de la agenda">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            cuerpoTablaPagos.appendChild(fila);
        });
    }

    // ==============================================================
    // EVENTOS Y MANEJADORES
    // ==============================================================

    // Live preview en suscripción
    inputSuscMonto.addEventListener('input', actualizarPreviewSuscripcion);
    selectSuscFrecuencia.addEventListener('change', actualizarPreviewSuscripcion);

    // Registro de Suscripción
    formSuscripcion.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            const nombre = inputSuscNombre.value.trim();
            const categoria = selectSuscCategoria.value;
            const frecuencia = selectSuscFrecuencia.value;
            const monto = parseFloat(inputSuscMonto.value);

            crearSuscripcion({ nombre, categoria, monto, frecuencia });

            formSuscripcion.reset();
            actualizarPreviewSuscripcion();
            renderizarTodo();

            if (window.Swal) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `Suscripción "${nombre}" agregada`,
                    showConfirmButton: false,
                    timer: 2500,
                    background: '#12151c',
                    color: '#ffffff'
                });
            }
        } catch (error) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Atención',
                    text: error.message || 'No fue posible registrar la suscripción.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
            } else {
                alert(error.message);
            }
        }
    });

    // Registro de Pago Pendiente
    formPago.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
            const nombre = inputPagoNombre.value.trim();
            const tipo = selectPagoTipo.value;
            const fechaVencimiento = inputPagoFecha.value;
            const monto = parseFloat(inputPagoMonto.value);

            crearPagoPendiente({
                nombre,
                tipo,
                monto,
                fechaVencimiento,
                origen: 'MANUAL'
            });

            formPago.reset();
            // Restaurar fecha mínima a hoy
            const hoyStr = new Date().toISOString().split('T')[0];
            inputPagoFecha.value = hoyStr;
            renderizarTodo();

            if (window.Swal) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `Pago "${nombre}" agendado con éxito`,
                    showConfirmButton: false,
                    timer: 2500,
                    background: '#12151c',
                    color: '#ffffff'
                });
            }
        } catch (error) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Atención',
                    text: error.message || 'No fue posible agendar el pago.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#10b981'
                });
            } else {
                alert(error.message);
            }
        }
    });

    // Chips de Filtro
    if (filtrosContainer) {
        filtrosContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.gd-chip');
            if (!btn) return;
            filtrosContainer.querySelectorAll('.gd-chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            filtroEstadoSuscripcion = btn.getAttribute('data-filtro') || 'TODAS';
            renderizarTodo();
        });
    }

    // Acciones sobre tarjetas de suscripción (Pausar, Reactivar, Cancelar, Eliminar)
    if (listaSuscripciones) {
        listaSuscripciones.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const accion = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');

            if (accion === 'pausar') {
                const res = await Swal.fire({
                    title: '¿Pausar suscripción?',
                    text: 'Se sumará a tu Ahorro Potencial mientras permanezca inactiva.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, pausar',
                    cancelButtonText: 'Cancelar',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#f59e0b',
                    cancelButtonColor: '#475569'
                });
                if (res.isConfirmed) {
                    cambiarEstadoSuscripcion(id, 'PAUSADA');
                    renderizarTodo();
                }
            } else if (accion === 'reactivar') {
                cambiarEstadoSuscripcion(id, 'ACTIVA');
                renderizarTodo();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Suscripción reactivada',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#12151c',
                    color: '#ffffff'
                });
            } else if (accion === 'cancelar') {
                const res = await Swal.fire({
                    title: '¿Cancelar suscripción?',
                    text: 'Confirmarás que no seguirás pagando este servicio. Tu ahorro anual proyectado aumentará.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, dar de baja',
                    cancelButtonText: 'Volver',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#dc2626',
                    cancelButtonColor: '#475569'
                });
                if (res.isConfirmed) {
                    cambiarEstadoSuscripcion(id, 'CANCELADA');
                    renderizarTodo();
                }
            } else if (accion === 'eliminar') {
                const res = await Swal.fire({
                    title: '¿Eliminar registro?',
                    text: 'Esta acción borrará la suscripción de forma permanente.',
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
                    eliminarSuscripcion(id);
                    renderizarTodo();
                }
            }
        });
    }

    // Acciones sobre pagos en la agenda
    if (cuerpoTablaPagos) {
        cuerpoTablaPagos.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const accion = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');

            if (accion === 'toggle-pago') {
                const estaPagado = btn.getAttribute('data-pagado') === 'true';

                if (!estaPagado) {
                    const res = await Swal.fire({
                        title: '¿Marcar como pagado?',
                        text: 'Este pago se marcará como completado en tu agenda del mes. Recuerda que no debita saldo bancario automáticamente.',
                        icon: 'info',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, marcar pagado',
                        cancelButtonText: 'Cancelar',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#10b981',
                        cancelButtonColor: '#475569'
                    });
                    if (res.isConfirmed) {
                        marcarPagoPagado(id, true);
                        renderizarTodo();
                    }
                } else {
                    marcarPagoPagado(id, false);
                    renderizarTodo();
                }
            } else if (accion === 'eliminar-pago') {
                const res = await Swal.fire({
                    title: '¿Eliminar este pago?',
                    text: 'Se removerá de tu lista de compromisos.',
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
                    eliminarPagoPendiente(id);
                    renderizarTodo();
                }
            }
        });
    }

    // Botón de sincronización con Finara Bank
    if (btnSyncFinara) {
        btnSyncFinara.addEventListener('click', () => {
            sincronizarPagosDesdeProductos();
            renderizarTodo();
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Sincronización completada!',
                    text: 'Tus cuotas de préstamos y deudas de tarjetas de crédito han sido actualizadas en la agenda.',
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
