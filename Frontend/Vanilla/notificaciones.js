// Vanilla/notificaciones.js
// Manejo seguro de notificaciones locales y estado de la campana

export function obtenerNotificaciones() {
    try {
        return JSON.parse(localStorage.getItem('finara_notificaciones')) || [];
    } catch {
        return [];
    }
}

export function actualizarCampana() {
    try {
        const notifs = obtenerNotificaciones();
        const badge = document.getElementById('notificacionesBadge') || document.querySelector('.notif-badge');
        if (badge) {
            const noLeidas = notifs.filter(n => !n.leida).length;
            badge.textContent = noLeidas > 99 ? '99+' : String(noLeidas);
            badge.style.display = noLeidas > 0 ? 'inline-flex' : 'none';
        }
    } catch (e) {
        console.warn("Error al actualizar campana de notificaciones:", e);
    }
}

export function initCampanaNotificaciones() {
    actualizarCampana();
}

export default {
    obtenerNotificaciones,
    actualizarCampana,
    initCampanaNotificaciones
};
