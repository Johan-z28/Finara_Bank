const form = document.querySelector("form");
const usuarioInput = document.getElementById("usuario");
const passwordInput = document.getElementById("password");
const attempts = document.getElementById("attempts");
const showPassword = document.getElementById("showPassword");
let intentos = 0;

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const valorUsuario = usuarioInput.value.trim();
    const valorPassword = passwordInput.value;

    // Obtener los usuarios registrados desde el localStorage
    const usuariosLocales = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];

    // Buscar si existe un usuario que coincida por username o correo, y su contraseña
    const usuarioEncontrado = usuariosLocales.find(u =>
        (u.username === valorUsuario || u.correo === valorUsuario) && u.password === valorPassword
    );

    if (usuarioEncontrado) {
        // Guardar el usuario activo actual en la sesión
        localStorage.setItem("userProfile", JSON.stringify(usuarioEncontrado));

        alert("Inicio de sesión exitoso");
        window.location.href = "../../pages/Dashboard.html";
    } else {
        intentos++;
        if (intentos < 3) {
            if (attempts) {
                attempts.textContent = "Intentos restantes: " + (3 - intentos);
            }
            alert("Usuario o contraseña incorrectos");
        } else {
            if (attempts) {
                attempts.textContent = "Cuenta bloqueada";
            }
            alert("Has superado los 3 intentos. La cuenta está bloqueada.");
            usuarioInput.disabled = true;
            passwordInput.disabled = true;
        }
    }
});

if (showPassword) {
    showPassword.addEventListener("click", function() {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            showPassword.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
        } else {
            passwordInput.type = "password";
            showPassword.innerHTML = '<i class="fa-regular fa-eye"></i>';
        }
    });
}