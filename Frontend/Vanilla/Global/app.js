// Vanilla/Global/app.js
document.addEventListener("DOMContentLoaded", async () => {
    const getSesion = (key) => {
        const val = localStorage.getItem(key) || sessionStorage.getItem(key);
        return (val && val !== "undefined" && val !== "null") ? val : null;
    };

    const userProfileRaw = getSesion("userProfile");
    const emailSesion = getSesion("emailSesion");
    const usuarioLogueadoDirecto = getSesion("usuarioLogueado");

    let usuarioActivo = null;
    if (userProfileRaw) {
        try {
            usuarioActivo = JSON.parse(userProfileRaw);
        } catch (e) {
            console.error("Error al parsear userProfile:", e);
        }
    }

    if (!usuarioActivo && !emailSesion && !usuarioLogueadoDirecto) {
        window.location.href = "../index.html";
        return;
    }

    // Identificar si el usuario es Administrador
    const esAdmin = Boolean(
        usuarioActivo && (
            usuarioActivo.username === "finara_banck" ||
            usuarioActivo.correo === "finara_banck" ||
            usuarioActivo.rol === "admin"
        )
    );

    const nombreUsuario = usuarioActivo?.nombre ||
        usuarioActivo?.username ||
        (typeof emailSesion === 'string' ? emailSesion.split('@')[0] : "Usuario");

    const greetingName = document.getElementById("greetingName");
    if (greetingName) greetingName.textContent = esAdmin ? `${nombreUsuario}` : nombreUsuario;

    const sidebarUserName = document.getElementById("sidebarUserName");
    if (sidebarUserName) sidebarUserName.textContent = nombreUsuario;

    const mainContent = document.getElementById("mainContent");
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    const sidebarCollapseBtn = document.getElementById("sidebarCollapseBtn");
    const mainWrapper = document.querySelector(".main-wrapper");

    // 🛡️ RECONFIGURACIÓN DEL MENÚ SIDEBAR Y NAVBAR SEGÚN ROL
    const sidebarNavUl = document.querySelector(".sidebar-nav ul");
    if (sidebarNavUl) {
        if (esAdmin) {
            // 1. Ocultar todas las opciones de usuario cliente del menú
            const vistasOcultar = ["dashboard", "saldos", "transferencias", "consignar", "retiros", "movimientos", "simuladortc"];
            vistasOcultar.forEach(vista => {
                const item = sidebarNavUl.querySelector(`[data-view="${vista}"]`)?.closest('li');
                if (item) item.style.display = 'none';
            });

            // 2. Ocultar el botón "Solicitar Producto" del footer del Sidebar
            const btnSolicitar = document.querySelector('.btn-solicitar-sidebar');
            if (btnSolicitar) btnSolicitar.style.display = 'none';

            // 3. Ocultar opción de "Ver perfil" en el navbar superior para el Admin
            const btnPerfilNavbar = document.querySelector('.btn-perfil-navbar');
            if (btnPerfilNavbar) {
                btnPerfilNavbar.style.display = 'none';
            }

            // 4. Crear e insertar el botón "Administración" como la única opción disponible
            if (!document.querySelector('[data-view="admindashboard"]')) {
                const adminLi = document.createElement("li");
                adminLi.className = "nav-item";
                adminLi.innerHTML = `
                    <a href="#" class="nav-link active" data-view="admindashboard" title="Administración">
                        <i class="fa-solid fa-users-gear" style="color: #e5a93c;"></i>
                        <span>Administración</span>
                    </a>
                `;
                sidebarNavUl.insertBefore(adminLi, sidebarNavUl.firstChild);
            }
        }
    }

    if (sidebarCollapseBtn && sidebar && mainWrapper) {
        sidebarCollapseBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            mainWrapper.classList.toggle("expanded");
        });
    }

    const cargarVista = async (nombreVista) => {
        try {
            const vistaMin = nombreVista.toLowerCase();

            // Protección de rutas: Acceso a Administración
            if ((vistaMin === "admindashboard" || vistaMin === "admin-dashboard") && !esAdmin) {
                mainContent.innerHTML = `
                    <div style="text-align: center; padding: 4rem 1rem;">
                        <i class="fa-solid fa-user-shield" style="font-size: 3.5rem; color: #f87171; margin-bottom: 1rem;"></i>
                        <h2 style="color: var(--text-white); margin-bottom: 0.5rem;">Acceso Restringido</h2>
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Esta sección requiere privilegios de administrador.</p>
                    </div>
                `;
                return;
            }

            // Bloquear acceso a perfil si es Admin
            if (vistaMin === "perfil" && esAdmin) {
                mainContent.innerHTML = `
                    <div style="text-align: center; padding: 4rem 1rem;">
                        <i class="fa-solid fa-user-gear" style="font-size: 3.5rem; color: #e5a93c; margin-bottom: 1rem;"></i>
                        <h2 style="color: var(--text-white); margin-bottom: 0.5rem;">Panel de Administración Activo</h2>
                        <p style="color: var(--text-muted); font-size: 0.9rem;">La cuenta de Administrador gestiona el sistema globalmente y no requiere un perfil de cliente.</p>
                    </div>
                `;
                return;
            }

            // Mapeo dinámico de vistas HTML
            let urlFetch = "";
            if (vistaMin === "admindashboard" || vistaMin === "admin-dashboard") {
                urlFetch = "/Frontend/Pages/Admin/admin-dashboard.html";
            } else {
                const mapaVistas = {
                    dashboard: 'views/Dashboard.html',
                    saldos: 'views/Saldos.html',
                    transferencias: 'views/Transferencias.html',
                    consignar: 'views/Consignar.html',
                    retiros: 'views/Retiros.html',
                    solicitarproductos: 'views/SolicitarProductos.html',
                    movimientos: 'views/Movimientos.html',
                    perfil: 'views/Perfil.html',
                    simuladortc: 'views/CreditoSimulador.html'
                };
                const archivoVista = mapaVistas[vistaMin] || `views/${nombreVista}.html`;
                urlFetch = `/Frontend/Pages/${archivoVista}`;
            }

            const respuesta = await fetch(urlFetch);

            if (!respuesta.ok) {
                throw new Error(`No se encontró la vista en: ${urlFetch}`);
            }

            const htmlContenido = await respuesta.text();
            mainContent.innerHTML = htmlContenido;

            // Inicialización de controladores JS según la vista activa
            switch (vistaMin) {
                case "dashboard":
                    try {
                        const modDash = await import('../Dashboard.js');
                        if (modDash.initDashboardView) await modDash.initDashboardView();
                    } catch (err) { }
                    break;

                case "saldos":
                    try {
                        const modSaldos = await import('../Saldos.js');
                        if (modSaldos.initSaldosView) await modSaldos.initSaldosView();
                    } catch (err) { }
                    break;

                case "admindashboard":
                case "admin-dashboard":
                    try {
                        const modAdmin = await import('../AdminCall/Admin.js');
                        if (modAdmin.initAdminView) await modAdmin.initAdminView();
                    } catch (err) {
                        console.warn("Módulo Admin.js:", err);
                    }
                    break;

                case "solicitarproductos":
                    try {
                        const modSolicitar = await import('../newCard.js');
                        if (modSolicitar.initSolicitarProductosView) await modSolicitar.initSolicitarProductosView();
                    } catch (err) { }
                    break;

                case "perfil":
                    try {
                        const modPerfil = await import('../Perfil.js');
                        if (modPerfil.initPerfilView) await modPerfil.initPerfilView();
                    } catch (err) {
                        console.warn("Módulo Perfil.js:", err);
                    }
                    break;

                case "consignar":
                    try {
                        const modConsignar = await import('../Consignar.js');
                        if (modConsignar.initConsignarView) await modConsignar.initConsignarView();
                    } catch (err) {
                        console.warn("Módulo Consignar.js:", err);
                    }
                    break;

                case "movimientos":
                    try {
                        const modMovimientos = await import('../Movimientos.js');
                        if (modMovimientos.initMovimientosView) await modMovimientos.initMovimientosView();
                    } catch (err) {
                        console.warn("Módulo Movimientos.js:", err);
                    }
                    break;

                case "retiros":
                    try {
                        const modRetiros = await import('../Retiros.js');
                        if (modRetiros.initRetirosView) await modRetiros.initRetirosView();
                    } catch (err) {
                        console.warn("Módulo Retiros.js:", err);
                    }
                    break;

                case "transferencias":
                    try {
                        const modTransferencias = await import('../Transferencias.js');
                        if (modTransferencias.initTransferenciasView) await modTransferencias.initTransferenciasView();
                    } catch (err) {
                        console.warn("Módulo Transferencias.js:", err);
                    }
                    break;

                case "simuladortc":
                    try {
                        const modSim = await import('../SimuladorTC.js');
                        if (modSim.initSimuladorTCView) await modSim.initSimuladorTCView();
                    } catch (err) {
                        console.warn("Módulo SimuladorTC.js:", err);
                    }
                    break;
            }

        } catch (error) {
            console.error("Error Router SPA:", error);
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #f87171; margin-bottom: 1rem;"></i>
                    <h2 style="color: var(--text-white); margin-bottom: 0.5rem;">Módulo en construcción</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">El módulo (${nombreVista}) estará disponible próximamente.</p>
                </div>
            `;
        }
    };

    const marcarItemActivo = (vistaDestino) => {
        document.querySelectorAll("[data-view]").forEach(el => {
            el.classList.remove("active", "is-active");
        });

        document.querySelectorAll(`[data-view="${vistaDestino}"]`).forEach(el => {
            el.classList.add("active", "is-active");
        });
    };

    document.addEventListener("click", (e) => {
        const link = e.target.closest("[data-view]");
        if (link) {
            e.preventDefault();
            const vistaDestino = link.getAttribute("data-view");
            if (!vistaDestino) return;

            marcarItemActivo(vistaDestino);
            cargarVista(vistaDestino);
        }
    });

    if (menuToggle && sidebar && sidebarBackdrop) {
        menuToggle.addEventListener("click", () => {
            const isOpen = sidebar.classList.toggle("is-open");
            sidebarBackdrop.classList.toggle("hidden", !isOpen);
        });
        sidebarBackdrop.addEventListener("click", () => {
            sidebar.classList.remove("is-open");
            sidebarBackdrop.classList.add("hidden");
        });
    }

    // 🔒 CIERRE DE SESIÓN SEGURO
    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", (e) => {
            e.preventDefault();

            localStorage.removeItem("userProfile");
            localStorage.removeItem("emailSesion");
            localStorage.removeItem("usuarioLogueado");

            sessionStorage.removeItem("userProfile");
            sessionStorage.removeItem("emailSesion");
            sessionStorage.removeItem("usuarioLogueado");

            window.location.href = "../index.html";
        });
    }

    // Inicializar directo en Administración si es Admin
    const vistaInicial = esAdmin ? "admindashboard" : "dashboard";
    marcarItemActivo(vistaInicial);
    cargarVista(vistaInicial);
});