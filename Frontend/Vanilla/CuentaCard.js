// Vanilla/componentes/CuentaCard.js
// Componente visual de una cuenta: tipo, número parcial y saldo.

const TIPOS = {
    AHORROS: { etiqueta: 'Cuenta de Ahorros', icono: 'fa-piggy-bank', clase: 'ahorros', saldoLabel: 'Saldo disponible' },
    CORRIENTE: { etiqueta: 'Cuenta Corriente', icono: 'fa-building-columns', clase: 'corriente', saldoLabel: 'Saldo disponible' },
    TARJETA_CREDITO: { etiqueta: 'Tarjeta de Crédito', icono: 'fa-credit-card', clase: 'tarjeta', saldoLabel: 'Cupo disponible' }
};

const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
});

// Solo se muestran los últimos 4 dígitos, aunque el API enviara el número completo.
export function enmascararNumero(numero) {
    const ultimos = String(numero ?? '').replace(/\D/g, '').slice(-4);
    return `•••• ${ultimos}`;
}

function el(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto; // textContent: evita inyección HTML
    return nodo;
}

export function crearCuentaCard(cuenta, { ocultarSaldo = false } = {}) {
    const tipo = TIPOS[cuenta.tipo] ?? { etiqueta: 'Producto', icono: 'fa-wallet', clase: 'otro', saldoLabel: 'Saldo' };

    const card = el('article', `cuenta-card cuenta-card--${tipo.clase}`);
    card.setAttribute('aria-label', `${tipo.etiqueta} ${enmascararNumero(cuenta.numero)}`);

    const cabecera = el('div', 'cuenta-card__head');
    const icono = el('div', 'cuenta-card__icon');
    const i = el('i', `fa-solid ${tipo.icono}`);
    i.setAttribute('aria-hidden', 'true');
    icono.appendChild(i);

    const titulos = el('div', 'cuenta-card__titles');
    titulos.append(el('h3', 'cuenta-card__tipo', tipo.etiqueta), el('span', 'cuenta-card__numero', enmascararNumero(cuenta.numero)));

    const estado = el('span', `cuenta-card__estado${cuenta.estado === 'ACTIVA' ? '' : ' cuenta-card__estado--inactiva'}`,
        cuenta.estado === 'ACTIVA' ? 'Activa' : 'Inactiva');

    cabecera.append(icono, titulos, estado);

    const saldo = el('div', 'cuenta-card__saldo');
    const valor = el('strong', 'cuenta-card__valor', ocultarSaldo ? '$ ••••••' : formatoCOP.format(Number(cuenta.saldo) || 0));
    valor.dataset.valor = formatoCOP.format(Number(cuenta.saldo) || 0);
    saldo.append(el('span', 'cuenta-card__saldo-label', tipo.saldoLabel), valor);

    card.append(cabecera, saldo);
    return card;
}