import { initGlobalComponents } from './Global/app.js';

let editando = false;

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();
    await cargarDatosPerfil();

    const btnEditar = document.querySelector('.btn-edit-profile');
    if (btnEditar) {
        btnEditar.addEventListener('click', toggleModoEdicion);
    }

    // <-- NUEVA LÍNEA: Activar los botones de lápiz individuales -->
    configurarBotonesEditarIndividuales();

    configurarBotonesConfiguracion();
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

// Función para alternar el modo edición con confirmación de SweetAlert2 y validación local
async function toggleModoEdicion() {
    const btnEditar = document.querySelector('.btn-edit-profile');
    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');
    if (!infoRows) return;

    if (!editando) {
        // Entrar en modo edición
        editando = true;
        btnEditar.innerHTML = `<i class="fa-solid fa-check"></i> Guardar cambios`;
        btnEditar.style.backgroundColor = '#10B981'; // Color verde de éxito

        // Convertir los campos en inputs editables
        infoRows.forEach(row => {
            const strong = row.querySelector('strong');
            const textoActual = strong.textContent;
            const campoId = getCampoId(row);
            strong.innerHTML = `<input type="text" class="input-edit-perfil" data-campo="${campoId}" value="${textoActual}" style="background: #222; color: #fff; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; width: 100%;">`;
        });
    } else {
        // 1. Modal de confirmación con SweetAlert2 antes de guardar
        const confirmacion = await Swal.fire({
            title: '¿Guardar cambios?',
            text: '¿Estás seguro de actualizar tu información personal?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Cancelar',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c',
            cancelButtonColor: '#d33'
        });

        // Si el usuario cancela, detenemos el proceso y se mantiene editando
        if (!confirmacion.isConfirmed) {
            return;
        }

        // 2. Recolectar nuevos valores y validar que no estén vacíos
        const nuevosDatos = {};
        let hayCamposVacios = false;

        infoRows.forEach(row => {
            const input = row.querySelector('input');
            if (input) {
                const campo = input.dataset.campo;
                const valor = input.value.trim();
                if (valor === '') {
                    hayCamposVacios = true;
                }
                nuevosDatos[campo] = valor;
            }
        });

        if (hayCamposVacios) {
            Swal.fire({
                title: 'Campos vacíos',
                text: 'Por favor completa todos los campos antes de guardar.',
                icon: 'warning',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return; // No guardamos y permitimos corregir
        }

        // 3. Recuperar datos actuales del localStorage para conservar saldo, avatar, contraseña, etc.
        let userData = JSON.parse(localStorage.getItem('userProfile')) || {};

        // Fusionar cambios
        userData.nombre = nuevosDatos.nombre || userData.nombre;
        userData.email = nuevosDatos.correo || userData.email;
        userData.telefono = nuevosDatos.telefono || userData.telefono;
        userData.direccion = nuevosDatos.direccion || userData.direccion;

        // 4. Guardar actualizado en localStorage
        localStorage.setItem('userProfile', JSON.stringify(userData));

        // 5. Restaurar botón principal
        btnEditar.innerHTML = `<i class="fa-solid fa-pen"></i> Editar perfil`;
        btnEditar.style.backgroundColor = '';
        editando = false;

        // Alerta bonita de éxito con SweetAlert2
        Swal.fire({
            title: '¡Actualizado!',
            text: 'Tus datos se han guardado correctamente.',
            icon: 'success',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });

        // Volver a renderizar con la data fresca en pantalla
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

// Configurar los botones de lápiz individuales en cada fila de información personal
function configurarBotonesEditarIndividuales() {
    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');
    if (!infoRows) return;

    infoRows.forEach(row => {
        const btnEditRow = row.querySelector('button');
        if (!btnEditRow) return;

        btnEditRow.addEventListener('click', async () => {
            const spanLabel = row.querySelector('span').textContent;
            const strongVal = row.querySelector('strong');
            const valorActual = strongVal.textContent.trim();
            const campoId = getCampoId(row);

            if (!campoId) return;

            const titulosModal = {
                'nombre': 'Editar Nombre Completo',
                'correo': 'Editar Correo Electrónico',
                'telefono': 'Editar Teléfono',
                'direccion': 'Editar Dirección'
            };

            // Mostrar modal de SweetAlert2 con input prellenado
            const { value: nuevoValor } = await Swal.fire({
                title: titulosModal[campoId] || 'Editar campo',
                input: 'text',
                inputValue: valorActual,
                inputAttributes: {
                    autocapitalize: 'off'
                },
                showCancelButton: true,
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Cancelar',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c',
                cancelButtonColor: '#d33',
                inputValidator: (value) => {
                    if (!value || value.trim() === '') {
                        return '¡El campo no puede estar vacío!';
                    }
                    if (campoId === 'correo') {
                        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!regexCorreo.test(value.trim())) {
                            return 'Por favor ingresa un correo electrónico válido.';
                        }
                    }
                }
            });

            if (nuevoValor) {
                const valorLimpio = nuevoValor.trim();

                // Recuperar y actualizar el perfil en localStorage
                let userData = JSON.parse(localStorage.getItem('userProfile')) || {};

                if (campoId === 'correo') {
                    userData.email = valorLimpio;
                } else {
                    userData[campoId] = valorLimpio;
                }

                localStorage.setItem('userProfile', JSON.stringify(userData));

                // Actualizar también en el registro local general si aplica
                const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
                if (localUsers.length > 0) {
                    localUsers[localUsers.length - 1][campoId === 'correo' ? 'email' : campoId] = valorLimpio;
                    localUsers[localUsers.length - 1][campoId] = valorLimpio;
                    localStorage.setItem('finara_usuarios_local', JSON.stringify(localUsers));
                }

                // Notificación de éxito y actualización de la interfaz
                await Swal.fire({
                    title: '¡Actualizado!',
                    text: `El campo "${spanLabel}" se ha actualizado correctamente.`,
                    icon: 'success',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });

                cargarDatosPerfil();
            }
        });
    });
}

// Configurar los botones de configuración de cuenta con SweetAlert2
function configurarBotonesConfiguracion() {
    const settingRows = document.querySelectorAll('.profile-card')[1]?.querySelectorAll('.setting-row');
    if (!settingRows || settingRows.length === 0) return;

    settingRows.forEach((row, index) => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', async () => {
            switch (index) {
                case 0: // Cambiar contraseña
                    await cambiarContraseñaFácil();
                    break;
                case 1: // Notificaciones
                    Swal.fire({
                        title: 'Notificaciones',
                        text: '¡Pronto estará disponible la gestión de notificaciones!',
                        icon: 'info',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c'
                    });
                    break;
                case 2: // Métodos de autenticación
                    Swal.fire({
                        title: 'Autenticación',
                        text: '¡Pronto estará disponible la configuración de métodos de autenticación!',
                        icon: 'info',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c'
                    });
                    break;
                case 3: // Privacidad y datos
                    Swal.fire({
                        title: 'Privacidad y Datos',
                        text: '¡Pronto estará disponible la sección de privacidad y datos!',
                        icon: 'info',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c'
                    });
                    break;
                default:
                    break;
            }
        });
    });
}

// Función para cambiar contraseña con SweetAlert2 y validación real
async function cambiarContraseñaFácil() {
    // 1. Pedir contraseña actual
    const { value: passwordActual } = await Swal.fire({
        title: 'Cambiar contraseña',
        text: 'Ingresa tu contraseña actual:',
        input: 'password',
        inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });

    if (!passwordActual) return;

    // Obtener datos guardados para validar localmente si el backend no responde
    let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
    let passwordRegistrada = userData.password;

    if (!passwordRegistrada) {
        const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
        if (localUsers.length > 0) {
            passwordRegistrada = localUsers[localUsers.length - 1].password;
        }
    }

    try {
        // Intento con Backend (Try-Catch)
        const response = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passwordActual })
        });

        if (!response.ok) throw new Error('Backend no disponible');

        // Si responde el backend, pedir la nueva contraseña
        const { value: nuevaPassword } = await Swal.fire({
            title: 'Nueva contraseña',
            text: 'Ingresa tu nueva contraseña (mínimo 8 caracteres):',
            input: 'password',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c',
            showCancelButton: true,
            cancelButtonText: 'Cancelar'
        });

        if (!nuevaPassword) return;
        if (nuevaPassword.length < 8) {
            Swal.fire({ title: 'Error', text: 'La contraseña debe tener al menos 8 caracteres.', icon: 'error', background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c' });
            return;
        }

        const responseChange = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passwordActual, nuevaPassword })
        });

        if (!responseChange.ok) throw new Error('Error al actualizar en el servidor');

        Swal.fire({ title: '¡Éxito!', text: 'Contraseña actualizada exitosamente en el servidor.', icon: 'success', background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c' });

    } catch (error) {
        console.warn('Validando contraseña en localStorage...');

        // Validar si la contraseña actual coincide con la almacenada
        if (passwordRegistrada && passwordActual !== passwordRegistrada) {
            Swal.fire({ title: 'Contraseña incorrecta', text: 'La contraseña actual no coincide con nuestros registros.', icon: 'error', background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c' });
            return;
        }

        // Pedir nueva contraseña
        const { value: nuevaPassword } = await Swal.fire({
            title: 'Nueva contraseña',
            text: 'Ingresa tu nueva contraseña (mínimo 8 caracteres):',
            input: 'password',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c',
            showCancelButton: true,
            cancelButtonText: 'Cancelar'
        });

        if (!nuevaPassword) return;

        if (nuevaPassword.length < 8) {
            Swal.fire({ title: 'Atención', text: 'La contraseña debe tener al menos 8 caracteres.', icon: 'warning', background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c' });
            return;
        }

        if (nuevaPassword === passwordActual) {
            Swal.fire({ title: 'Atención', text: 'La nueva contraseña no puede ser igual a la actual.', icon: 'warning', background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c' });
            return;
        }

        // Guardar cambios en localStorage
        userData.password = nuevaPassword;
        localStorage.setItem('userProfile', JSON.stringify(userData));

        const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
        if (localUsers.length > 0) {
            localUsers[localUsers.length - 1].password = nuevaPassword;
            localStorage.setItem('finara_usuarios_local', JSON.stringify(localUsers));
        }

        Swal.fire({
            title: '¡Actualizado!',
            text: 'Tu contraseña ha sido actualizada correctamente en el almacenamiento local.',
            icon: 'success',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
    }
}