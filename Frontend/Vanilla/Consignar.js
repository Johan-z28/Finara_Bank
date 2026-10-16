import { initGlobalComponents } from './Global/app.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        initGlobalComponents();
    } catch (e) {
        console.warn("Componentes globales omitidos:", e);
    }

    // 1. Recuperar usuario activo desde localStorage
    const usuarioActivo = obtenerUsuarioActivoReal();

    if (!usuarioActivo) {
        Swal.fire({
            icon: 'warning',
            title: 'Sesión requerida',
            text: 'Debes iniciar sesión para realizar una consignación.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        }).then(() => {
            window.location.href = "Login.html";
        });
        return;
    }

    // 2. Pintar el nombre del usuario en la barra superior
    const greetingName = document.getElementById('greetingName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const nombreReal = usuarioActivo.nombre || usuarioActivo.username || "Usuario";

    if (greetingName) greetingName.textContent = nombreReal;
    if (dropdownUserName) dropdownUserName.textContent = nombreReal;

    // 3. Activar manualmente el menú desplegable del perfil
    configurarMenuPerfilManual();

    // 4. Poblar el selector de origen con las tarjetas reales
    poblarSelectorTarjetas(usuarioActivo);

    // 5. Manejar el formulario de consignación con validación de tarjeta de crédito
    const formConsignacion = document.getElementById('formConsignacion');
    if (formConsignacion) {
        formConsignacion.addEventListener('submit', (e) => {
            e.preventDefault();

            const selectOrigen = document.getElementById('cuentaOrigen');
            const tarjetaSeleccionadaTexto = selectOrigen.options[selectOrigen.selectedIndex].text.toLowerCase();

            // REGLA DE NEGOCIO: No se puede consignar desde una Tarjeta de Crédito
            if (tarjetaSeleccionadaTexto.includes('crédito') || tarjetaSeleccionadaTexto.includes('credito')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Operación no permitida',
                    text: 'Las Tarjetas de Crédito son medios de pago y financiamiento de compras, por lo que no pueden utilizarse como origen para realizar consignaciones.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            procesarConsignacionFinal(usuarioActivo);
        });
    }
});

function obtenerUsuarioActivoReal() {
    try {
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

        if (listaUsuarios.length > 0) {
            return listaUsuarios[listaUsuarios.length - 1];
        }
    } catch (e) {
        console.error("Error al obtener usuario:", e);
    }
    return null;
}

function configurarMenuPerfilManual() {
    const profileBtn = document.getElementById("profileMenuBtn");
    const profileDropdown = document.getElementById("profileDropdown");

    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isActive = profileDropdown.classList.contains("active") || profileDropdown.style.display === "block";
            if (isActive) {
                profileDropdown.classList.remove("active");
                profileDropdown.style.display = "none";
            } else {
                profileDropdown.classList.add("active");
                profileDropdown.style.display = "block";
            }
        });

        document.addEventListener("click", (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove("active");
                profileDropdown.style.display = "none";
            }
        });
    }
}

function poblarSelectorTarjetas(usuario) {
    const selectOrigen = document.getElementById('cuentaOrigen');
    if (!selectOrigen) return;

    selectOrigen.innerHTML = '';

    let tarjetasBrutas = usuario.tarjetasAprobadas;
    let tarjetas = [];

    if (tarjetasBrutas) {
        if (Array.isArray(tarjetasBrutas)) {
            tarjetas = tarjetasBrutas;
        } else if (typeof tarjetasBrutas === 'object') {
            tarjetas = Object.values(tarjetasBrutas);
        }
    }

    if (tarjetas.length > 0) {
        tarjetas.forEach((tarjeta, index) => {
            const option = document.createElement('option');
            option.value = index;

            const titulo = tarjeta.titulo || "Tarjeta Finara";
            const numeroTarjeta = tarjeta.numeroTarjeta || tarjeta.tipo || "Plástico digital";
            const saldoMostrado = usuario.saldoDisponible || "$ 0";

            option.textContent = `${titulo} - [${numeroTarjeta}] (Saldo: ${saldoMostrado})`;
            selectOrigen.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = 'general';
        option.textContent = `Cuenta General Principal - Saldo: ${usuario.saldoDisponible || '$ 0'}`;
        selectOrigen.appendChild(option);
    }
}

function procesarConsignacionFinal(usuarioActivo) {
    const montoInput = document.getElementById('montoConsignar').value;
    const monto = parseFloat(montoInput);
    const cuentaDestino = document.getElementById('cuentaDestino').value.trim();

    if (!monto || monto < 10000) {
        Swal.fire({
            icon: 'warning',
            title: 'Monto inválido',
            text: 'El monto mínimo de consignación es de $ 10.000 COP.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
        return;
    }

    if (!cuentaDestino) {
        Swal.fire({
            icon: 'warning',
            title: 'Destino requerido',
            text: 'Por favor ingresa la cuenta o correo del destinatario.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
        return;
    }

    // Extraer limpiamente el saldo actual evitando errores con puntos, comas o décimas fantasma
    let saldoActualNum = 0;
    if (usuarioActivo.saldoDisponible) {
        // Reemplazar puntos de miles y limpiar formato monetario string a número flotante real
        const limpioStr = usuarioActivo.saldoDisponible.toString()
            .replace('$', '')
            .trim()
            .replaceAll('.', '')
            .replace(',', '.');

        saldoActualNum = parseFloat(limpioStr) || 0;
    }

    // Sumar de forma exacta el monto ingresado
    saldoActualNum += monto;

    // Guardar el saldo formateado limpiamente sin decimales extraños en pesos colombianos
    usuarioActivo.saldoDisponible = `$ ${Math.round(saldoActualNum).toLocaleString('es-CO')}`;
    usuarioActivo.ultimaActividad = "Hace un momento";

    // Actualizar localStorage
    localStorage.setItem('userProfile', JSON.stringify(usuarioActivo));

    let listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
    listaUsuarios = listaUsuarios.map(u => {
        if (u.correo === usuarioActivo.correo || u.username === usuarioActivo.username) {
            return usuarioActivo;
        }
        return u;
    });
    localStorage.setItem("finara_usuarios_local", JSON.stringify(listaUsuarios));

    Swal.fire({
        icon: 'success',
        title: '¡Consignación Exitosa!',
        html: `Se han acreditado <strong>$ ${monto.toLocaleString('es-CO')} COP</strong> a la cuenta destino <strong>${cuentaDestino}</strong>.<br><br>Tu nuevo saldo disponible es: <span style="color: #38bdf8;">${usuarioActivo.saldoDisponible}</span>`,
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c'
    }).then(() => {
        location.reload();
    });
}
