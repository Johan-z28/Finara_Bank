import { initGlobalComponents } from './Global/app.js';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initGlobalComponents === 'function') {
        initGlobalComponents();
    }

    // 1. Obtener usuario activo
    const usuarioPerfil = JSON.parse(localStorage.getItem('userProfile')) || {};
    const emailLogueado = localStorage.getItem('usuarioLogueado') || localStorage.getItem('emailSesion');
    const listaUsuarios = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
    const usuarioActivo = listaUsuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado) || usuarioPerfil;
    const usernameActual = usuarioActivo.username || usuarioActivo.correo || 'maria17';

    // 2. Extraer tarjetas aprobadas directamente del perfil
    let productosUsuario = [...(usuarioActivo.tarjetasAprobadas || [])];

    // 3. Sincronizar desde `finara_cuentas` (Cuentas aperturadas y TC)
    const todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    const cuentasDelUsuario = todasLasCuentas.filter(c => c && (c.username === usernameActual || (!c.username && usernameActual === 'maria17')));

    cuentasDelUsuario.forEach(cuenta => {
        const yaEstaEnLista = productosUsuario.some(p => p.numeroTarjeta === cuenta.numero || p.numeroTarjeta?.replace(/\s+/g, '') === cuenta.numero?.replace(/\s+/g, ''));
        if (!yaEstaEnLista) {
            let tipoProducto = 'debito';
            let tituloProducto = 'Cuenta de Ahorros';

            if (cuenta.tipo === 'CORRIENTE') {
                tipoProducto = 'corriente';
                tituloProducto = 'Cuenta Corriente';
            } else if (cuenta.tipo === 'TARJETA_CREDITO') {
                tipoProducto = 'credito';
                tituloProducto = 'Tarjeta de Crédito Gold';
            }

            productosUsuario.push({
                id: cuenta.id,
                tipo: tipoProducto,
                titulo: tituloProducto,
                numeroTarjeta: cuenta.numero,
                monto: cuenta.saldo,
                estado: (cuenta.estado || 'activa').toLowerCase(),
                fechaAprobacion: cuenta.fechaCreacion || cuenta.fechaAprobacion || new Date().toISOString()
            });
        }
    });

    // 4. Incluir créditos desembolsados desde los movimientos
    const movimientos = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
    const prestamos = movimientos.filter(m => m.tipo === 'CREDITO_DESEMBOLSO');

    prestamos.forEach(p => {
        const yaExiste = productosUsuario.some(prod => prod.id === p.id);
        if (!yaExiste) {
            productosUsuario.push({
                id: p.id,
                tipo: 'prestamo',
                titulo: 'Crédito Libre Destino',
                numeroTarjeta: `5542 0000 0000 ${String(p.cuentaDestino).slice(-4)}`,
                monto: p.monto,
                estado: 'activa',
                fechaAprobacion: p.fecha
            });
        }
    });

    const tarjetasGrid = document.getElementById('tarjetasGrid');
    const filterTabs = document.querySelectorAll('.btn-filtro-estado');
    const modal = document.getElementById('cardDetailModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const modalCardBody = document.getElementById('modalCardBody');

    // 🔒 Enmascaramiento de números (HU-13)
    function enmascararNumero(num) {
        if (!num) return '**** **** **** ****';
        const ultimos4 = String(num).replace(/\s+/g, '').slice(-4);
        return `**** **** **** ${ultimos4}`;
    }

    function renderProductos(filtro = 'todas') {
        if (productosUsuario.length === 0) {
            tarjetasGrid.innerHTML = `
                <div class="cuentas-estado-vacio">
                    <i class="fa-solid fa-credit-card cuentas-estado-vacio__icono"></i>
                    <h3 class="cuentas-estado-vacio__titulo">Aún no tienes productos o tarjetas asociadas</h3>
                    <p class="cuentas-estado-vacio__desc">
                        Explora nuestro portafolio y solicita tu tarjeta de crédito, débito o cuenta corriente en minutos.
                    </p>
                    <a href="solicitudTarjeta.html" class="btn-solicitar-vacio">
                        <i class="fa-solid fa-plus"></i> Solicitar Producto
                    </a>
                </div>
            `;
            return;
        }

        const filtrados = productosUsuario.filter(p => filtro === 'todas' || (p.estado || 'activa') === filtro);

        if (filtrados.length === 0) {
            tarjetasGrid.innerHTML = `<p class="saldos-subtitle" style="grid-column: 1 / -1; text-align: center;">No tienes productos bajo el filtro <strong>${filtro}</strong>.</p>`;
            return;
        }

        tarjetasGrid.innerHTML = filtrados.map(prod => {
            const estado = prod.estado || 'activa';
            const tipo = (prod.tipo || 'debito').toLowerCase();

            let tarjetaClase = 'tarjeta-dorada';
            let tagTexto = 'Ahorros';
            let logoSrc = '../Style/image/Logo_finara_black.svg';

            if (tipo === 'corriente') {
                tarjetaClase = 'tarjeta-platino';
                tagTexto = 'Corriente';
                logoSrc = '../Style/image/Logo_finara_black.svg';
            } else if (tipo === 'credito') {
                tarjetaClase = 'tarjeta-negra';
                tagTexto = 'Crédito';
                logoSrc = '../Style/image/Logo_finara.svg';
            } else if (tipo === 'prestamo') {
                tarjetaClase = 'tarjeta-prestamo';
                tagTexto = 'Préstamo';
                logoSrc = '../Style/image/Logo_finara.svg';
            }

            return `
                <div class="tarjeta-producto-wrapper">
                    <div class="tarjeta-plastico ${tarjetaClase}">
                        <div class="head-tarjeta">
                            <img src="${logoSrc}" alt="Finara Logo" class="logo-svg">
                            <i class="fa-solid fa-wifi card-contactless"></i>
                        </div>

                        <div class="card-chip-area">
                            <div class="chip"></div>
                            <span class="card-tag">${tagTexto}</span>
                        </div>

                        <div class="foot-tarjeta">
                            <span class="card-number">${enmascararNumero(prod.numeroTarjeta)}</span>
                            <span class="card-type">VISA</span>
                        </div>
                    </div>

                    <div class="tarjeta-producto-footer">
                        <span class="card-badge-estado status-${estado}">${estado.toUpperCase()}</span>
                        <button class="btn-card-detail-action btn-card-detail" data-id="${prod.id || prod.numeroTarjeta}">
                            Ver detalle <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos Modal
        document.querySelectorAll('.btn-card-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const prod = productosUsuario.find(p => (p.id || p.numeroTarjeta) === id);
                if (prod) {
                    modalCardBody.innerHTML = `
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Producto:</span>
                                <strong>${prod.titulo || 'Producto Finara'}</strong>
                            </div>
                        </div>
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Número Enmascarado:</span>
                                <strong style="font-family: monospace; color: var(--gold-main);">${enmascararNumero(prod.numeroTarjeta)}</strong>
                            </div>
                        </div>
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Estado:</span>
                                <strong>${(prod.estado || 'activa').toUpperCase()}</strong>
                            </div>
                        </div>
                        ${prod.monto !== undefined ? `
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Saldo / Monto:</span>
                                <strong style="color: var(--gold-main);">$ ${Number(prod.monto).toLocaleString('es-CO')}</strong>
                            </div>
                        </div>` : ''}
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Fecha de Emisión:</span>
                                <strong>${prod.fechaAprobacion ? prod.fechaAprobacion.split('T')[0] : 'Reciente'}</strong>
                            </div>
                        </div>
                    `;
                    modal.classList.remove('hidden');
                }
            });
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderProductos(tab.getAttribute('data-filter'));
        });
    });

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));
    }

    renderProductos('todas');
});