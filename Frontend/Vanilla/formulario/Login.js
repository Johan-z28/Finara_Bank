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
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault();

            const inputCorreo = document.getElementById("correo").value.trim();
            const password = document.getElementById("password").value;

            // Obtener usuarios almacenados localmente
            const usuariosLocales = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];

            // Buscar coincidencia por correo o nombre de usuario
            const usuarioEncontrado = usuariosLocales.find(u =>
                (u.correo.toLowerCase() === inputCorreo.toLowerCase() || u.username.toLowerCase() === inputCorreo.toLowerCase()) &&
                u.password === password
            );

            if (usuarioEncontrado) {
                // Guardar la sesión activa actual
                localStorage.setItem("userProfile", JSON.stringify(usuarioEncontrado));

                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido de nuevo!',
                    text: 'Accediendo a tu panel de control...',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Redirección un nivel arriba hacia Pages/Dashboard.html
                    window.location.href = "../Dashboard.html";
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Credenciales incorrectas',
                    text: 'El correo/usuario o la contraseña son inválidos. Por favor, verifica tus datos.',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
            }
        });
    }
});