// Vanilla/AdminCall/Admin.js
export async function initAdminView() {
    vincularModalesAdmin();
}

function vincularModalesAdmin() {
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
            Swal.fire({ icon: 'warning', title: 'Contraseña muy corta', text: 'Debe tener al menos 8 caracteres.', background: '#12161f', color: '#fff', confirmButtonColor: '#d4af37' });
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

        usuariosLocales.push({
            nombre, correo, tipoDocumento, documento, telefono: "Por definir",
            fecha: new Date().toISOString().split('T')[0], username, password,
            direccion: "Por definir", rol: "Cliente", productosActivos: 0,
            saldoDisponible: "$ 0", ultimaActividad: "Creado por Administrador",
            avatar: "../../Style/image/profile/avatarDefault.png", verificado: true,
            tarjetasAprobadas: [], cuentas: []
        });

        localStorage.setItem("finara_usuarios_local", JSON.stringify(usuariosLocales));
        Swal.fire({ icon: 'success', title: '¡Usuario Creado!', text: `El usuario @${username} ha sido registrado.`, background: '#12161f', color: '#fff', confirmButtonColor: '#d4af37' }).then(() => {
            modal.classList.remove('active');
        });
    }

    // Modal READ
    const readModal = document.getElementById('adminReadModal');
    const btnOpenRead = document.querySelector('[data-accion="Read"]');
    const btnCloseReadModal = document.getElementById('closeAdminReadModal');

    if (btnOpenRead && readModal) {
        btnOpenRead.onclick = () => { readModal.classList.add('active'); cargarTodosLosUsuarios(); };
    }
    if (btnCloseReadModal && readModal) {
        btnCloseReadModal.onclick = () => { readModal.classList.remove('active'); };
    }

    function cargarTodosLosUsuarios() {
        const listaReadContainer = document.getElementById('usuariosReadList');
        const detalleReadContainer = document.getElementById('detalleReadContainer');
        if (!listaReadContainer || !detalleReadContainer) return;

        listaReadContainer.innerHTML = '';
        detalleReadContainer.innerHTML = `<div class="placeholder-detalle"><i class="fa-solid fa-id-card"></i><p>Selecciona un usuario de la lista.</p></div>`;
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        
        usuarios.forEach((user, index) => {
            const card = document.createElement('div');
            card.className = 'usuario-item-card';
            card.innerHTML = `<h5>${user.nombre}</h5><span>@${user.username} - ${user.correo}</span><div><span class="badge-status ${user.verificado ? 'verificado' : 'pendiente'}">${user.verificado ? 'Verificado' : 'Pendiente'}</span></div>`;
            card.onclick = () => {
                document.querySelectorAll('#usuariosReadList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarDatosCompletosUsuario(user, index);
            };
            listaReadContainer.appendChild(card);
        });
    }

    function mostrarDatosCompletosUsuario(user, index) {
        document.getElementById('detalleReadContainer').innerHTML = `
          <div class="detalle-info-card">
              <h4>Datos del Usuario</h4>
              <p><strong>Nombre:</strong> ${user.nombre}</p>
              <p><strong>Username:</strong> @${user.username}</p>
              <p><strong>Correo:</strong> ${user.correo}</p>
              <p><strong>Documento:</strong> ${user.documento || 'N/A'}</p>
              <p><strong>Teléfono:</strong> ${user.telefono || 'N/A'}</p>
              <div class="acciones-derivadas-container">
                  <button class="btn-derivar" id="btnIrUpdate"><i class="fa-solid fa-user-pen"></i> Ir a Update</button>
                  <button class="btn-derivar" id="btnIrDelete" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);"><i class="fa-solid fa-user-xmark"></i> Ir a Delete</button>
              </div>
          </div>
      `;
        document.getElementById('btnIrUpdate').onclick = () => { readModal.classList.remove('active'); updateModal.classList.add('active'); cargarUsuariosUpdate(); };
        document.getElementById('btnIrDelete').onclick = () => { readModal.classList.remove('active'); deleteModal.classList.add('active'); cargarUsuariosDelete(); };
    }

    // Modal UPDATE
    const updateModal = document.getElementById('adminUpdateModal');
    const btnOpenUpdate = document.querySelector('[data-accion="Update"]');
    const btnCloseUpdateModal = document.getElementById('closeAdminUpdateModal');

    if (btnOpenUpdate && updateModal) {
        btnOpenUpdate.onclick = () => { updateModal.classList.add('active'); cargarUsuariosUpdate(); };
    }
    if (btnCloseUpdateModal && updateModal) {
        btnCloseUpdateModal.onclick = () => { updateModal.classList.remove('active'); };
    }

    function cargarUsuariosUpdate() {
        const listaUpdateContainer = document.getElementById('usuariosUpdateList');
        if (!listaUpdateContainer) return;
        listaUpdateContainer.innerHTML = '';
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        usuarios.forEach((user, index) => {
            const card = document.createElement('div');
            card.className = 'usuario-item-card';
            card.innerHTML = `<h5>${user.nombre}</h5><span>@${user.username}</span>`;
            card.onclick = () => {
                document.querySelectorAll('#usuariosUpdateList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarPerfilUpdateUsuario(user, index);
            };
            listaUpdateContainer.appendChild(card);
        });
    }

    function mostrarPerfilUpdateUsuario(user, index) {
        document.getElementById('detalleUpdateContainer').innerHTML = `
          <div class="update-info-card">
              <div class="update-info-header"><i class="fa-solid fa-user"></i><h4>Editar Perfil</h4></div>
              <div class="update-row-item"><span class="update-row-label">Nombre</span><div class="update-row-value-container"><span class="update-row-value">${user.nombre}</span><button class="btn-edit-pencil" data-field="nombre"><i class="fa-solid fa-pen"></i></button></div></div>
              <div class="update-row-item"><span class="update-row-label">Correo</span><div class="update-row-value-container"><span class="update-row-value">${user.correo}</span><button class="btn-edit-pencil" data-field="correo"><i class="fa-solid fa-pen"></i></button></div></div>
          </div>
      `;
        document.querySelectorAll('.btn-edit-pencil').forEach(btn => {
            btn.onclick = () => {
                const field = btn.getAttribute('data-field');
                Swal.fire({
                    title: 'Seguridad',
                    html: `<input type="password" id="swal-clave" class="swal2-input" placeholder="Clave actual"><input type="text" id="swal-nuevo" class="swal2-input" placeholder="Nuevo valor">`,
                    background: '#12161f', color: '#fff', confirmButtonColor: '#d4af37', showCancelButton: true,
                    preConfirm: () => ({ clave: document.getElementById('swal-clave').value, nuevo: document.getElementById('swal-nuevo').value })
                }).then(res => {
                    if (res.isConfirmed && res.value.clave === user.password) {
                        user[field] = res.value.nuevo;
                        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
                        usuarios[index] = user;
                        localStorage.setItem("finara_usuarios_local", JSON.stringify(usuarios));
                        Swal.fire({ icon: 'success', title: '¡Actualizado!', background: '#12161f', color: '#fff', confirmButtonColor: '#d4af37' });
                        mostrarPerfilUpdateUsuario(user, index);
                    }
                });
            };
        });
    }

    // Modal DELETE
    const deleteModal = document.getElementById('adminDeleteModal');
    const btnOpenDelete = document.querySelector('[data-accion="Delete"]');
    const btnCloseDeleteModal = document.getElementById('closeAdminDeleteModal');

    if (btnOpenDelete && deleteModal) {
        btnOpenDelete.onclick = () => { deleteModal.classList.add('active'); cargarUsuariosDelete(); };
    }
    if (btnCloseDeleteModal && deleteModal) {
        btnCloseDeleteModal.onclick = () => { deleteModal.classList.remove('active'); };
    }

    function cargarUsuariosDelete() {
        const listaDeleteContainer = document.getElementById('usuariosDeleteList');
        if (!listaDeleteContainer) return;
        listaDeleteContainer.innerHTML = '';
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        usuarios.forEach((user, index) => {
            const card = document.createElement('div');
            card.className = 'usuario-item-card';
            card.innerHTML = `<h5>${user.nombre}</h5><span>@${user.username}</span>`;
            card.onclick = () => {
                document.querySelectorAll('#usuariosDeleteList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                document.getElementById('detalleDeleteContainer').innerHTML = `
                    <div class="delete-info-card">
                        <h4>Depurar Cuenta</h4>
                        <p>¿Eliminar a <strong>${user.nombre}</strong>?</p>
                        <button class="btn-danger-action" id="btnEjecutarBorrado"><i class="fa-solid fa-trash-can"></i> Eliminar Definitivamente</button>
                    </div>
                `;
                document.getElementById('btnEjecutarBorrado').onclick = () => {
                    usuarios.splice(index, 1);
                    localStorage.setItem("finara_usuarios_local", JSON.stringify(usuarios));
                    Swal.fire({ icon: 'success', title: 'Eliminado', background: '#12161f', color: '#fff', confirmButtonColor: '#d4af37' });
                    cargarUsuariosDelete();
                };
            };
            listaDeleteContainer.appendChild(card);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { initAdminView(); });