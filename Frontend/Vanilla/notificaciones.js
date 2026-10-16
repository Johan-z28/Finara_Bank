// Vanilla/notificaciones.js
// Notificaciones guardadas en localStorage + campana del navbar.
// Reutilizable en cualquier página: basta con llamar initCampanaNotificaciones().

const CLAVE = 'finara_notificaciones';
const MAXIMO = 30;

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function leer() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE));
        return Array.isArray(datos) ? datos : [];
    } catch { return []; }
}

function escribir(lista) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAXIMO))); } catch { /* sin espacio / modo privado */ }
}

// tipo: 'exito' | 'alerta' | 'info'
export function guardarNotificacion({ titulo, mensaje, tipo = 'info' }) {
    const nueva = {
        id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        titulo, mensaje, tipo, fecha: new Date().toISOString(), leida: false
    };
    escribir([nueva, ...leer()]);
    return nueva;
}

export const obtenerNotificaciones = leer;

function marcarTodasLeidas() {
    escribir(leer().map(n => ({ ...n, leida: true })));
}

// ----- Campana del navbar -----
let boton = null, panel = null, badge = null;

const ICONOS = { exito: 'fa-circle-check', alerta: 'fa-triangle-exclamation', info: 'fa-circle-info' };

function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto; // textContent: evita inyección HTML
    return n;
}

function pintarPanel() {
    const lista = leer();
    panel.replaceChildren(el('div', 'notif-titulo', 'Notificaciones'));

    if (!lista.length) {
        panel.append(el('p', 'notif-vacio', 'No tienes notificaciones.'));
        return;
    }
    lista.forEach(n => {
        const item = el('div', `notif-item notif-item--${n.tipo}${n.leida ? '' : ' notif-item--nueva'}`);
        const icono = el('i', `fa-solid ${ICONOS[n.tipo] ?? ICONOS.info} notif-icono`);
        icono.setAttribute('aria-hidden', 'true');
        const cuerpo = el('div', 'notif-cuerpo');
        cuerpo.append(el('strong', '', n.titulo), el('p', '', n.mensaje), el('small', '', formatoFecha.format(new Date(n.fecha))));
        item.append(icono, cuerpo);
        panel.append(item);
    });
}

export function actualizarCampana() {
    if (!boton) return;
    const sinLeer = leer().filter(n => !n.leida).length;
    badge.textContent = sinLeer > 9 ? '9+' : String(sinLeer);
    badge.classList.toggle('hidden', sinLeer === 0);
    boton.setAttribute('aria-label', sinLeer ? `Notificaciones (${sinLeer} sin leer)` : 'Notificaciones');
    if (panel.classList.contains('active')) pintarPanel();
}

export function initCampanaNotificaciones() {
    boton = document.querySelector('.navbar-actions .icon-btn[aria-label^="Notificaciones"]');
    const contenedor = document.querySelector('.navbar-actions');
    if (!boton || !contenedor) return;

    badge = el('span', 'notif-badge hidden');
    boton.append(badge);
    panel = el('div', 'notif-panel');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Notificaciones');
    contenedor.append(panel);

    boton.addEventListener('click', e => {
        e.stopPropagation();
        const abrir = !panel.classList.contains('active');
        panel.classList.toggle('active', abrir);
        if (abrir) {
            pintarPanel();
            marcarTodasLeidas(); // se pintan como "nuevas" y el contador se limpia
            badge.classList.add('hidden');
        }
    });
    document.addEventListener('click', e => { if (!panel.contains(e.target)) panel.classList.remove('active'); });

    actualizarCampana();
}