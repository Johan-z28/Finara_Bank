// Importar o asegurar que SweetAlert2 esté disponible globalmente (asumiendo que lo tienes enlazado en el HTML)
// Si usas CDN en el HTML: <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

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
        registroForm.addEventListener("submit", function(event) {
            event.preventDefault();

            // Capturar los valores de todos los campos
            const nombre = document.getElementById("nombre").value.trim();
            const correo = document.getElementById("correo").value.trim();
            const tipoDocumento = document.getElementById("tipoDocumento").value;
            const documento = document.getElementById("documento").value.trim();
            const telefono = document.getElementById("telefono").value.trim();
            const fecha = document.getElementById("fecha").value;
            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            // 1. Validar mayoría de edad (mínimo 18 años)
            const fechaNacimiento = new Date(fecha);
            const hoy = new Date();
            let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
            const mes = hoy.getMonth() - fechaNacimiento.getMonth();

            if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
                edad--;
            }

            if (edad < 18) {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'Debes ser mayor de 18 años para registrarte en Finara Bank.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            // 2. Validar longitud de contraseña
            if (password.length < 8) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Contraseña muy corta',
                    text: 'La contraseña debe tener mínimo 8 caracteres.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            if (password !== confirmPassword) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de coincidencia',
                    text: 'Las contraseñas no coinciden.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            // 3. Validación de formato de correo electrónico usando regex
            const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!regexCorreo.test(correo)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Correo inválido',
                    text: 'Por favor, ingresa un correo electrónico válido.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            // 4. Validación de Términos y Condiciones
            const termsCheckbox = document.getElementById("terminos");
            if (termsCheckbox && !termsCheckbox.checked) {
                Swal.fire({
                    icon: 'info',
                    title: 'Términos y condiciones',
                    text: 'Debes aceptar los términos y condiciones para continuar.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            // Recuperar registros previos o inicializar arreglo vacío en localStorage
            let usuariosLocales = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];

            // 5. Verificar si ya existe el correo electrónico
            const correoExiste = usuariosLocales.some(u => u.correo === correo);
            if (correoExiste) {
                Swal.fire({
                    icon: 'error',
                    title: 'Correo ya registrado',
                    text: 'Este correo electrónico ya se encuentra registrado.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            // 6. Verificar si ya existe el nombre de usuario (único)
            const usernameExiste = usuariosLocales.some(u => u.username === username);
            if (usernameExiste) {
                Swal.fire({
                    icon: 'error',
                    title: 'Usuario no disponible',
                    text: 'El nombre de usuario "@' + username + '" ya está en uso. Por favor elige otro.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

            // Construir el objeto con los datos completos del usuario
            const userData = {
                nombre,
                correo,
                tipoDocumento,
                documento,
                telefono,
                fecha,
                username,
                password,
                rol: "Cliente",
                productosActivos: 0,
                saldoDisponible: "$ 0",
                ultimaActividad: "Recién registrado",
                avatar: "../Style/image/avatar-maria.png"
            };

            // Guardar en el arreglo local y actualizar localStorage
            usuariosLocales.push(userData);
            localStorage.setItem("finara_usuarios_local", JSON.stringify(usuariosLocales));

            // Guardar también como perfil activo actual para pruebas
            localStorage.setItem("userProfile", JSON.stringify(userData));

            // Alerta de éxito con SweetAlert2 y redirección al cerrar
            Swal.fire({
                icon: 'success',
                title: '¡Registro exitoso!',
                text: 'Tu cuenta ha sido creada correctamente.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            }).then(() => {
                window.location.href = "Login.html";
            });
        });
    }
});