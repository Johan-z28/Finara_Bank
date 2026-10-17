// Exportar para que app.js lo importe en la SPA
export async function initAdminView() {
    vincularModalesAdmin();
}

function vincularModalesAdmin() {
    // 1. Comportamiento del Sidebar
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (collapseBtn && sidebar && mainWrapper) {
        collapseBtn.onclick = () => {
            sidebar.classList.toggle('collapsed');
            mainWrapper.classList.toggle('expanded');
        };
    }
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.onclick = () => {
            sidebar.classList.toggle('open');
        };
    }

    // ==========================================
    // 2. LÓGICA DEL MODAL DE CREATE
    // ==========================================
    const modal = document.getElementById('adminModal');
    const btnOpenCreate = document.querySelector('[data-accion="Create"]');
    const btnCloseModal = document.getElementById('closeAdminModal');
    const listaPendientesContainer = document.getElementById('usuariosPendientesList');
    const detalleContainer = document.getElementById('detalleUsuarioContainer');

    if (btnOpenCreate && modal) {
        btnOpenCreate.onclick = () => {
            modal.classList.add('active');
            renderizarFormularioCreacion();
        };
    }

    if (btnCloseModal && modal) {
        btnCloseModal.onclick = () => {
            modal.classList.remove('active');
        };
    }

    function renderizarFormularioCreacion() {
        if (!listaPendientesContainer || !detalleContainer) return;

        listaPendientesContainer.innerHTML = `
           <div style="padding: 1rem; color: var(--text-muted); font-size: 0.9rem;">
               <h4 style="color: var(--gold-main); margin-bottom: 0.5rem;"><i class="fa-solid fa-user-plus"></i> Alta Directa</h4>
               <p>Completa los campos obligatorios para registrar un nuevo usuario en el sistema con estado activo de inmediato.</p>
           </div>
       `;

        detalleContainer.innerHTML = `
           <div class="detalle-info-card" style="max-height: 480px; overflow-y: auto; padding-right: 5px;">
               <h4 style="margin-bottom: 1rem;">Formulario de Nuevo Usuario</h4>
               <form id="formCrearUsuarioAdmin" style="display: flex; flex-direction: column; gap: 0.8rem;">
                   <div>
                       <label style="font-size: 0.8rem; color: var(--text-muted);">Nombre Completo *</label>
                       <input type="text" id="adminNuevoNombre" placeholder="Ej. Carlos Pérez" style="width: 100%; margin: 0; background: #0a0c10; color: #fff; border: 1px solid var(--border-dark); padding: 0.6rem; border-radius: 8px;" required>
                   </div>
                   <div>
                       <label style="font-size: 0.8rem; color: var(--text-muted);">Correo Electrónico *</label>
                       <input type="email" id="adminNuevoCorreo" placeholder="Ej. carlos@email.com" style="width: 100%; margin: 0; background: #0a0c10; color: #fff; border: 1px solid var(--border-dark); padding: 0.6rem; border-radius: 8px;" required>
                   </div>
                   <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                       <div>
                           <label style="font-size: 0.8rem; color: var(--text-muted);">Tipo Documento</label>
                           <select id="adminNuevoTipoDoc" style="width: 100%; background: #0a0c10; color: #fff; border: 1px solid var(--border-dark); padding: 0.6rem; border-radius: 8px;">
                               <option value="CC">Cédula de Ciudadanía</option>
                               <option value="CE">Cédula de Extranjería</option>
                               <option value="Pasaporte">Pasaporte</option>
                           </select>
                       </div>
                       <div>
                           <label style="font-size: 0.8rem; color: var(--text-muted);">Nro Documento *</label>
                           <input type="text" id="adminNuevoDoc" placeholder="Ej. 1023456789" style="width: 100%; background: #0a0c10; color: #fff; border: 1px solid var(--border-dark); padding: 0.6rem; border-radius: 8px;" required>
                       </div>
                   </div>
                   <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                       <div>
                           <label style="font-size: 0.8rem; color: var(--text-muted);">Usuario (@) *</label>
                           <input type="text" id="adminNuevoUsername" placeholder="Ej. carlos_p" style="width: 100%; background: #0a0c10; color: #fff; border: 1px solid var(--border-dark); padding: 0.6rem; border-radius: 8px;" required>
                       </div>
                       <div>
                           <label style="font-size: 0.8rem; color: var(--text-muted);">Contraseña *</label>
                           <input type="password" id="adminNuevoPassword" placeholder="Mínimo 8 caracteres" style="width: 100%; background: #0a0c10; color: #fff; border: 1px solid var(--border-dark); padding: 0.6rem; border-radius: 8px;" required>
                       </div>
                   </div>
                   <button type="submit" class="btn-aprobar" style="margin-top: 1rem; width: 100%;">
                       <i class="fa-solid fa-check"></i> Registrar Usuario
                   </button>
               </form>
           </div>
       `;

        const form = document.getElementById('formCrearUsuarioAdmin');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                ejecutarCreacionUsuarioAdmin();
            };
        }
    }

    function ejecutarCreacionUsuarioAdmin() {
        const nombre = document.getElementById('adminNuevoNombre').value.trim();
        const correo = document.getElementById('adminNuevoCorreo').value.trim();
        const tipoDocumento = document.getElementById('adminNuevoTipoDoc').value;
        const documento = document.getElementById('adminNuevoDoc').value.trim();
        const username = document.getElementById('adminNuevoUsername').value.trim();
        const password = document.getElementById('adminNuevoPassword').value;

        if (password.length < 8) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseña muy corta',
                text: 'La contraseña debe tener al menos 8 caracteres.',
                background: '#12161f',
                color: '#fff',
                confirmButtonColor: '#d4af37'
            });
            return;
        }

        let usuariosLocales = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];

        if (usuariosLocales.some(u => u.correo === correo)) {
            Swal.fire({ icon: 'error', title: 'Correo en uso', text: 'Este correo ya se encuentra registrado.', background: '#12161f', color: '#fff', confirmButtonColor: '#ef4444' });
            return;
        }
        if (usuariosLocales.some(u => u.username === username)) {
            Swal.fire({ icon: 'error', title: 'Usuario no disponible', text: 'El nombre de usuario ya está ocupado.', background: '#12161f', color: '#fff', confirmButtonColor: '#ef4444' });
            return;
        }

        const nuevoUsuario = {
            nombre,
            correo,
            tipoDocumento,
            documento,
            telefono: "Por definir",
            fecha: new Date().toISOString().split('T')[0],
            username,
            password,
            direccion: "Por definir",
            rol: "Cliente",
            productosActivos: 0,
            saldoDisponible: "$ 0",
            ultimaActividad: "Creado por Administrador",
            avatar: "../../Style/image/profile/avatarDefault.png",
            verificado: true,
            tarjetasAprobadas: [],
            cuentas: []
        };

        usuariosLocales.push(nuevoUsuario);
        localStorage.setItem("finara_usuarios_local", JSON.stringify(usuariosLocales));

        Swal.fire({
            icon: 'success',
            title: '¡Usuario Creado Exitosamente!',
            text: `El usuario @${username} ha sido registrado y activado en el sistema.`,
            background: '#12161f',
            color: '#fff',
            confirmButtonColor: '#d4af37'
        }).then(() => {
            modal.classList.remove('active');
        });
    }

    // ==========================================
    // 3. LÓGICA DEL MODAL DE READ
    // ==========================================
    const readModal = document.getElementById('adminReadModal');
    const btnOpenRead = document.querySelector('[data-accion="Read"]');
    const btnCloseReadModal = document.getElementById('closeAdminReadModal');

    if (btnOpenRead && readModal) {
        btnOpenRead.onclick = () => {
            readModal.classList.add('active');
            cargarTodosLosUsuarios();
        };
    }
    if (btnCloseReadModal && readModal) {
        btnCloseReadModal.onclick = () => {
            readModal.classList.remove('active');
        };
    }

    function cargarTodosLosUsuarios() {
        const listaReadContainer = document.getElementById('usuariosReadList');
        const detalleReadContainer = document.getElementById('detalleReadContainer');
        if (!listaReadContainer || !detalleReadContainer) return;

        listaReadContainer.innerHTML = '';
        detalleReadContainer.innerHTML = `
          <div class="placeholder-detalle">
              <i class="fa-solid fa-id-card"></i>
              <p>Selecciona un usuario de la lista para ver sus datos y opciones de gestión.</p>
          </div>
      `;
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        if (usuarios.length === 0) {
            listaReadContainer.innerHTML = `<p class="empty-list-text">No hay usuarios registrados en el sistema.</p>`;
            return;
        }
        usuarios.forEach((user, index) => {
            const card = document.createElement('div');
            card.className = 'usuario-item-card';
            const estaVerificado = user.verificado === true;
            const badgeClass = estaVerificado ? 'verificado' : 'pendiente';
            const badgeText = estaVerificado ? 'Verificado' : 'Pendiente';
            card.innerHTML = `
              <h5>${user.nombre}</h5>
              <span>@${user.username} - ${user.correo}</span>
              <div><span class="badge-status ${badgeClass}">${badgeText}</span></div>
          `;
            card.onclick = () => {
                document.querySelectorAll('#usuariosReadList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarDatosCompletosUsuario(user, index);
            };
            listaReadContainer.appendChild(card);
        });
    }

    function mostrarDatosCompletosUsuario(user, index) {
        const detalleReadContainer = document.getElementById('detalleReadContainer');
        const estaVerificado = user.verificado === true;
        detalleReadContainer.innerHTML = `
          <div class="detalle-info-card">
              <h4>Datos Completos del Usuario</h4>
              <p><strong>Nombre:</strong> ${user.nombre}</p>
              <p><strong>Username:</strong> @${user.username}</p>
              <p><strong>Correo:</strong> ${user.correo}</p>
              <p><strong>Tipo Documento:</strong> ${user.tipoDocumento || 'No registrado'}</p>
              <p><strong>Nro Documento:</strong> ${user.documento || 'No registrado'}</p>
              <p><strong>Teléfono:</strong> ${user.telefono || 'No registrado'}</p>
              <p><strong>Estado:</strong> ${estaVerificado ? 'Verificado (Activo)' : 'Pendiente de validación'}</p>
              <p><strong>Rol:</strong> ${user.rol || 'Cliente'}</p>
              <h4 style="margin-top: 1rem;">Opciones de Gestión</h4>
              <div class="acciones-derivadas-container">
                  <button class="btn-derivar" id="btnIrUpdate">
                      <i class="fa-solid fa-user-pen"></i> Derivar a Update (Modificar datos)
                  </button>
                  <button class="btn-derivar" id="btnIrDelete" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                      <i class="fa-solid fa-user-xmark"></i> Derivar a Delete (Depuración)
                  </button>
              </div>
          </div>
      `;
        document.getElementById('btnIrUpdate').onclick = () => {
            readModal.classList.remove('active');
            updateModal.classList.add('active');
            cargarUsuariosUpdate();
        };
        document.getElementById('btnIrDelete').onclick = () => {
            readModal.classList.remove('active');
            deleteModal.classList.add('active');
            cargarUsuariosDelete();
        };
    }

    // ==========================================
    // 4. LÓGICA DEL MODAL DE UPDATE
    // ==========================================
    const updateModal = document.getElementById('adminUpdateModal');
    const btnOpenUpdate = document.querySelector('[data-accion="Update"]');
    const btnCloseUpdateModal = document.getElementById('closeAdminUpdateModal');

    if (btnOpenUpdate && updateModal) {
        btnOpenUpdate.onclick = () => {
            updateModal.classList.add('active');
            cargarUsuariosUpdate();
        };
    }
    if (btnCloseUpdateModal && updateModal) {
        btnCloseUpdateModal.onclick = () => {
            updateModal.classList.remove('active');
        };
    }

    function cargarUsuariosUpdate() {
        const listaUpdateContainer = document.getElementById('usuariosUpdateList');
        const detalleUpdateContainer = document.getElementById('detalleUpdateContainer');
        if (!listaUpdateContainer || !detalleUpdateContainer) return;

        listaUpdateContainer.innerHTML = '';
        detalleUpdateContainer.innerHTML = `
          <div class="placeholder-detalle" style="text-align: center; margin: auto;">
              <i class="fa-solid fa-user-pen"></i>
              <p>Selecciona un usuario de la izquierda para modificar su información personal.</p>
          </div>
      `;
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        if (usuarios.length === 0) {
            listaUpdateContainer.innerHTML = `<p class="empty-list-text">No hay usuarios registrados.</p>`;
            return;
        }
        usuarios.forEach((user, index) => {
            const card = document.createElement('div');
            card.className = 'usuario-item-card';
            card.innerHTML = `
              <h5>${user.nombre}</h5>
              <span>@${user.username} - ${user.correo}</span>
          `;
            card.onclick = () => {
                document.querySelectorAll('#usuariosUpdateList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarPerfilUpdateUsuario(user, index);
            };
            listaUpdateContainer.appendChild(card);
        });
    }

    function mostrarPerfilUpdateUsuario(user, index) {
        const detalleUpdateContainer = document.getElementById('detalleUpdateContainer');
        detalleUpdateContainer.innerHTML = `
          <div class="update-info-card">
              <div class="update-info-header">
                  <i class="fa-solid fa-user"></i>
                  <h4>Información personal</h4>
              </div>
              <div class="update-row-item">
                  <span class="update-row-label">Nombre completo</span>
                  <div class="update-row-value-container">
                      <span class="update-row-value">${user.nombre}</span>
                      <button class="btn-edit-pencil" data-field="nombre" title="Editar Nombre"><i class="fa-solid fa-pen"></i></button>
                  </div>
              </div>
              <div class="update-row-item">
                  <span class="update-row-label">Correo electrónico</span>
                  <div class="update-row-value-container">
                      <span class="update-row-value">${user.correo}</span>
                      <button class="btn-edit-pencil" data-field="correo" title="Editar Correo"><i class="fa-solid fa-pen"></i></button>
                  </div>
              </div>
              <div class="update-row-item">
                  <span class="update-row-label">Teléfono</span>
                  <div class="update-row-value-container">
                      <span class="update-row-value">${user.telefono || 'No registrado'}</span>
                      <button class="btn-edit-pencil" data-field="telefono" title="Editar Teléfono"><i class="fa-solid fa-pen"></i></button>
                  </div>
              </div>
              <div class="update-row-item">
                  <span class="update-row-label">Dirección</span>
                  <div class="update-row-value-container">
                      <span class="update-row-value">${user.direccion || 'No registrada'}</span>
                      <button class="btn-edit-pencil" data-field="direccion" title="Editar Dirección"><i class="fa-solid fa-pen"></i></button>
                  </div>
              </div>
          </div>
      `;
        detalleUpdateContainer.querySelectorAll('.btn-edit-pencil').forEach(btn => {
            btn.onclick = () => {
                const field = btn.getAttribute('data-field');
                const fieldNames = { nombre: 'Nombre completo', correo: 'Correo electrónico', telefono: 'Teléfono', direccion: 'Dirección' };
                Swal.fire({
                    title: 'Seguridad Requerida',
                    text: `Para modificar [${fieldNames[field]}], ingresa la clave actual y el documento del usuario.`,
                    html: `
                      <input type="password" id="swal-clave" class="swal2-input" placeholder="Clave actual del usuario" style="width: 85%;">
                      <input type="text" id="swal-documento" class="swal2-input" placeholder="Número de documento" style="width: 85%;">
                      <input type="text" id="swal-nuevo-valor" class="swal2-input" placeholder="Nuevo valor para ${fieldNames[field]}" style="width: 85%;">
                  `,
                    background: '#12161f',
                    color: '#fff',
                    confirmButtonColor: '#d4af37',
                    confirmButtonText: 'Verificar y Guardar',
                    showCancelButton: true,
                    cancelButtonText: 'Cancelar',
                    preConfirm: () => {
                        return {
                            clave: document.getElementById('swal-clave').value,
                            documento: document.getElementById('swal-documento').value,
                            nuevoValor: document.getElementById('swal-nuevo-valor').value
                        };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const { clave, documento, nuevoValor } = result.value;
                        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
                        const usuarioActual = usuarios[index];
                        if (usuarioActual.password === clave && usuarioActual.documento === documento) {
                            usuarioActual[field] = nuevoValor;
                            localStorage.setItem("finara_usuarios_local", JSON.stringify(usuarios));
                            Swal.fire({
                                icon: 'success',
                                title: '¡Actualizado con éxito!',
                                text: `El campo ${fieldNames[field]} ha sido modificado.`,
                                background: '#12161f',
                                color: '#fff',
                                confirmButtonColor: '#d4af37'
                            });
                            mostrarPerfilUpdateUsuario(usuarioActual, index);
                            cargarUsuariosUpdate();
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Datos Incorrectos',
                                text: 'La clave actual o el número de documento no coinciden.',
                                background: '#12161f',
                                color: '#fff',
                                confirmButtonColor: '#ef4444'
                            });
                        }
                    }
                });
            };
        });
    }

    // ==========================================
    // 5. LÓGICA DEL MODAL DE DELETE
    // ==========================================
    const deleteModal = document.getElementById('adminDeleteModal');
    const btnOpenDelete = document.querySelector('[data-accion="Delete"]');
    const btnCloseDeleteModal = document.getElementById('closeAdminDeleteModal');

    if (btnOpenDelete && deleteModal) {
        btnOpenDelete.onclick = () => {
            deleteModal.classList.add('active');
            cargarUsuariosDelete();
        };
    }
    if (btnCloseDeleteModal && deleteModal) {
        btnCloseDeleteModal.onclick = () => {
            deleteModal.classList.remove('active');
        };
    }

    function cargarUsuariosDelete() {
        const listaDeleteContainer = document.getElementById('usuariosDeleteList');
        const detalleDeleteContainer = document.getElementById('detalleDeleteContainer');
        if (!listaDeleteContainer || !detalleDeleteContainer) return;

        listaDeleteContainer.innerHTML = '';
        detalleDeleteContainer.innerHTML = `
          <div class="placeholder-detalle" style="text-align: center; margin: auto;">
              <i class="fa-solid fa-user-shield" style="font-size: 2.5rem; color: #ef4444; margin-bottom: 1rem;"></i>
              <p>Selecciona un usuario de la izquierda para iniciar el protocolo de borrado seguro.</p>
          </div>
      `;
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        if (usuarios.length === 0) {
            listaDeleteContainer.innerHTML = `<p class="empty-list-text">No hay usuarios registrados.</p>`;
            return;
        }
        usuarios.forEach((user, index) => {
            const card = document.createElement('div');
            card.className = 'usuario-item-card';
            card.innerHTML = `
              <h5>${user.nombre}</h5>
              <span>@${user.username} - ${user.correo}</span>
          `;
            card.onclick = () => {
                document.querySelectorAll('#usuariosDeleteList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarPerfilDeleteUsuario(user, index);
            };
            listaDeleteContainer.appendChild(card);
        });
    }

    function mostrarPerfilDeleteUsuario(user, index) {
        const detalleDeleteContainer = document.getElementById('detalleDeleteContainer');
        detalleDeleteContainer.innerHTML = `
          <div class="delete-info-card">
              <div class="delete-info-header">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  <h4>Zona de Peligro: Depuración de Cuenta</h4>
              </div>
              <div class="delete-row-item">
                  <span class="delete-row-label">Nombre completo</span>
                  <span class="delete-row-value">${user.nombre}</span>
              </div>
              <div class="delete-row-item">
                  <span class="delete-row-label">Nombre de usuario</span>
                  <span class="delete-row-value">@${user.username}</span>
              </div>
              <div class="delete-row-item">
                  <span class="delete-row-label">Correo electrónico</span>
                  <span class="delete-row-value">${user.correo}</span>
              </div>
              <button class="btn-danger-action" id="btnEjecutarBorrado">
                  <i class="fa-solid fa-trash-can"></i> Eliminar Registro Permanentemente
              </button>
          </div>
      `;
        document.getElementById('btnEjecutarBorrado').onclick = () => {
            const hashSeguridad = Math.random().toString(36).substring(2, 8).toUpperCase();
            Swal.fire({
                title: '¿Estás completamente seguro?',
                html: `
                  <p style="color: #ef4444; font-size: 0.9rem; margin-bottom: 1rem;">Esta acción eliminará los datos del usuario de forma irreversible del sistema local.</p>
                  <p style="margin-bottom: 0.5rem;">Para confirmar, escribe el siguiente código hash de seguridad:</p>
                  <div style="background: #1e2530; color: #d4af37; padding: 10px; font-size: 1.2rem; font-weight: bold; letter-spacing: 2px; border-radius: 6px; margin-bottom: 1rem; user-select: text;">${hashSeguridad}</div>
                  <input type="text" id="swal-input-hash" class="swal2-input" placeholder="Ingresa el código hash aquí" style="width: 85%; text-transform: uppercase;">
              `,
                background: '#12161f',
                color: '#fff',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ef4444',
                preConfirm: () => {
                    return document.getElementById('swal-input-hash').value.trim().toUpperCase();
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    if (result.value === hashSeguridad) {
                        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
                        usuarios.splice(index, 1);
                        localStorage.setItem("finara_usuarios_local", JSON.stringify(usuarios));
                        Swal.fire({
                            icon: 'success',
                            title: '¡Usuario Eliminado!',
                            text: 'El registro ha sido depurado exitosamente.',
                            background: '#12161f',
                            color: '#fff',
                            confirmButtonColor: '#d4af37'
                        });
                        cargarUsuariosDelete();
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Código Incorrecto',
                            text: 'El hash no coincide. La operación fue cancelada.',
                            background: '#12161f',
                            color: '#fff',
                            confirmButtonColor: '#ef4444'
                        });
                    }
                }
            });
        };
    }

    // ==========================================
    // 6. CHATBOT ALERTA
    // ==========================================
    const btnChatbotAdmin = document.querySelector('[data-accion="Chatbot"]');
    if (btnChatbotAdmin) {
        btnChatbotAdmin.onclick = () => {
            Swal.fire({
                title: '<strong style="color: #d4af37;">Módulo en Desarrollo</strong>',
                html: `
                   <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 10px 0;">
                       <i class="fa-solid fa-comments" style="font-size: 50px; color: #8b5cf6;"></i>
                       <p style="color: #b3b3b3; font-size: 14px; text-align: center; margin: 0;">
                           La configuración del <strong>asistente virtual</strong> estará disponible en una próxima actualización.
                       </p>
                   </div>
               `,
                background: '#12161f',
                color: '#ffffff',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#d4af37'
            });
        };
    }
}

// Ejecución tradicional para compatibilidad directa
document.addEventListener('DOMContentLoaded', () => {
    initAdminView();
});