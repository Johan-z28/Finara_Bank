import { initGlobalComponents } from './Global/app.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener perfil de usuario o mock de tarjetas aprobadas
    const usuarioPerfil = JSON.parse(localStorage.getItem('userProfile')) || {};
    const tarjetasAprobadas = usuarioPerfil.tarjetasAprobadas || [
        { id: '1', tipo: 'Crédito', titulo: 'Visa Gold Finara', numeroTarjeta: '4532 8821 1092 4821', estado: 'activa', fechaAprobacion: '2024-05-12' },
        { id: '2', tipo: 'Débito', titulo: 'Tarjeta Débito Preferencial', numeroTarjeta: '4532 9912 3341 1092', estado: 'activa', fechaAprobacion: '2023-01-10' },
        { id: '3', tipo: 'Crédito', titulo: 'Visa Black Signature', numeroTarjeta: '4532 1100 2299 8821', estado: 'inactiva', fechaAprobacion: '2022-11-20' },
        { id: '4', tipo: 'Crédito', titulo: 'Tarjeta Clásica', numeroTarjeta: '4532 4433 2211 3341', estado: 'cancelada', fechaAprobacion: '2020-03-15' }
    ];

    const tarjetasGrid = document.getElementById('tarjetasGrid');
    const filterTabs = document.querySelectorAll('.btn-filtro-estado');
    const modal = document.getElementById('cardDetailModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const modalCardBody = document.getElementById('modalCardBody');

    // 🔒 Función de enmascaramiento HU-13 (Muestra solo los últimos 4 dígitos)
    function enmascararNumero(num) {
        if (!num) return '•••• •••• •••• ••••';
        const ultimos4 = num.replace(/\s+/g, '').slice(-4);
        return `•••• •••• •••• ${ultimos4}`;
    }

    // Renderizar tarjetas según filtro
    function renderTarjetas(filtro = 'todas') {
        const filtradas = tarjetasAprobadas.filter(t => filtro === 'todas' || (t.estado || 'activa') === filtro);

        if (filtradas.length === 0) {
            tarjetasGrid.innerHTML = `<p class="saldos-subtitle">No tienes tarjetas registradas bajo el estado <strong>${filtro}</strong>.</p>`;
            return;
        }

        tarjetasGrid.innerHTML = filtradas.map(card => {
            const estado = card.estado || 'activa';
            const badgeClass = estado === 'activa' ? 'badge--activa' : (estado === 'inactiva' ? 'badge-gold' : 'badge--bloqueada');

            return `
                <div class="cuenta-card cuenta-card--tarjeta">
                    <div class="cuenta-card__head">
                        <div class="cuenta-card__icon">
                            <i class="fa-solid fa-credit-card"></i>
                        </div>
                        <div class="cuenta-card__titles">
                            <span class="cuenta-card__tipo">${card.titulo || 'Tarjeta Finara'}</span>
                            <span class="tarjeta-mascara-numero">${enmascararNumero(card.numeroTarjeta)}</span>
                        </div>
                        <span class="cuenta-card__estado ${estado === 'inactiva' || estado === 'cancelada' ? 'cuenta-card__estado--inactiva' : ''}">
                            ${estado.toUpperCase()}
                        </span>
                    </div>

                    <div class="tarjeta-vinculada__acciones">
                        <button class="btn-tarjeta-accion btn-ver-detalles btn-card-detail" data-id="${card.id || card.numeroTarjeta}">
                            <i class="fa-regular fa-eye"></i> Ver detalle
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos para ver detalle en modal
        document.querySelectorAll('.btn-card-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const card = tarjetasAprobadas.find(t => (t.id || t.numeroTarjeta) === id);
                if (card) {
                    modalCardBody.innerHTML = `
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Producto:</span>
                                <strong>${card.titulo || 'Tarjeta Finara'}</strong>
                            </div>
                        </div>
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Tipo:</span>
                                <strong>${card.tipo}</strong>
                            </div>
                        </div>
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Número Enmascarado:</span>
                                <strong class="tarjeta-mascara-numero">${enmascararNumero(card.numeroTarjeta)}</strong>
                            </div>
                        </div>
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Estado:</span>
                                <strong>${(card.estado || 'activa').toUpperCase()}</strong>
                            </div>
                        </div>
                        <div class="leyenda-item">
                            <div class="leyenda-info">
                                <span class="leyenda-nombre">Fecha de Emisión:</span>
                                <strong>${card.fechaAprobacion || 'Reciente'}</strong>
                            </div>
                        </div>
                    `;
                    modal.classList.remove('hidden');
                }
            });
        });
    }

    // Eventos de pestañas de filtro
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderTarjetas(tab.getAttribute('data-filter'));
        });
    });

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));
    }

    renderTarjetas('todas');
});