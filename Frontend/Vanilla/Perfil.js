import { initGlobalComponents } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa la hamburguesa, el menú de perfil y los datos compartidos
    initGlobalComponents();

    // Cargar los datos del usuario (Backend con fallback a LocalStorage)
    await cargarDatosPerfil();
});

async function cargarDatosPerfil() {
    let userData = null;

    try {
        // Intento de obtener datos desde el backend (ajusta la URL según tu API)
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Descomenta si manejas tokens
            }
        });

        if (!response.ok) {
            throw new Error('Error al conectar con el backend');
        }

        userData = await response.json();

        // Opcional: Actualizar el localStorage con la data más fresca del backend
        localStorage.setItem('userProfile', JSON.stringify(userData));

    } catch (error) {
        console.warn('Backend no disponible, cargando datos desde localStorage...', error);

        // Respaldo: Buscar en el localStorage
        const storedData = localStorage.getItem('userProfile');
        if (storedData) {
            userData = JSON.parse(storedData);
        } else {
            // Datos por defecto en caso de que tampoco existan en localStorage
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

    // Renderizar los datos obtenidos en el HTML existente dentro del <main>
    renderizarPerfil(userData);
}

function renderizarPerfil(user) {
    // 1. Saludo superior y navbar (si aplica)
    const greetingName = document.getElementById('greetingName');
    if (greetingName && user.nombre) {
        // Extraer primer nombre o mostrar completo según prefieras
        greetingName.textContent = user.nombre.split(' ')[0];
    }

    // 2. Tarjeta Héroe del Perfil (Hero Section)
    const profileHero = document.querySelector('.profile-hero');
    if (profileHero) {
        const nameH2 = profileHero.querySelector('.profile-data h2');
        const roleSpan = profileHero.querySelector('.profile-data span');
        const contactPs = profileHero.querySelectorAll('.profile-contact p');
        const avatarImg = profileHero.querySelector('.profile-avatar img');

        if (nameH2) nameH2.textContent = user.nombre;
        if (roleSpan) roleSpan.textContent = user.rol || 'Cliente';

        if (contactPs.length >= 3) {
            contactPs[0].innerHTML = `<i class="fa-regular fa-envelope"></i> ${user.email}`;
            contactPs[1].innerHTML = `<i class="fa-solid fa-phone"></i> ${user.telefono}`;
            contactPs[2].innerHTML = `<i class="fa-solid fa-location-dot"></i> ${user.direccion}`;
        }

        if (avatarImg && user.avatar) {
            avatarImg.src = user.avatar;
        }
    }

    // 3. Sección de Información Personal (Primer tarjeta de la grilla)
    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');
    if (infoRows && infoRows.length >= 4) {
        infoRows[0].querySelector('strong').textContent = user.nombre;
        infoRows[1].querySelector('strong').textContent = user.email;
        infoRows[2].querySelector('strong').textContent = user.telefono;
        infoRows[3].querySelector('strong').textContent = user.direccion;
    }

    // 4. Resumen de cuenta (Tercera tarjeta de la grilla)
    const accountSummaryCard = document.querySelector('.profile-card.account-summary');
    if (accountSummaryCard) {
        const strongElements = accountSummaryCard.querySelectorAll('.summary-item strong');
        if (strongElements.length >= 3) {
            strongElements[0].textContent = user.productosActivos ?? 3;
            strongElements[1].textContent = user.saldoDisponible ?? "$ 2.450.000";
            strongElements[2].textContent = user.ultimaActividad ?? "Hoy, 10:24 a. m.";
        }
    }
}