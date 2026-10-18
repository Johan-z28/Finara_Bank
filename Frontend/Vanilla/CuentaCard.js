// Vanilla/componentes/CuentaCard.js

const TIPOS = {
    AHORROS: { etiqueta: 'Cuenta de Débito', icono: 'fa-piggy-bank', clase: 'ahorros', saldoLabel: 'Saldo disponible' },
    CORRIENTE: { etiqueta: 'Cuenta Corriente', icono: 'fa-building-columns', clase: 'corriente', saldoLabel: 'Saldo disponible' },
    TARJETA_CREDITO: { etiqueta: 'Tarjeta de Crédito', icono: 'fa-credit-card', clase: 'tarjeta', saldoLabel: 'Cupo disponible' }
};

const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
});

export function formatearNumeroCuenta(numero, ocultar = false) {
    const digitos = String(numero ?? '').replace(/\D/g, '');
    if (ocultar) return '•••• •••• •••• ••••';
    return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function el(tag, clase, texto) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

export function crearCuentaCard(cuenta, { ocultarSaldo = false, onEstadoCambiado } = {}) {
    const tipoInfo = TIPOS[cuenta.tipo] ?? { etiqueta: 'Producto Bancario', icono: 'fa-wallet', clase: 'otro', saldoLabel: 'Saldo disponible' };
    const numeroTexto = formatearNumeroCuenta(cuenta.numero, ocultarSaldo);
    const estaBloqueada = Boolean(cuenta.bloqueada || cuenta.estado === 'BLOQUEADA');

    const card = el('article', `cuenta-card cuenta-card--${tipoInfo.clase}`);

    let clasePlastico = 'tarjeta-negra';
    let logoPath = '../Style/image/Logo_finara.svg';
    let tagTexto = 'Crédito';

    if (cuenta.tipo === 'AHORROS') {
        clasePlastico = 'tarjeta-dorada';
        logoPath = '../Style/image/Logo_finara_black.svg';
        tagTexto = 'Débito';
    } else if (cuenta.tipo === 'CORRIENTE') {
        clasePlastico = 'tarjeta-platino';
        logoPath = '../Style/image/Logo_finara_black.svg';
        tagTexto = 'Corriente';
    }

    const plasticoCard = document.createElement('div');
    plasticoCard.className = `tarjeta-plastico ${clasePlastico}`;
    plasticoCard.innerHTML = `
        <div class="head-tarjeta">
            <img src="${logoPath}" alt="Finara Logo" class="logo-svg">
            <i class="fa-solid fa-wifi card-contactless" title="Contactless"></i>
        </div>
        <div class="card-chip-area">
            <div class="chip"></div>
            <span class="card-tag">${tagTexto}</span>
        </div>
        <div class="foot-tarjeta">
            <span class="card-number">${numeroTexto}</span>
            <span class="card-type">VISA</span>
        </div>
    `;

    const metaContainer = el('div', 'cuenta-card__meta-container');
    const estadoHeader = el('div', 'cuenta-card__estado-header');
    
    const titulosBox = el('div', 'cuenta-card__titulos-box');
    const tituloTipo = el('h3', 'cuenta-card__tipo-titulo', tipoInfo.etiqueta);
    const subNumero = el('span', 'cuenta-card__sub-numero', numeroTexto);
    titulosBox.append(tituloTipo, subNumero);

    // ETIQUETA / BADGE DE ESTADO DE TARJETA (Activa / Bloqueada)
    const estadoBadge = el('span', `cuenta-card__estado-badge ${estaBloqueada ? 'badge--bloqueada' : 'badge--activa'}`,
        estaBloqueada ? 'Bloqueada' : 'Activa');
    
    estadoHeader.append(titulosBox, estadoBadge);

    const saldoBox = el('div', 'cuenta-card__saldo-box');
    const labelSaldo = el('span', 'cuenta-card__saldo-label', tipoInfo.saldoLabel);
    const valorSaldo = el('strong', 'cuenta-card__valor-monto', ocultarSaldo ? '$ ••••••' : formatoCOP.format(Number(cuenta.saldo) || 0));

    saldoBox.append(labelSaldo, valorSaldo);
    metaContainer.append(estadoHeader, saldoBox);

    card.append(plasticoCard, metaContainer);

    const accionesGrupo = el('div', 'cuenta-card__acciones-grupo');
    
    let htmlBotones = '';
    if (cuenta.tipo === 'TARJETA_CREDITO') {
        htmlBotones += `
            <button type="button" class="btn-simular-compra" data-view="simuladortc" title="Simular compra a cuotas">
                <i class="fa-solid fa-calculator"></i> Simular compra
            </button>
        `;
    }

    htmlBotones += `
        <div class="acciones-doble-btn">
            <button type="button" class="btn-tarjeta-accion btn-ver-detalles" title="Ver información de seguridad">
                <i class="fa-regular fa-eye"></i> Ver datos
            </button>
            <button type="button" class="btn-tarjeta-accion btn-toggle-bloqueo" title="${estaBloqueada ? 'Desbloquear cuenta' : 'Bloquear cuenta'}">
                <i class="fa-solid ${estaBloqueada ? 'fa-lock-open' : 'fa-lock'}"></i> ${estaBloqueada ? 'Desbloquear' : 'Bloquear'}
            </button>
        </div>
    `;

    accionesGrupo.innerHTML = htmlBotones;

    // ALERTA DE "VER DATOS" ELEGANTE Y COMPLETA
    accionesGrupo.querySelector('.btn-ver-detalles').addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.Swal) {
            Swal.fire({
                title: `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; color: #e5a93c; font-size: 1.15rem; font-weight: 700;">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>Información de Seguridad</span>
                    </div>
                `,
                html: `
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(229, 169, 60, 0.25); border-radius: 16px; padding: 1.2rem; text-align: left; color: #ffffff; font-family: 'Poppins', sans-serif;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 0.75rem;">
                            <span style="color: #94a3b8; font-size: 0.82rem;">Producto:</span>
                            <strong style="color: #ffffff; font-size: 0.9rem;">${tipoInfo.etiqueta}</strong>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 0.75rem;">
                            <span style="color: #94a3b8; font-size: 0.82rem;">Número completo:</span>
                            <strong style="color: #e5a93c; font-family: monospace; font-size: 0.95rem; letter-spacing: 1px;">${numeroTexto}</strong>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 0.75rem;">
                            <span style="color: #94a3b8; font-size: 0.82rem;">Vencimiento:</span>
                            <strong style="color: #ffffff; font-size: 0.9rem;">09/29</strong>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 0.75rem;">
                            <span style="color: #94a3b8; font-size: 0.82rem;">CVV de seguridad:</span>
                            <span style="background: rgba(229, 169, 60, 0.2); color: #e5a93c; border: 1px solid rgba(229, 169, 60, 0.4); padding: 2px 10px; border-radius: 8px; font-weight: 700; font-family: monospace; font-size: 0.9rem;">584</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #94a3b8; font-size: 0.82rem;">Estado actual:</span>
                            <span style="color: ${estaBloqueada ? '#f87171' : '#34d399'}; font-size: 0.85rem; font-weight: 600;">
                                <i class="fa-solid ${estaBloqueada ? 'fa-lock' : 'fa-circle-check'}"></i> ${estaBloqueada ? 'Bloqueada' : 'Activa y segura'}
                            </span>
                        </div>
                    </div>
                `,
                background: '#0d1017',
                color: '#ffffff',
                showCloseButton: true,
                confirmButtonColor: '#e5a93c',
                confirmButtonText: 'Cerrar'
            });
        }
    });

    // ACCIÓN DE BLOQUEAR CON PERSISTENCIA EN LOCALSTORAGE
    accionesGrupo.querySelector('.btn-toggle-bloqueo').addEventListener('click', (e) => {
        e.stopPropagation();
        
        const nuevoBloqueo = !estaBloqueada;

        let todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        todasLasCuentas = todasLasCuentas.map(cta => {
            if (cta.id === cuenta.id || cta.numero === cuenta.numero) {
                cta.bloqueada = nuevoBloqueo;
                cta.estado = nuevoBloqueo ? 'BLOQUEADA' : 'ACTIVA';
            }
            return cta;
        });
        localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

        if (window.Swal) {
            Swal.fire({
                icon: nuevoBloqueo ? 'warning' : 'success',
                title: nuevoBloqueo ? 'Tarjeta Bloqueada' : 'Tarjeta Activada',
                text: `El producto ${tipoInfo.etiqueta} ha sido ${nuevoBloqueo ? 'bloqueado temporalmente' : 'desbloqueado con éxito'}.`,
                background: '#0d1017',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c',
                confirmButtonText: 'Aceptar'
            }).then(() => {
                if (typeof onEstadoCambiado === 'function') {
                    onEstadoCambiado();
                }
            });
        }
    });

    card.appendChild(accionesGrupo);

    return card;
}