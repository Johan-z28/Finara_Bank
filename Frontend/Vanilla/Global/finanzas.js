// Vanilla/FinaraFinanzas.js

document.addEventListener("DOMContentLoaded", async () => {
    // 1. GESTIÓN DE SESIÓN
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

    // Redirección al login si no hay sesión activa
    if (!usuarioActivo && !emailSesion && !usuarioLogueadoDirecto) {
        window.location.href = "../index.html";
        return;
    }

    const nombreUsuario = usuarioActivo?.nombre ||
        usuarioActivo?.username ||
        (typeof emailSesion === 'string' ? emailSesion.split('@')[0] : "Usuario");

    // Sincronizar datos de usuario en la UI
    const greetingName = document.getElementById("greetingName");
    if (greetingName) greetingName.textContent = nombreUsuario;

    const sidebarUserName = document.getElementById("sidebarUserName");
    if (sidebarUserName) sidebarUserName.textContent = nombreUsuario;

    // Helper para sanitizar y normalizar ruta del avatar
    const sanitizarAvatar = (avatar) => {
        if (!avatar || typeof avatar !== 'string') return "../Style/image/profile/avatarDefault.png";
        if (avatar.startsWith("data:") || avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
        if (avatar.includes("avatar-maria") || avatar.includes("../../") || avatar.toLowerCase().startsWith("style/") || avatar.toLowerCase().startsWith("/style/")) {
            return "../Style/image/profile/avatarDefault.png";
        }
        return avatar;
    };

    // Sincronizar Avatar en Navbar
    const avatarSrc = sanitizarAvatar(usuarioActivo?.avatar || (localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile')).avatar : null));

    const navbarAvatarImg = document.getElementById("navbarAvatarImg");
    if (navbarAvatarImg) {
        navbarAvatarImg.src = avatarSrc;
        navbarAvatarImg.onerror = () => {
            navbarAvatarImg.onerror = null;
            navbarAvatarImg.src = "../Style/image/profile/avatarDefault.png";
        };
    }

    // Auto-reparar en localStorage si contenía una ruta rota
    if (usuarioActivo && usuarioActivo.avatar !== avatarSrc) {
        usuarioActivo.avatar = avatarSrc;
        localStorage.setItem("userProfile", JSON.stringify(usuarioActivo));
        localStorage.setItem("userAvatar", avatarSrc);
    }

    // 2. REFERENCIAS A ELEMENTOS DEL DOM
    const mainContent = document.getElementById("mainContent");
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    const sidebarCollapseBtn = document.getElementById("sidebarCollapseBtn");
    const mainWrapper = document.querySelector(".main-wrapper");

    // Colapso del Sidebar
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

    // 3. ENROUTADOR Y CARGADOR DE VISTAS SPA (FINANZAS)
    const cargarVista = async (nombreVista) => {
        try {
            const vistaMin = nombreVista.toLowerCase();

            const mapaVistas = {
                dashboard: 'views/Finanzas/DashboardFinanzas.html',
                fondoemergencia: 'views/Finanzas/FondoEmergencia.html',
                presupuesto: 'views/Finanzas/Presupuesto.html',
                suscripcionespagos: 'views/Finanzas/SuscripcionesPagos.html',
                saludfinanciera: 'views/Finanzas/SaludFinanciera.html',
                gestiondeudas: 'views/Finanzas/GestionDeudas.html',
                perfil: 'views/Perfil.html' // Vista unificada de perfil
            };

            const urlFetch = `/Frontend/Pages/${mapaVistas[vistaMin] || `views/finanzas/${nombreVista}.html`}`;

            let respuesta = await fetch(urlFetch).catch(() => null);
            if (!respuesta || !respuesta.ok) {
                const fallbackUrl = urlFetch.startsWith("/Frontend/Pages/") ? urlFetch.replace("/Frontend/Pages/", "") : urlFetch;
                const altResp = await fetch(fallbackUrl).catch(() => null);
                if (altResp && altResp.ok) respuesta = altResp;
            }
            if (!respuesta || !respuesta.ok) throw new Error(`No se encontró la vista en: ${urlFetch}`);

            const htmlContenido = await respuesta.text();
            mainContent.innerHTML = htmlContenido;

            // Inicialización de módulos JS según la vista activa
            switch (vistaMin) {
                case "dashboard":
                    try { const m = await import('../Finanzas/DashboardFinanzas.js'); if (m.initDashboardFinanzasView) await m.initDashboardFinanzasView(); } catch (e) { }
                    break;
                case "fondoemergencia":
                    try { const m = await import('../Finanzas/FondoEmergencia.js'); if (m.initFondoEmergenciaView) await m.initFondoEmergenciaView(); } catch (e) { }
                    break;
                case "presupuesto":
                    try { const m = await import('../Finanzas/Presupuesto.js'); if (m.initPresupuestoView) await m.initPresupuestoView(); } catch (e) { }
                    break;
                case "suscripcionespagos":
                    try { const m = await import('../Finanzas/SuscripcionesPagos.js'); if (m.initSuscripcionesPagosView) await m.initSuscripcionesPagosView(); } catch (e) { console.error(e); }
                    break;
                case "saludfinanciera":
                    try { const m = await import('../Finanzas/SaludFinanciera.js'); if (m.initSaludFinancieraView) await m.initSaludFinancieraView(); } catch (e) { }
                    break;
                case "gestiondeudas":
                    try { const m = await import('../Finanzas/GestionDeudas.js'); if (m.initGestionDeudasView) await m.initGestionDeudasView(); } catch (e) { console.error(e); }
                    break;
                case "perfil":
                    try { const m = await import('../Perfil.js'); if (m.initPerfilView) await m.initPerfilView('finanzas'); } catch (e) { }
                    break;
            }

        } catch (error) {
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 4rem 1rem;">
                    <h2>Módulo en construcción 🚀</h2>
                    <p style="color: #94a3b8; margin-top: 8px;">Estamos desarrollando esta sección para ayudarte a mejorar tus finanzas.</p>
                </div>`;
        }
    };

    // Marcar item activo en el sidebar
    const marcarItemActivo = (vistaDestino) => {
        document.querySelectorAll("[data-view]").forEach(el => el.classList.remove("active", "is-active"));
        document.querySelectorAll(`[data-view="${vistaDestino}"]`).forEach(el => el.classList.add("active", "is-active"));
    };

    // Listener global para navegación
    document.addEventListener("click", (e) => {
        const link = e.target.closest("[data-view]");
        if (link) {
            e.preventDefault();
            const vistaDestino = link.getAttribute("data-view");
            if (!vistaDestino) return;

            marcarItemActivo(vistaDestino);
            cargarVista(vistaDestino);
            cerrarMenuMovil();
        }
    });

    // Menú hamburguesa móvil
    if (menuToggle && sidebar && sidebarBackdrop) {
        menuToggle.addEventListener("click", () => {
            const isOpen = sidebar.classList.toggle("is-open");
            sidebarBackdrop.classList.toggle("hidden", !isOpen);
        });
        sidebarBackdrop.addEventListener("click", cerrarMenuMovil);
    }

    // 4. CERRAR SESIÓN
    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", (e) => {
            e.preventDefault();

            localStorage.removeItem("userProfile");
            localStorage.removeItem("emailSesion");
            localStorage.removeItem("usuarioLogueado");

            sessionStorage.clear();

            window.location.href = "../index.html";
        });
    }

    // Cargar la vista inicial del Dashboard de Finanzas
    marcarItemActivo("dashboard");
    cargarVista("dashboard");
});