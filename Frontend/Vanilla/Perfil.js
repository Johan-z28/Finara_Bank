import { initGlobalComponents } from './app.js';

let editando = false;

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();
    await cargarDatosPerfil();

    // Configurar el evento del botón de editar perfil principal
    const btnEditar = document.querySelector('.btn-edit-profile');
    if (btnEditar) {
        btnEditar.addEventListener('click', toggleModoEdicion);
    }
});

async function cargarDatosPerfil() {
    let userData = null;

    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Error al conectar con el backend');

        userData = await response.json();
        localStorage.setItem('userProfile', JSON.stringify(userData));

    } catch (error) {
        console.warn('Backend no disponible, cargando datos desde localStorage...');

        let storedData = localStorage.getItem('userProfile');
        if (storedData) {
            userData = JSON.parse(storedData);
        } else {
            const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local'));
            if (localUsers && localUsers.length > 0) {
                userData = localUsers[localUsers.length - 1];
            }
        }

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
    const greetingName = document.getElementById('greetingName');
    if (greetingName && user.nombre) {
        greetingName.textContent = user.nombre.split(' ')[0];
    }

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

    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');
    if (infoRows && infoRows.length >= 4) {
        infoRows[0].querySelector('strong').textContent = user.nombre;
        infoRows[1].querySelector('strong').textContent = user.email;
        infoRows[2].querySelector('strong').textContent = user.telefono;
        infoRows[3].querySelector('strong').textContent = user.direccion;
    }

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

// Función para alternar el modo edición en la tarjeta de información personal
function toggleModoEdicion() {
    editando = !editando;
    const btnEditar = document.querySelector('.btn-edit-profile');
    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');

    if (!infoRows) return;

    if (editando) {
        // Cambiar apariencia del botón principal
        btnEditar.innerHTML = `<i class="fa-solid fa-check"></i> Guardar cambios`;
        btnEditar.style.backgroundColor = '#10B981'; // Color verde de éxito opcional

        // Convertir los strong en inputs editables
        infoRows.forEach(row => {
            const strong = row.querySelector('strong');
            const textoActual = strong.textContent;
            const campoId = getCampoId(row);

            strong.innerHTML = `<input type="text" class="input-edit-perfil" data-campo="${campoId}" value="${textoActual}" style="background: #222; color: #fff; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; width: 100%;">`;
        });
    } else {
        // Guardar los nuevos valores
        const nuevosDatos = {};
        infoRows.forEach(row => {
            const input = row.querySelector('input');
            if (input) {
                const campo = input.dataset.campo;
                nuevosDatos[campo] = input.value.trim();
            }
        });

        // Recuperar datos actuales del localStorage para conservar saldo, avatar, etc.
        let userData = JSON.parse(localStorage.getItem('userProfile')) || {};

        // Fusionar cambios
        userData.nombre = nuevosDatos.nombre || userData.nombre;
        userData.email = nuevosDatos.correo || userData.email;
        userData.telefono = nuevosDatos.telefono || userData.telefono;
        userData.direccion = nuevosDatos.direccion || userData.direccion;

        // Guardar actualizado en localStorage
        localStorage.setItem('userProfile', JSON.stringify(userData));

        // Restaurar botón principal
        btnEditar.innerHTML = `<i class="fa-solid fa-pen"></i> Editar perfil`;
        btnEditar.style.backgroundColor = '';

        alert("¡Datos actualizados correctamente en el almacenamiento local!");

        // Volver a renderizar con la data fresca
        cargarDatosPerfil();
    }
}

// Identificar qué campo corresponde a cada fila de información personal
function getCampoId(row) {
    const label = row.querySelector('span').textContent.toLowerCase();
    if (label.includes('nombre')) return 'nombre';
    if (label.includes('correo')) return 'correo';
    if (label.includes('teléfono')) return 'telefono';
    if (label.includes('dirección')) return 'direccion';
    return '';
}