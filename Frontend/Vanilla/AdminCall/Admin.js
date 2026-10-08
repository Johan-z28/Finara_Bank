document.addEventListener('DOMContentLoaded', () => {
    // 1. Comportamiento del Sidebar (Colapsar y Menú Móvil)
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

    // 2. Funcionalidad temporal para los botones de las tarjetas del CRUD
    const actionButtons = document.querySelectorAll('.btn-admin-action');

    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const seccion = button.getAttribute('data-accion');
            alert(`Construyendo funcionalidad de: ${seccion}`);
        });
    });
});