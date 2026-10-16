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
    configurarNavegacionProductos();
    configurarModalAyudaChat();
    configurarNavegacionSaldos();
    configurarModalLimitesSeguridad();
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
            }
            else if (index === 2) {
                // Índice 2: Métodos de autenticación
                let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
                let estaVerificado = userData.verificado;
                if (estaVerificado === undefined) {
                    const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
                    if (localUsers.length > 0) {
                        estaVerificado = localUsers[localUsers.length - 1].verificado ?? true;
                    } else {
                        estaVerificado = true;
                    }
                }

                if (estaVerificado) {
                    await Swal.fire({
                        title: '<strong style="color: #34D399;">Cuenta Autenticada</strong>',
                        html: `
                           <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 10px 0;">
                               <i class="fa-solid fa-circle-check" style="font-size: 50px; color: #34D399;"></i>
                               <p style="color: #c9cbd0; font-size: 14px; text-align: center; margin: 0;">
                                   Tu cuenta ya se encuentra <strong>autenticada y protegida</strong> bajo los estándares de seguridad de Finara Bank.
                               </p>
                           </div>
                       `,
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#e5a93c',
                        width: '430px'
                    });
                } else {
                    await Swal.fire({
                        title: '<strong style="color: #EF4444;">Autenticación Requerida</strong>',
                        html: `
                           <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 10px 0;">
                               <i class="fa-solid fa-triangle-exclamation" style="font-size: 50px; color: #EF4444;"></i>
                               <p style="color: #c9cbd0; font-size: 14px; text-align: center; margin: 0;">
                                   Tu cuenta no cuenta con verificación activa. Por favor, <strong>comunícate con el banco</strong> para validar tu identidad.
                               </p>
                           </div>
                       `,
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#e5a93c',
                        width: '430px'
                    });
                }
            }
            else if (index === 3) {
                // Índice 3: Privacidad y datos (Técnico y corporativo)
                await Swal.fire({
                    title: '<strong style="color: #e5a93c;">Privacidad y Seguridad de Datos</strong>',
                    html: `
                       <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 10px 0; text-align: left;">
                           <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                               <i class="fa-solid fa-shield-halved" style="font-size: 22px; color: #34D399;"></i>
                               <span style="color: #e9e9eb; font-size: 13px;">Gestión de identidad mediante protocolos <strong>UUID</strong>.</span>
                           </div>
                           <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                               <i class="fa-solid fa-key" style="font-size: 22px; color: #e5a93c;"></i>
                               <span style="color: #e9e9eb; font-size: 13px;">Hashing de credenciales protegido con <strong>bcrypt</strong>.</span>
                           </div>
                           <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                               <i class="fa-solid fa-database" style="font-size: 22px; color: #34D399;"></i>
                               <span style="color: #e9e9eb; font-size: 13px;">Prevención y seguridad contra <strong>Inyección SQL</strong>.</span>
                           </div>
                           <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                               <i class="fa-solid fa-lock" style="font-size: 22px; color: #e5a93c;"></i>
                               <span style="color: #e9e9eb; font-size: 13px;">Cifrado de transacciones bajo estandares <strong>AES-256 bits</strong>.</span>
                           </div>
                       </div>
                   `,
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonText: 'Cerrar',
                    confirmButtonColor: '#e5a93c',
                    width: '480px'
                });
            }
            else {
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

// NUEVO: Redirigir al hacer clic en "Productos activos"
function configurarNavegacionProductos() {
    const accountSummaryCard = document.querySelector('.profile-card.account-summary');
    if (!accountSummaryCard) return;
    const itemsResumen = accountSummaryCard.querySelectorAll('.summary-item');
    if (itemsResumen.length >= 1) {
        const itemProductos = itemsResumen[0]; // El primer item es Productos activos
        itemProductos.style.cursor = 'pointer';
        itemProductos.title = 'Haz clic para solicitar o gestionar tus productos';
        itemProductos.addEventListener('click', () => {
            window.location.href = 'solicitudTarjeta.html';
        });
    }
}

// NUEVO: Modal emergente con SVG animado para "¿Necesitas ayuda?"
function configurarModalAyudaChat() {
    const bottomCards = document.querySelectorAll('.bottom-card');
    if (!bottomCards || bottomCards.length < 2) return;

    const tarjetaAyuda = bottomCards[1]; // La segunda tarjeta es "¿Necesitas ayuda?"
    const btnAyuda = tarjetaAyuda.querySelector('button');

    if (btnAyuda) {
        btnAyuda.addEventListener('click', () => {
            Swal.fire({
                title: '<strong style="color: #e5a93c;">Chat Interactivo</strong>',
                html: `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; padding: 10px 0;">
                        <!-- SVG Animado de engranaje/construcción corporativo en tonos dorados -->
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <style>
                                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }
                                .rotating-gear { animation: spin 4s linear infinite; transform-origin: center; }
                                .pulsing-icon { animation: pulse 2s ease-in-out infinite; transform-origin: center; }
                            </style>
                            <path class="pulsing-icon" d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#e5a93c"/>
                            <path class="rotating-gear" d="M19.14 12.94C19.18 12.64 19.2 12.32 19.2 12C19.2 11.68 19.18 11.36 19.14 11.06L21.16 9.43C21.34 9.28 21.39 9.03 21.28 8.82L19.38 5.53C19.27 5.32 19.02 5.24 18.8 5.32L16.39 6.29C15.89 5.91 15.34 5.59 14.74 5.35L14.37 2.78C14.34 2.55 14.15 2.38 13.92 2.38H10.08C9.85 2.38 9.66 2.55 9.63 2.78L9.26 5.35C8.66 5.59 8.11 5.91 7.61 6.29L5.2 5.32C4.98 5.24 4.73 5.32 4.62 5.53L2.72 8.82C2.61 9.03 2.66 9.28 2.84 9.43L4.86 11.06C4.82 11.36 4.8 11.68 4.8 12C4.8 12.32 4.82 12.64 4.86 12.94L2.84 14.57C2.66 14.72 2.61 14.97 2.72 15.18L4.62 18.47C4.73 18.68 4.98 18.76 5.2 18.68L7.61 17.71C8.11 18.09 8.66 18.41 9.26 18.65L9.63 21.22C9.66 21.45 9.85 21.62 10.08 21.62H13.92C14.15 21.62 14.34 21.45 14.37 21.22L14.74 18.65C15.34 18.41 15.89 18.09 16.39 17.71L18.8 18.68C19.02 18.76 19.27 18.68 19.38 18.47L21.28 15.18C21.39 14.97 21.34 14.72 21.16 14.57L19.14 12.94ZM12 15.6C10.01 15.6 8.4 13.99 8.4 12C8.4 10.01 10.01 8.4 12 8.4C13.99 8.4 15.6 10.01 15.6 12C15.6 13.99 13.99 15.6 12 15.6Z" fill="#d4982b" opacity="0.3"/>
                        </svg>
                        <p style="color: #c9cbd0; font-size: 14px; text-align: center; margin: 0;">
                            ¡Estamos trabajando para ti! El módulo de <strong>chat interactivo</strong> se encuentra actualmente en desarrollo y construcción. Próximamente podrás recibir asistencia en tiempo real.
                        </p>
                    </div>
                `,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#e5a93c',
                width: '440px'
            });
        });
    }
}

// NUEVO: Redirigir al hacer clic en "Saldo disponible"
function configurarNavegacionSaldos() {
    const accountSummaryCard = document.querySelector('.profile-card.account-summary');
    if (!accountSummaryCard) return;
    const itemsResumen = accountSummaryCard.querySelectorAll('.summary-item');
    if (itemsResumen.length >= 2) {
        const itemSaldo = itemsResumen[1]; // El segundo item es "Saldo disponible"
        itemSaldo.style.cursor = 'pointer';
        itemSaldo.title = 'Haz clic para consultar tus saldos detallados';
        itemSaldo.addEventListener('click', () => {
            window.location.href = 'Saldos.html';
        });
    }
}

// NUEVO: Alerta informativa para "Límites y seguridad"
function configurarModalLimitesSeguridad() {
    const bottomCards = document.querySelectorAll('.bottom-card');
    if (!bottomCards || bottomCards.length < 1) return;

    const tarjetaSeguridad = bottomCards[0]; // La primera tarjeta es "Límites y seguridad"
    const btnSeguridad = tarjetaSeguridad.querySelector('button');

    if (btnSeguridad) {
        btnSeguridad.addEventListener('click', () => {
            Swal.fire({
                title: '<strong style="color: #e5a93c;">Límites y Seguridad</strong>',
                html: `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 10px 0;">
                        <i class="fa-solid fa-shield-halved" style="font-size: 50px; color: #e5a93c;"></i>
                        <p style="color: #c9cbd0; font-size: 14px; text-align: center; margin: 0;">
                            La gestión y configuración de <strong>topes de transacción y límites de seguridad</strong> se implementará próximamente en una futura actualización de la plataforma.
                        </p>
                    </div>
                `,
                background: '#12151c',
                color: '#ffffff',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#e5a93c',
                width: '430px'
            });
        });
    }
}