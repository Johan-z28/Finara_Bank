// Vanilla/app.js

export function initGlobalComponents() {
    // 1. CARGA GLOBAL DE USUARIO EN NAVBAR
    const storedUserName = localStorage.getItem('userName') || 'yull';
    const storedUserAvatar = localStorage.getItem('userAvatar');

    const greetingName = document.getElementById('greetingName');
    const dropdownUserName = document.getElementById('dropdownUserName');

    if (greetingName) greetingName.textContent = storedUserName;
    if (dropdownUserName) dropdownUserName.textContent = storedUserName;

    // 2. FOTO O ÍCONO POR DEFECTO
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

    // 3. MENÚ DESPLEGABLE DE PERFIL
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (profileMenuBtn && profileDropdown) {
        profileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
        });
    }

    // 4. LÓGICA DEL MENÚ HAMBURGUESA / SIDEBAR EN MÓVILES
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        // Cerrar al hacer clic fuera del sidebar
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
}