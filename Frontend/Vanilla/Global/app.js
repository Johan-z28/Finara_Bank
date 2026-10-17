// Vanilla/Global/app.js o app.js principal
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

    const nombreUsuario = usuarioActivo?.nombre ||
        usuarioActivo?.username ||
        (typeof emailSesion === 'string' ? emailSesion.split('@')[0] : "Usuario");

    const greetingName = document.getElementById("greetingName");
    if (greetingName) greetingName.textContent = nombreUsuario;

    const sidebarUserName = document.getElementById("sidebarUserName");
    if (sidebarUserName) sidebarUserName.textContent = nombreUsuario;

    const mainContent = document.getElementById("mainContent");
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    const sidebarCollapseBtn = document.getElementById("sidebarCollapseBtn");
    const mainWrapper = document.querySelector(".main-wrapper");

    if (sidebarCollapseBtn && sidebar && mainWrapper) {
        sidebarCollapseBtn.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            mainWrapper.classList.toggle("expanded");
        });
    }

    const cargarVista = async (nombreVista) => {
        try {
            const vistaMin = nombreVista.toLowerCase();
            
            const mapaVistas = {
                dashboard: 'Dashboard.html',
                inicio: 'Dashboard.html',
                saldos: 'Saldos.html',
                transferencias: 'Transferencias.html',
                consignar: 'Consignar.html',
                retiros: 'Retiros.html',
                solicitarproductos: 'SolicitarProductos.html',
                solicitarProductos: 'SolicitarProductos.html',
                movimientos: 'Movimientos.html',
                perfil: 'Perfil.html'
            };

            const archivoVista = mapaVistas[vistaMin] || `${nombreVista}.html`;
            const respuesta = await fetch(`/Frontend/Pages/views/${archivoVista}`);

            if (!respuesta.ok) {
                throw new Error(`No se encontró el archivo ${archivoVista}`);
            }

            const htmlContenido = await respuesta.text();
            mainContent.innerHTML = htmlContenido;

            switch (vistaMin) {
                case "dashboard":
                case "inicio":
                    try {
                        const modDash = await import('../Dashboard.js');
                        if (modDash.initDashboardView) {
                            await modDash.initDashboardView();
                        }
                    } catch (err) {
                        console.warn("Módulo JS Dashboard no requerido:", err);
                    }
                    break;

                case "saldos":
                    try {
                        const modSaldos = await import('../Saldos.js');
                        if (modSaldos.initSaldosView) {
                            await modSaldos.initSaldosView();
                        }
                    } catch (err) {
                        console.error("Error al inicializar el módulo de Saldos:", err);
                    }
                    break;

                case "transferencias":
                    try {
                        const modTransf = await import('../Transferencias.js');
                        if (modTransf.initTransferenciasView) {
                            await modTransf.initTransferenciasView();
                        }
                    } catch (err) {
                        console.error("Error al inicializar Transferencias:", err);
                    }
                    break;

                case "consignar":
                    try {
                        const modConsignar = await import('../Consignar.js');
                        if (modConsignar.initConsignarView) {
                            await modConsignar.initConsignarView();
                        }
                    } catch (err) {
                        console.warn("Error al inicializar Consignar:", err);
                    }
                    break;

                case "retiros":
                    try {
                        const modRetiros = await import('../Retiros.js');
                        if (typeof modRetiros.initRetirosView === 'function') {
                            await modRetiros.initRetirosView();
                        }
                    } catch (err) {
                        console.warn("Error al inicializar Retiros:", err);
                    }
                    break;

                case "solicitarproductos":
                    try {
                        const modSolicitar = await import('../newCard.js');
                        if (modSolicitar.initSolicitarProductosView) {
                            await modSolicitar.initSolicitarProductosView();
                        }
                    } catch (err) {
                        console.warn("Módulo newCard.js", err);
                    }
                    break;

                case "movimientos":
                    try {
                        const modMov = await import('../Movimientos.js');
                        if (modMov.initMovimientosView) {
                            await modMov.initMovimientosView();
                        }
                    } catch (err) {
                        console.warn("Módulo Movimientos.js", err);
                    }
                    break;

                case "perfil":
                    try {
                        const modPerfil = await import('../Perfil.js');
                        if (modPerfil.initPerfilView) {
                            await modPerfil.initPerfilView();
                        }
                    } catch (err) {
                        console.error("Error al inicializar Perfil:", err);
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

            if (window.innerWidth <= 850 && sidebar) {
                sidebar.classList.remove("is-open");
                if (sidebarBackdrop) sidebarBackdrop.classList.add("hidden");
            }
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

    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("userProfile");
            localStorage.removeItem("usuarioLogueado");
            localStorage.removeItem("emailSesion");
            localStorage.removeItem("userName");
            localStorage.removeItem("usuarioActivo");
            sessionStorage.clear();
            window.location.href = "../index.html";
        });
    }

    marcarItemActivo("dashboard");
    cargarVista("dashboard");
});