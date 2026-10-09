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

            const nombre = document.getElementById("nombre").value.trim();
            const correo = document.getElementById("correo").value.trim();
            const tipoDocumento = document.getElementById("tipoDocumento").value;
            const documento = document.getElementById("documento").value.trim();
            const telefono = document.getElementById("telefono").value.trim();
            const fecha = document.getElementById("fecha").value;
            const username = document.getElementById("userName").value.trim();
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

            // 2. Validar contraseña
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

            // 3. Validación de correo
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

            // 4. Validación de Términos
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

            let usuariosLocales = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];

            // 5. Verificar correo duplicado
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

            // 6. Verificar username duplicado
            const usernameExiste = usuariosLocales.some(u => u.username === username);
            if (usernameExiste) {
                Swal.fire({
                    icon: 'error',
                    title: 'Usuario no disponible',
                    text: 'El nombre de usuario "@' + username + '" ya está en uso.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
                return;
            }

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
                avatar: "../../Style/image/avatar-maria.png",
                verificado: true,
            };

            usuariosLocales.push(userData);
            localStorage.setItem("finara_usuarios_local", JSON.stringify(usuariosLocales));
            localStorage.setItem("userProfile", JSON.stringify(userData));

            Swal.fire({
                icon: 'success',
                title: '¡Registro exitoso!',
                text: 'Tu cuenta ha sido creada correctamente en Finara Bank.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            }).then(() => {
                window.location.href = "Login.html";
            });
        });
    }

    // Modal SweetAlert2 Profesional para Términos y Condiciones
    const btnTerminos = document.getElementById("btnTerminos");
    if (btnTerminos) {
        btnTerminos.addEventListener("click", function(e) {
            e.preventDefault();
            Swal.fire({
                title: '<strong style="color: #e5a93c;">Términos y Condiciones - Finara Bank</strong>',
                html: `
                  <div style="text-align: left; max-height: 320px; overflow-y: auto; padding-right: 12px; font-size: 13px; color: #b3b3b3; line-height: 1.6;">
                      <p><strong style="color: #fff;">1. Marco de Operación Digital:</strong> Al aperturar su cuenta digital en Finara Bank, el usuario acepta operar bajo los estandares de seguridad bancaria estipulados para transacciones virtuales.</p>
                      <br>
                      <p><strong style="color: #fff;">2. Mayoría de Edad y Autenticidad:</strong> Los servicios están restringidos a mayores de 18 años. Toda la información suministrada (tipo y número de documento) tiene carácter de declaración jurada.</p>
                      <br>
                      <p><strong style="color: #fff;">3. Custodia de Claves:</strong> El titular es el único responsable de la seguridad de su contraseña y claves transaccionales frente a accesos de terceros.</p>
                  </div>
              `,
                icon: 'info',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#e5a93c',
                width: '600px'
            });
        });
    }

    // Modal SweetAlert2 Profesional para Política de Privacidad
    const btnPrivacidad = document.getElementById("btnPrivacidad");
    if (btnPrivacidad) {
        btnPrivacidad.addEventListener("click", function(e) {
            e.preventDefault();
            Swal.fire({
                title: '<strong style="color: #e5a93c;">Política de Privacidad y Habeas Data</strong>',
                html: `
                  <div style="text-align: left; max-height: 320px; overflow-y: auto; padding-right: 12px; font-size: 13px; color: #b3b3b3; line-height: 1.6;">
                      <p><strong style="color: #fff;">1. Tratamiento de Datos Sensibles:</strong> En cumplimiento de las normativas de protección de datos, Finara Bank protege rigurosamente la información de identificación personal recaudada.</p>
                      <br>
                      <p><strong style="color: #fff;">2. Finalidad Financiera:</strong> Los datos son utilizados exclusivamente para la validación de perfiles, gestión de productos de crédito/débito y prevención de fraudes bancarios.</p>
                      <br>
                      <p><strong style="color: #fff;">3. Confidencialidad:</strong> Sus datos personales no serán comercializados ni compartidos con entidades ajenas a la red de servicios financieros de Finara.</p>
                  </div>
              `,
                icon: 'success',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#e5a93c',
                width: '600px'
            });
        });
    }
});