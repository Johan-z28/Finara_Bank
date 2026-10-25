// ==========================================
// MODELO POO: CLASES DE TARJETAS BANCARIAS
// ==========================================

class TarjetaBancaria {
    constructor(tipo, titulo, proposito, operaciones, intereses, condicion, estado = 'activa') {
        this.tipo = tipo;
        this.titulo = titulo;
        this.proposito = proposito;
        this.operaciones = operaciones;
        this.intereses = intereses;
        this.condicion = condicion;
        this.estado = estado;
        this.numeroCompleto = this.generarNumeroUnico();
    }

    validarRequisitos(ingresos, estrato) {
        return { aprobado: true, motivo: "" };
    }

    generarNumeroUnico() {
        const timestamp = String(Date.now()).slice(-4);
        const bloque1 = Math.floor(1000 + Math.random() * 9000);
        const bloque2 = Math.floor(1000 + Math.random() * 9000);
        return `4021 ${bloque1} ${bloque2} ${timestamp}`;
    }

    getNumeroEnmascarado() {
        if (!this.numeroCompleto) return '•••• •••• •••• ••••';
        const digitosLimpio = this.numeroCompleto.replace(/\s+/g, '');
        const ultimos4 = digitosLimpio.slice(-4);
        return `•••• •••• •••• ${ultimos4}`;
    }
}

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
}

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

function obtenerInstanciaTarjeta(tipo) {
    switch (tipo) {
        case "credito": return new TarjetaCredito();
        case "corriente": return new TarjetaCorriente();
        case "debito":
        default:
            return new TarjetaDebito();
    }
}

export async function initSolicitarProductosView() {
    configurarVistaSolicitud();
}

function configurarVistaSolicitud() {
    const profileBtn = document.getElementById("profileMenuBtn");
    const profileDropdown = document.getElementById("profileDropdown");
    const dropdownUserName = document.getElementById("dropdownUserName");
    const greetingName = document.getElementById("greetingName");
    const userAvatarImg = document.getElementById("userAvatarImg");
    const userAvatarIcon = document.getElementById("userAvatarIcon");

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

    actualizarDisponibilidadTarjetas(usuarioActivo);
    document.removeEventListener("click", manejarClicTarjetaGlobal);
    document.addEventListener("click", manejarClicTarjetaGlobal);
}

function actualizarDisponibilidadTarjetas(usuarioActivo) {
    try {
        let cuentasUsuario = [];
        try {
            cuentasUsuario = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        } catch {
            cuentasUsuario = [];
        }

        const usernameActual = usuarioActivo ? (usuarioActivo.username || usuarioActivo.correo || 'maria17') : 'maria17';
        
        const misCuentas = cuentasUsuario.filter(c => c && (c.username === usernameActual || (!c.username && usernameActual === 'maria17')));

        const tieneAhorros = misCuentas.some(c => {
            const t = String(c.tipo || '').toUpperCase();
            return (t.includes('AHORRO') || t.includes('DEBITO') || t.includes('DÉBITO')) && c.estado !== 'INACTIVA';
        });

        const tieneCorriente = misCuentas.some(c => {
            const t = String(c.tipo || '').toUpperCase();
            return t.includes('CORRIENTE') && c.estado !== 'INACTIVA';
        });

        const tieneCredito = misCuentas.some(c => {
            const t = String(c.tipo || '').toUpperCase();
            return (t.includes('CREDITO') || t.includes('CRÉDITO')) && c.estado !== 'INACTIVA';
        }) || (usuarioActivo && Array.isArray(usuarioActivo.tarjetasAprobadas) && usuarioActivo.tarjetasAprobadas.some(t => t.tipo === 'credito'));

        const btnDebito = encontrarBotonProducto(['debito', 'débito', 'ahorros']);
        const btnCorriente = encontrarBotonProducto(['corriente']);
        const btnCredito = encontrarBotonProducto(['crédito', 'credito']);

        if (tieneAhorros && btnDebito) {
            deshabilitarBotonProducto(btnDebito, 'Producto ya activo');
        }

        if (tieneCorriente && btnCorriente) {
            deshabilitarBotonProducto(btnCorriente, 'Producto ya activo');
        }

        if (tieneCredito && btnCredito) {
            deshabilitarBotonProducto(btnCredito, 'Producto ya activo');
        }

    } catch (err) {
        console.error("Error al actualizar disponibilidad de tarjetas:", err);
    }
}

function encontrarBotonProducto(palabrasClave) {
    const todosLosBotones = document.querySelectorAll('button, .request-card-btn, .btn-solicitar, .btn-submit-withdraw');
    for (const btn of todosLosBotones) {
        const contenedor = btn.closest('.product-card, .card, div') || btn.parentElement;
        const textoContenedor = (contenedor ? contenedor.innerText : '').toLowerCase();
        
        if (palabrasClave.some(clave => textoContenedor.includes(clave))) {
            return btn;
        }
    }
    return null;
}

function deshabilitarBotonProducto(btn, mensaje) {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add('btn-producto-activo');
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${mensaje}`;
    btn.style.background = 'rgba(255, 255, 255, 0.08)';
    btn.style.color = '#94a3b8';
    btn.style.border = '1px solid rgba(255, 255, 255, 0.12)';
    btn.style.cursor = 'not-allowed';
    btn.style.opacity = '0.75';
}

function manejarClicTarjetaGlobal(e) {
    const boton = e.target.closest(".request-card-btn, .btn-solicitar, button[data-producto]");
    if (!boton || boton.disabled) return;

    e.preventDefault();
    const usuarioActual = obtenerUsuarioActivo();
    if (!usuarioActual) {
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: 'Sesión requerida',
                text: 'Debes iniciar sesión para solicitar un producto.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
        }
        return;
    }

    const tarjetaBox = boton.closest(".card-option-box, .product-card, .card");
    const tipoTarjeta = boton.getAttribute("data-producto") || (tarjetaBox ? tarjetaBox.getAttribute("data-card") : null) || 'debito';

    if (tipoTarjeta === 'credito') {
        const tarjetaObj = obtenerInstanciaTarjeta(tipoTarjeta);
        mostrarModalSolicitud(tarjetaObj, usuarioActual);
        return;
    }

    const tipoCuenta = tipoTarjeta === 'corriente' ? 'CORRIENTE' : 'AHORROS';
    aperturarCuentaUsuarioYEmitir(usuarioActual, tipoCuenta, tipoTarjeta);
}

function aperturarCuentaUsuarioYEmitir(usuarioActivo, tipoCuenta, tipoTarjeta) {
    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    } catch {
        todasLasCuentas = [];
    }

    const usernameActual = usuarioActivo.username || usuarioActivo.correo || 'maria17';
    let cuentaExistente = todasLasCuentas.find(c => c && (c.username === usernameActual || (!c.username && usernameActual === 'maria17')) && c.tipo === tipoCuenta && c.estado === 'ACTIVA');

    let numeroCuentaOficial = '';

    if (!cuentaExistente) {
        const tarjetaObj = obtenerInstanciaTarjeta(tipoTarjeta);
        numeroCuentaOficial = tarjetaObj.numeroCompleto.replace(/\s+/g, '');
        const nuevaCuenta = {
            id: `CTA-${tipoCuenta.slice(0, 3)}-${Date.now()}`,
            tipo: tipoCuenta,
            numero: numeroCuentaOficial,
            saldo: 0,
            estado: 'ACTIVA',
            username: usernameActual,
            fechaCreacion: new Date().toISOString()
        };
        todasLasCuentas.push(nuevaCuenta);
        localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));
    } else {
        numeroCuentaOficial = cuentaExistente.numero;
    }

    emitirTarjetaDirecta(usuarioActivo, tipoTarjeta, numeroCuentaOficial);
}

function emitirTarjetaDirecta(usuarioActivo, tipoTarjeta, numeroOficial) {
    const tarjetaObj = obtenerInstanciaTarjeta(tipoTarjeta);
    const vencimiento = '09/29';
    const cvv = String(Math.floor(100 + Math.random() * 900));
    const usernameActual = usuarioActivo.username || usuarioActivo.correo || 'maria17';

    const datosTarjetaAprobada = {
        tipo: tipoTarjeta,
        titulo: tarjetaObj.titulo,
        numeroTarjeta: numeroOficial,
        fechaVencimiento: vencimiento,
        cvv: cvv,
        fechaAprobacion: new Date().toISOString()
    };

    let listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    listaUsuarios = listaUsuarios.map(u => {
        if (u.correo === usuarioActivo.correo || u.username === usuarioActivo.username) {
            u.tarjetasAprobadas = u.tarjetasAprobadas || [];
            u.tarjetasAprobadas = u.tarjetasAprobadas.filter(t => t.tipo !== tipoTarjeta);
            u.tarjetasAprobadas.push(datosTarjetaAprobada);
            u.productosActivos = (u.productosActivos || 0) + 1;
        }
        return u;
    });
    localStorage.setItem("finara_usuarios_local", JSON.stringify(listaUsuarios));

    let todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    let tipoCuentaAsociada = tipoTarjeta === 'corriente' ? 'CORRIENTE' : 'AHORROS';

    const tarjetaInfo = {
        tipo: tipoTarjeta,
        titulo: tarjetaObj.titulo,
        numero: numeroOficial,
        fechaVencimiento: vencimiento,
        cvv: cvv,
        bloqueada: false
    };

    todasLasCuentas = todasLasCuentas.map(cta => {
        if (cta && (cta.username === usernameActual || (!cta.username && usernameActual === 'maria17')) && cta.tipo === tipoCuentaAsociada) {
            cta.tarjetaAsociada = tarjetaInfo;
        }
        return cta;
    });

    localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));

    usuarioActivo.tarjetasAprobadas = usuarioActivo.tarjetasAprobadas || [];
    usuarioActivo.tarjetasAprobadas = usuarioActivo.tarjetasAprobadas.filter(t => t.tipo !== tipoTarjeta);
    usuarioActivo.tarjetasAprobadas.push(datosTarjetaAprobada);
    localStorage.setItem("userProfile", JSON.stringify(usuarioActivo));

    // Formatear el número oficial en bloques de 4 dígitos
    const numeroLimpio = String(numeroOficial).replace(/\D/g, '');
    const numeroFormateado = numeroLimpio.replace(/(\d{4})(?=\d)/g, '$1 ');

    if (window.Swal) {
        Swal.fire({
            title: `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding-top: 10px;">
                    <div style="width: 50px; height: 50px; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #34d399; font-size: 1.4rem;">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <span style="color: #ffffff; font-size: 1.25rem; font-weight: 700;">¡${tarjetaObj.titulo} Emitida!</span>
                </div>
            `,
            html: `
                <div style="font-family: 'Poppins', sans-serif; text-align: left; padding: 0.5rem 0;">
                    <p style="color: #94a3b8; font-size: 0.88rem; text-align: center; margin-bottom: 1.2rem; line-height: 1.5;">
                        Tu tarjeta ha sido vinculada exitosamente a tu cuenta con el número oficial asignado.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, rgba(229, 169, 60, 0.08) 0%, rgba(17, 20, 29, 0.9) 100%); border: 1px solid rgba(229, 169, 60, 0.3); padding: 1.2rem; border-radius: 14px; text-align: center; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
                        <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; display: block; margin-bottom: 6px;">Número Oficial Asignado</span>
                        <div style="color: #e5a93c; font-size: 1.25rem; font-weight: 700; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px; margin-bottom: 8px;">
                            ${numeroFormateado}
                        </div>
                        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(52, 211, 153, 0.12); border: 1px solid rgba(52, 211, 153, 0.3); padding: 3px 10px; border-radius: 20px; color: #34d399; font-size: 0.78rem; font-weight: 500;">
                            <i class="fa-solid fa-circle-check"></i> Activa para compras y retiros
                        </div>
                    </div>
                </div>
            `,
            confirmButtonColor: '#e5a93c',
            confirmButtonText: 'Ver en Saldos',
            background: '#0d1017',
            color: '#ffffff',
            customClass: {
                popup: 'swal2-custom-popup'
            }
        }).then(() => {
            const linkSaldos = document.querySelector('[data-view="saldos"]');
            if (linkSaldos) linkSaldos.click();
        });
    }
}

function obtenerUsuarioActivo() {
    const perfilDirecto = JSON.parse(localStorage.getItem("userProfile"));
    if (perfilDirecto) return perfilDirecto;

    const emailLogueado = localStorage.getItem("usuarioLogueado") || localStorage.getItem("emailSesion") || localStorage.getItem("userName");
    const listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    if (emailLogueado) {
        const encontrado = listaUsuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado || u.nombre === emailLogueado);
        if (encontrado) return encontrado;
    }
    return null;
}

function mostrarModalSolicitud(tarjetaObj, usuarioActivo) {
    const modalExistente = document.getElementById("modalSolicitudCreditoFinara");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalSolicitudCreditoFinara";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(5, 7, 10, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1.5rem;
    `;

    overlay.innerHTML = `
        <div style="background: #11141b; border: 1px solid rgba(229,169,60,0.4); border-radius: 16px; padding: 2rem; max-width: 440px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); color: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.4rem;">
                <h3 style="margin: 0; font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-credit-card" style="color: #e5a93c;"></i> Solicitar Tarjeta de Crédito Gold
                </h3>
                <button type="button" id="btnCerrarModalCredito" style="background: none; border: none; color: #8a8f99; font-size: 1.2rem; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 1.2rem;">
                Por favor, ingresa los siguientes datos para evaluar tu preaprobación de cupo de crédito en Finara Bank.
            </p>

            <form id="formSolicitudCredito" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 0.4rem;">Ingresos Mensuales ($ COP)</label>
                    <input type="number" id="inputIngresosCredito" placeholder="Ej. 2500000" min="500000" step="100000" required
                        style="width: 100%; padding: 0.75rem; background: #1b202c; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                </div>

                <div>
                    <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 0.4rem;">Estrato Socioeconómico</label>
                    <select id="selectEstratoCredito" required
                        style="width: 100%; padding: 0.75rem; background: #1b202c; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                        <option value="" disabled selected>Selecciona tu estrato...</option>
                        <option value="1">Estrato 1</option>
                        <option value="2">Estrato 2</option>
                        <option value="3">Estrato 3</option>
                        <option value="4">Estrato 4</option>
                        <option value="5">Estrato 5 o más</option>
                    </select>
                </div>

                <button type="submit" style="background: #e5a93c; color: #0a0c10; border: none; padding: 0.85rem; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-circle-check"></i> Evaluar y Solicitar
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const cerrar = () => overlay.remove();
    overlay.querySelector("#btnCerrarModalCredito").addEventListener("click", cerrar);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrar();
    });

    overlay.querySelector("#formSolicitudCredito").addEventListener("submit", (e) => {
        e.preventDefault();
        const ingresos = Number(document.getElementById("inputIngresosCredito").value) || 0;
        const estrato = Number(document.getElementById("selectEstratoCredito").value) || 1;

        const validacion = tarjetaObj.validarRequisitos(ingresos, estrato);

        if (!validacion.aprobado) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'Solicitud No Aprobada',
                    text: validacion.motivo,
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
            } else {
                alert(validacion.motivo);
            }
            return;
        }

        cerrar();
        const numeroCreditoOficial = tarjetaObj.numeroCompleto.replace(/\s+/g, '');
        emitirTarjetaDirecta(usuarioActivo, 'credito', numeroCreditoOficial);
    });
}