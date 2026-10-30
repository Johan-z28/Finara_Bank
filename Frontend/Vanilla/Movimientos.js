import { PERIODOS, obtenerCuentasFiltro, obtenerMovimientos, SesionExpiradaError } from './movimientosService.js';

// Helper seguro para guardar notificaciones en localStorage
function guardarNotificacionLocal(notif) {
    try {
        const notifs = JSON.parse(localStorage.getItem('finara_notificaciones')) || [];
        notifs.unshift({
            id: `NOTIF-${Date.now()}`,
            ...notif,
            fecha: new Date().toISOString(),
            leida: false
        });
        localStorage.setItem('finara_notificaciones', JSON.stringify(notifs.slice(0, 30)));
    } catch {
        // Ignorar excepciones de cuota
    }
}

const TAMANO_PAGINA = 8;

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

function el(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

// ----- Una fila de la tabla -----
function crearFila(mov) {
    const esIngreso = mov.tipo === 'INGRESO';
    const fila = el('tr', `mov-fila mov-fila--${esIngreso ? 'ingreso' : 'egreso'}`);

    const fecha = new Date(mov.fecha);
    const fechaValida = !isNaN(fecha.getTime()) ? fecha : new Date();

    const tdFecha = el('td');
    tdFecha.dataset.label = 'Fecha';
    tdFecha.append(
        el('span', 'mov-fecha', formatoFecha.format(fechaValida)),
        el('span', 'mov-hora', formatoHora.format(fechaValida))
    );

    const tdDesc = el('td');
    tdDesc.dataset.label = 'Descripción';
    tdDesc.append(el('span', 'mov-desc', mov.descripcion || 'Transacción bancaria'));
    if (mov.categoria) tdDesc.append(el('span', 'mov-categoria', mov.categoria));

    const tdTipo = el('td');
    tdTipo.dataset.label = 'Tipo';
    const badge = el('span', `mov-badge mov-badge--${esIngreso ? 'ingreso' : 'egreso'}`);
    const icono = el('i', `fa-solid ${esIngreso ? 'fa-arrow-down' : 'fa-arrow-up'}`);
    icono.setAttribute('aria-hidden', 'true');
    badge.append(icono, document.createTextNode(esIngreso ? ' Ingreso' : ' Egreso'));
    tdTipo.append(badge);

    const tdValor = el('td', 'mov-valor-celda');
    tdValor.dataset.label = 'Valor';
    tdValor.append(el('strong', `mov-valor mov-valor--${esIngreso ? 'ingreso' : 'egreso'}`,
        `${esIngreso ? '+' : '−'} ${formatoCOP.format(Number(mov.valor) || 0)}`));

    fila.append(tdFecha, tdDesc, tdTipo, tdValor);
    return fila;
}

export async function initMovimientosView() {
    const $ = id => document.getElementById(id);
    const selCuenta = $('filtroCuenta'), selPeriodo =$('filtroPeriodo');
    const selTipo = $('filtroTipo'), selOrden =$('filtroOrden');
    const cuerpo = $('movCuerpo'), estado = $('movEstado'), tablaWrap =$('movTablaWrap');
    const btnPrev = $('pagPrev'), btnNext =$('pagNext'), pagInfo = $('pagInfo'), pagResumen =$('pagResumen');
    const totIngresos = $('totIngresos'), totEgresos =$('totEgresos');

    if (!cuerpo) return; // Si no está en el DOM, abortar

    const filtros = { cuentaId: null, periodo: '30d', tipo: 'todos', orden: 'desc', pagina: 1 };
    let peticion = 0;

    if (selPeriodo) {
        selPeriodo.replaceChildren();
        PERIODOS.forEach(p => {
            const o = el('option', '', p.etiqueta);
            o.value = p.valor;
            selPeriodo.append(o);
        });
        selPeriodo.value = filtros.periodo;
    }

    const mostrarEstado = (mensaje, { reintentar = false, restablecer = false } = {}) => {
        if (!estado) return;
        estado.replaceChildren();
        const p = el('p', '', mensaje);
        estado.append(p);

        if (reintentar) {
            const b = el('button', 'btn-reintentar', 'Reintentar');
            b.addEventListener('click', cargar);
            estado.append(b);
        }

        estado.classList.remove('hidden');
        if (tablaWrap) tablaWrap.classList.add('hidden');
    };

    async function cargar() {
        const mia = ++peticion;
        if (estado) estado.classList.add('hidden');
        if (tablaWrap) {
            tablaWrap.classList.remove('hidden');
            tablaWrap.setAttribute('aria-busy', 'true');
        }
        [btnPrev, btnNext].forEach(b => { if (b) b.disabled = true; });
        
        cuerpo.replaceChildren(...Array.from({ length: 5 }, () => {
            const tr = el('tr', 'mov-skeleton');
            const td = el('td'); td.colSpan = 4;
            tr.append(td);
            return tr;
        }));

        try {
            const r = await obtenerMovimientos({ ...filtros, tamano: TAMANO_PAGINA });
            if (mia !== peticion) return;

            filtros.pagina = r.pagina;
            if (totIngresos) totIngresos.textContent = formatoCOP.format(r.resumen.ingresos);
            if (totEgresos) totEgresos.textContent = formatoCOP.format(r.resumen.egresos);

            if (!r.items.length) {
                if (pagResumen) pagResumen.textContent = '';
                if (pagInfo) pagInfo.textContent = '';
                mostrarEstado('No hay movimientos registrados en este periodo.', { restablecer: filtros.periodo !== 'todo' });
                return;
            }

            cuerpo.replaceChildren(...r.items.map(crearFila));
            const ini = (r.pagina - 1) * TAMANO_PAGINA + 1;
            if (pagResumen) pagResumen.textContent = `Mostrando ${ini}–${ini + r.items.length - 1} de ${r.total}`;
            if (pagInfo) pagInfo.textContent = `Página ${r.pagina} de ${r.totalPaginas}`;
            if (btnPrev) btnPrev.disabled = r.pagina <= 1;
            if (btnNext) btnNext.disabled = r.pagina >= r.totalPaginas;
        } catch (err) {
            if (mia !== peticion) return;
            if (err instanceof SesionExpiradaError) { window.location.href = '../index.html'; return; }
            mostrarEstado('No pudimos cargar los movimientos. Intenta de nuevo.', { reintentar: true });
        } finally {
            if (mia === peticion && tablaWrap) tablaWrap.setAttribute('aria-busy', 'false');
        }
    }

    const alCambiarFiltro = () => {
        if (selCuenta) filtros.cuentaId = selCuenta.value;
        if (selPeriodo) filtros.periodo = selPeriodo.value;
        filtros.tipo = selTipo ? selTipo.value : 'todos';
        if (selOrden) filtros.orden = selOrden.value;
        filtros.pagina = 1;
        cargar();
    };

    [selCuenta, selPeriodo, selTipo, selOrden].filter(Boolean).forEach(s => s.addEventListener('change', alCambiarFiltro));
    if (btnPrev) btnPrev.addEventListener('click', () => { filtros.pagina--; cargar(); });
    if (btnNext) btnNext.addEventListener('click', () => { filtros.pagina++; cargar(); });

    try {
        const cuentas = await obtenerCuentasFiltro();
        if (!cuentas.length) { mostrarEstado('Aún no tienes cuentas asociadas.'); return; }
        if (selCuenta) {
            selCuenta.replaceChildren();
            cuentas.forEach(c => {
                const o = el('option', '', `${c.nombre} · •••• ${String(c.numero).replace(/\D/g, '').slice(-4)}`);
                o.value = c.id;
                selCuenta.append(o);
            });
            filtros.cuentaId = selCuenta.value;
        }

        const selExtractoCuenta = $('extractoCuentaSelect');
        if (selExtractoCuenta) {
            selExtractoCuenta.replaceChildren();
            cuentas.forEach(c => {
                const opt = el('option', '', `${c.nombre} · •••• ${String(c.numero).replace(/\D/g, '').slice(-4)}`);
                opt.value = c.id;
                selExtractoCuenta.append(opt);
            });
        }

        cargar();
    } catch (err) {
        if (err instanceof SesionExpiradaError) { window.location.href = '../index.html'; return; }
        mostrarEstado('No pudimos cargar tus cuentas. Intenta de nuevo.', { reintentar: true });
    }

    // Modal de Extractos Bancarios
    const modalExtracto = $('modalExtractoBancario');
    const btnAbrirModal = $('btnAbrirModalExtracto');
    const btnCerrarModal = $('btnCerrarModalExtracto');
    const btnCancelarModal = $('btnCancelarExtracto');
    const formExtracto = $('formGenerarExtracto');
    const selMes = $('extractoMesSelect');
    const selAnio = $('extractoAnioSelect');

    if (selMes) selMes.value = String(new Date().getMonth() + 1);

    const abrirModal = () => modalExtracto && modalExtracto.classList.remove('hidden');
    const cerrarModal = () => modalExtracto && modalExtracto.classList.add('hidden');

    if (btnAbrirModal) btnAbrirModal.addEventListener('click', abrirModal);
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModal);
    if (modalExtracto) {
        modalExtracto.addEventListener('click', (e) => {
            if (e.target === modalExtracto) cerrarModal();
        });
    }

    if (formExtracto) {
        formExtracto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const cuentaId = $('extractoCuentaSelect').value;
            const mes = selMes.value;
            const anio = selAnio.value;

            try {
                let modExtracto = null;
                try { modExtracto = await import('./extractoService.js'); } catch {}

                if (modExtracto && typeof modExtracto.obtenerDatosExtracto === 'function') {
                    const datosDoc = await modExtracto.obtenerDatosExtracto(cuentaId, mes, anio);
                    if (typeof modExtracto.descargarExtractoPDF === 'function') {
                        modExtracto.descargarExtractoPDF(datosDoc);
                    }
                    guardarNotificacionLocal({
                        titulo: 'Extracto bancario generado',
                        mensaje: `Se descargó exitosamente el extracto de ${datosDoc.cuenta.tipo} (terminada en ${String(datosDoc.cuenta.numero).slice(-4)}) para el periodo ${datosDoc.periodoTexto}. Folio: ${datosDoc.folioCertificado}.`,
                        tipo: 'exito'
                    });
                } else {
                    guardarNotificacionLocal({
                        titulo: 'Extracto bancario',
                        mensaje: `Generación de extracto solicitada para el periodo seleccionado.`,
                        tipo: 'info'
                    });
                }

                cerrarModal();

                if (window.Swal) {
                    Swal.fire({
                        title: '¡Extracto Solicitado!',
                        text: 'Tu extracto bancario ha sido procesado correctamente.',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: 'Aceptar'
                    });
                }
            } catch (err) {
                console.error('Error al generar extracto:', err);
                if (window.Swal) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al generar extracto',
                        text: err.message || 'No se pudo generar el documento.',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c'
                    });
                }
            }
        });
    }
}

// Soporte para ejecución tradicional cuando se abre directamente
document.addEventListener('DOMContentLoaded', () => {
    initMovimientosView();
});