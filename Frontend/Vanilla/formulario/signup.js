// Mostrar / ocultar contraseña (expuesta globalmente para que funcione el onclick del HTML)
window.togglePassword = function(inputId, button) {
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

document.addEventListener("DOMContentLoaded", () => {
    const registroForm = document.getElementById("registroForm");

    if (registroForm) {
        registroForm.addEventListener("submit", async function(event) {
            event.preventDefault();

            const nombre = document.getElementById("nombre").value.trim();
            const correo = document.getElementById("correo").value.trim();
            const documento = document.getElementById("documento").value.trim();
            const telefono = document.getElementById("telefono").value.trim();
            const fecha = document.getElementById("fecha").value;
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            const direccion = document.getElementById("direccion").value.trim();

            // Validaciones básicas
            if (password.length < 8) {
                alert("La contraseña debe tener mínimo 8 caracteres.");
                return;
            }
            if (password !== confirmPassword) {
                alert("Las contraseñas no coinciden.");
                return;
            }

            // Validación de formato de correo electrónico usando regex
            const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regexCorreo.test(correo)) {
                alert("Por favor, ingresa un correo electrónico válido.");
                return;
            }

            // Validación de Términos y Condiciones
            const termsCheckbox = document.querySelector('input[type="checkbox"]');
            if (termsCheckbox && !termsCheckbox.checked) {
                alert("Debes aceptar los términos y condiciones para continuar.");
                return;
            }

            // Construir el objeto con los datos del usuario
            const userData = {
                nombre,
                correo,
                documento,
                telefono,
                fecha,
                password, // (Idealmente encriptado o manejado con seguridad en backend)
                direccion,
                rol: "Cliente",
                productosActivos: 0,
                saldoDisponible: "$ 0",
                ultimaActividad: "Recién registrado",
                avatar: "../Style/image/avatar-maria.png" // O un avatar genérico por defecto
            };

            let backendSuccess = false;

            try {
                // Intento 1: Enviar al Backend
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });

                if (response.ok) {
                    backendSuccess = true;
                    alert("¡Registro exitoso guardado en el servidor!");
                    // Opcional: limpiar form o redirigir al login
                    // window.location.href = "Login.html";
                } else {
                    throw new Error("El servidor respondió con un error");
                }
            } catch (error) {
                console.warn("Backend no disponible. Guardando de forma local en localStorage...", error);
            }

            // Si el backend no está disponible o falló, guardamos en localStorage como respaldo
            if (!backendSuccess) {
                // Recuperar registros previos o inicializar arreglo vacío
                let usuariosLocales = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];

                // Verificar si ya existe el correo
                const existe = usuariosLocales.some(u => u.correo === correo);
                if (existe) {
                    alert("Este correo ya se encuentra registrado localmente.");
                    return;
                }

                usuariosLocales.push(userData);
                localStorage.setItem("finara_usuarios_local", JSON.stringify(usuariosLocales));

                // Guardar también como perfil activo actual para pruebas rápidas
                localStorage.setItem("userProfile", JSON.stringify(userData));

                alert("Backend no disponible: Tu cuenta ha sido registrada localmente en el navegador (localStorage).");

                // Opcional: Redirigir al perfil o dashboard de prueba
                // window.location.href = "Perfil.html";
            }
        });
    }
});