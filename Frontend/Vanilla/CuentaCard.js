// Vanilla/componentes/CuentaCard.js
// Componente visual de una cuenta: tipo, número parcial y saldo.

// Helper seguro para registrar notificaciones en localStorage sin romper módulos
function registrarNotificacionLocal({ titulo, mensaje, tipo = 'info' }) {
    try {
        const notifs = JSON.parse(localStorage.getItem('finara_notificaciones')) || [];
        notifs.unshift({
            id: `NOTIF-${Date.now()}`,
            titulo,
            mensaje,
            tipo,
            fecha: new Date().toISOString(),
            leida: false
        });
        localStorage.setItem('finara_notificaciones', JSON.stringify(notifs.slice(0, 30)));
    } catch {
        // Ignorar excepciones de cuota
    }
}

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
        const estaBloqueada = Boolean(cuenta.tarjetaAsociada.bloqueada);

        tarjetaBox.innerHTML = `
            <div class="tarjeta-vinculada__head">
                <div class="tarjeta-vinculada__info">
                    <i class="fa-solid fa-credit-card"></i>
                    <div>
                        <strong class="tarjeta-vinculada__titulo">${cuenta.tarjetaAsociada.titulo || 'Tarjeta Débito'}</strong>
                        <span class="tarjeta-vinculada__numero">${numVisible}</span>
                    </div>
                </div>
                <span class="tarjeta-vinculada__badge ${estaBloqueada ? 'badge--bloqueada' : 'badge--activa'}">
                    <i class="fa-solid ${estaBloqueada ? 'fa-lock' : 'fa-circle-check'}"></i> ${estaBloqueada ? 'Bloqueada' : 'Activa'}
                </span>
            </div>
            <div class="tarjeta-vinculada__acciones">
                <button type="button" class="btn-tarjeta-accion btn-ver-detalles" title="Ver datos de seguridad">
                    <i class="fa-regular fa-eye"></i> Ver datos
                </button>
                <button type="button" class="btn-tarjeta-accion ${estaBloqueada ? 'btn-desbloquear-tarjeta' : 'btn-bloquear-tarjeta'}" title="${estaBloqueada ? 'Desbloquear tarjeta' : 'Bloquear tarjeta temporalmente'}">
                    <i class="fa-solid ${estaBloqueada ? 'fa-lock-open' : 'fa-lock'}"></i> ${estaBloqueada ? 'Desbloquear' : 'Bloquear'}
                </button>
            </div>
        `;

        tarjetaBox.querySelector('.btn-ver-detalles').addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarModalDetallesTarjeta({
                ...cuenta.tarjetaAsociada,
                username: cuenta.username,
                tipoCuentaPadre: cuenta.tipo
            }, ocultarSaldo);
        });

        const btnToggleBloqueo = tarjetaBox.querySelector(estaBloqueada ? '.btn-desbloquear-tarjeta' : '.btn-bloquear-tarjeta');
        if (btnToggleBloqueo) {
            btnToggleBloqueo.addEventListener('click', (e) => {
                e.stopPropagation();
                gestionarBloqueoTarjeta({
                    tipo: cuenta.tarjetaAsociada.tipo,
                    numero: cuenta.tarjetaAsociada.numero,
                    titulo: cuenta.tarjetaAsociada.titulo,
                    bloqueada: estaBloqueada,
                    esAsociada: true,
                    cuentaPadreId: cuenta.id
                });
            });
        }

        card.appendChild(tarjetaBox);
    } else if (cuenta.tipo === 'AHORROS' || cuenta.tipo === 'CORRIENTE') {
        const sinTarjetaBox = el('div', 'cuenta-card__tarjeta-vinculada');
        const nombreTarjeta = cuenta.tipo === 'AHORROS' ? 'Tarjeta Débito Finara' : 'Tarjeta Débito Corriente';
        const tipoSlug = cuenta.tipo === 'AHORROS' ? 'debito' : 'corriente';

        sinTarjetaBox.innerHTML = `
            <div class="tarjeta-vinculada__head" style="opacity: 0.85;">
                <div class="tarjeta-vinculada__info">
                    <i class="fa-solid fa-credit-card" style="color: #64748b;"></i>
                    <div>
                        <strong class="tarjeta-vinculada__titulo" style="color: #94a3b8;">${nombreTarjeta}</strong>
                        <span class="tarjeta-vinculada__numero" style="color: #64748b; font-size: 0.75rem;">Sin tarjeta asociada</span>
                    </div>
                </div>
            </div>
            <div class="tarjeta-vinculada__acciones">
                <button type="button" class="btn-tarjeta-accion btn-solicitar-tarjeta-cuenta" style="grid-column: 1 / -1; background: rgba(229,169,60,0.15); color: #e5a93c; border: 1px dashed rgba(229,169,60,0.4);" title="Solicitar tarjeta ahora">
                    <i class="fa-solid fa-plus"></i> Solicitar ${nombreTarjeta}
                </button>
            </div>
        `;

        sinTarjetaBox.querySelector('.btn-solicitar-tarjeta-cuenta').addEventListener('click', (e) => {
            e.stopPropagation();
            activarTarjetaDesdeSaldos(cuenta, tipoSlug);
        });

        card.appendChild(sinTarjetaBox);
    }

    // Si es Tarjeta de Crédito independiente
    if (cuenta.tipo === 'TARJETA_CREDITO') {
        const estaBloqueadaTC = Boolean(cuenta.bloqueada || cuenta.estado === 'BLOQUEADA');
        const contAccionesTC = el('div', 'tarjeta-vinculada__acciones');
        contAccionesTC.style.marginTop = '-0.4rem';

        contAccionesTC.innerHTML = `
            <button type="button" class="btn-tarjeta-accion btn-ver-detalles" title="Ver número completo, vencimiento y CVV">
                <i class="fa-regular fa-eye"></i> Ver datos
            </button>
            <button type="button" class="btn-tarjeta-accion ${estaBloqueadaTC ? 'btn-desbloquear-tarjeta' : 'btn-bloquear-tarjeta'}" title="${estaBloqueadaTC ? 'Desbloquear tarjeta de crédito' : 'Bloquear tarjeta de crédito temporalmente'}">
                <i class="fa-solid ${estaBloqueadaTC ? 'fa-lock-open' : 'fa-lock'}"></i> ${estaBloqueadaTC ? 'Desbloquear' : 'Bloquear'}
            </button>
        `;

        contAccionesTC.querySelector('.btn-ver-detalles').addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarModalDetallesTarjeta(cuenta, ocultarSaldo);
        });

        contAccionesTC.querySelector(estaBloqueadaTC ? '.btn-desbloquear-tarjeta' : '.btn-bloquear-tarjeta').addEventListener('click', (e) => {
            e.stopPropagation();
            gestionarBloqueoTarjeta({
                tipo: 'credito',
                numero: cuenta.numero,
                titulo: cuenta.titulo || 'Tarjeta de Crédito',
                bloqueada: estaBloqueadaTC,
                esAsociada: false,
                cuentaId: cuenta.id
            });
        });

        card.appendChild(contAccionesTC);
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
    const estaBloqueada = Boolean(cuenta.bloqueada || cuenta.estado === 'BLOQUEADA');

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

            <!-- ESTADO BADGE -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <span style="font-size: 0.85rem; color: #94a3b8;">Estado de la tarjeta:</span>
                <span class="tarjeta-vinculada__badge ${estaBloqueada ? 'badge--bloqueada' : 'badge--activa'}">
                    <i class="fa-solid ${estaBloqueada ? 'fa-lock' : 'fa-circle-check'}"></i> ${estaBloqueada ? 'Bloqueada temporalmente' : 'Activa y operativa'}
                </span>
            </div>

            <!-- TARJETA VISUAL 3D VIRTUAL -->
            <div style="background: linear-gradient(135deg, #1b202c 0%, #0d0f14 100%); border: 1px solid ${estaBloqueada ? 'rgba(248,113,113,0.5)' : 'rgba(229,169,60,0.5)'}; border-radius: 14px; padding: 1.4rem; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-bottom: 1.5rem; opacity: ${estaBloqueada ? '0.75' : '1'};">
                ${estaBloqueada ? '<div style="position: absolute; top: 10px; right: 12px; background: rgba(248,113,113,0.2); color: #f87171; font-size: 0.75rem; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid #f87171;"><i class="fa-solid fa-lock"></i> BLOQUEADA</div>' : ''}
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

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button type="button" id="btnCopiarDatosTarjeta" style="background: #e5a93c; color: #0a0c10; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.82rem;">
                    <i class="fa-regular fa-copy"></i> Copiar número
                </button>
                <button type="button" id="btnBloquearModalTarjeta" class="btn-tarjeta-accion ${estaBloqueada ? 'btn-desbloquear-tarjeta' : 'btn-bloquear-tarjeta'}" style="padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.82rem;">
                    <i class="fa-solid ${estaBloqueada ? 'fa-lock-open' : 'fa-lock'}"></i> ${estaBloqueada ? 'Desbloquear' : 'Bloquear tarjeta'}
                </button>
            </div>
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
            btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
            setTimeout(() => {
                btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar número';
            }, 2000);
        });
    });

    overlay.querySelector("#btnBloquearModalTarjeta").addEventListener("click", () => {
        cerrar();
        gestionarBloqueoTarjeta({
            tipo: cuenta.tipo === 'TARJETA_CREDITO' ? 'credito' : cuenta.tipo,
            numero: numCompleto,
            titulo: tituloTarjeta,
            bloqueada: estaBloqueada,
            esAsociada: cuenta.tipo !== 'TARJETA_CREDITO',
            cuentaId: cuenta.id
        });
    });
}

async function confirmarBloqueoTarjeta(datosTarjeta, onConfirmar) {
    const accion = datosTarjeta.bloqueada ? 'desbloquear' : 'bloquear';
    const tituloModal = datosTarjeta.bloqueada ? '¿Deseas desbloquear esta tarjeta?' : '¿Deseas bloquear esta tarjeta temporalmente?';
    const textoModal = datosTarjeta.bloqueada
        ? `Al desbloquear tu ${datosTarjeta.titulo || 'tarjeta'}, podrás volver a realizar transferencias, compras y avances con normalidad.`
        : `Por tu seguridad, mientras la tarjeta esté bloqueada no se podrán realizar transferencias, avances ni pagos asociados a ella. Puedes reactivarla cuando quieras.`;

    if (window.Swal) {
        const result = await Swal.fire({
            title: tituloModal,
            text: textoModal,
            icon: datosTarjeta.bloqueada ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: datosTarjeta.bloqueada ? '#34d399' : '#f87171',
            cancelButtonColor: '#64748b',
            confirmButtonText: datosTarjeta.bloqueada ? '<i class="fa-solid fa-lock-open"></i> Sí, desbloquear' : '<i class="fa-solid fa-lock"></i> Sí, bloquear tarjeta',
            cancelButtonText: 'Cancelar',
            background: '#12151c',
            color: '#ffffff',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            onConfirmar();
        }
    } else {
        const confirma = confirm(`${tituloModal}\n\n${textoModal}`);
        if (confirma) {
            onConfirmar();
        }
    }
}

function gestionarBloqueoTarjeta(datosTarjeta) {
    confirmarBloqueoTarjeta(datosTarjeta, () => {
        ejecutarCambioEstadoBloqueo(datosTarjeta);
    });
}

function ejecutarCambioEstadoBloqueo(datosTarjeta) {
    const nuevoEstadoBloqueada = !datosTarjeta.bloqueada;
    const numLimpio = String(datosTarjeta.numero || '').replace(/\D/g, '');

    // 1. Actualizar en userProfile
    let usuarioActual = JSON.parse(localStorage.getItem('userProfile')) || {};
    if (Array.isArray(usuarioActual.tarjetasAprobadas)) {
        usuarioActual.tarjetasAprobadas.forEach(t => {
            const numT = String(t.numeroTarjeta || '').replace(/\D/g, '');
            if (numT === numLimpio || t.tipo === datosTarjeta.tipo) {
                t.bloqueada = nuevoEstadoBloqueada;
            }
        });
        localStorage.setItem('userProfile', JSON.stringify(usuarioActual));
    }

    // 2. Actualizar en finara_usuarios_local
    let listaUsuarios = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
    listaUsuarios = listaUsuarios.map(u => {
        if (Array.isArray(u.tarjetasAprobadas)) {
            u.tarjetasAprobadas.forEach(t => {
                const numT = String(t.numeroTarjeta || '').replace(/\D/g, '');
                if (numT === numLimpio || t.tipo === datosTarjeta.tipo) {
                    t.bloqueada = nuevoEstadoBloqueada;
                }
            });
        }
        return u;
    });
    localStorage.setItem('finara_usuarios_local', JSON.stringify(listaUsuarios));

    // 3. Actualizar en finara_cuentas
    let todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    todasLasCuentas = todasLasCuentas.map(cta => {
        if (cta.tarjetaAsociada) {
            const numAsoc = String(cta.tarjetaAsociada.numero || '').replace(/\D/g, '');
            if (numAsoc === numLimpio || cta.id === datosTarjeta.cuentaPadreId) {
                cta.tarjetaAsociada.bloqueada = nuevoEstadoBloqueada;
            }
        }
        if (cta.tipo === 'TARJETA_CREDITO') {
            const numTC = String(cta.numero || '').replace(/\D/g, '');
            if (numTC === numLimpio || cta.id === datosTarjeta.cuentaId) {
                cta.bloqueada = nuevoEstadoBloqueada;
                cta.estado = nuevoEstadoBloqueada ? 'BLOQUEADA' : 'ACTIVA';
            }
        }
        return cta;
    });
    localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

    // Notificación y alerta en pantalla en siguiente commit
    notificarYConfirmarBloqueo(datosTarjeta, nuevoEstadoBloqueada);
}

function notificarYConfirmarBloqueo(datosTarjeta, nuevoEstadoBloqueada) {
    const tituloTarjeta = datosTarjeta.titulo || 'Tarjeta Finara';
    const terminacion = String(datosTarjeta.numero || '').replace(/\D/g, '').slice(-4);
    const sufijoNumero = terminacion ? ` terminada en ••${terminacion}` : '';

    const tituloNotif = nuevoEstadoBloqueada ? 'Tarjeta bloqueada temporalmente' : 'Tarjeta desbloqueada con éxito';
    const mensajeNotif = nuevoEstadoBloqueada
        ? `Has bloqueado temporalmente tu ${tituloTarjeta}${sufijoNumero}. Tus transacciones y retiros quedan protegidos.`
        : `Has desbloqueado tu ${tituloTarjeta}${sufijoNumero}. Ya puedes utilizarla nuevamente para todas tus operaciones.`;

    // 1. Guardar en finara_notificaciones (localStorage)
    registrarNotificacionLocal({
        titulo: tituloNotif,
        mensaje: mensajeNotif,
        tipo: nuevoEstadoBloqueada ? 'alerta' : 'exito'
    });

    // 2. Confirmación en pantalla
    if (window.Swal) {
        Swal.fire({
            icon: nuevoEstadoBloqueada ? 'warning' : 'success',
            title: nuevoEstadoBloqueada ? 'Tarjeta Bloqueada' : 'Tarjeta Desbloqueada',
            text: mensajeNotif,
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c',
            confirmButtonText: 'Aceptar'
        }).then(() => {
            window.location.reload();
        });
    } else {
        alert(`${tituloNotif}\n\n${mensajeNotif}`);
        window.location.reload();
    }
}

function activarTarjetaDesdeSaldos(cuenta, tipoSlug) {
    const titulo = tipoSlug === 'debito' ? 'Tarjeta Débito Finara' : 'Tarjeta Cuenta Corriente';
    const numeroGenerado = '4532 ' + String(Date.now()).slice(-4) + ' ' + Math.floor(1000 + Math.random() * 9000) + ' ' + Math.floor(1000 + Math.random() * 9000);
    const vencimiento = '09/29';
    const cvv = String(Math.floor(100 + Math.random() * 900));

    const nuevaTarjeta = {
        tipo: tipoSlug,
        titulo: titulo,
        numeroTarjeta: numeroGenerado,
        fechaVencimiento: vencimiento,
        cvv: cvv,
        fechaAprobacion: new Date().toISOString()
    };

    let listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    let usuarioActual = JSON.parse(localStorage.getItem("userProfile")) || { username: cuenta.username || 'maria17' };
    const username = cuenta.username || usuarioActual.username || 'maria17';

    listaUsuarios = listaUsuarios.map(u => {
        if ((u.username && u.username === username) || (u.correo && u.correo === username)) {
            const tAprobadas = u.tarjetasAprobadas || [];
            if (!tAprobadas.some(t => t.tipo === tipoSlug)) {
                tAprobadas.push(nuevaTarjeta);
            }
            u.tarjetasAprobadas = tAprobadas;
        }
        return u;
    });
    localStorage.setItem("finara_usuarios_local", JSON.stringify(listaUsuarios));

    if (usuarioActual && ((usuarioActual.username && usuarioActual.username === username) || (usuarioActual.correo && usuarioActual.correo === username))) {
        const tAprobadas = usuarioActual.tarjetasAprobadas || [];
        if (!tAprobadas.some(t => t.tipo === tipoSlug)) {
            tAprobadas.push(nuevaTarjeta);
        }
        usuarioActual.tarjetasAprobadas = tAprobadas;
        localStorage.setItem("userProfile", JSON.stringify(usuarioActual));
    }

    if (window.Swal) {
        Swal.fire({
            icon: 'success',
            title: '¡Tarjeta Activada!',
            text: `Se ha emitido y asociado tu ${titulo} a esta cuenta con éxito.`,
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        }).then(() => {
            window.location.reload();
        });
    } else {
        alert(`¡${titulo} emitida y asociada con éxito!`);
        window.location.reload();
    }
}