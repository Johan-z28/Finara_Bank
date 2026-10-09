// ==========================================
// MODELO POO: CLASES DE TARJETAS BANCARIAS
// ==========================================

// Clase Padre (Superclase)
class TarjetaBancaria {
    constructor(tipo, titulo, proposito, operaciones, intereses, condicion) {
        this.tipo = tipo;
        this.titulo = titulo;
        this.proposito = proposito;
        this.operaciones = operaciones;
        this.intereses = intereses;
        this.condicion = condicion;
    }

    // Método genérico de evaluación (a sobreescribir en las hijas)
    validarRequisitos(ingresos, estrato) {
        return { aprobado: true, motivo: "" };
    }

    // Método para generar un número único de tarjeta aleatorio tipo bancario
    generarNumeroUnico() {
        const bloque1 = Math.floor(1000 + Math.random() * 9000);
        const bloque2 = Math.floor(1000 + Math.random() * 9000);
        const bloque3 = Math.floor(1000 + Math.random() * 9000);
        const bloque4 = Math.floor(1000 + Math.random() * 9000);
        return `4532 ${bloque1} ${bloque2} ${bloque4}`; // Prefijo simulado Visa/Finara
    }
}

// Clase Hija 1: Tarjeta Débito
class TarjetaDebito extends TarjetaBancaria {
    constructor() {
        super(
            "debito",
            "Tarjeta Débito Finara",
            "Guardar dinero a mediano y largo plazo.",
            "Consignación y retiro de dinero de forma segura.",
            "Tasa mensual del 1.5%, calculada y aplicada al momento del retiro.",
            "El monto a retirar no puede superar el saldo disponible."
        );
    }

    validarRequisitos(ingresos, estrato) {
        return { aprobado: true, motivo: "" };
    }
}

// Clase Hija 2: Tarjeta de Crédito Gold
class TarjetaCredito extends TarjetaBancaria {
    constructor() {
        super(
            "credito",
            "Tarjeta de Crédito Gold",
            "Medio de pago para financiar compras a cuotas con intereses según el plazo.",
            "El banco asigna un cupo de crédito; cada compra genera deuda a pagar.",
            "Se calcula según el valor del pago mensual resultante.",
            "Requiere ingresos mínimos anuales y validación de estrato socioeconómico."
        );
    }

    validarRequisitos(ingresos, estrato) {
        if (ingresos < 20000000 || estrato < 2) {
            return {
                aprobado: false,
                motivo: "Para la Tarjeta de Crédito Gold se requiere un ingreso anual superior a $20,000,000 y estrato mínimo de 2."
            };
        }
        return { aprobado: true, motivo: "" };
    }
}

// Clase Hija 3: Tarjeta Cuenta Corriente
class TarjetaCorriente extends TarjetaBancaria {
    constructor() {
        super(
            "corriente",
            "Tarjeta Cuenta Corriente",
            "Gestión diaria del dinero con mayor flexibilidad y sobregiro.",
            "Recibir nómina, pagar facturas y transferencias frecuentes.",
            "No genera intereses convencionales.",
            "Sobregiro permitido de hasta 20% adicional sobre el saldo actual."
        );
    }

    validarRequisitos(ingresos, estrato) {
        if (ingresos < 12000000) {
            return {
                aprobado: false,
                motivo: "Para la Cuenta Corriente se requiere un ingreso anual mínimo de $12,000,000."
            };
        }
        return { aprobado: true, motivo: "" };
    }
}

// Fábrica (Factory) para instanciar la tarjeta correcta según el tipo
function obtenerInstanciaTarjeta(tipo) {
    switch (tipo) {
        case "credito": return new TarjetaCredito();
        case "corriente": return new TarjetaCorriente();
        case "debito":
        default:
            return new TarjetaDebito();
    }
}


// ==========================================
// LÓGICA DE INTERFAZ Y EVENTOS DOM
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const botonesSolicitar = document.querySelectorAll(".request-card-btn");
    const profileBtn = document.getElementById("profileMenuBtn");
    const profileDropdown = document.getElementById("profileDropdown");
    const dropdownUserName = document.getElementById("dropdownUserName");
    const greetingName = document.getElementById("greetingName");
    const userAvatarImg = document.getElementById("userAvatarImg");
    const userAvatarIcon = document.getElementById("userAvatarIcon");
    const logoutBtn = document.getElementById("logoutBtn");

    // 1. Cargar datos del usuario activo en la barra superior y el menú
    const usuarioActivo = obtenerUsuarioActivo();
    if (usuarioActivo) {
        if (greetingName) greetingName.textContent = usuarioActivo.nombre || "Usuario";
        if (dropdownUserName) dropdownUserName.textContent = usuarioActivo.nombre || "Usuario";
        if (usuarioActivo.avatar && userAvatarImg) {
            userAvatarImg.src = usuarioActivo.avatar;
            userAvatarImg.classList.remove("hidden");
            if (userAvatarIcon) userAvatarIcon.classList.add("hidden");
        }
    }

    // 2. Alternar la visibilidad del menú desplegable de perfil
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("show");
            profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
        });
        document.addEventListener("click", (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.style.display = "none";
            }
        });
    }

    // 3. Lógica para cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("userProfile");
            localStorage.removeItem("usuarioActivo");
            localStorage.removeItem("usuarioLogueado");
            localStorage.removeItem("emailSesion");
            window.location.href = logoutBtn.getAttribute("href") || "../../index.html";
        });
    }

    botonesSolicitar.forEach(boton => {
        boton.addEventListener("click", (e) => {
            const usuarioActual = obtenerUsuarioActivo();
            if (!usuarioActual) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sesión requerida',
                    text: 'Debes iniciar sesión para solicitar un producto.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            if (usuarioActual.verificado !== true) {
                Swal.fire({
                    icon: 'info',
                    title: 'Cuenta no verificada',
                    text: 'Tu cuenta no está verificada. No puedes solicitar tarjetas hasta que sea validada.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            const tarjetaBox = e.target.closest(".card-option-box");
            const tipoTarjeta = tarjetaBox.getAttribute("data-card");

            // Instanciamos el objeto usando POO
            const tarjetaObj = obtenerInstanciaTarjeta(tipoTarjeta);
            mostrarModalSolicitud(tarjetaObj, usuarioActual);
        });
    });
});

// Función unificada para recuperar correctamente el usuario activo desde localStorage
function obtenerUsuarioActivo() {
    const perfilDirecto = JSON.parse(localStorage.getItem("userProfile"));
    if (perfilDirecto) return perfilDirecto;

    const emailLogueado = localStorage.getItem("usuarioLogueado") || localStorage.getItem("emailSesion");
    const listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    if (emailLogueado) {
        const encontrado = listaUsuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado);
        if (encontrado) return encontrado;
    }
    const userDirecto = JSON.parse(localStorage.getItem("usuarioActivo"));
    if (userDirecto) return userDirecto;
    return null;
}

function mostrarModalSolicitud(tarjetaObj, usuarioActivo) {
    const modalExistente = document.getElementById("modalFinaraCompleto");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalFinaraCompleto";
    overlay.style.cssText = `
       position: fixed;
       top: 0; left: 0; width: 100vw; height: 100vh;
       background-color: rgba(5, 8, 13, 0.85);
       display: flex; justify-content: center; align-items: center;
       z-index: 9999; font-family: 'Poppins', sans-serif; padding: 1rem;
   `;
    overlay.innerHTML = `
       <div style="
           background-color: #12151c; border: 1px solid #1f2430; border-radius: 16px;
           width: 95%; max-width: 1100px; display: grid; grid-template-columns: 1fr 1.2fr 180px;
           gap: 1.5rem; padding: 2.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
           position: relative; max-height: 90vh; overflow-y: auto;
       " class="modal-grid-content">
         
           <!-- Columna Izquierda (Datos de la Tarjeta usando POO) -->
           <div style="background: linear-gradient(145deg, rgba(229, 163, 60, 0.08), rgba(18, 21, 28, 0.5)); border: 1px solid rgba(229, 163, 60, 0.25); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
               <div>
                   <span style="color: #e5a93c; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Detalles del Producto (POO)</span>
                   <h3 style="color: #fff; font-size: 1.2rem; margin: 0.5rem 0 1rem 0;">${tarjetaObj.titulo}</h3>
                   <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: #8a8f99; display: flex; flex-direction: column; gap: 0.75rem;">
                       <li><strong style="color: #fff;">Propósito:</strong> ${tarjetaObj.proposito}</li>
                       <li><strong style="color: #fff;">Operación:</strong> ${tarjetaObj.operaciones}</li>
                       <li><strong style="color: #fff;">Intereses:</strong> ${tarjetaObj.intereses}</li>
                       <li><strong style="color: #fff;">Condición:</strong> ${tarjetaObj.condicion}</li>
                   </ul>
               </div>
               <div style="margin-top: 1rem; text-align: center; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                   <i class="fa-solid fa-shield-halved" style="font-size: 1.8rem; color: #e5a93c;"></i>
                   <p style="font-size: 0.7rem; color: #8a8f99; margin-top: 0.3rem;">Titular: ${usuarioActivo.nombre}</p>
               </div>
           </div>

           <!-- Columna Central (Formulario de Evaluación + Dirección de Envío) -->
           <div style="background-color: rgba(14, 116, 144, 0.07); border: 1px solid rgba(14, 116, 144, 0.25); border-radius: 12px; padding: 1.5rem;">
               <span style="color: #38bdf8; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Evaluación de Solicitud</span>
               <h3 style="color: #fff; font-size: 1.2rem; margin: 0.5rem 0 1.2rem 0;">Datos del Solicitante</h3>
             
               <form id="formSolicitudCard" style="display: flex; flex-direction: column; gap: 0.85rem;">
                   <div>
                       <label style="display: block; font-size: 0.8rem; color: #8a8f99; margin-bottom: 0.3rem;">Nacionalidad</label>
                       <select id="nacionalidad" style="width: 100%; padding: 0.6rem; border-radius: 8px; background: #0a0c10; border: 1px solid #1f2430; color: #fff; font-size: 0.85rem;">
                           <option value="colombiana">Colombiana</option>
                           <option value="extranjera">Extranjera</option>
                       </select>
                   </div>
                   <div>
                       <label style="display: block; font-size: 0.8rem; color: #8a8f99; margin-bottom: 0.3rem;">Ingresos Anuales</label>
                       <input type="number" id="ingresosAnuales" placeholder="Ej: 25000000" required style="width: 100%; padding: 0.6rem; border-radius: 8px; background: #0a0c10; border: 1px solid #1f2430; color: #fff; font-size: 0.85rem;">
                   </div>
                   <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                       <div>
                           <label style="display: block; font-size: 0.8rem; color: #8a8f99; margin-bottom: 0.3rem;">Moneda</label>
                           <select id="tipoMoneda" style="width: 100%; padding: 0.6rem; border-radius: 8px; background: #0a0c10; border: 1px solid #1f2430; color: #fff; font-size: 0.85rem;">
                               <option value="COP">COP ($)</option>
                               <option value="USD">USD ($)</option>
                               <option value="EUR">EUR (€)</option>
                           </select>
                       </div>
                       <div>
                           <label style="display: block; font-size: 0.8rem; color: #8a8f99; margin-bottom: 0.3rem;">Estrato</label>
                           <select id="estrato" style="width: 100%; padding: 0.6rem; border-radius: 8px; background: #0a0c10; border: 1px solid #1f2430; color: #fff; font-size: 0.85rem;">
                               <option value="1">Estrato 1</option>
                               <option value="2">Estrato 2</option>
                               <option value="3">Estrato 3</option>
                               <option value="4">Estrato 4</option>
                               <option value="5">Estrato 5</option>
                               <option value="6">Estrato 6</option>
                           </select>
                       </div>
                   </div>
                   <!-- CAMPO NUEVO: Dirección de Envío -->
                   <div>
                       <label style="display: block; font-size: 0.8rem; color: #8a8f99; margin-bottom: 0.3rem;">Dirección de envío (Para entrega física)</label>
                       <input type="text" id="direccionEnvio" value="${usuarioActivo.direccion || ''}" placeholder="Ej. Calle 50 # 45-20" required style="width: 100%; padding: 0.6rem; border-radius: 8px; background: #0a0c10; border: 1px solid #1f2430; color: #fff; font-size: 0.85rem;">
                   </div>
               </form>
           </div>

           <!-- Columna Derecha -->
           <div style="display: flex; flex-direction: column; justify-content: center; gap: 1rem;">
               <span style="font-size: 0.75rem; color: #8a8f99; text-align: center;">Acciones</span>
               <button type="button" id="btnEnviarSolicitud" style="background-color: #e5a93c; color: #0a0c10; border: none; border-radius: 24px; padding: 0.8rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                   <i class="fa-solid fa-check"></i> Solicitar
               </button>
               <button type="button" id="btnCancelarSolicitud" style="background-color: #dc2626; color: #ffffff; border: none; border-radius: 24px; padding: 0.8rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                   <i class="fa-solid fa-xmark"></i> Rechazar
               </button>
           </div>
       </div>
   `;

    document.body.appendChild(overlay);

    document.getElementById("btnEnviarSolicitud").addEventListener("click", () => {
        const ingresos = parseFloat(document.getElementById("ingresosAnuales").value) || 0;
        const estrato = parseInt(document.getElementById("estrato").value) || 1;
        const moneda = document.getElementById("tipoMoneda").value;
        const nacionalidad = document.getElementById("nacionalidad").value;
        const direccionEnvio = document.getElementById("direccionEnvio").value.trim();

        if (!direccionEnvio) {
            Swal.fire({
                icon: 'warning',
                title: 'Dirección requerida',
                text: 'Por favor ingresa una dirección de envío válida para mandar la tarjeta.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        // Polimorfismo / Herencia: Ejecutamos el validador de la clase hija
        const resultadoValidacion = tarjetaObj.validarRequisitos(ingresos, estrato);
        const aprobado = resultadoValidacion.aprobado;
        const mensajeMotivo = resultadoValidacion.motivo;

        if (aprobado) {
            const datosTarjetaAprobada = {
                tipo: tarjetaObj.tipo,
                titulo: tarjetaObj.titulo,
                numeroTarjeta: tarjetaObj.generarNumeroUnico(), // Número único generado
                ingresos: ingresos,
                moneda: moneda,
                nacionalidad: nacionalidad,
                direccionEnvio: direccionEnvio, // Guardamos la dirección de envío
                fechaAprobacion: new Date().toISOString()
            };

            // Actualizar lista global de usuarios en localStorage
            let listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
            listaUsuarios = listaUsuarios.map(u => {
                if (u.correo === usuarioActivo.correo || u.username === usuarioActivo.username) {
                    u.tarjetasAprobadas = u.tarjetasAprobadas || [];
                    u.tarjetasAprobadas.push(datosTarjetaAprobada);
                    u.productosActivos = (u.productosActivos || 0) + 1;
                }
                return u;
            });
            localStorage.setItem("finara_usuarios_local", JSON.stringify(listaUsuarios));

            // Actualizar usuario activo local
            usuarioActivo.tarjetasAprobadas = usuarioActivo.tarjetasAprobadas || [];
            usuarioActivo.tarjetasAprobadas.push(datosTarjetaAprobada);
            usuarioActivo.productosActivos = (usuarioActivo.productosActivos || 0) + 1;
            localStorage.setItem("userProfile", JSON.stringify(usuarioActivo));
        }

        mostrarResultadoEvaluacion(aprobado, tarjetaObj.titulo, mensajeMotivo, aprobado ? tarjetaObj.generarNumeroUnico() : null, direccionEnvio);
    });

    const cerrarModal = () => overlay.remove();
    document.getElementById("btnCancelarSolicitud").addEventListener("click", cerrarModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrarModal();
    });
}

function mostrarResultadoEvaluacion(aprobado, nombreTarjeta, motivo, numeroTarjeta, direccionEnvio) {
    const modalActual = document.getElementById("modalFinaraCompleto");
    if (modalActual) modalActual.remove();

    const tituloRes = aprobado ? "¡Solicitud Aprobada!" : "Solicitud Denegada";
    const textoRes = aprobado
        ? `¡Felicitaciones! Cumples con todos los requisitos para la <strong>${nombreTarjeta}</strong>.<br><br>` +
        `💳 <strong>N° de Tarjeta Asignado:</strong> <span style="color: #38bdf8; font-family: monospace;">${numeroTarjeta}</span><br>` +
        `📦 Tu tarjeta física será enviada a la dirección <strong>${direccionEnvio}</strong> y tardará <strong>hasta una semana</strong> en llegar a tu domicilio.`
        : `Lo sentimos, la solicitud para la <strong>${nombreTarjeta}</strong> ha sido rechazada.<br><br><span style="font-size: 0.85rem; color: #f87171;">${motivo}</span>`;

    Swal.fire({
        icon: aprobado ? 'success' : 'error',
        title: tituloRes,
        html: textoRes,
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c'
    }).then(() => {
        location.reload();
    });
}