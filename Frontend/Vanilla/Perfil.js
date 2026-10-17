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

    // 5. Configuración de Cuenta
    const settingRows = document.querySelectorAll('.setting-row');
    settingRows.forEach((row, idx) => {
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
    if (!window.Swal) return;
    if (index === 0) {
        Swal.fire({
            title: 'Cambiar Contraseña',
            text: 'Módulo de seguridad para cambiar la clave de acceso.',
            icon: 'info',
            background: '#12151c',
            color: '#ffffff',
            confirmButtonColor: '#e5a93c'
        });
    } else {
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

document.addEventListener('DOMContentLoaded', () => {
    initPerfilView();
});