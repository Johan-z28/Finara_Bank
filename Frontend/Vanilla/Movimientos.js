import { initGlobalComponents } from './app.js';
import { PERIODOS, obtenerCuentasFiltro, obtenerMovimientos, SesionExpiradaError } from './movimientosService.js';

const TAMANO_PAGINA = 8;

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

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
    const tdFecha = el('td');
    tdFecha.dataset.label = 'Fecha';
    tdFecha.append(el('span', 'mov-fecha', formatoFecha.format(fecha)), el('span', 'mov-hora', formatoHora.format(fecha)));

    const tdDesc = el('td');
    tdDesc.dataset.label = 'Descripción';
    tdDesc.append(el('span', 'mov-desc', mov.descripcion));
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
        `${esIngreso ? '+' : '−'} ${formatoCOP.format(mov.valor)}`));

    fila.append(tdFecha, tdDesc, tdTipo, tdValor);
    return fila;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa la hamburguesa, el menú de perfil y los datos compartidos
    initGlobalComponents();

    const $ = id => document.getElementById(id);
    const selCuenta = $('filtroCuenta'), selPeriodo = $('filtroPeriodo'), selOrden = $('filtroOrden');
    const cuerpo = $('movCuerpo'), estado = $('movEstado'), tablaWrap = $('movTablaWrap');
    const btnPrev = $('pagPrev'), btnNext = $('pagNext'), pagInfo = $('pagInfo'), pagResumen = $('pagResumen');
    const totIngresos = $('totIngresos'), totEgresos = $('totEgresos');

    const filtros = { cuentaId: null, periodo: '30d', orden: 'desc', pagina: 1 };
    let peticion = 0; // descarta respuestas viejas si el usuario cambia filtros rápido

    PERIODOS.forEach(p => {
        const o = el('option', '', p.etiqueta);
        o.value = p.valor;
        selPeriodo.append(o);
    });
    selPeriodo.value = filtros.periodo;

    const mostrarEstado = (mensaje, { reintentar = false } = {}) => {
        estado.replaceChildren(el('p', '', mensaje));
        if (reintentar) {
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
                mostrarEstado('No hay movimientos en este periodo.');
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
        filtros.orden = selOrden.value;
        filtros.pagina = 1;
        cargar();
    };
    [selCuenta, selPeriodo, selOrden].forEach(s => s.addEventListener('change', alCambiarFiltro));
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
        filtros.cuentaId = selCuenta.value;
        cargar();
    } catch (err) {
        if (err instanceof SesionExpiradaError) { window.location.href = '../index.html'; return; }
        mostrarEstado('No pudimos cargar tus cuentas. Intenta de nuevo.', { reintentar: true });
    }
});