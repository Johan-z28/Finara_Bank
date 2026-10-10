import { initGlobalComponents } from './Global/app.js';
let editando = false;

document.addEventListener('DOMContentLoaded', async () => {
    initGlobalComponents();
    await cargarDatosPerfil();

    const btnEditar = document.querySelector('.btn-edit-profile');
    if (btnEditar) {
        btnEditar.addEventListener('click', toggleModoEdicion);
    }

    configurarBotonesEditarIndividuales();
    configurarBotonesConfiguracion();
    configurarCambioFotoAvatar();
    configurarInteraccionActividad(); // <-- NUEVO: Activa el modal con calendario de actividad
});

async function cargarDatosPerfil() {
    let userData = null;
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
            direccion: "Por definir",
            productosActivos: 3,
            saldoDisponible: "$ 2.450.000",
            fechaCreacion: new Date().toISOString(), // Guardamos fecha de creación para el cálculo de días
            avatar: "../Style/image/profile/avatar-maria.png",
            verificado: true
        };
    }

    // SINCRONIZACIÓN DE DIRECCIÓN: Si tiene tarjetas aprobadas con dirección de envío, usar esa
    let direccionFinal = userData.direccion || "Por definir";
    if (userData.tarjetasAprobadas && userData.tarjetasAprobadas.length > 0) {
        const ultimaTarjeta = userData.tarjetasAprobadas[userData.tarjetasAprobadas.length - 1];
        if (ultimaTarjeta.direccionEnvio) {
            direccionFinal = ultimaTarjeta.direccionEnvio;
            userData.direccion = direccionFinal;
            localStorage.setItem('userProfile', JSON.stringify(userData));
        }
    }

    // CÁLCULO DE DÍAS EN TIEMPO REAL PARA LA ÚLTIMA ACTIVIDAD
    let textoActividad = "Recién registrado";
    if (userData.fechaCreacion) {
        const fechaCreacion = new Date(userData.fechaCreacion);
        const hoy = new Date();
        const diferenciaTiempo = hoy - fechaCreacion;
        const diferenciaDias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

        if (diferenciaDias === 0) {
            textoActividad = "Recién registrado";
        } else if (diferenciaDias === 1) {
            textoActividad = "Creado hace 1 día";
        } else {
            textoActividad = `Creado hace ${diferenciaDias} días`;
        }
    } else {
        // Si es un usuario antiguo sin fecha de creación, se la asignamos hoy
        userData.fechaCreacion = new Date().toISOString();
        localStorage.setItem('userProfile', JSON.stringify(userData));
    }

    const normalizedUser = {
        nombre: userData.nombre || "Usuario",
        rol: userData.rol || "Cliente",
        email: userData.email || userData.correo || "No registrado",
        telefono: userData.telefono || "No registrado",
        direccion: direccionFinal,
        productosActivos: userData.productosActivos ?? (userData.tarjetasAprobadas ? userData.tarjetasAprobadas.length : 0),
        saldoDisponible: userData.saldoDisponible ?? "$ 0",
        ultimaActividad: textoActividad,
        fechaCreacion: userData.fechaCreacion,
        avatar: userData.avatar || "../Style/image/profile/avatar-maria.png",
        verificado: userData.verificado ?? true
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
        const nameH2 = document.getElementById('profileHeroName');
        const roleSpan = document.getElementById('profileHeroRole');
        const avatarImg = document.getElementById('profileAvatarImg');
        const verificationBadge = document.getElementById('verificationStatusBadge');

        if (nameH2) nameH2.textContent = user.nombre;
        if (roleSpan) roleSpan.textContent = user.rol;
        if (avatarImg && user.avatar) avatarImg.src = user.avatar;

        if (verificationBadge) {
            if (user.verificado) {
                verificationBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                verificationBadge.style.border = '1px solid #10B981';
                verificationBadge.style.color = '#34D399';
                verificationBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Cuenta Verificada`;
            } else {
                verificationBadge.style.background = 'rgba(239, 68, 68, 0.15)';
                verificationBadge.style.border = '1px solid #EF4444';
                verificationBadge.style.color = '#F87171';
                verificationBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Cuenta No Verificada`;
            }
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

// NUEVO: Modal emergente con Calendario de inicios de sesión al hacer clic en "Última actividad"
function configurarInteraccionActividad() {
    const accountSummaryCard = document.querySelector('.profile-card.account-summary');
    if (!accountSummaryCard) return;

    const itemsResumen = accountSummaryCard.querySelectorAll('.summary-item');
    if (itemsResumen.length >= 3) {
        const itemActividad = itemsResumen[2]; // El tercer item es Última Actividad
        itemActividad.style.cursor = 'pointer';
        itemActividad.title = 'Haz clic para ver el historial de actividad y calendario';

        itemActividad.addEventListener('click', () => {
            // Generar un calendario HTML simulado de los días del mes actual con accesos registrados
            const fechaActual = new Date();
            const mesAnio = fechaActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            const diaHoy = fechaActual.getDate();

            let diasHtml = '';
            for (let i = 1; i <= 30; i++) {
                let esHoy = i === diaHoy;
                let conAcceso = i <= diaHoy; // Días pasados o el actual con inicio de sesión simulado
                let estilos = `padding: 8px; text-align: center; border-radius: 8px; font-size: 12px;`;

                if (esHoy) {
                    estilos += ` background: #e5a93c; color: #000; font-weight: bold;`;
                } else if (conAcceso) {
                    estilos += ` background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.4);`;
                } else {
                    estilos += ` background: #1a1d24; color: #666;`;
                }
                diasHtml += `<div style="${estilos}">${i}</div>`;
            }

            Swal.fire({
                title: `<strong style="color: #e5a93c; text-transform: capitalize;">Calendario de Sesiones (${mesAnio})</strong>`,
                html: `
                   <div style="text-align: left; color: #b3b3b3; font-size: 13px; margin-bottom: 15px;">
                       <p>Historial de actividad y días con inicio de sesión verificado en la plataforma:</p>
                   </div>
                   <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; background: #0e1015; padding: 15px; border-radius: 12px; border: 1px solid #222630;">
                       <div style="text-align:center; color:#e5a93c; font-weight:bold; font-size:11px;">Lu</div>
                       <div style="text-align:center; color:#e5a93c; font-weight:bold; font-size:11px;">Ma</div>
                       <div style="text-align:center; color:#e5a93c; font-weight:bold; font-size:11px;">Mi</div>
                       <div style="text-align:center; color:#e5a93c; font-weight:bold; font-size:11px;">Ju</div>
                       <div style="text-align:center; color:#e5a93c; font-weight:bold; font-size:11px;">Vi</div>
                       <div style="text-align:center; color:#e5a93c; font-weight:bold; font-size:11px;">Sa</div>
                       <div style="text-align:center; color:#e5a93c; font-weight:bold; font-size:11px;">Do</div>
                       ${diasHtml}
                   </div>
                   <div style="margin-top: 15px; font-size: 11px; color: #888; display: flex; justify-content: space-around;">
                       <span>🟢 Días con acceso</span>
                       <span>🟡 Día actual</span>
                   </div>
               `,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#e5a93c',
                width: '500px'
            });
        });
    }
}

function configurarCambioFotoAvatar() {
    const btnCambiarFoto = document.getElementById('btnCambiarFoto');
    const inputCambiarFoto = document.getElementById('inputCambiarFoto');

    if (!btnCambiarFoto || !inputCambiarFoto) return;

    btnCambiarFoto.addEventListener('click', () => inputCambiarFoto.click());

    inputCambiarFoto.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(uploadEvent) {
            const base64Image = uploadEvent.target.result;

            let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
            userData.avatar = base64Image;
            localStorage.setItem('userProfile', JSON.stringify(userData));

            const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
            if (localUsers.length > 0) {
                localUsers[localUsers.length - 1].avatar = base64Image;
                localStorage.setItem('finara_usuarios_local', JSON.stringify(localUsers));
            }

            cargarDatosPerfil();

            Swal.fire({
                title: '¡Foto actualizada!',
                text: 'Tu imagen de perfil se ha guardado correctamente.',
                icon: 'success',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
        };
        reader.readAsDataURL(file);
    });
}

// Funciones estándar de edición y contraseña (mantienen la estructura previa)
async function toggleModoEdicion() {
    const btnEditar = document.querySelector('.btn-edit-profile');
    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');
    if (!infoRows) return;

    if (!editando) {
        editando = true;
        btnEditar.innerHTML = `<i class="fa-solid fa-check"></i> Guardar cambios`;
        btnEditar.style.backgroundColor = '#10B981';

        infoRows.forEach(row => {
            const strong = row.querySelector('strong');
            const textoActual = strong.textContent;
            const campoId = getCampoId(row);
            strong.innerHTML = `<input type="text" class="input-edit-perfil" data-campo="${campoId}" value="${textoActual}" style="background: #222; color: #fff; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; width: 100%;">`;
        });
    } else {
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

        if (!confirmacion.isConfirmed) return;

        const nuevosDatos = {};
        let hayCamposVacios = false;

        infoRows.forEach(row => {
            const input = row.querySelector('input');
            if (input) {
                const campo = input.dataset.campo;
                const valor = input.value.trim();
                if (valor === '') hayCamposVacios = true;
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
            return;
        }

        let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
        userData.nombre = nuevosDatos.nombre || userData.nombre;
        userData.email = nuevosDatos.correo || userData.email;
        userData.telefono = nuevosDatos.telefono || userData.telefono;
        userData.direccion = nuevosDatos.direccion || userData.direccion;

        localStorage.setItem('userProfile', JSON.stringify(userData));

        btnEditar.innerHTML = `<i class="fa-solid fa-pen"></i> Editar perfil`;
        btnEditar.style.backgroundColor = '';
        editando = false;

        Swal.fire({
            title: '¡Actualizado!',
            text: 'Tus datos se han guardado correctamente.',
            icon: 'success',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });

        cargarDatosPerfil();
    }
}

function getCampoId(row) {
    const label = row.querySelector('span').textContent.toLowerCase();
    if (label.includes('nombre')) return 'nombre';
    if (label.includes('correo')) return 'correo';
    if (label.includes('teléfono')) return 'telefono';
    if (label.includes('dirección')) return 'direccion';
    return '';
}

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

            const { value: nuevoValor } = await Swal.fire({
                title: titulosModal[campoId] || 'Editar campo',
                input: 'text',
                inputValue: valorActual,
                showCancelButton: true,
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Cancelar',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c',
                cancelButtonColor: '#d33',
                inputValidator: (value) => {
                    if (!value || value.trim() === '') return '¡El campo no puede estar vacío!';
                    if (campoId === 'correo') {
                        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!regexCorreo.test(value.trim())) return 'Por favor ingresa un correo electrónico válido.';
                    }
                }
            });

            if (nuevoValor) {
                const valorLimpio = nuevoValor.trim();
                let userData = JSON.parse(localStorage.getItem('userProfile')) || {};

                if (campoId === 'correo') {
                    userData.email = valorLimpio;
                } else {
                    userData[campoId] = valorLimpio;
                }
                localStorage.setItem('userProfile', JSON.stringify(userData));

                const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
                if (localUsers.length > 0) {
                    localUsers[localUsers.length - 1][campoId === 'correo' ? 'email' : campoId] = valorLimpio;
                    localUsers[localUsers.length - 1][campoId] = valorLimpio;
                    localStorage.setItem('finara_usuarios_local', JSON.stringify(localUsers));
                }

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

function configurarBotonesConfiguracion() {
    const settingRows = document.querySelectorAll('.profile-card')[1]?.querySelectorAll('.setting-row');
    if (!settingRows) return;

    settingRows.forEach((row, index) => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', async () => {
            if (index === 0) {
                await cambiarContraseñaFácil();
            } else {
                Swal.fire({
                    title: 'Sección en desarrollo',
                    text: 'Esta opción estará disponible próximamente.',
                    icon: 'info',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
            }
        });
    });
}

async function cambiarContraseñaFácil() {
    const { value: passwordActual } = await Swal.fire({
        title: 'Cambiar contraseña',
        text: 'Ingresa tu contraseña actual:',
        input: 'password',
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });
    if (!passwordActual) return;

    let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
    let passwordRegistrada = userData.password;
    if (!passwordRegistrada) {
        const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
        if (localUsers.length > 0) passwordRegistrada = localUsers[localUsers.length - 1].password;
    }

    if (passwordRegistrada && passwordActual !== passwordRegistrada) {
        Swal.fire({ title: 'Contraseña incorrecta', text: 'La contraseña actual no coincide.', icon: 'error', background: '#12151c', color: '#ffffff', confirmButtonColor: '#e5a93c' });
        return;
    }

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

    userData.password = nuevaPassword;
    localStorage.setItem('userProfile', JSON.stringify(userData));

    const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
    if (localUsers.length > 0) {
        localUsers[localUsers.length - 1].password = nuevaPassword;
        localStorage.setItem('finara_usuarios_local', JSON.stringify(localUsers));
    }

    Swal.fire({
        title: '¡Actualizado!',
        text: 'Tu contraseña ha sido actualizada correctamente.',
        icon: 'success',
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c'
    });
}