document.addEventListener('DOMContentLoaded', () => {
    // 1. Comportamiento del Sidebar
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (collapseBtn && sidebar && mainWrapper) {
        collapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainWrapper.classList.toggle('expanded');
        });
    }
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // ==========================================
    // 2. LÓGICA DEL MODAL DE CREATE (Validación de usuarios pendientes)
    // ==========================================
    const modal = document.getElementById('adminModal');
    const btnOpenCreate = document.querySelector('[data-accion="Create"]');
    const btnCloseModal = document.getElementById('closeAdminModal');
    const listaPendientesContainer = document.getElementById('usuariosPendientesList');
    const detalleContainer = document.getElementById('detalleUsuarioContainer');
    if (btnOpenCreate) {
        btnOpenCreate.addEventListener('click', () => {
            modal.classList.add('active');
            cargarUsuariosPendientes();
        });
    }
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    function cargarUsuariosPendientes() {
        listaPendientesContainer.innerHTML = '';
        detalleContainer.innerHTML = `
          <div class="placeholder-detalle">
              <i class="fa-solid fa-hand-pointer"></i>
              <p>Selecciona un usuario de la izquierda para gestionar su verificación.</p>
          </div>
      `;
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        const pendientes = usuarios.map((user, index) => ({ ...user, originalIndex: index }))
            .filter(u => u.verificado === false || u.verificado === undefined);
        if (pendientes.length === 0) {
            listaPendientesContainer.innerHTML = `<p class="empty-list-text">No hay usuarios pendientes por validar.</p>`;
            return;
        }
        pendientes.forEach(user => {
            const card = document.createElement('div');
            card.className = 'usuario-item-card';
            card.innerHTML = `
              <h5>${user.nombre}</h5>
              <span>@${user.username} - ${user.correo}</span>
          `;
            card.addEventListener('click', () => {
                document.querySelectorAll('#usuariosPendientesList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarDetalleUsuario(user);
            });
            listaPendientesContainer.appendChild(card);
        });
    }
    function mostrarDetalleUsuario(user) {
        detalleContainer.innerHTML = `
          <div class="detalle-info-card">
              <h4>Detalles de la Solicitud</h4>
              <p><strong>Nombre completo:</strong> ${user.nombre}</p>
              <p><strong>Correo electrónico:</strong> ${user.correo}</p>
              <p><strong>Tipo de Documento:</strong> ${user.tipoDocumento || 'No especificado'}</p>
              <p><strong>Número de Documento:</strong> ${user.documento || 'No especificado'}</p>
              <p><strong>Teléfono:</strong> ${user.telefono || 'No especificado'}</p>
              <p><strong>Nombre de Usuario:</strong> @${user.username}</p>
           
              <div class="acciones-btns-container">
                  <button class="btn-aprobar" id="btnAprobar">Verificar (Aprobar)</button>
                  <button class="btn-rechazar" id="btnRechazar">Marcar / Derivar</button>
              </div>
          </div>
      `;
        document.getElementById('btnAprobar').addEventListener('click', () => {
            actualizarEstadoUsuario(user.originalIndex, true);
        });
        document.getElementById('btnRechazar').addEventListener('click', () => {
            actualizarEstadoUsuario(user.originalIndex, 'pendiente_revision');
        });
    }
    function actualizarEstadoUsuario(index, accion) {
        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
        if (accion === true) {
            usuarios[index].verificado = true;
            Swal.fire({
                icon: 'success',
                title: '¡Usuario Verificado!',
                text: `El usuario ${usuarios[index].nombre} ha sido aprobado exitosamente.`,
                background: '#12161f',
                color: '#fff',
                confirmButtonColor: '#d4af37'
            });
        } else {
            Swal.fire({
                icon: 'info',
                title: 'Acción Registrada',
                text: 'El estado del usuario se mantiene en seguimiento.',
                background: '#12161f',
                color: '#fff',
                confirmButtonColor: '#d4af37'
            });
        }
        localStorage.setItem("finara_usuarios_local", JSON.stringify(usuarios));
        cargarUsuariosPendientes();
    }

    // ==========================================
    // 3. LÓGICA DEL MODAL DE READ (CONSULTA GENERAL)
    // ==========================================
    const readModal = document.getElementById('adminReadModal');
    const btnOpenRead = document.querySelector('[data-accion="Read"]');
    const btnCloseReadModal = document.getElementById('closeAdminReadModal');
    const listaReadContainer = document.getElementById('usuariosReadList');
    const detalleReadContainer = document.getElementById('detalleReadContainer');
    if (btnOpenRead) {
        btnOpenRead.addEventListener('click', () => {
            readModal.classList.add('active');
            cargarTodosLosUsuarios();
        });
    }
    if (btnCloseReadModal) {
        btnCloseReadModal.addEventListener('click', () => {
            readModal.classList.remove('active');
        });
    }
    function cargarTodosLosUsuarios() {
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
            card.addEventListener('click', () => {
                document.querySelectorAll('#usuariosReadList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarDatosCompletosUsuario(user, index);
            });
            listaReadContainer.appendChild(card);
        });
    }
    function mostrarDatosCompletosUsuario(user, index) {
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
              <p><strong>Fecha Nacimiento:</strong> ${user.fecha || 'No registrada'}</p>
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
        document.getElementById('btnIrUpdate').addEventListener('click', () => {
            readModal.classList.remove('active');
            updateModal.classList.add('active');
            cargarUsuariosUpdate();
        });
        document.getElementById('btnIrDelete').addEventListener('click', () => {
            readModal.classList.remove('active');
            deleteModal.classList.add('active');
            cargarUsuariosDelete();
        });
    }

    // ==========================================
    // 4. LÓGICA DEL MODAL DE UPDATE (ACTUALIZACIÓN)
    // ==========================================
    const updateModal = document.getElementById('adminUpdateModal');
    const btnOpenUpdate = document.querySelector('[data-accion="Update"]');
    const btnCloseUpdateModal = document.getElementById('closeAdminUpdateModal');
    const listaUpdateContainer = document.getElementById('usuariosUpdateList');
    const detalleUpdateContainer = document.getElementById('detalleUpdateContainer');
    if (btnOpenUpdate) {
        btnOpenUpdate.addEventListener('click', () => {
            updateModal.classList.add('active');
            cargarUsuariosUpdate();
        });
    }
    if (btnCloseUpdateModal) {
        btnCloseUpdateModal.addEventListener('click', () => {
            updateModal.classList.remove('active');
        });
    }
    function cargarUsuariosUpdate() {
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
            card.addEventListener('click', () => {
                document.querySelectorAll('#usuariosUpdateList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarPerfilUpdateUsuario(user, index);
            });
            listaUpdateContainer.appendChild(card);
        });
    }
    function mostrarPerfilUpdateUsuario(user, index) {
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
            btn.addEventListener('click', () => {
                const field = btn.getAttribute('data-field');
                const fieldNames = { nombre: 'Nombre completo', correo: 'Correo electrónico', telefono: 'Teléfono', direccion: 'Dirección' };
                Swal.fire({
                    title: 'Seguridad Requerida',
                    text: `Para modificar el campo [${fieldNames[field]}], ingresa la clave actual y el documento del usuario.`,
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
                    focusConfirm: false,
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
                                text: `El campo ${fieldNames[field]} ha sido modificado correctamente.`,
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
            });
        });
    }

    // ==========================================
    // 5. MENÚ DESPLEGABLE DE PERFIL Y CIERRE DE SESIÓN
    // ==========================================
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const cerrarSesionBtn = document.getElementById('cerrarSesionBtn');
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', () => {
            window.location.href = '../../index.html';
        });
    }

    // ==========================================
    // 6. LÓGICA DEL MODAL DE DELETE (DEPURACIÓN SEGURA)
    // ==========================================
    const deleteModal = document.getElementById('adminDeleteModal');
    const btnOpenDelete = document.querySelector('[data-accion="Delete"]');
    const btnCloseDeleteModal = document.getElementById('closeAdminDeleteModal');
    const listaDeleteContainer = document.getElementById('usuariosDeleteList');
    const detalleDeleteContainer = document.getElementById('detalleDeleteContainer');
    if (btnOpenDelete) {
        btnOpenDelete.addEventListener('click', () => {
            deleteModal.classList.add('active');
            cargarUsuariosDelete();
        });
    }
    if (btnCloseDeleteModal) {
        btnCloseDeleteModal.addEventListener('click', () => {
            deleteModal.classList.remove('active');
        });
    }
    function cargarUsuariosDelete() {
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
            card.addEventListener('click', () => {
                document.querySelectorAll('#usuariosDeleteList .usuario-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                mostrarPerfilDeleteUsuario(user, index);
            });
            listaDeleteContainer.appendChild(card);
        });
    }
    function mostrarPerfilDeleteUsuario(user, index) {
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
              <div class="delete-row-item">
                  <span class="delete-row-label">Documento</span>
                  <span class="delete-row-value">${user.documento || 'No registrado'}</span>
              </div>
              <button class="btn-danger-action" id="btnEjecutarBorrado">
                  <i class="fa-solid fa-trash-can"></i> Eliminar Registro Permanentemente
              </button>
          </div>
      `;
        document.getElementById('btnEjecutarBorrado').addEventListener('click', () => {
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
                cancelButtonColor: '#374151',
                focusConfirm: false,
                preConfirm: () => {
                    return document.getElementById('swal-input-hash').value.trim().toUpperCase();
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const codigoIngresado = result.value;
                    if (codigoIngresado === hashSeguridad) {
                        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];
                        usuarios.splice(index, 1);
                        localStorage.setItem("finara_usuarios_local", JSON.stringify(usuarios));
                        Swal.fire({
                            icon: 'success',
                            title: '¡Usuario Eliminado!',
                            text: 'El registro ha sido depurado exitosamente del sistema.',
                            background: '#12161f',
                            color: '#fff',
                            confirmButtonColor: '#d4af37'
                        });
                        cargarUsuariosDelete();
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Código Incorrecto',
                            text: 'El hash de seguridad no coincide. La operación fue cancelada por seguridad.',
                            background: '#12161f',
                            color: '#fff',
                            confirmButtonColor: '#ef4444'
                        });
                    }
                }
            });
        });
    }
});