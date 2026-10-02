import { initGlobalComponents } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();
    await cargarDatosPerfil();
});

async function cargarDatosPerfil() {
    let userData = null;

    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Error al conectar con el backend');
        }

        userData = await response.json();
        localStorage.setItem('userProfile', JSON.stringify(userData));

    } catch (error) {
        console.warn('Backend no disponible, cargando datos desde localStorage...', error);

        // Intentar obtener el perfil activo o el último usuario registrado en localStorage
        let storedData = localStorage.getItem('userProfile');

        if (storedData) {
            userData = JSON.parse(storedData);
        } else {
            // Intentar buscar en la lista de usuarios locales si existe
            const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local'));
            if (localUsers && localUsers.length > 0) {
                userData = localUsers[localUsers.length - 1]; // Tomar el último registrado
            }
        }

        // Si de plano no hay nada, usar valores por defecto
        if (!userData) {
            userData = {
                nombre: "María Gómez",
                rol: "Cliente",
                email: "maria.gomez@email.com",
                telefono: "+57 300 123 4567",
                direccion: "Cra 45 # 12-34, Bogotá",
                productosActivos: 3,
                saldoDisponible: "$ 2.450.000",
                ultimaActividad: "Hoy, 10:24 a. m.",
                avatar: "../Style/image/avatar-maria.png"
            };
        }
    }

    // Normalizar propiedades para evitar desfases entre 'correo' y 'email'
    const normalizedUser = {
        nombre: userData.nombre || "Usuario",
        rol: userData.rol || "Cliente",
        email: userData.email || userData.correo || "No registrado",
        telefono: userData.telefono || "No registrado",
        direccion: userData.direccion || "No registrada",
        productosActivos: userData.productosActivos ?? 0,
        saldoDisponible: userData.saldoDisponible ?? "$ 0",
        ultimaActividad: userData.ultimaActividad ?? "Reciente",
        avatar: userData.avatar || "../Style/image/avatar-maria.png"
    };

    renderizarPerfil(normalizedUser);
}

function renderizarPerfil(user) {
    // 1. Saludo superior
    const greetingName = document.getElementById('greetingName');
    if (greetingName && user.nombre) {
        greetingName.textContent = user.nombre.split(' ')[0];
    }

    // 2. Tarjeta Héroe del Perfil
    const profileHero = document.querySelector('.profile-hero');
    if (profileHero) {
        const nameH2 = profileHero.querySelector('.profile-data h2');
        const roleSpan = profileHero.querySelector('.profile-data span');
        const contactPs = profileHero.querySelectorAll('.profile-contact p');
        const avatarImg = profileHero.querySelector('.profile-avatar img');

        if (nameH2) nameH2.textContent = user.nombre;
        if (roleSpan) roleSpan.textContent = user.rol;

        if (contactPs.length >= 3) {
            contactPs[0].innerHTML = `<i class="fa-regular fa-envelope"></i> ${user.email}`;
            contactPs[1].innerHTML = `<i class="fa-solid fa-phone"></i> ${user.telefono}`;
            contactPs[2].innerHTML = `<i class="fa-solid fa-location-dot"></i> ${user.direccion}`;
        }

        if (avatarImg && user.avatar) {
            avatarImg.src = user.avatar;
        }
    }

    // 3. Sección de Información Personal
    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');
    if (infoRows && infoRows.length >= 4) {
        infoRows[0].querySelector('strong').textContent = user.nombre;
        infoRows[1].querySelector('strong').textContent = user.email;
        infoRows[2].querySelector('strong').textContent = user.telefono;
        infoRows[3].querySelector('strong').textContent = user.direccion;
    }

    // 4. Resumen de cuenta
    const accountSummaryCard = document.querySelector('.profile-card.account-summary');
    if (accountSummaryCard) {
        const strongElements = accountSummaryCard.querySelectorAll('.summary-item strong');
        if (strongElements.length >= 3) {
            strongElements[0].textContent = user.productosActivos;
            strongElements[1].textContent = user.saldoDisponible;
            strongElements[2].textContent = user.ultimaActividad;
        }
    }
}