// ==========================================
// MODELO POO: CLASES DE TARJETAS BANCARIAS
// ==========================================

// Clase Padre (Superclase)
class TarjetaBancaria {
    constructor(tipo, titulo, proposito, operaciones, intereses, condicion, estado = 'activa') {
        this.tipo = tipo;
        this.titulo = titulo;
        this.proposito = proposito;
        this.operaciones = operaciones;
        this.intereses = intereses;
        this.condicion = condicion;
        this.estado = estado; // 'activa' | 'inactiva' | 'cancelada'
        this.numeroCompleto = this.generarNumeroUnico();
    }

    // Método genérico de evaluación (a sobreescribir en las hijas)
    validarRequisitos(ingresos, estrato) {
        return { aprobado: true, motivo: "" };
    }

    // Método para generar un número único de tarjeta aleatorio tipo bancario
    generarNumeroUnico() {
        // Usar una parte fija y mezclar milisegundos con aleatoriedad para evitar colisiones
        const timestamp = String(Date.now()).slice(-4);
        const bloque1 = Math.floor(1000 + Math.random() * 9000);
        const bloque2 = Math.floor(1000 + Math.random() * 9000);
        const bloque3 = Math.floor(1000 + Math.random() * 9000);
        return `4532 ${bloque1} ${bloque2} ${timestamp}`;
    }

    // 🔒 MÉTODO POO HU-13: ENMASCARAMIENTO DE DATOS SENSIBLES
    getNumeroEnmascarado() {
        if (!this.numeroCompleto) return '•••• •••• •••• ••••';
        const digitosLimpio = this.numeroCompleto.replace(/\s+/g, '');
        const ultimos4 = digitosLimpio.slice(-4);
        return `•••• •••• •••• ${ultimos4}`;
    }

    // Obtener badge CSS según estado
    getBadgeClass() {
        switch (this.estado) {
            case 'activa': return 'badge-active';
            case 'inactiva': return 'badge-inactive';
            case 'cancelada': return 'badge-canceled';
            default: return '';
        }
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
            "Requiere ingresos mínimos mensuales y validación de estrato socioeconómico."
        );
    }

    validarRequisitos(ingresos, estrato) {
        if (ingresos < 2000000 || estrato < 2) {
            return {
                aprobado: false,
                motivo: "Para la Tarjeta de Crédito Gold se requiere un ingreso mensual superior a $2,000,000 y estrato mínimo de 2."
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
        if (ingresos < 1200000) {
            return {
                aprobado: false,
                motivo: "Para la Cuenta Corriente se requiere un ingreso mensual mínimo de $1,200,000."
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

    // 4. Actualizar disponibilidad dinámica de cuentas y tarjetas
    actualizarDisponibilidadTarjetas(usuarioActivo);

    // 5. Aperturar Cuenta de Ahorros
    const btnAperturarAhorros = document.getElementById("btnAperturarAhorros");
    if (btnAperturarAhorros) {
        btnAperturarAhorros.addEventListener("click", () => {
            const usuarioActual = obtenerUsuarioActivo();
            if (!usuarioActual) return;
            aperturarCuentaUsuario(usuarioActual, 'AHORROS');
        });
    }

    // 6. Aperturar Cuenta Corriente
    const btnAperturarCorriente = document.getElementById("btnAperturarCorriente");
    if (btnAperturarCorriente) {
        btnAperturarCorriente.addEventListener("click", () => {
            const usuarioActual = obtenerUsuarioActivo();
            if (!usuarioActual) return;
            aperturarCuentaUsuario(usuarioActual, 'CORRIENTE');
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
            if (!tarjetaBox) return;
            const tipoTarjeta = tarjetaBox.getAttribute("data-card");
            if (!tipoTarjeta) return;

            // Si es Tarjeta de Crédito: Requiere evaluación crediticia (ingresos, estrato, etc.)
            if (tipoTarjeta === 'credito') {
                const tarjetaObj = obtenerInstanciaTarjeta(tipoTarjeta);
                mostrarModalSolicitud(tarjetaObj, usuarioActual);
                return;
            }

            // Si es Tarjeta Débito o Tarjeta Corriente: Se emite directamente sin solicitar datos
            emitirTarjetaDirecta(usuarioActual, tipoTarjeta);
        });
    });

    // 7. Simular y Solicitar Crédito / Préstamos
    const btnSolicitarPrestamo = document.getElementById("btnSolicitarPrestamo");
    if (btnSolicitarPrestamo) {
        btnSolicitarPrestamo.addEventListener("click", () => {
            const usuarioActual = obtenerUsuarioActivo();
            if (!usuarioActual) return;
            mostrarModalSimuladorCredito(usuarioActual);
        });
    }
});

/**
 * Emite una Tarjeta Débito o Tarjeta Corriente de forma inmediata y automática
 * sin solicitar formulario ni datos extras, utilizando los datos existentes del usuario.
 */
function emitirTarjetaDirecta(usuarioActivo, tipoTarjeta) {
    const tarjetaObj = obtenerInstanciaTarjeta(tipoTarjeta);
    const numeroGenerado = tarjetaObj.generarNumeroUnico();
    const vencimiento = '09/29';
    const cvv = String(Math.floor(100 + Math.random() * 900));

    const datosTarjetaAprobada = {
        tipo: tipoTarjeta,
        titulo: tarjetaObj.titulo,
        numeroTarjeta: numeroGenerado,
        fechaVencimiento: vencimiento,
        cvv: cvv,
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

    actualizarDisponibilidadTarjetas(usuarioActivo);

    Swal.fire({
        icon: 'success',
        title: `¡${tarjetaObj.titulo} Emitida!`,
        html: `
            <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 0.8rem;">
                Tu tarjeta ha sido vinculada exitosamente a tu cuenta.
            </p>
            <div style="background: rgba(229,169,60,0.1); border: 1px dashed rgba(229,169,60,0.3); padding: 1rem; border-radius: 10px; margin-top: 0.5rem; text-align: center;">
                <span style="font-size: 0.75rem; color: #8a8f99; text-transform: uppercase;">Número de Tarjeta Asignado</span>
                <h3 style="color: #e5a93c; margin: 0.3rem 0; font-family: monospace; letter-spacing: 1px;">${numeroGenerado}</h3>
                <small style="color: #34d399;"><i class="fa-solid fa-circle-check"></i> Activa para compras y retiros</small>
            </div>
        `,
        confirmButtonColor: '#e5a93c',
        confirmButtonText: 'Entendido',
        background: '#12151c',
        color: '#ffffff'
    });
}

/**
 * Función para aperturar Cuentas Bancarias directamente y ofrecer la tarjeta vinculada
 */
function aperturarCuentaUsuario(usuarioActivo, tipo) {
    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    } catch {
        todasLasCuentas = [];
    }

    const usernameActual = usuarioActivo.username || usuarioActivo.correo || 'maria17';
    const yaTiene = todasLasCuentas.some(c => c && (c.username === usernameActual || (!c.username && usernameActual === 'maria17')) && c.tipo === tipo);

    if (yaTiene) {
        Swal.fire({
            icon: 'info',
            title: 'Cuenta ya activa',
            text: `Ya tienes una ${tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} activa.`,
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
        return;
    }

    const nuevoNumero = '4021 ' + String(Date.now()).slice(-4) + ' ' + Math.floor(1000 + Math.random() * 9000);
    const nuevaCuenta = {
        id: `CTA-${tipo.slice(0, 3)}-${Date.now()}`,
        tipo: tipo,
        numero: nuevoNumero.replace(/\s+/g, ''),
        saldo: 0,
        estado: 'ACTIVA',
        username: usernameActual,
        fechaCreacion: new Date().toISOString()
    };

    todasLasCuentas.push(nuevaCuenta);
    localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

    actualizarDisponibilidadTarjetas(usuarioActivo);

    const nombreProducto = tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente';
    const tarjetaAsociada = tipo === 'AHORROS' ? 'Tarjeta Débito' : 'Tarjeta de Cuenta Corriente';
    const tipoTarjetaSlug = tipo === 'AHORROS' ? 'debito' : 'corriente';

    Swal.fire({
        icon: 'success',
        title: `¡${nombreProducto} Aperturada!`,
        html: `
            <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 0.8rem;">
                Tu número de cuenta es: <strong style="color: #e5a93c;">${nuevoNumero}</strong>.
            </p>
            <div style="background: rgba(229,169,60,0.1); border: 1px dashed rgba(229,169,60,0.3); padding: 0.9rem; border-radius: 10px; margin-top: 0.5rem; text-align: left;">
                <p style="margin: 0; color: #fff; font-size: 0.85rem; font-weight: 600;">
                    <i class="fa-solid fa-credit-card" style="color: #e5a93c;"></i> ¿Deseas solicitar tu ${tarjetaAsociada}?
                </p>
                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 0.78rem;">
                    Sin costo de envío y vinculada de inmediato a tu nueva cuenta.
                </p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: `<i class="fa-solid fa-check"></i> Sí, solicitar ${tarjetaAsociada}`,
        cancelButtonText: 'Más tarde',
        confirmButtonColor: '#e5a93c',
        cancelButtonColor: '#334155',
        background: '#12151c',
        color: '#ffffff'
    }).then((res) => {
        if (res.isConfirmed) {
            emitirTarjetaDirecta(usuarioActivo, tipoTarjetaSlug);
        }
    });
}

/**
 * Evalúa y actualiza la disponibilidad de cada tarjeta según las cuentas que el usuario tenga aperturadas:
 * Caso A: Solo Ahorros -> Habilita Débito (vinculada a Ahorros) y Crédito. Deshabilita Tarjeta Corriente.
 * Caso B: Solo Corriente -> Habilita Tarjeta Corriente y Crédito. Deshabilita Débito.
 * Caso C: Ambas cuentas -> Habilita las 3 tarjetas de forma independiente.
 * Sin cuentas activas -> Deshabilita Débito, Corriente y Crédito.
 */
function actualizarDisponibilidadTarjetas(usuarioActivo) {
    if (!usuarioActivo) return;

    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    } catch {
        todasLasCuentas = [];
    }

    const usernameActual = usuarioActivo.username || usuarioActivo.correo || 'maria17';
    let cuentasUsuario = todasLasCuentas.filter(c => c && (c.username === usernameActual || (!c.username && usernameActual === 'maria17')));

    // Si no tiene cuentas en finara_cuentas pero es maria17 por defecto
    if (cuentasUsuario.length === 0 && usernameActual === 'maria17') {
        cuentasUsuario = [
            { tipo: 'AHORROS', estado: 'ACTIVA' },
            { tipo: 'CORRIENTE', estado: 'ACTIVA' }
        ];
    }

    const tieneAhorros = cuentasUsuario.some(c => c.tipo === 'AHORROS' && c.estado === 'ACTIVA');
    const tieneCorriente = cuentasUsuario.some(c => c.tipo === 'CORRIENTE' && c.estado === 'ACTIVA');

    // Tarjetas ya aprobadas del usuario para evitar duplicación
    const tarjetasAprobadas = usuarioActivo.tarjetasAprobadas || [];
    const yaTieneDebito = tarjetasAprobadas.some(t => t.tipo === 'debito');
    const yaTieneCredito = tarjetasAprobadas.some(t => t.tipo === 'credito');
    const yaTieneCorriente = tarjetasAprobadas.some(t => t.tipo === 'corriente');

    const boxDebito = document.querySelector('.card-option-box[data-card="debito"]');
    const boxCredito = document.querySelector('.card-option-box[data-card="credito"]');
    const boxCorriente = document.querySelector('.card-option-box[data-card="corriente"]');

    const configurarOpcion = (box, habilitado, motivoBloqueo, yaAdquirida = false) => {
        if (!box) return;
        const btn = box.querySelector('.request-card-btn');
        let hint = box.querySelector('.card-prerequisito-hint');
        let badge = box.querySelector('.card-aprobada-badge');

        if (yaAdquirida) {
            if (btn) {
                btn.disabled = true;
                btn.classList.add('btn-disabled');
                btn.textContent = 'Producto activo';
                btn.title = 'Ya tienes este producto activo en tu cuenta.';
            }
            if (hint) hint.remove();
            if (!badge) {
                badge = document.createElement('small');
                badge.className = 'card-aprobada-badge';
                box.appendChild(badge);
            }
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Tarjeta activa y asociada';
            return;
        }

        if (badge) badge.remove();

        if (!habilitado) {
            if (btn) {
                btn.disabled = true;
                btn.classList.add('btn-disabled');
                btn.title = motivoBloqueo;
            }
            if (!hint) {
                hint = document.createElement('small');
                hint.className = 'card-prerequisito-hint';
                box.appendChild(hint);
            }
            hint.textContent = motivoBloqueo;
        } else {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('btn-disabled');
                btn.title = '';
            }
            if (hint) hint.remove();
        }
    };

    // 1. Tarjeta Débito: Requiere Cuenta de Ahorros activa y que no haya sido ya solicitada
    configurarOpcion(boxDebito, tieneAhorros, 'Requiere tener aperturada una Cuenta de Ahorros activa.', yaTieneDebito);

    // 2. Tarjeta Cuenta Corriente: Requiere Cuenta Corriente activa y que no haya sido ya solicitada
    configurarOpcion(boxCorriente, tieneCorriente, 'Requiere tener aperturada una Cuenta Corriente activa.', yaTieneCorriente);

    // 3. Tarjeta de Crédito: Requiere al menos una cuenta (Ahorros o Corriente) activa y no tenerla ya activa
    const tieneAlgunaCuenta = tieneAhorros || tieneCorriente;
    configurarOpcion(boxCredito, tieneAlgunaCuenta, 'Disponible solo si tienes al menos una cuenta de ahorros o corriente activa.', yaTieneCredito);

    // 4. Cuentas Bancarias (Ahorros y Corriente)
    const boxCuentaAhorros = document.querySelector('.card-option-box[data-account="ahorros"]');
    const boxCuentaCorriente = document.querySelector('.card-option-box[data-account="corriente"]');

    const configurarOpcionCuenta = (box, yaTiene) => {
        if (!box) return;
        const btn = box.querySelector('.request-card-btn');
        let badge = box.querySelector('.card-aprobada-badge');

        if (yaTiene) {
            if (btn) {
                btn.disabled = true;
                btn.classList.add('btn-disabled');
                btn.textContent = 'Cuenta Activa';
                btn.title = 'Ya tienes esta cuenta aperturada.';
            }
            if (!badge) {
                badge = document.createElement('small');
                badge.className = 'card-aprobada-badge';
                box.appendChild(badge);
            }
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Cuenta aperturada y disponible';
        } else {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('btn-disabled');
            }
            if (badge) badge.remove();
        }
    };

    configurarOpcionCuenta(boxCuentaAhorros, tieneAhorros);
    configurarOpcionCuenta(boxCuentaCorriente, tieneCorriente);
}

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
                       <label style="display: block; font-size: 0.8rem; color: #8a8f99; margin-bottom: 0.3rem;">Ingresos Mensuales</label>
                       <input type="number" id="ingresosMensuales" placeholder="Ej: 3000000" required style="width: 100%; padding: 0.6rem; border-radius: 8px; background: #0a0c10; border: 1px solid #1f2430; color: #fff; font-size: 0.85rem;">
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
        const ingresos = parseFloat(document.getElementById("ingresosMensuales").value) || 0;
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

        // Validación estricta de seguridad: Verificar prerrequisitos de cuentas bancarias antes de procesar
        let todasLasCuentas = [];
        try {
            todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        } catch {
            todasLasCuentas = [];
        }
        const usernameActual = usuarioActivo.username || usuarioActivo.correo || 'maria17';
        let cuentasUsuario = todasLasCuentas.filter(c => c && (c.username === usernameActual || (!c.username && usernameActual === 'maria17')));
        if (cuentasUsuario.length === 0 && usernameActual === 'maria17') {
            cuentasUsuario = [{ tipo: 'AHORROS', estado: 'ACTIVA' }, { tipo: 'CORRIENTE', estado: 'ACTIVA' }];
        }

        const tieneAhorros = cuentasUsuario.some(c => c.tipo === 'AHORROS' && c.estado === 'ACTIVA');
        const tieneCorriente = cuentasUsuario.some(c => c.tipo === 'CORRIENTE' && c.estado === 'ACTIVA');

        if (tarjetaObj.tipo === 'debito' && !tieneAhorros) {
            Swal.fire({
                icon: 'error',
                title: 'Operación no permitida',
                text: 'No es posible solicitar una Tarjeta Débito sin una Cuenta de Ahorros activa.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        if (tarjetaObj.tipo === 'corriente' && !tieneCorriente) {
            Swal.fire({
                icon: 'error',
                title: 'Operación no permitida',
                text: 'No es posible solicitar una Tarjeta de Cuenta Corriente sin una Cuenta Corriente activa.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        if (tarjetaObj.tipo === 'credito' && !tieneAhorros && !tieneCorriente) {
            Swal.fire({
                icon: 'error',
                title: 'Operación no permitida',
                text: 'Para solicitar una Tarjeta de Crédito debes tener aperturada al menos una Cuenta de Ahorros o Corriente activa.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        // Evitar registros duplicados si el usuario ya cuenta con esta tarjeta
        const yaTieneProducto = (usuarioActivo.tarjetasAprobadas || []).some(t => t.tipo === tarjetaObj.tipo);
        if (yaTieneProducto) {
            Swal.fire({
                icon: 'info',
                title: 'Producto ya activo',
                text: 'Ya cuentas con este producto aprobado y asociado a tu cuenta.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            cerrarModal();
            return;
        }

        // Polimorfismo / Herencia: Ejecutamos el validador de la clase hija
        const resultadoValidacion = tarjetaObj.validarRequisitos(ingresos, estrato);
        const aprobado = resultadoValidacion.aprobado;
        const mensajeMotivo = resultadoValidacion.motivo;

        if (aprobado) {
            const numeroGenerado = tarjetaObj.generarNumeroUnico();
            const datosTarjetaAprobada = {
                tipo: tarjetaObj.tipo,
                titulo: tarjetaObj.titulo,
                numeroTarjeta: numeroGenerado,
                ingresos: ingresos,
                moneda: moneda,
                nacionalidad: nacionalidad,
                direccionEnvio: direccionEnvio,
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

            // Si es tarjeta de crédito aprobada, sincronizarla inmediatamente con finara_cuentas
            if (tarjetaObj.tipo === 'credito') {
                const cupoCalculado = Math.min(20000000, Math.max(1000000, Math.round(((ingresos || 2000000) * 1.5) / 100000) * 100000));
                const nuevaTC = {
                    id: `TC-${numeroGenerado}`,
                    tipo: 'TARJETA_CREDITO',
                    numero: numeroGenerado,
                    saldo: cupoCalculado,
                    estado: 'ACTIVA',
                    username: usernameActual,
                    fechaAprobacion: datosTarjetaAprobada.fechaAprobacion
                };
                todasLasCuentas.push(nuevaTC);
                try {
                    localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));
                } catch {
                    // Ignorar cuota
                }
            }

            // Actualizar reactivamente la interfaz de las tarjetas
            actualizarDisponibilidadTarjetas(usuarioActivo);
        }

        mostrarResultadoEvaluacion(aprobado, tarjetaObj.titulo, mensajeMotivo, aprobado ? datosTarjetaAprobada?.numeroTarjeta : null, direccionEnvio);
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

/**
 * Modal interactivo para simular y solicitar Crédito de Libre Inversión
 */
function mostrarModalSimuladorCredito(usuarioActivo) {
    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    } catch {
        todasLasCuentas = [];
    }
    const usernameActual = usuarioActivo.username || usuarioActivo.correo || 'maria17';
    const cuentasUsuario = todasLasCuentas.filter(c => c && (c.username === usernameActual || (!c.username && usernameActual === 'maria17')) && c.tipo !== 'TARJETA_CREDITO');

    if (cuentasUsuario.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Requiere cuenta activa',
            text: 'Debes aperturar al menos una Cuenta de Ahorros o Corriente para recibir el desembolso de tu crédito.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
        return;
    }

    const opcionesCuentas = cuentasUsuario.map(c => `<option value="${c.numero}">${c.tipo === 'AHORROS' ? 'Cuenta de Ahorros' : 'Cuenta Corriente'} (**** ${String(c.numero).slice(-4)}) - Saldo: $ ${Number(c.saldo).toLocaleString('es-CO')}</option>`).join('');

    const modalExistente = document.getElementById("modalSimuladorCreditoFinara");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalSimuladorCreditoFinara";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(5, 7, 10, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1.5rem;
    `;

    overlay.innerHTML = `
        <div style="background: #11141b; border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 16px; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); color: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem;">
                <h3 style="margin: 0; font-size: 1.2rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-hand-holding-dollar" style="color: #c084fc;"></i> Simulador de Crédito
                </h3>
                <button type="button" id="btnCerrarSimulador" style="background: none; border: none; color: #8a8f99; font-size: 1.2rem; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <form id="formSimuladorCredito">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.35rem;">Monto a solicitar (COP):</label>
                    <input type="number" id="montoCreditoInput" min="500000" max="30000000" step="100000" value="5000000" required
                           style="width: 100%; background: #1a1e29; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.65rem 0.9rem; color: #fff; font-size: 1rem;">
                    <small style="color: #64748b; font-size: 0.75rem;">Mínimo $ 500.000 - Máximo $ 30.000.000</small>
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.35rem;">Plazo en meses:</label>
                    <select id="plazoCreditoSelect" style="width: 100%; background: #1a1e29; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.65rem 0.9rem; color: #fff; font-size: 0.95rem;">
                        <option value="12">12 meses (1 año)</option>
                        <option value="24" selected>24 meses (2 años)</option>
                        <option value="36">36 meses (3 años)</option>
                        <option value="48">48 meses (4 años)</option>
                        <option value="60">60 meses (5 años)</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.2rem;">
                    <label style="display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.35rem;">Cuenta para desembolso inmediato:</label>
                    <select id="cuentaDesembolsoSelect" style="width: 100%; background: #1a1e29; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.65rem 0.9rem; color: #fff; font-size: 0.95rem;">
                        ${opcionesCuentas}
                    </select>
                </div>

                <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 10px; padding: 1rem; margin-bottom: 1.4rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.85rem; color: #94a3b8;">
                        <span>Tasa E.A.:</span>
                        <strong style="color: #fff;">18.5% E.A. (1.42% M.V.)</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
                        <span style="color: #cbd5e1;">Cuota mensual estimada:</span>
                        <strong id="cuotaEstimadaText" style="color: #c084fc; font-size: 1.1rem;">$ 247.380 / mes</strong>
                    </div>
                </div>

                <button type="submit" style="width: 100%; background: #c084fc; color: #0a0c10; border: none; padding: 0.85rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-check"></i> Solicitar y Desembolsar Crédito
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const inputMonto = overlay.querySelector("#montoCreditoInput");
    const selectPlazo = overlay.querySelector("#plazoCreditoSelect");
    const textCuota = overlay.querySelector("#cuotaEstimadaText");

    const recalcular = () => {
        const monto = Number(inputMonto.value) || 0;
        const meses = Number(selectPlazo.value) || 24;
        const tasaMensual = 0.0142;
        if (monto > 0 && meses > 0) {
            const cuota = (monto * (tasaMensual * Math.pow(1 + tasaMensual, meses))) / (Math.pow(1 + tasaMensual, meses) - 1);
            textCuota.textContent = `$ ${Math.round(cuota).toLocaleString('es-CO')} / mes`;
        }
    };

    inputMonto.addEventListener("input", recalcular);
    selectPlazo.addEventListener("change", recalcular);
    recalcular();

    const cerrar = () => overlay.remove();
    overlay.querySelector("#btnCerrarSimulador").addEventListener("click", cerrar);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrar();
    });

    overlay.querySelector("#formSimuladorCredito").addEventListener("submit", (e) => {
        e.preventDefault();
        const monto = Number(inputMonto.value);
        const numCuenta = overlay.querySelector("#cuentaDesembolsoSelect").value;

        // Desembolsar directamente en la cuenta seleccionada
        let cuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        const ctaIdx = cuentas.findIndex(c => String(c.numero) === String(numCuenta));
        if (ctaIdx !== -1) {
            cuentas[ctaIdx].saldo = (Number(cuentas[ctaIdx].saldo) || 0) + monto;
            localStorage.setItem('finara_cuentas', JSON.stringify(cuentas));
        }

        // Registrar movimiento
        let movs = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
        movs.unshift({
            id: `MOV-CRED-${Date.now()}`,
            tipo: 'CREDITO_DESEMBOLSO',
            descripcion: 'Desembolso Crédito de Libre Destino',
            cuentaOrigen: 'Finara Bank',
            cuentaDestino: numCuenta,
            monto: monto,
            fecha: new Date().toISOString(),
            estado: 'EXITOSA'
        });
        localStorage.setItem('finara_movimientos', JSON.stringify(movs));

        cerrar();
        Swal.fire({
            icon: 'success',
            title: '¡Crédito Aprobado y Desembolsado!',
            html: `
                <p>Se ha transferido exitosamente el monto de <strong style="color: #34d399;">$ ${monto.toLocaleString('es-CO')}</strong> a tu cuenta <strong>**** ${String(numCuenta).slice(-4)}</strong>.</p>
                <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.5rem;">Ya tienes los fondos disponibles para transferir o retirar.</p>
            `,
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
    });
}

