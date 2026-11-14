// Frontend/Vanilla/Beneficios.js
// Controlador para HU-08: Beneficios y recompensas vinculados a productos financieros

import { consultarEstadoProductosUsuario, obtenerCuentas } from './cuentasService.js';

/**
 * Catálogo Base de Beneficios de Finara Bank (idéntico al Backend)
 */
const CATALOGO_BASE_BENEFICIOS = [
    {
        id: 'BEN-CB01',
        categoria: 'Cashback',
        titulo: '5% Cashback en Supermercados',
        descripcion: 'Reembolso directo en tu cuenta bancaria por compras de víveres los fines de semana.',
        producto: 'Tarjeta Débito',
        codigo: 'SUPER5-FINARA',
        vigencia: '31/12/2026',
        icono: 'fa-basket-shopping',
        categoriaClase: 'tag-cat-cashback'
    },
    {
        id: 'BEN-DS02',
        categoria: 'Descuento',
        titulo: '30% OFF en Restaurantes Aliados',
        descripcion: 'Descuento exclusivo en establecimientos gastronómicos gourmet pagando con tarjeta Finara.',
        producto: 'Tarjeta de Crédito Gold',
        codigo: 'GOURMET30',
        vigencia: '31/12/2026',
        icono: 'fa-utensils',
        categoriaClase: 'tag-cat-descuento'
    },
    {
        id: 'BEN-PT03',
        categoria: 'Puntos Finara',
        titulo: 'Doble Puntaje en Compras Online',
        descripcion: 'Acumula el doble de puntos Finara en comercios electrónicos nacionales e internacionales.',
        producto: 'Tarjeta de Crédito Gold',
        codigo: 'PUNTOS2X',
        vigencia: '31/12/2026',
        icono: 'fa-coins',
        categoriaClase: 'tag-cat-puntos'
    },
    {
        id: 'BEN-TS04',
        categoria: 'Tasas',
        titulo: '0% Tasa de Interés en Avances',
        descripcion: 'Primer uso de sobregiro o avance autorizado sin costo de financiamiento a 15 días.',
        producto: 'Tarjeta Cuenta Corriente',
        codigo: 'AVANCE0',
        vigencia: '31/12/2026',
        icono: 'fa-chart-line',
        categoriaClase: 'tag-cat-tasas'
    },
    {
        id: 'BEN-SG05',
        categoria: 'Seguros',
        titulo: 'Seguro de Protección de Compras',
        descripcion: 'Cobertura gratuita de hasta $2.000.000 COP contra daño accidental o robo por 90 días.',
        producto: 'Todos los productos',
        codigo: 'PROTEC-FINARA',
        vigencia: '31/12/2026',
        icono: 'fa-shield-halved',
        categoriaClase: 'tag-cat-seguros'
    },
    {
        id: 'BEN-VIA06',
        categoria: 'Viajes',
        titulo: 'Acceso VIP a Salas Lounge',
        descripcion: '2 pases de cortesía por semestre para salas VIP en aeropuertos al acumular facturación.',
        producto: 'Tarjeta de Crédito Gold',
        codigo: 'VIPPASS-2026',
        vigencia: '31/12/2026',
        icono: 'fa-plane-departure',
        categoriaClase: 'tag-cat-viajes'
    },
    {
        id: 'BEN-CST07',
        categoria: 'Descuento',
        titulo: '0 Comisión en Transferencias ACH',
        descripcion: 'Envía dinero a otros bancos nacionales sin cobro de tarifa de transferencia interbancaria.',
        producto: 'Cuenta de Ahorros',
        codigo: 'ACH-FREE',
        vigencia: '31/12/2026',
        icono: 'fa-arrow-right-arrow-left',
        categoriaClase: 'tag-cat-descuento'
    },
    {
        id: 'BEN-ENT08',
        categoria: 'Viajes',
        titulo: '2x1 en Boletas de Cine',
        descripcion: 'Paga una entrada y lleva la segunda gratis todos los miércoles en cines aliados.',
        producto: 'Tarjeta Débito',
        codigo: 'CINE2X1',
        vigencia: '31/12/2026',
        icono: 'fa-film',
        categoriaClase: 'tag-cat-viajes'
    }
];

/**
 * Obtiene la clave de almacenamiento del usuario activo
 */
function obtenerClaveStorageUsuario() {
    try {
        const perfil = JSON.parse(localStorage.getItem('userProfile'));
        if (perfil) {
            const identificador = perfil.correo || perfil.username || perfil.nombre || 'usuario';
            return `finara_beneficios_${identificador.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }

        const emailSesion = localStorage.getItem('emailSesion') || localStorage.getItem('usuarioLogueado');
        if (emailSesion) {
            return `finara_beneficios_${emailSesion.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        }
    } catch (e) {
        console.error("Error al obtener sesión de usuario:", e);
    }
    return 'finara_beneficios_invitado';
}

/**
 * Valida si un beneficio es aplicable según los productos activos del usuario
 */
function esBeneficioCalificado(beneficio, estado) {
    if (!beneficio || !estado) return false;

    const prod = (beneficio.producto || '').trim().toLowerCase();

    // Comprobar si tiene algún producto activo
    const tieneAlgunProducto = Boolean(
        estado.tieneAhorros ||
        estado.tieneCorriente ||
        estado.tieneCredito ||
        estado.tienePrestamo ||
        (Array.isArray(estado.cuentas) && estado.cuentas.some(c => c && c.estado !== 'INACTIVA'))
    );

    if (!tieneAlgunProducto) return false;

    if (prod === 'todos los productos' || prod === 'todos') {
        return true;
    }

    if (prod === 'cuenta de ahorros') {
        return Boolean(estado.tieneAhorros);
    }

    if (prod === 'tarjeta débito' || prod === 'tarjeta debito') {
        const tieneTarjetaDebito = estado.cuentas?.some(c =>
            (c.tipo === 'AHORROS' || c.tarjetaAsociada?.tipo === 'debito') && c.estado !== 'INACTIVA'
        );
        return Boolean(estado.tieneAhorros || tieneTarjetaDebito);
    }

    if (prod === 'tarjeta de crédito gold' || prod === 'tarjeta de credito gold') {
        return Boolean(estado.tieneCredito);
    }

    if (prod === 'tarjeta cuenta corriente' || prod === 'cuenta corriente') {
        return Boolean(estado.tieneCorriente);
    }

    return false;
}

/**
 * Carga o inicializa los beneficios válidos del usuario actual
 */
function obtenerBeneficiosUsuario(estado) {
    const clave = obtenerClaveStorageUsuario();
    let lista = [];

    try {
        const datos = localStorage.getItem(clave);
        if (datos) {
            lista = JSON.parse(datos);
        }
    } catch (e) {
        console.error("Error al parsear beneficios:", e);
    }

    // Filtrar estrictamente para que solo conserve beneficios de productos que el usuario tiene activos
    if (Array.isArray(lista) && lista.length > 0) {
        const calificados = lista.filter(b => esBeneficioCalificado(b, estado));
        if (calificados.length !== lista.length) {
            guardarBeneficiosUsuario(calificados);
        }
        return calificados;
    }

    // Si no tiene beneficios guardados pero tiene productos activos, generar un grupo inicial filtrado
    const nuevoGrupo = generarGrupoAleatorio(estado);
    if (nuevoGrupo.length > 0) {
        guardarBeneficiosUsuario(nuevoGrupo);
    }
    return nuevoGrupo;
}

/**
 * Guarda el array de beneficios en localStorage
 */
function guardarBeneficiosUsuario(lista) {
    const clave = obtenerClaveStorageUsuario();
    try {
        localStorage.setItem(clave, JSON.stringify(lista));
    } catch (e) {
        console.error("Error al guardar beneficios:", e);
    }
}

/**
 * Genera un grupo aleatorio de beneficios exclusivamente calificados para el usuario
 */
function generarGrupoAleatorio(estado) {
    const catalogoFiltrado = CATALOGO_BASE_BENEFICIOS.filter(b => esBeneficioCalificado(b, estado));

    if (catalogoFiltrado.length === 0) {
        return [];
    }

    const copia = [...catalogoFiltrado];
    const shuffle = copia.sort(() => 0.5 - Math.random());
    const maxPermitido = Math.min(copia.length, Math.floor(Math.random() * 3) + 3);
    const seleccionados = shuffle.slice(0, Math.max(1, maxPermitido));

    return seleccionados.map(b => ({
        ...b,
        redimido: false,
        fechaAsignacion: new Date().toISOString()
    }));
}

/**
 * Controlador principal de la vista
 */
export async function initBeneficiosView() {
    const grid = document.getElementById('gridBeneficios');
    const btnGirar = document.getElementById('btnGirarRuleta');
    const tabsCategorias = document.getElementById('tabsCategorias');
    const statDisponibles = document.getElementById('statDisponibles');
    const statRedimidos = document.getElementById('statRedimidos');
    const statPuntos = document.getElementById('statPuntos');

    if (!grid) return;

    // Consultar estado real de los productos bancarios del usuario
    let estadoProductos = { tieneAhorros: false, tieneCorriente: false, tieneCredito: false, tienePrestamo: false, cuentas: [] };
    try {
        estadoProductos = await consultarEstadoProductosUsuario();
    } catch (e) {
        console.warn("No se pudo consultar estado de productos, intentando con cuentas:", e);
        try {
            const cuentas = await obtenerCuentas();
            estadoProductos = {
                tieneAhorros: cuentas.some(c => c.tipo === 'AHORROS' && c.estado !== 'INACTIVA'),
                tieneCorriente: cuentas.some(c => c.tipo === 'CORRIENTE' && c.estado !== 'INACTIVA'),
                tieneCredito: cuentas.some(c => c.tipo === 'TARJETA_CREDITO' && c.estado !== 'INACTIVA'),
                tienePrestamo: cuentas.some(c => c.tipo === 'PRESTAMO' && c.estado !== 'INACTIVA'),
                cuentas
            };
        } catch {}
    }

    const tieneProductosActivos = Boolean(
        estadoProductos.tieneAhorros ||
        estadoProductos.tieneCorriente ||
        estadoProductos.tieneCredito ||
        estadoProductos.tienePrestamo ||
        (Array.isArray(estadoProductos.cuentas) && estadoProductos.cuentas.some(c => c && c.estado !== 'INACTIVA'))
    );

    let beneficios = tieneProductosActivos ? obtenerBeneficiosUsuario(estadoProductos) : [];
    let categoriaActiva = 'TODOS';

    /**
     * Actualiza las tarjetas de resumen
     */
    function actualizarMetricas() {
        const disponibles = beneficios.filter(b => !b.redimido).length;
        const redimidos = beneficios.filter(b => b.redimido).length;
        // Puntos reales: 0 al inicio y 100 pts por cada beneficio redimido
        const puntosTotales = redimidos * 100;

        if (statDisponibles) statDisponibles.textContent = disponibles;
        if (statRedimidos) statRedimidos.textContent = redimidos;
        if (statPuntos) statPuntos.textContent = `${puntosTotales.toLocaleString('es-CO')} pts`;
    }

    /**
     * Renderiza el listado de tarjetas según filtro o empty state
     */
    function renderizarTarjetas() {
        grid.innerHTML = '';

        if (!tieneProductosActivos) {
            grid.innerHTML = `
                <div class="empty-state-beneficios">
                    <i class="fa-solid fa-gift"></i>
                    <h3>Aún no tienes productos con beneficios activos</h3>
                    <p style="margin-bottom: 1.5rem;">Solicita tu Tarjeta de Crédito, Cuenta de Ahorros o Corriente para desbloquear reembolsos, millas y descuentos aliados.</p>
                    <button class="btn-hero-action" data-view="solicitarproductos">
                        <i class="fa-solid fa-plus"></i> Solicitar un Producto
                    </button>
                </div>
            `;
            return;
        }

        const filtrados = categoriaActiva === 'TODOS'
            ? beneficios
            : beneficios.filter(b => {
                if (categoriaActiva === 'Viajes') {
                    return b.categoria === 'Viajes' || b.categoria === 'Entretenimiento';
                }
                return b.categoria.toLowerCase() === categoriaActiva.toLowerCase();
            });

        if (filtrados.length === 0) {
            grid.innerHTML = `
                <div class="empty-state-beneficios">
                    <i class="fa-solid fa-gift"></i>
                    <h3>No hay beneficios en esta categoría</h3>
                    <p>Prueba seleccionando otra categoría o descubre nuevos beneficios con el botón superior.</p>
                </div>
            `;
            return;
        }

        filtrados.forEach(b => {
            const card = document.createElement('article');
            card.className = `beneficio-card ${b.redimido ? 'card-redimido' : ''}`;
            card.innerHTML = `
                <div>
                    <div class="card-header-tags">
                        <span class="tag-categoria ${b.categoriaClase || 'tag-cat-default'}">
                            <i class="fa-solid ${b.icono || 'fa-tag'}"></i> ${b.categoria}
                        </span>
                        <span class="tag-producto">
                            <i class="fa-solid fa-credit-card"></i> ${b.producto}
                        </span>
                    </div>

                    <h3 class="card-title">${b.titulo}</h3>
                    <p class="card-description">${b.descripcion}</p>

                    <div class="card-meta-info">
                        <span><i class="fa-solid fa-barcode"></i> ID: ${b.id}</span>
                        <span><i class="fa-regular fa-calendar-check"></i> Válido: ${b.vigencia}</span>
                    </div>

                    <div class="card-coupon-box">
                        <span class="coupon-code">${b.codigo}</span>
                        <button class="btn-copy-code" data-codigo="${b.codigo}" title="Copiar cupón">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>
                </div>

                <div>
                    <button class="btn-redimir-action ${b.redimido ? 'is-redimido' : ''}" data-id="${b.id}" ${b.redimido ? 'disabled' : ''}>
                        ${b.redimido ? '<i class="fa-solid fa-check-circle"></i> ✅ Redimido' : '<i class="fa-solid fa-gift"></i> Redimir Beneficio'}
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        asignarEventosAcciones();
    }

    /**
     * Asigna eventos a los botones de copiar y redimir
     */
    function asignarEventosAcciones() {
        // Copiar cupón
        grid.querySelectorAll('.btn-copy-code').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const codigo = e.currentTarget.getAttribute('data-codigo');
                try {
                    await navigator.clipboard.writeText(codigo);
                    if (window.Swal) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: `¡Código ${codigo} copiado al portapapeles!`,
                            showConfirmButton: false,
                            timer: 2000,
                            background: '#121620',
                            color: '#ffffff'
                        });
                    }
                } catch (err) {
                    const temp = document.createElement('textarea');
                    temp.value = codigo;
                    document.body.appendChild(temp);
                    temp.select();
                    document.execCommand('copy');
                    document.body.removeChild(temp);
                    if (window.Swal) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: `¡Código copiado!`,
                            showConfirmButton: false,
                            timer: 2000,
                            background: '#121620',
                            color: '#ffffff'
                        });
                    }
                }
            });
        });

        // Redimir beneficio
        grid.querySelectorAll('.btn-redimir-action:not(.is-redimido)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const target = beneficios.find(b => b.id === id);

                if (!target || target.redimido) return;

                target.redimido = true;
                target.fechaRedencion = new Date().toISOString();
                guardarBeneficiosUsuario(beneficios);
                actualizarMetricas();
                renderizarTarjetas();

                if (window.Swal) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Beneficio Redimido!',
                        html: `Has redimido con éxito <strong>${target.titulo}</strong> para tu <em>${target.producto}</em>.<br><br>Cupón aplicado: <code>${target.codigo}</code>`,
                        background: '#121620',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: 'Entendido'
                    });
                }
            });
        });
    }

    /**
     * Resetea el filtro visual a 'TODOS'
     */
    function resetearFiltroATodos() {
        categoriaActiva = 'TODOS';
        if (tabsCategorias) {
            tabsCategorias.querySelectorAll('.tab-pill').forEach(t => {
                if (t.getAttribute('data-categoria') === 'TODOS') {
                    t.classList.add('active');
                } else {
                    t.classList.remove('active');
                }
            });
        }
    }

    /**
     * Evento botón Ruleta / Descubrir nuevos beneficios (Acumulación sin duplicados)
     */
    if (btnGirar) {
        btnGirar.addEventListener('click', () => {
            if (!tieneProductosActivos) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Sin Productos Activos',
                        text: 'Primero necesitas tener al menos una cuenta o tarjeta activa en Finara Bank para participar por recompensas.',
                        background: '#121620',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: 'Entendido'
                    });
                }
                return;
            }

            // Catálogo aplicable según productos del usuario
            const catalogoFiltrado = CATALOGO_BASE_BENEFICIOS.filter(b => esBeneficioCalificado(b, estadoProductos));
            const idsExistentes = new Set(beneficios.map(b => b.id));
            const disponiblesParaAgregar = catalogoFiltrado.filter(b => !idsExistentes.has(b.id));

            // Caso B: El usuario ya posee todos los beneficios posibles
            if (disponiblesParaAgregar.length === 0) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'info',
                        title: '¡Cartera de Beneficios Completa!',
                        text: 'Ya cuentas con todos los beneficios disponibles para tus productos activos. Para desbloquear más ventajas exclusivas, solicita una nueva tarjeta o producto en Finara Bank.',
                        background: '#121620',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: 'Entendido'
                    });
                }
                return;
            }

            // Caso A: Aún hay beneficios por desbloquear
            const procederDesbloqueo = () => {
                const copiaDisponibles = [...disponiblesParaAgregar].sort(() => 0.5 - Math.random());
                const cantidadAAgregar = Math.min(copiaDisponibles.length, Math.random() > 0.5 ? 2 : 1);
                const seleccionados = copiaDisponibles.slice(0, cantidadAAgregar);

                const nuevosBeneficios = seleccionados.map(b => ({
                    ...b,
                    redimido: false,
                    fechaAsignacion: new Date().toISOString()
                }));

                // Se agregan al inicio preservando los existentes (tanto disponibles como redimidos)
                beneficios = [...nuevosBeneficios, ...beneficios];
                guardarBeneficiosUsuario(beneficios);

                resetearFiltroATodos();
                actualizarMetricas();
                renderizarTarjetas();

                if (window.Swal) {
                    const mensajeHtml = nuevosBeneficios.length === 1
                        ? `Has desbloqueado: <strong>${nuevosBeneficios[0].titulo}</strong> para tu <em>${nuevosBeneficios[0].producto}</em>.`
                        : `Has desbloqueado <strong>${nuevosBeneficios.length} nuevos beneficios</strong> para tus productos.`;

                    Swal.fire({
                        icon: 'success',
                        title: '¡Nuevo Beneficio Desbloqueado!',
                        html: `${mensajeHtml}<br><br>Se ha añadido a tu cartera de recompensas sin afectar tus beneficios previos.`,
                        background: '#121620',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: '¡Genial!'
                    });
                }
            };

            if (window.Swal) {
                Swal.fire({
                    title: '¿Deseas descubrir nuevas recompensas?',
                    text: `Hay ${disponiblesParaAgregar.length} beneficio(s) disponible(s) para desbloquear en tus productos.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '🎲 ¡Girar Ruleta!',
                    cancelButtonText: 'Cancelar',
                    background: '#121620',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c',
                    cancelButtonColor: '#334155'
                }).then((result) => {
                    if (result.isConfirmed) {
                        Swal.fire({
                            title: '¡Girando la ruleta Finara!',
                            text: 'Consultando recompensas exclusivas para tus productos...',
                            timer: 750,
                            showConfirmButton: false,
                            background: '#121620',
                            color: '#ffffff',
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        }).then(() => {
                            procederDesbloqueo();
                        });
                    }
                });
            } else {
                procederDesbloqueo();
            }
        });
    }

    /**
     * Eventos Tabs / Filtros
     */
    if (tabsCategorias) {
        tabsCategorias.querySelectorAll('.tab-pill').forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabsCategorias.querySelectorAll('.tab-pill').forEach(t => t.classList.remove('active'));
                const el = e.currentTarget;
                el.classList.add('active');
                categoriaActiva = el.getAttribute('data-categoria') || 'TODOS';
                renderizarTarjetas();
            });
        });
    }

    // Inicialización
    actualizarMetricas();
    renderizarTarjetas();
}
