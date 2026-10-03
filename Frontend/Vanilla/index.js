document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navLinksContainer = document.getElementById('navLinks');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id], footer[id]');

    // 1. Toggle Menú Hamburguesa
    if (menuToggle && navLinksContainer) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            navLinksContainer.classList.toggle('menu-abierto');

            const icon = menuToggle.querySelector('i');
            if (icon) {
                if (navLinksContainer.classList.contains('menu-abierto')) {
                    icon.className = 'fa-solid fa-xmark';
                } else {
                    icon.className = 'fa-solid fa-bars';
                }
            }
        });
    }

    // 2. Cierre del menú móvil al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const targetHref = this.getAttribute('href');

            if (targetHref && targetHref.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(targetHref);

                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }

                if (navLinksContainer && navLinksContainer.classList.contains('menu-abierto')) {
                    navLinksContainer.classList.remove('menu-abierto');
                    const icon = menuToggle.querySelector('i');
                    if (icon) {
                        icon.className = 'fa-solid fa-bars';
                    }
                }
            }
        });
    });

    // 3. Highlight de navegación según el desplazamiento
    function changeActiveNav() {
        let currentSection = '';
        const scrollPosition = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        if (scrollPosition < 150) {
            currentSection = 'hero';
        }

        if (currentSection) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.classList.add('active');
                }
            });
        }
    }

    window.addEventListener('scroll', changeActiveNav);
    changeActiveNav();
});