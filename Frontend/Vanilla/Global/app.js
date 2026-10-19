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

    // RECONFIGURACIÓN SEGÚN ROL
    const sidebarNavUl = document.querySelector(".sidebar-nav ul");
    if (sidebarNavUl && esAdmin) {
        const vistasOcultar = ["dashboard", "saldos", "transferencias", "consignar", "retiros", "movimientos", "simuladortc"];
        vistasOcultar.forEach(vista => {
            const item = sidebarNavUl.querySelector(`[data-view="${vista}"]`)?.closest('li');
            if (item) item.style.display = 'none';
        });

        const btnSolicitar = document.querySelector('.btn-solicitar-sidebar');
        if (btnSolicitar) btnSolicitar.style.display = 'none';

        const btnPerfilNavbar = document.querySelector('.btn-perfil-navbar');
        if (btnPerfilNavbar) btnPerfilNavbar.style.display = 'none';

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

    if (sidebarCollapseBtn && sidebar && mainWrapper) {
        sidebarCollapseBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            mainWrapper.classList.toggle("expanded");
        });
    }

    const cerrarMenuMovil = () => {
        if (sidebar) sidebar.classList.remove("is-open");
        if (sidebarBackdrop) sidebarBackdrop.classList.add("hidden");
    };

    const cargarVista = async (nombreVista) => {
        try {
            const vistaMin = nombreVista.toLowerCase();

            if ((vistaMin === "admindashboard" || vistaMin === "admin-dashboard") && !esAdmin) {
                mainContent.innerHTML = `<div style="text-align: center; padding: 4rem 1rem;"><h2>Acceso Restringido</h2></div>`;
                return;
            }

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
                urlFetch = `/Frontend/Pages/${mapaVistas[vistaMin] || `views/${nombreVista}.html`}`;
            }

            const respuesta = await fetch(urlFetch);
            if (!respuesta.ok) throw new Error(`No se encontró la vista en: ${urlFetch}`);

            const htmlContenido = await respuesta.text();
            mainContent.innerHTML = htmlContenido;

            // Inicialización de módulos JS
            switch (vistaMin) {
                case "dashboard":
                    try { const m = await import('../Dashboard.js'); if (m.initDashboardView) await m.initDashboardView(); } catch (e) {}
                    break;
                case "saldos":
                    try { const m = await import('../Saldos.js'); if (m.initSaldosView) await m.initSaldosView(); } catch (e) {}
                    break;
                case "transferencias":
                    try { const m = await import('../Transferencias.js'); if (m.initTransferenciasView) await m.initTransferenciasView(); } catch (e) {}
                    break;
                case "consignar":
                    try { const m = await import('../Consignar.js'); if (m.initConsignarView) await m.initConsignarView(); } catch (e) {}
                    break;
                case "retiros":
                    try { const m = await import('../Retiros.js'); if (m.initRetirosView) await m.initRetirosView(); } catch (e) {}
                    break;
                case "solicitarproductos":
                    try { const m = await import('../newCard.js'); if (m.initSolicitarProductosView) await m.initSolicitarProductosView(); } catch (e) {}
                    break;
                case "perfil":
                    try { const m = await import('../Perfil.js'); if (m.initPerfilView) await m.initPerfilView(); } catch (e) {}
                    break;
                case "movimientos":
                    try { const m = await import('../Movimientos.js'); if (m.initMovimientosView) await m.initMovimientosView(); } catch (e) {}
                    break;
            }

        } catch (error) {
            mainContent.innerHTML = `<div style="text-align: center; padding: 4rem 1rem;"><h2>Módulo en construcción</h2></div>`;
        }
    };

    const marcarItemActivo = (vistaDestino) => {
        document.querySelectorAll("[data-view]").forEach(el => el.classList.remove("active", "is-active"));
        document.querySelectorAll(`[data-view="${vistaDestino}"]`).forEach(el => el.classList.add("active", "is-active"));
    };

    document.addEventListener("click", (e) => {
        const link = e.target.closest("[data-view]");
        if (link) {
            e.preventDefault();
            const vistaDestino = link.getAttribute("data-view");
            if (!vistaDestino) return;

            marcarItemActivo(vistaDestino);
            cargarVista(vistaDestino);
            cerrarMenuMovil(); // Cierra el menú al navegar en celular
        }
    });

    if (menuToggle && sidebar && sidebarBackdrop) {
        menuToggle.addEventListener("click", () => {
            const isOpen = sidebar.classList.toggle("is-open");
            sidebarBackdrop.classList.toggle("hidden", !isOpen);
        });
        sidebarBackdrop.addEventListener("click", cerrarMenuMovil);
    }

    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../index.html";
        });
    }

    const vistaInicial = esAdmin ? "admindashboard" : "dashboard";
    marcarItemActivo(vistaInicial);
    cargarVista(vistaInicial);
});