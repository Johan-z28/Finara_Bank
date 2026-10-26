// Vanilla/Perfil.js
import { obtenerCuentas } from './cuentasService.js';

let editando = false;

export async function initPerfilView() {
    await cargarDatosPerfil();
    vincularEventosPerfil();
}

async function cargarDatosPerfil() {
    let userData = null;
    let storedData = localStorage.getItem('userProfile');

    if (storedData) {
        try {
            userData = JSON.parse(storedData);
        } catch (e) {
            console.error("Error al parsear userProfile:", e);
        }
    } else {
        const localUsers = JSON.parse(localStorage.getItem('finara_usuarios_local'));
        if (localUsers && localUsers.length > 0) {
            userData = localUsers[localUsers.length - 1];
        }
    }

    if (!userData) {
        userData = {
            nombre: "Johan Zapata",
            rol: "Cliente",
            email: "jzapata12345@cesde.net",
            telefono: "3042020579",
            direccion: "Por definir",
            fechaCreacion: new Date().toISOString(),
            avatar: "../Style/image/profile/avatar-maria.png",
            verificado: true
        };
    }

    // Sincronización de Dirección
    let direccionFinal = userData.direccion || "Por definir";
    if (userData.tarjetasAprobadas && userData.tarjetasAprobadas.length > 0) {
        const ultimaTarjeta = userData.tarjetasAprobadas[userData.tarjetasAprobadas.length - 1];
        if (ultimaTarjeta.direccionEnvio) {
            direccionFinal = ultimaTarjeta.direccionEnvio;
            userData.direccion = direccionFinal;
            localStorage.setItem('userProfile', JSON.stringify(userData));
        }
    }

    // Obtener cuentas reales activas
    let cuentasReales = [];
    try {
        cuentasReales = await obtenerCuentas();
    } catch {
        cuentasReales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    }

    const cantidadProductos = cuentasReales.filter(c => c && c.estado !== 'INACTIVA' && c.estado !== 'CANCELADA').length;

    // Calcular Saldo Disponible Total
    const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const saldoTotal = cuentasReales.reduce((acc, c) => {
        const s = typeof c.saldo === 'number' ? c.saldo : Number(String(c.saldo || 0).replace(/[^0-9.-]+/g, ""));
        return acc + (isNaN(s) ? 0 : s);
    }, 0);

    const normalizedUser = {
        nombre: userData.nombre || "Usuario",
        rol: userData.rol || "Cliente",
        email: userData.email || userData.correo || "No registrado",
        telefono: userData.telefono || "No registrado",
        direccion: direccionFinal,
        productosActivos: cantidadProductos,
        saldoDisponible: formatoCOP.format(saldoTotal),
        avatar: userData.avatar || "../Style/image/profile/avatar-maria.png",
        verificado: userData.verificado ?? true
    };

    renderizarPerfil(normalizedUser);
}

function renderizarPerfil(user) {
    const greetingName = document.getElementById('greetingName');
    if (greetingName && user.nombre) {
        greetingName.textContent = user.nombre;
    }

    const nameH2 = document.getElementById('profileHeroName');
    const roleSpan = document.getElementById('profileHeroRole');
    const avatarImg = document.getElementById('profileAvatarImg');
    const verificationBadge = document.getElementById('verificationStatusBadge');
    
    // Sincronizar también con el avatar del Navbar superior
    const navbarAvatarImg = document.getElementById('navbarAvatarImg');

    if (nameH2) nameH2.textContent = user.nombre;
    if (roleSpan) roleSpan.textContent = user.rol;
    if (avatarImg && user.avatar) avatarImg.src = user.avatar;
    if (navbarAvatarImg && user.avatar) navbarAvatarImg.src = user.avatar;

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
        if (strongElements.length >= 2) {
            strongElements[0].textContent = user.productosActivos;
            strongElements[1].textContent = user.saldoDisponible;
        }
    }
}

function vincularEventosPerfil() {
    // 1. Botón Editar Perfil
    const btnEditProfile = document.querySelector('.btn-edit-profile');
    if (btnEditProfile) {
        btnEditProfile.onclick = async (e) => {
            e.preventDefault();
            await toggleModoEdicion();
        };
    }

    // 2. Cambiar Foto / Cámara
    const btnCambiarFoto = document.getElementById('btnCambiarFoto');
    const inputFoto = document.getElementById('inputCambiarFoto');
    if (btnCambiarFoto && inputFoto) {
        btnCambiarFoto.onclick = (e) => {
            e.preventDefault();
            inputFoto.click();
        };
        inputFoto.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(uploadEvent) {
                const base64Image = uploadEvent.target.result;
                let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
                userData.avatar = base64Image;
                localStorage.setItem('userProfile', JSON.stringify(userData));
                cargarDatosPerfil();
            };
            reader.readAsDataURL(file);
        };
    }

    // 3. Clic en Productos Activos o Saldo Disponible para ir a Saldos
    const summaryItems = document.querySelectorAll('.profile-card.account-summary .summary-item');
    summaryItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.onclick = () => {
            const linkSaldos = document.querySelector('[data-view="saldos"]');
            if (linkSaldos) linkSaldos.click();
        };
    });

    // 4. Botones de edición individual (Lápices)
    const infoRows = document.querySelectorAll('.info-row');
    infoRows.forEach(row => {
        const btnRow = row.querySelector('button');
        if (btnRow) {
            btnRow.onclick = async (e) => {
                e.preventDefault();
                await editarCampoIndividual(row);
            };
        }
    });

    // 5. Configuración de Cuenta (Cambiar contraseña, Notificaciones, etc.)
    const settingRows = document.querySelectorAll('.setting-row, .setting-item');
    settingRows.forEach((row, idx) => {
        row.style.cursor = 'pointer';
        row.onclick = async (e) => {
            e.preventDefault();
            await manejarOpcionConfiguracion(idx);
        };
    });

    // 6. Botones de Tarjetas Inferiores
    const bottomButtons = document.querySelectorAll('.bottom-card button');
    bottomButtons.forEach((btn, idx) => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (window.Swal) {
                Swal.fire({
                    title: idx === 0 ? 'Límites y Seguridad' : 'Soporte Finara Bank',
                    text: 'Este módulo se encuentra en desarrollo.',
                    icon: 'info',
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c'
                });
            }
        };
    });
}

async function toggleModoEdicion() {
    const btnEditar = document.querySelector('.btn-edit-profile');
    const infoRows = document.querySelectorAll('.profile-card')[0]?.querySelectorAll('.info-row');
    if (!infoRows || !btnEditar) return;

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
        if (window.Swal) {
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
        }

        const nuevosDatos = {};
        infoRows.forEach(row => {
            const input = row.querySelector('input');
            if (input) {
                nuevosDatos[input.dataset.campo] = input.value.trim();
            }
        });

        let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
        userData.nombre = nuevosDatos.nombre || userData.nombre;
        userData.email = nuevosDatos.correo || userData.email;
        userData.telefono = nuevosDatos.telefono || userData.telefono;
        userData.direccion = nuevosDatos.direccion || userData.direccion;

        localStorage.setItem('userProfile', JSON.stringify(userData));

        btnEditar.innerHTML = `<i class="fa-solid fa-pen"></i> Editar perfil`;
        btnEditar.style.backgroundColor = '';
        editando = false;

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

async function editarCampoIndividual(row) {
    if (!row || !window.Swal) return;
    const spanLabel = row.querySelector('span').textContent;
    const strongVal = row.querySelector('strong');
    const valorActual = strongVal.textContent.trim();
    const campoId = getCampoId(row);
    if (!campoId) return;

    const { value: nuevoValor } = await Swal.fire({
        title: `Editar ${spanLabel}`,
        input: 'text',
        inputValue: valorActual,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        background: '#12151c',
        color: '#ffffff',
        confirmButtonColor: '#e5a93c'
    });

    if (nuevoValor && nuevoValor.trim()) {
        let userData = JSON.parse(localStorage.getItem('userProfile')) || {};
        userData[campoId === 'correo' ? 'email' : campoId] = nuevoValor.trim();
        localStorage.setItem('userProfile', JSON.stringify(userData));
        cargarDatosPerfil();
    }
}

async function manejarOpcionConfiguracion(index) {
    if (index === 0) {
        const userData = JSON.parse(localStorage.getItem('userProfile')) || {};
        mostrarModalCambiarContrasena(userData);
    } else {
        if (window.Swal) {
            Swal.fire({
                title: 'Configuración de Cuenta',
                text: 'Esta opción estará disponible próximamente.',
                icon: 'info',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
        }
    }
}

function mostrarModalCambiarContrasena(usuario) {
    const modalExistente = document.getElementById("modalCambiarPasswordFinara");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.id = "modalCambiarPasswordFinara";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(5, 7, 10, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1.5rem;
    `;

    overlay.innerHTML = `
        <div style="background: #11141b; border: 1px solid rgba(229,169,60,0.4); border-radius: 16px; padding: 2rem; max-width: 420px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); color: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.4rem;">
                <h3 style="margin: 0; font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-lock" style="color: #e5a93c;"></i> Cambiar Contraseña
                </h3>
                <button type="button" id="btnCerrarModalPass" style="background: none; border: none; color: #8a8f99; font-size: 1.2rem; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <form id="formCambiarPassword" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 0.4rem;">Contraseña Actual</label>
                    <input type="password" id="passActual" placeholder="Ingresa tu contraseña actual" required
                        style="width: 100%; padding: 0.75rem; background: #1b202c; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.9rem; box-sizing: border-box; outline: none;">
                </div>

                <div>
                    <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 0.4rem;">Nueva Contraseña</label>
                    <input type="password" id="passNueva" placeholder="Mínimo 6 caracteres" minlength="6" required
                        style="width: 100%; padding: 0.75rem; background: #1b202c; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.9rem; box-sizing: border-box; outline: none;">
                </div>

                <div>
                    <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 0.4rem;">Confirmar Nueva Contraseña</label>
                    <input type="password" id="passConfirmacion" placeholder="Repite la nueva contraseña" minlength="6" required
                        style="width: 100%; padding: 0.75rem; background: #1b202c; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.9rem; box-sizing: border-box; outline: none;">
                </div>

                <button type="submit" style="background: linear-gradient(135deg, #e5a93c 0%, #b8860b 100%); color: #0a0c10; border: none; padding: 0.85rem; border-radius: 8px; font-weight: 700; cursor: pointer; margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(229, 169, 60, 0.3);">
                    <i class="fa-solid fa-key"></i> Actualizar Contraseña
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const cerrar = () => overlay.remove();
    overlay.querySelector("#btnCerrarModalPass").addEventListener("click", cerrar);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrar();
    });

    overlay.querySelector("#formCambiarPassword").addEventListener("submit", (e) => {
        e.preventDefault();
        
        const actual = document.getElementById("passActual").value;
        const nueva = document.getElementById("passNueva").value;
        const confirmacion = document.getElementById("passConfirmacion").value;

        const passGuardada = usuario ? (usuario.password || usuario.contrasena || "123456") : "123456";

        if (actual !== passGuardada) {
            Swal.fire({
                icon: 'error',
                title: 'Contraseña Incorrecta',
                text: 'La contraseña actual no coincide con tus registros.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        if (nueva !== confirmacion) {
            Swal.fire({
                icon: 'warning',
                title: 'Las contraseñas no coinciden',
                text: 'La nueva contraseña y su confirmación deben ser idénticas.',
                background: '#12151c',
                color: '#ffffff',
                confirmButtonColor: '#e5a93c'
            });
            return;
        }

        let userProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
        userProfile.password = nueva;
        userProfile.contrasena = nueva;
        localStorage.setItem("userProfile", JSON.stringify(userProfile));

        let listaUsuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        const correoUser = usuario ? (usuario.correo || usuario.email || usuario.username) : '';

        listaUsuarios = listaUsuarios.map(u => {
            if (u.correo === correoUser || u.username === correoUser) {
                u.password = nueva;
                u.contrasena = nueva;
            }
            return u;
        });
        localStorage.setItem("finara_usuarios_local", JSON.stringify(listaUsuarios));

        cerrar();

        Swal.fire({
            icon: 'success',
            title: '¡Contraseña Actualizada!',
            text: 'Tu contraseña ha sido modificada con éxito.',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initPerfilView();
});