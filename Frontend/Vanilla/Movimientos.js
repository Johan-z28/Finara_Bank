import { initGlobalComponents } from './Global/app.js';
import { PERIODOS, obtenerCuentasFiltro, obtenerMovimientos, SesionExpiradaError } from './movimientosService.js';
import { obtenerDatosExtracto, descargarExtractoPDF } from './extractoService.js';
import { guardarNotificacion } from './notificaciones.js';

const TAMANO_PAGINA = 8;

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

function el(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto; // textContent: evita inyección HTML
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

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa la hamburguesa, el menú de perfil y los datos compartidos
    initGlobalComponents();

    const $ = id => document.getElementById(id);
    const selCuenta = $('filtroCuenta'), selPeriodo = $('filtroPeriodo');
    const selTipo = $('filtroTipo'), selOrden = $('filtroOrden');
    const cuerpo = $('movCuerpo'), estado = $('movEstado'), tablaWrap = $('movTablaWrap');
    const btnPrev = $('pagPrev'), btnNext = $('pagNext'), pagInfo = $('pagInfo'), pagResumen = $('pagResumen');
    const totIngresos = $('totIngresos'), totEgresos = $('totEgresos');

    const filtros = { cuentaId: null, periodo: '30d', tipo: 'todos', orden: 'desc', pagina: 1 };
    let peticion = 0; // descarta respuestas viejas si el usuario cambia filtros rápido

    PERIODOS.forEach(p => {
        const o = el('option', '', p.etiqueta);
        o.value = p.valor;
        selPeriodo.append(o);
    });
    selPeriodo.value = filtros.periodo;

    const mostrarEstado = (mensaje, { reintentar = false, restablecer = false } = {}) => {
        estado.replaceChildren();
        const p = el('p', '', mensaje);
        estado.append(p);

        if (restablecer) {
            const btnReset = el('button', 'btn-reintentar', 'Ver todo el historial');
            btnReset.addEventListener('click', () => {
                selPeriodo.value = 'todo';
                filtros.periodo = 'todo';
                filtros.pagina = 1;
                cargar();
            });
            estado.append(btnReset);
        } else if (reintentar) {
            const b = el('button', 'btn-reintentar', 'Reintentar');
            b.addEventListener('click', cargar);
            estado.append(b);
        }

        estado.classList.remove('hidden');
        tablaWrap.classList.add('hidden');
    };

    async function cargar() {
        const mia = ++peticion;
        estado.classList.add('hidden');
        tablaWrap.classList.remove('hidden');
        tablaWrap.setAttribute('aria-busy', 'true');
        [btnPrev, btnNext].forEach(b => b.disabled = true);
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
            totIngresos.textContent = formatoCOP.format(r.resumen.ingresos);
            totEgresos.textContent = formatoCOP.format(r.resumen.egresos);

            if (!r.items.length) {
                pagResumen.textContent = '';
                pagInfo.textContent = '';
                mostrarEstado('No hay movimientos registrados en este periodo.', { restablecer: filtros.periodo !== 'todo' });
                return;
            }

            cuerpo.replaceChildren(...r.items.map(crearFila));
            const ini = (r.pagina - 1) * TAMANO_PAGINA + 1;
            pagResumen.textContent = `Mostrando ${ini}–${ini + r.items.length - 1} de ${r.total}`;
            pagInfo.textContent = `Página ${r.pagina} de ${r.totalPaginas}`;
            btnPrev.disabled = r.pagina <= 1;
            btnNext.disabled = r.pagina >= r.totalPaginas;
        } catch (err) {
            if (mia !== peticion) return;
            if (err instanceof SesionExpiradaError) { window.location.href = '../index.html'; return; }
            mostrarEstado('No pudimos cargar los movimientos. Intenta de nuevo.', { reintentar: true });
        } finally {
            if (mia === peticion) tablaWrap.setAttribute('aria-busy', 'false');
        }
    }

    // Cualquier cambio de filtro vuelve a la página 1
    const alCambiarFiltro = () => {
        filtros.cuentaId = selCuenta.value;
        filtros.periodo = selPeriodo.value;
        filtros.tipo = selTipo ? selTipo.value : 'todos';
        filtros.orden = selOrden.value;
        filtros.pagina = 1;
        cargar();
    };
    [selCuenta, selPeriodo, selTipo, selOrden].filter(Boolean).forEach(s => s.addEventListener('change', alCambiarFiltro));
    btnPrev.addEventListener('click', () => { filtros.pagina--; cargar(); });
    btnNext.addEventListener('click', () => { filtros.pagina++; cargar(); });

    // Carga inicial: primero las cuentas del selector, luego los movimientos
    try {
        const cuentas = await obtenerCuentasFiltro();
        if (!cuentas.length) { mostrarEstado('Aún no tienes cuentas asociadas.'); return; }
        cuentas.forEach(c => {
            const o = el('option', '', `${c.nombre} · •••• ${String(c.numero).replace(/\D/g, '').slice(-4)}`);
            o.value = c.id;
            selCuenta.append(o);
        });
        // Poblar selector del modal de extractos
        const selExtractoCuenta = $('extractoCuentaSelect');
        if (selExtractoCuenta) {
            selExtractoCuenta.replaceChildren();
            cuentas.forEach(c => {
                const opt = el('option', '', `${c.nombre} · •••• ${String(c.numero).replace(/\D/g, '').slice(-4)}`);
                opt.value = c.id;
                selExtractoCuenta.append(opt);
            });
        }

        filtros.cuentaId = selCuenta.value;
        cargar();
    } catch (err) {
        if (err instanceof SesionExpiradaError) { window.location.href = '../index.html'; return; }
        mostrarEstado('No pudimos cargar tus cuentas. Intenta de nuevo.', { reintentar: true });
    }

    // ----- Manejo de Modal de Extractos Bancarios (HU-19) -----
    const modalExtracto = $('modalExtractoBancario');
    const btnAbrirModal = $('btnAbrirModalExtracto');
    const btnCerrarModal = $('btnCerrarModalExtracto');
    const btnCancelarModal = $('btnCancelarExtracto');
    const formExtracto = $('formGenerarExtracto');
    const selMes = $('extractoMesSelect');
    const selAnio = $('extractoAnioSelect');

    // Seleccionar por defecto el mes actual
    if (selMes) selMes.value = String(new Date().getMonth() + 1);

    const abrirModal = () => {
        if (!modalExtracto) return;
        modalExtracto.classList.remove('hidden');
    };

    const cerrarModal = () => {
        if (!modalExtracto) return;
        modalExtracto.classList.add('hidden');
    };

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
                const datosDoc = await obtenerDatosExtracto(cuentaId, mes, anio);
                descargarExtractoPDF(datosDoc);

                cerrarModal();

                if (window.Swal) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Extracto Generado con Éxito!',
                        html: `
                            <p style="color: #cbd5e1; font-size: 0.95rem;">
                                Se ha descargado el extracto oficial de <strong>${datosDoc.cuenta.tipo}</strong> para el periodo <strong>${datosDoc.periodoTexto}</strong>.
                            </p>
                            <small style="color: #94a3b8; display: block; margin-top: 0.5rem;">
                                Revisa tu carpeta de Descargas o la ventana de impresión para guardarlo como PDF.
                            </small>
                        `,
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c'
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
});
