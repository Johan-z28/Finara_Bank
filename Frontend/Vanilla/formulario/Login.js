// ---------- Configuración ----------
const MAX_INTENTOS = 3;           // intentos fallidos antes de bloquear la cuenta
const MINUTOS_BLOQUEO = 50;        // duración del bloqueo
const CLAVE_USUARIOS = "finara_usuarios_local";   // lo escribe signup.js
const CLAVE_SESION = "userProfile";               // lo leen Dashboard/Perfil
const CLAVE_CONTROL = "finara_login_control";     // { cuenta: { intentos, bloqueadoHasta } }
const RUTA_DASHBOARD = "../Dashboard.html";       // Pages/formulario -> Pages/Dashboard.html
const RUTA_ADMIN_DASHBOARD = "../Admin/admin-dashboard.html"; // Pages/formulario -> Pages/Admin/admin-dashboard.html
const CLAVE_ADMIN_AUTH = "finara_admin_auth";

// Credenciales fijas de administración (HU-02.2)
const ADMIN_CREDENTIALS = {
    username: "finara_banck",
    password: "123456777"
};

// Estilo base de todas las alertas (igual al formulario de registro)
const ESTILO_SWAL = {
    background: "#12151c",
    color: "#ffffff",
    confirmButtonColor: "#e5a93c"
};

// ---------- Mostrar / ocultar contraseña ----------
window.togglePassword = function (inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector("i");
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
};

// ---------- localStorage (con validación) ----------
function leerJSON(clave, valorPorDefecto) {
    try {
        const crudo = localStorage.getItem(clave);
        if (!crudo) return valorPorDefecto;
        const dato = JSON.parse(crudo);
        return dato === null || dato === undefined ? valorPorDefecto : dato;
    } catch (error) {
        console.warn(`No se pudo leer "${clave}" de localStorage:`, error);
        return valorPorDefecto;
    }
}

function guardarJSON(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;
    } catch (error) {
        console.warn(`No se pudo guardar "${clave}" en localStorage:`, error);
        return false;
    }
}

// Lee un campo probando varios nombres posibles (por si el registro lo guardó distinto)
function campo(usuario, nombres) {
    for (const n of nombres) {
        if (usuario[n] !== undefined && usuario[n] !== null && String(usuario[n]).trim() !== "") {
            return String(usuario[n]);
        }
    }
    return "";
}
const getUsername = (u) => campo(u, ["username", "userName", "usuario", "user"]);
const getPassword = (u) => campo(u, ["password", "contrasena", "contraseña", "clave"]);

// Solo se aceptan registros válidos (objetos con nombre de usuario)
function obtenerUsuarios() {
    const usuarios = leerJSON(CLAVE_USUARIOS, []);
    return Array.isArray(usuarios)
        ? usuarios.filter(u => u && typeof u === "object" && getUsername(u))
        : [];
}

function obtenerControl() {
    const control = leerJSON(CLAVE_CONTROL, {});
    return control && typeof control === "object" && !Array.isArray(control) ? control : {};
}

// ---------- Lógica de cuentas e intentos ----------
const normalizar = (texto) => String(texto || "").trim().toLowerCase();

function buscarUsuario(nombreUsuario, usuarios) {
    const id = normalizar(nombreUsuario);
    return usuarios.find(u => normalizar(getUsername(u)) === id) || null;
}

// Cada cuenta (usuario) tiene su propio contador: bloquear una no afecta a las demás
function claveDeCuenta(nombreUsuario) {
    return "u:" + normalizar(nombreUsuario);
}

function estadoCuenta(clave) {
    const control = obtenerControl();
    const estado = control[clave] || { intentos: 0, bloqueadoHasta: 0 };

    // Si el bloqueo ya venció, la cuenta queda como nueva
    if (estado.bloqueadoHasta && estado.bloqueadoHasta <= Date.now()) {
        delete control[clave];
        guardarJSON(CLAVE_CONTROL, control);
        return { intentos: 0, bloqueadoHasta: 0 };
    }
    return estado;
}

function guardarEstadoCuenta(clave, estado) {
    const control = obtenerControl();
    control[clave] = estado;
    guardarJSON(CLAVE_CONTROL, control);
}

function limpiarEstadoCuenta(clave) {
    const control = obtenerControl();
    delete control[clave];
    guardarJSON(CLAVE_CONTROL, control);
}

function formatearTiempo(ms) {
    const totalSeg = Math.max(1, Math.ceil(ms / 1000));
    const min = Math.floor(totalSeg / 60);
    const seg = totalSeg % 60;
    return min > 0 ? `${min} min ${seg} s` : `${seg} s`;
}

// ---------- Alertas (SweetAlert2) ----------
function alertaCamposVacios() {
    return Swal.fire({
        ...ESTILO_SWAL,
        icon: "info",
        title: "Campos incompletos",
        text: "Ingresa tu usuario y tu contraseña para continuar."
    });
}

function alertaSinCuentas() {
    return Swal.fire({
        ...ESTILO_SWAL,
        icon: "info",
        title: "No hay cuentas registradas",
        text: "No encontramos usuarios guardados en este navegador. Crea una cuenta para continuar.",
        confirmButtonText: "Entendido"
    });
}

// Sale desde el PRIMER error (usuario o contraseña incorrectos)
function alertaCredencialesIncorrectas(intentosRestantes) {
    const critico = intentosRestantes === 1;
    const textoIntentos = critico
        ? "Te queda 1 intento antes de que se bloquee la cuenta."
        : `Te quedan ${intentosRestantes} intentos antes de que se bloquee la cuenta.`;

    return Swal.fire({
        ...ESTILO_SWAL,
        icon: critico ? "error" : "warning",
        title: "Credenciales incorrectas",
        html: `El usuario o la contraseña no son válidos.<br>
               <span class="intentos-aviso ${critico ? "critico" : ""}">
                   <i class="fa-solid fa-triangle-exclamation"></i> ${textoIntentos}
               </span>`
    });
}

// Muestra una cuenta regresiva en vivo hasta que termine el bloqueo
function alertaCuentaBloqueada(bloqueadoHasta, recienBloqueada) {
    let intervalo = null;

    return Swal.fire({
        ...ESTILO_SWAL,
        icon: "error",
        title: "Cuenta bloqueada",
        html: (recienBloqueada
                ? `Superaste los ${MAX_INTENTOS} intentos fallidos.<br>`
                : "Esta cuenta se encuentra bloqueada temporalmente.<br>") +
              `<span class="intentos-aviso critico">
                   <i class="fa-solid fa-lock"></i>
                   Intenta de nuevo en <b id="tiempoBloqueo">${formatearTiempo(bloqueadoHasta - Date.now())}</b>
               </span>
               <span class="aviso-extra">Puedes iniciar sesión con otra cuenta mientras tanto.</span>`,
        didOpen: () => {
            const el = Swal.getHtmlContainer().querySelector("#tiempoBloqueo");
            intervalo = setInterval(() => {
                const restante = bloqueadoHasta - Date.now();
                if (restante <= 0) {
                    clearInterval(intervalo);
                    if (el) el.textContent = "0 s";
                    return;
                }
                if (el) el.textContent = formatearTiempo(restante);
            }, 1000);
        },
        willClose: () => clearInterval(intervalo)
    });
}

// ---------- Inicio ----------
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const inputUsuario = document.getElementById("usuario");
    const inputPassword = document.getElementById("password");
    const loginRole = document.getElementById("loginRole");
    const tabCliente = document.getElementById("tabCliente");
    const tabAdmin = document.getElementById("tabAdmin");
    const formHeaderIcon = document.getElementById("formHeaderIcon");
    const formHeaderTitle = document.getElementById("formHeaderTitle");
    const formHeaderSubtitle = document.getElementById("formHeaderSubtitle");
    const submitBtn = loginForm ? loginForm.querySelector(".login-button") : null;
    const registerLinkWrapper = document.querySelector(".register-link");
    const forgotPasswordLink = document.getElementById("forgotPassword");

    // Modalidad de acceso: CLIENTE vs ADMINISTRADOR (HU-02.2)
    function cambiarModalidadAcceso(rol) {
        if (!loginRole) return;
        loginRole.value = rol;

        const esAdmin = rol === "ADMIN";

        if (tabCliente && tabAdmin) {
            tabCliente.classList.toggle("activo", !esAdmin);
            tabCliente.setAttribute("aria-selected", !esAdmin ? "true" : "false");
            tabAdmin.classList.toggle("activo", esAdmin);
            tabAdmin.setAttribute("aria-selected", esAdmin ? "true" : "false");
        }

        if (formHeaderIcon) {
            formHeaderIcon.className = esAdmin ? "form-icon form-icon--admin" : "form-icon";
            formHeaderIcon.innerHTML = esAdmin
                ? '<i class="fa-solid fa-user-shield"></i>'
                : '<i class="fa-solid fa-right-to-bracket"></i>';
        }

        if (formHeaderTitle) {
            formHeaderTitle.textContent = esAdmin ? "Acceso de Administrador" : "Iniciar sesión";
        }

        if (formHeaderSubtitle) {
            formHeaderSubtitle.textContent = esAdmin
                ? "Ingresa tus credenciales maestras de administración Finara Bank."
                : "Ingresa tu usuario y contraseña para acceder a tu cuenta.";
        }

        if (submitBtn) {
            submitBtn.className = esAdmin ? "login-button login-button--admin" : "login-button";
            submitBtn.querySelector("span").textContent = esAdmin ? "Ingresar al Panel Admin" : "Iniciar sesión";
        }

        if (registerLinkWrapper) {
            registerLinkWrapper.style.display = esAdmin ? "none" : "flex";
        }

        if (forgotPasswordLink) {
            forgotPasswordLink.style.display = esAdmin ? "none" : "block";
        }

        inputUsuario.value = "";
        inputPassword.value = "";
        inputUsuario.placeholder = esAdmin ? "Ej. finara_banck" : "Ej. yull_mesa";
        inputUsuario.focus();
    }

    if (tabCliente && tabAdmin) {
        tabCliente.addEventListener("click", () => cambiarModalidadAcceso("CLIENTE"));
        tabAdmin.addEventListener("click", () => cambiarModalidadAcceso("ADMIN"));
    }

    // Si viene con parámetro ?admin=true en la URL, abrir pestaña de admin directamente
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true") {
        cambiarModalidadAcceso("ADMIN");
    }

    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            // El campo nunca se bloquea: se puede escribir, copiar y pegar siempre
            const nombreUsuario = inputUsuario.value.trim().replace(/^@/, "");
            const password = inputPassword.value;
            const esModoAdmin = loginRole ? loginRole.value === "ADMIN" : false;

            // 1. Campos vacíos
            if (!nombreUsuario || !password) {
                alertaCamposVacios();
                return;
            }

            // =========================================================
            // 2. ACCESO EXCLUSIVO ADMINISTRADOR (HU-02.2)
            // =========================================================
            if (esModoAdmin) {
                if (nombreUsuario === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                    // Guardar token/sesión de autenticación de administrador
                    const sesionAdmin = {
                        rol: "ADMIN",
                        username: ADMIN_CREDENTIALS.username,
                        nombre: "Administrador Finara",
                        fechaLogin: new Date().toISOString()
                    };
                    guardarJSON(CLAVE_ADMIN_AUTH, sesionAdmin);

                    Swal.fire({
                        ...ESTILO_SWAL,
                        icon: "success",
                        title: "¡Credenciales de Administrador Válidas!",
                        text: "Accediendo al Panel de Control y Administración...",
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = RUTA_ADMIN_DASHBOARD;
                    });
                } else {
                    inputPassword.value = "";
                    Swal.fire({
                        ...ESTILO_SWAL,
                        icon: "error",
                        title: "Credenciales de Administrador Incorrectas",
                        text: "El usuario o la contraseña de administración son inválidos. Por favor, verifica tus datos de acceso.",
                        confirmButtonText: "Intentar de nuevo"
                    }).then(() => {
                        inputPassword.focus();
                    });
                }
                return;
            }

            // =========================================================
            // 3. ACCESO CLIENTE CONVENCIONAL
            // =========================================================
            const usuarios = obtenerUsuarios();

            if (usuarios.length === 0) {
                console.warn(`[Login] No hay usuarios en localStorage ("${CLAVE_USUARIOS}") para este origen:`, window.location.origin);
                alertaSinCuentas();
                return;
            }

            const usuarioExistente = buscarUsuario(nombreUsuario, usuarios);
            const clave = claveDeCuenta(nombreUsuario);
            const estado = estadoCuenta(clave);

            // ¿Esta cuenta está bloqueada? (las demás cuentas siguen funcionando)
            if (estado.bloqueadoHasta > Date.now()) {
                inputPassword.value = "";
                alertaCuentaBloqueada(estado.bloqueadoHasta, false)
                    .then(() => inputUsuario.focus());
                return;
            }

            // Credenciales correctas
            if (usuarioExistente && getPassword(usuarioExistente) === password) {
                limpiarEstadoCuenta(clave);

                // Guardar tanto el perfil completo como las variables globales que app.js espera
                guardarJSON(CLAVE_SESION, usuarioExistente);
                localStorage.setItem("userName", usuarioExistente.nombre || usuarioExistente.username || "Sin Nombre");
                localStorage.setItem("userAvatar", usuarioExistente.avatar || "");

                if (!guardarJSON(CLAVE_SESION, usuarioExistente)) {
                    Swal.fire({
                        ...ESTILO_SWAL,
                        icon: "error",
                        title: "No se pudo iniciar sesión",
                        text: "Tu navegador no permite guardar la sesión. Revisa que el almacenamiento local esté habilitado."
                    });
                    return;
                }

                Swal.fire({
                    ...ESTILO_SWAL,
                    icon: "success",
                    title: "¡Bienvenido de nuevo!",
                    text: "Accediendo a tu panel de control...",
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = RUTA_DASHBOARD;
                });
                return;
            }

            // Usuario o contraseña incorrectos: sumar intento y avisar
            const intentos = estado.intentos + 1;
            inputPassword.value = "";

            if (intentos >= MAX_INTENTOS) {
                const bloqueadoHasta = Date.now() + MINUTOS_BLOQUEO * 60 * 1000;
                guardarEstadoCuenta(clave, { intentos, bloqueadoHasta });
                alertaCuentaBloqueada(bloqueadoHasta, true)
                    .then(() => inputUsuario.focus());
            } else {
                guardarEstadoCuenta(clave, { intentos, bloqueadoHasta: 0 });
                alertaCredencialesIncorrectas(MAX_INTENTOS - intentos)
                    .then(() => inputPassword.focus());
            }
        });
    }

    // Recuperar contraseña (aviso informativo)
    const forgot = document.getElementById("forgotPassword");
    if (forgot) {
        forgot.addEventListener("click", function (e) {
            e.preventDefault();
            Swal.fire({
                ...ESTILO_SWAL,
                icon: "info",
                title: "Recuperar contraseña",
                text: "Esta función estará disponible próximamente. Si necesitas ayuda, comunícate con soporte de Finara Bank.",
                confirmButtonText: "Entendido"
            });
        });
    }
});