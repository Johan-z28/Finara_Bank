const form = document.querySelector("form");
const usuario = document.getElementById("usuario");
const password = document.getElementById("password");
const attempts = document.getElementById("attempts");
const showPassword = document.getElementById("showPassword");

let intentos = 0;

form.addEventListener("submit", function(event) {

    event.preventDefault();

    const usuarioCorrecto = "maria17";
    const contraseña = "12345";

if (usuario.value === usuarioCorrecto && password.value === contraseña) {

        alert("Inicio de sesión exitoso");

        window.location.href = "Dashboard.html";

    } else {

        intentos++;

        if (intentos < 3) {

            attempts.textContent =
                "Intentos restantes: " + (3 - intentos);

            alert("Usuario o contraseña incorrectos");

        } else {

            attempts.textContent = "Cuenta bloqueada";

            alert("Has superado los 3 intentos. La cuenta está bloqueada.");

            usuario.disabled = true;
            password.disabled = true;
        }
    }
});


showPassword.addEventListener("click", function() {

    if (password.type === "password") {

        password.type = "text";

        showPassword.innerHTML =
            '<i class="fa-regular fa-eye-slash"></i>';

    } else {

        password.type = "password";

        showPassword.innerHTML =
            '<i class="fa-regular fa-eye"></i>';
    }
});