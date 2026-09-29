document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id]');

    function changeActiveNav() {
        let currentSection = '';
        const scrollPosition = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120; // Compensación del navbar
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

    // Evento Scroll
    window.addEventListener('scroll', changeActiveNav);

    // Evento Clic en Enlaces
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const targetHref = this.getAttribute('href');
            if (targetHref.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(targetHref);
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 90;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Ejecución inicial
    changeActiveNav();
});