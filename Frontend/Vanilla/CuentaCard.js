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

// Formatea el número de cuenta completo (ej. 4021 5877 0123 4) o enmascarado si está oculto
export function formatearNumeroCuenta(numero, ocultar = false) {
    const digitos = String(numero ?? '').replace(/\D/g, '');
    if (ocultar) {
        return '•••• •••• •••• ••••';
    }
    // Si no está oculto, muestra el número completo agrupado en bloques de 4 para lectura fácil
    return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function el(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto; // textContent: evita inyección HTML
    return nodo;
}

export function crearCuentaCard(cuenta, { ocultarSaldo = false } = {}) {
    const tipo = TIPOS[cuenta.tipo] ?? { etiqueta: 'Producto', icono: 'fa-wallet', clase: 'otro', saldoLabel: 'Saldo disponible' };

    const numeroTexto = formatearNumeroCuenta(cuenta.numero, ocultarSaldo);
    const card = el('article', `cuenta-card cuenta-card--${tipo.clase}`);
    card.setAttribute('aria-label', `${tipo.etiqueta} ${numeroTexto}`);

    const cabecera = el('div', 'cuenta-card__head');
    const icono = el('div', 'cuenta-card__icon');
    const i = el('i', `fa-solid ${tipo.icono}`);
    i.setAttribute('aria-hidden', 'true');
    icono.appendChild(i);

    const titulos = el('div', 'cuenta-card__titles');
    titulos.append(el('h3', 'cuenta-card__tipo', tipo.etiqueta), el('span', 'cuenta-card__numero', numeroTexto));

    if (cuenta.tipo === 'TARJETA_CREDITO') {
        const badgeCredito = el('span', 'cuenta-card__badge-credito', 'Crédito');
        titulos.querySelector('.cuenta-card__tipo').appendChild(badgeCredito);
    }

    const estado = el('span', `cuenta-card__estado${cuenta.estado === 'ACTIVA' ? '' : ' cuenta-card__estado--inactiva'}`,
        cuenta.estado === 'ACTIVA' ? 'Activa' : 'Inactiva');

    cabecera.append(icono, titulos, estado);

    const saldo = el('div', 'cuenta-card__saldo');
    const valor = el('strong', 'cuenta-card__valor', ocultarSaldo ? '$ ••••••' : formatoCOP.format(Number(cuenta.saldo) || 0));
    valor.dataset.valor = formatoCOP.format(Number(cuenta.saldo) || 0);
    saldo.append(el('span', 'cuenta-card__saldo-label', tipo.saldoLabel), valor);

    card.append(cabecera, saldo);

    // Si tiene tarjeta asociada (Débito en Ahorros o Tarjeta en Corriente)
    if (cuenta.tarjetaAsociada) {
        const tarjetaBox = el('div', 'cuenta-card__tarjeta-vinculada');
        const numTarjeta = cuenta.tarjetaAsociada.numero || '4532 0000 0000 0000';
        const numVisible = ocultarSaldo ? '•••• •••• •••• ••••' : formatearNumeroCuenta(numTarjeta, false);

        tarjetaBox.innerHTML = `
            <div class="tarjeta-vinculada__head">
                <div class="tarjeta-vinculada__info">
                    <i class="fa-solid fa-credit-card"></i>
                    <div>
                        <strong class="tarjeta-vinculada__titulo">${cuenta.tarjetaAsociada.titulo || 'Tarjeta Débito'}</strong>
                        <span class="tarjeta-vinculada__numero">${numVisible}</span>
                    </div>
                </div>
                <span class="tarjeta-vinculada__badge badge--activa">
                    <i class="fa-solid fa-circle-check"></i> Activa
                </span>
            </div>
            <div class="tarjeta-vinculada__acciones">
                <button type="button" class="btn-tarjeta-accion btn-ver-detalles" style="grid-column: 1 / -1;" title="Ver datos de seguridad">
                    <i class="fa-regular fa-eye"></i> Ver datos de tarjeta (Vencimiento y CVV)
                </button>
            </div>
        `;

        tarjetaBox.querySelector('.btn-ver-detalles').addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarModalDetallesTarjeta({
                ...cuenta.tarjetaAsociada,
                username: cuenta.username
            }, ocultarSaldo);
        });

        card.appendChild(tarjetaBox);
    }

    // Si es Tarjeta de Crédito independiente
    if (cuenta.tipo === 'TARJETA_CREDITO') {
        const btnDetalles = el('button', 'btn-tarjeta-accion btn-ver-detalles');
        btnDetalles.type = 'button';
        btnDetalles.style.marginTop = '-0.4rem';
        btnDetalles.innerHTML = '<i class="fa-regular fa-eye"></i> Ver datos de tarjeta (Vencimiento y CVV)';
        btnDetalles.title = 'Ver número completo, vencimiento y CVV';
        btnDetalles.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarModalDetallesTarjeta(cuenta, ocultarSaldo);
        });

        card.appendChild(btnDetalles);
    }

    return card;
}

function mostrarModalDetallesTarjeta(cuenta, ocultarSaldo = false) {
    const modalExistente = document.getElementById("modalDetallesTarjetaFinara");
    if (modalExistente) modalExistente.remove();

    const numCompleto = cuenta.numero || '4532 9999 8888 7777';
    const vencimiento = cuenta.fechaVencimiento || '09/29';
    const cvv = cuenta.cvv || '584';
    const tituloTarjeta = cuenta.titulo || (cuenta.tipo === 'TARJETA_CREDITO' ? 'Tarjeta de Crédito Gold' : 'Tarjeta Débito Finara');

    const overlay = document.createElement("div");
    overlay.id = "modalDetallesTarjetaFinara";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(5, 7, 10, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1.5rem;
    `;

    overlay.innerHTML = `
        <div style="background: #11141b; border: 1px solid rgba(229,169,60,0.4); border-radius: 16px; padding: 2rem; max-width: 440px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); color: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.4rem;">
                <h3 style="margin: 0; font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-shield-halved" style="color: #e5a93c;"></i> ${tituloTarjeta}
                </h3>
                <button type="button" id="btnCerrarDetallesTarjeta" style="background: none; border: none; color: #8a8f99; font-size: 1.2rem; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- TARJETA VISUAL 3D VIRTUAL -->
            <div style="background: linear-gradient(135deg, #1b202c 0%, #0d0f14 100%); border: 1px solid rgba(229,169,60,0.5); border-radius: 14px; padding: 1.4rem; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <span style="font-size: 0.8rem; font-weight: 700; color: #e5a93c; letter-spacing: 1px;">FINARA BANK</span>
                    <i class="fa-solid fa-wifi" style="color: rgba(229,169,60,0.7); font-size: 1.1rem;"></i>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1.4rem;">
                    <div style="width: 36px; height: 26px; background: linear-gradient(135deg, #e5a93c 0%, #b8860b 100%); border-radius: 4px;"></div>
                </div>
                <div style="font-family: monospace; font-size: 1.25rem; letter-spacing: 2px; color: #fff; margin-bottom: 1.2rem; font-weight: 600;">
                    ${ocultarSaldo ? '•••• •••• •••• ••••' : formatearNumeroCuenta(numCompleto, false)}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.75rem;">
                    <div>
                        <span style="display: block; color: #8a8f99; font-size: 0.65rem;">TITULAR</span>
                        <strong style="color: #e2e8f0; text-transform: uppercase;">${cuenta.username || 'USUARIO FINARA'}</strong>
                    </div>
                    <div>
                        <span style="display: block; color: #8a8f99; font-size: 0.65rem;">VENCE</span>
                        <strong style="color: #e2e8f0;">${ocultarSaldo ? '••/••' : vencimiento}</strong>
                    </div>
                    <div>
                        <span style="display: block; color: #8a8f99; font-size: 0.65rem;">CVV</span>
                        <strong style="color: #e5a93c; font-size: 0.9rem;">${ocultarSaldo ? '•••' : cvv}</strong>
                    </div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.7rem; font-size: 0.8rem; color: #94a3b8; background: rgba(255,255,255,0.03); padding: 0.9rem; border-radius: 10px; margin-bottom: 1.2rem;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Número de tarjeta:</span>
                    <strong style="color: #fff; font-family: monospace;">${ocultarSaldo ? '•••• •••• •••• ••••' : formatearNumeroCuenta(numCompleto, false)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Fecha de vencimiento:</span>
                    <strong style="color: #fff;">${ocultarSaldo ? '••/••' : vencimiento}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Código de seguridad (CVV):</span>
                    <strong style="color: #e5a93c;">${ocultarSaldo ? '•••' : cvv}</strong>
                </div>
            </div>

            <button type="button" id="btnCopiarDatosTarjeta" style="width: 100%; background: #e5a93c; color: #0a0c10; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fa-regular fa-copy"></i> Copiar número de tarjeta
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    const cerrar = () => overlay.remove();
    overlay.querySelector("#btnCerrarDetallesTarjeta").addEventListener("click", cerrar);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrar();
    });

    overlay.querySelector("#btnCopiarDatosTarjeta").addEventListener("click", () => {
        navigator.clipboard.writeText(String(numCompleto).replace(/\s+/g, '')).then(() => {
            const btn = overlay.querySelector("#btnCopiarDatosTarjeta");
            btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado al portapapeles!';
            setTimeout(() => {
                btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar número de tarjeta';
            }, 2000);
        });
    });
}