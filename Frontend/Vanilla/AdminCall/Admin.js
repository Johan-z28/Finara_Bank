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

    // 2. Lógica del Modal de Create (Validación de usuarios pendientes)
    const modal = document.getElementById('adminModal');
    const btnOpenCreate = document.querySelector('[data-accion="Create"]');
    const btnCloseModal = document.getElementById('closeAdminModal');
    const listaPendientesContainer = document.getElementById('usuariosPendientesList');
    const detalleContainer = document.getElementById('detalleUsuarioContainer');

    // Abrir Modal al hacer clic en "Gestionar Alta"
    if (btnOpenCreate) {
        btnOpenCreate.addEventListener('click', () => {
            modal.classList.add('active');
            cargarUsuariosPendientes();
        });
    }

    // Cerrar Modal
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Función para cargar los usuarios no verificados desde localStorage
    function cargarUsuariosPendientes() {
        listaPendientesContainer.innerHTML = '';
        detalleContainer.innerHTML = `
            <div class="placeholder-detalle">
                <i class="fa-solid fa-hand-pointer"></i>
                <p>Selecciona un usuario de la izquierda para gestionar su verificación.</p>
            </div>
        `;

        let usuarios = JSON.parse(localStorage.getItem("finara_usuarios_local")) || [];

        // Filtrar los que no están verificados (verificado === false o undefined)
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

    // Mostrar detalle a la derecha y habilitar botones de acción
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

        // Evento para Aprobar (Cambiar verificado a true)
        document.getElementById('btnAprobar').addEventListener('click', () => {
            actualizarEstadoUsuario(user.originalIndex, true);
        });

        // Evento para Rechazar (Se conserva en localStorage sin borrarlo de golpe)
        document.getElementById('btnRechazar').addEventListener('click', () => {
            actualizarEstadoUsuario(user.originalIndex, 'pendiente_revision');
        });
    }

    // Actualizar el estado en localStorage con SweetAlert2
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

    // Excluir Create y Read de las alertas temporales
    const actionButtons = document.querySelectorAll('.btn-admin-action:not([data-accion="Create"]):not([data-accion="Read"])');
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const seccion = button.getAttribute('data-accion');
            Swal.fire({
                icon: 'info',
                title: 'En desarrollo',
                text: `Construyendo funcionalidad de: ${seccion}`,
                background: '#12161f',
                color: '#fff',
                confirmButtonColor: '#d4af37'
            });
        });
    });

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

        // Derivar a Update (sin borrar el localStorage)
        document.getElementById('btnIrUpdate').addEventListener('click', () => {
            Swal.fire({
                icon: 'question',
                title: 'Derivando a Update',
                text: `Redirigiendo las opciones de actualización para: ${user.nombre}`,
                background: '#12161f',
                color: '#fff',
                confirmButtonColor: '#d4af37'
            });
        });

        // Derivar a Delete (solo redirige/avisa, respetando la regla de no borrar en Read)
        document.getElementById('btnIrDelete').addEventListener('click', () => {
            Swal.fire({
                icon: 'warning',
                title: 'Derivación a Delete',
                text: `El usuario ${user.nombre} ha sido seleccionado para la sección de borrado seguro.`,
                background: '#12161f',
                color: '#fff',
                confirmButtonColor: '#ef4444'
            });
        });
    }
    // ==========================================
    // 4. LÓGICA DEL MENÚ DESPLEGABLE DE PERFIL
    // ==========================================
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const cerrarSesionBtn = document.getElementById('cerrarSesionBtn');

    if (profileBtn && profileDropdown) {
        // Alternar visibilidad al hacer clic en el icono de perfil
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });

        // Cerrar el menú si se hace clic fuera de él
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }

    // Botón de Cerrar Sesión -> Redirige al index principal
    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', () => {
            // Opcional: limpiar datos de sesión si usas localStorage para la autenticación
            // localStorage.removeItem("finara_sesion_activa");

            // Ruta relativa correcta desde Admin/ hacia la raíz donde está index.html
            window.location.href = '../../index.html';
        });
    }
});