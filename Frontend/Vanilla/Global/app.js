let isGlobalListenersInitialized = false;

export function initGlobalComponents() {
    updateUserData();
    highlightActiveMenu();

    if (!isGlobalListenersInitialized) {
        setupGlobalEvents();
        isGlobalListenersInitialized = true;
    }
}

/**
 * Carga e inyecta los datos del usuario en el Navbar desde LocalStorage
 */
function updateUserData() {
    const storedUserName = localStorage.getItem('userName') || 'Sin Nombre';
    const storedUserAvatar = localStorage.getItem('userAvatar');

    const greetingName = document.getElementById('greetingName');
    const dropdownUserName = document.getElementById('dropdownUserName');

    if (greetingName) greetingName.textContent = storedUserName;
    if (dropdownUserName) dropdownUserName.textContent = storedUserName;

    const userAvatarImg = document.getElementById('userAvatarImg');
    const userAvatarIcon = document.getElementById('userAvatarIcon');

    if (userAvatarImg && userAvatarIcon) {
        if (storedUserAvatar && storedUserAvatar.trim() !== '') {
            userAvatarImg.src = storedUserAvatar;
            userAvatarImg.classList.remove('hidden');
            userAvatarIcon.classList.add('hidden');
        } else {
            userAvatarImg.classList.add('hidden');
            userAvatarIcon.classList.remove('hidden');
        }
    }
}

/**
 * Detecta en qué archivo .html está el navegador y resalta el enlace activo en el Sidebar
 */
function highlightActiveMenu() {
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop().toLowerCase();
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Eventos del Layout (Sidebar, Navbar, Perfil y Chatbot)
 */
function setupGlobalEvents() {
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const mainWrapper = document.querySelector('.main-wrapper');
        const profileDropdown = document.getElementById('profileDropdown');
        const windowChat = document.getElementById('windowChat');

        // A. Toggle Sidebar (Escritorio / Móvil)
        const sidebarCollapseBtn = e.target.closest('#sidebarCollapseBtn');
        if (sidebarCollapseBtn) {
            e.preventDefault();
            if (sidebar) {
                if (window.innerWidth > 992) {
                    sidebar.classList.toggle('collapsed');
                    if (mainWrapper) mainWrapper.classList.toggle('expanded');
                } else {
                    sidebar.classList.toggle('open');
                }
            }
            return;
        }

        // B. Botón Hamburguesa Móvil
        const mobileMenuBtn = e.target.closest('#mobileMenuBtn');
        if (mobileMenuBtn) {
            e.preventDefault();
            if (sidebar) sidebar.classList.toggle('open');
            return;
        }

        // C. Abrir / Cerrar Desplegable de Perfil
        const profileBtn = e.target.closest('#profileMenuBtn');
        if (profileBtn) {
            e.preventDefault();
            if (profileDropdown) profileDropdown.classList.toggle('active');
            return;
        }

        // Clic fuera del perfil para cerrarlo
        if (profileDropdown && profileDropdown.classList.contains('active')) {
            if (!e.target.closest('.profile-menu-container')) {
                profileDropdown.classList.remove('active');
            }
        }

        // D. Abrir / Cerrar Chatbot
        const openChatNavBtn = e.target.closest('#openChatbotNavBtn');
        const floatChatBtn = e.target.closest('#btnToggleChat');
        const closeChatBtn = e.target.closest('#btnCloseChat');

        if (openChatNavBtn || floatChatBtn) {
            e.preventDefault();
            if (windowChat) windowChat.classList.toggle('hidden');
            return;
        }

        if (closeChatBtn) {
            e.preventDefault();
            if (windowChat) windowChat.classList.add('hidden');
            return;
        }

        // E. Clic fuera del sidebar en móviles
        if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !e.target.closest('#mobileMenuBtn')) {
                sidebar.classList.remove('open');
            }
        }
    });
}