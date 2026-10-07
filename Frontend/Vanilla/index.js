document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. NAVEGACIÓN Y MENÚ HAMBURGUESA
    // ==========================================
    const menuToggle = document.getElementById('menuToggle');
    const navLinksContainer = document.getElementById('navLinks');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id], footer[id]');

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

        document.addEventListener('click', (e) => {
            if (!navLinksContainer.contains(e.target) && !menuToggle.contains(e.target)) {
                if (navLinksContainer.classList.contains('menu-abierto')) {
                    navLinksContainer.classList.remove('menu-abierto');
                    const icon = menuToggle.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-bars';
                }
            }
        });
    }

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

    // ==========================================
    // 2. CHATBOT FLOTANTE (FINARA ASSISTANT)
    // ==========================================
    const chatFloatBtn = document.getElementById('chatFloatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotBody = document.getElementById('chatbotBody');
    const chatbotFooter = document.getElementById('chatbotFooter');

    if (chatFloatBtn && closeChatBtn && chatbotWindow) {
        const toggleChat = () => {
            chatbotWindow.classList.toggle('hidden');
        };

        chatFloatBtn.addEventListener('click', toggleChat);
        closeChatBtn.addEventListener('click', toggleChat);

        const btnBotAction = document.querySelector('.btn-bot-action');
        if (btnBotAction) {
            btnBotAction.addEventListener('click', (e) => {
                e.preventDefault();
                chatbotWindow.classList.remove('hidden');
            });
        }

        const respuestasFAQ = {
            cuentas: "Ofrecemos **Cuenta de Ahorros** (0 cuota de manejo, rentabilidad diaria) y **Cuenta Corriente** con chequera digital activa.",
            creditos: "Puedes solicitar préstamos de libre inversión con aprobación en minutos y plazos flexibles de hasta 60 meses.",
            inversion: "Con **Inversión Inteligente** puedes hacer crecer tu capital desde $100.000 COP sin cláusula de permanencia.",
            soporte: "Puedes contactarnos vía email a **soporte@finarabank.com** o a la línea gratuita **01 8000 910 200**."
        };

        if (chatbotFooter && chatbotBody) {
            chatbotFooter.addEventListener('click', (e) => {
                if (e.target.classList.contains('option-btn')) {
                    const faqKey = e.target.getAttribute('data-faq');
                    const respuesta = respuestasFAQ[faqKey];

                    if (respuesta) {
                        const userMsg = document.createElement('div');
                        userMsg.className = 'chat-bubble';
                        userMsg.style.alignSelf = 'flex-end';
                        userMsg.style.background = 'var(--gold-main)';
                        userMsg.style.color = '#000000';
                        userMsg.style.fontWeight = '600';
                        userMsg.textContent = e.target.textContent;
                        chatbotBody.appendChild(userMsg);

                        setTimeout(() => {
                            const botMsg = document.createElement('div');
                            botMsg.className = 'chat-bubble';
                            botMsg.innerHTML = respuesta.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            chatbotBody.appendChild(botMsg);
                            chatbotBody.scrollTop = chatbotBody.scrollHeight;
                        }, 350);

                        chatbotBody.scrollTop = chatbotBody.scrollHeight;
                    }
                }
            });
        }
    }

    // ==========================================
    // 3. VALIDACIÓN Y ENVÍO DE FORMULARIO
    // ==========================================
    const formContacto = document.querySelector('.formulario-contacto');
    if (formContacto) {
        formContacto.addEventListener('submit', (e) => {
            e.preventDefault();

            const nombre = document.getElementById('nombre')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const mensaje = document.getElementById('mensaje')?.value.trim();

            if (!nombre || !email || !mensaje) {
                alert('Por favor, completa todos los campos del formulario.');
                return;
            }

            const btnSubmit = formContacto.querySelector('button[type="submit"]');
            const originalContent = btnSubmit.innerHTML;

            btnSubmit.disabled = true;
            btnSubmit.innerHTML = 'Enviando... <i class="fa-solid fa-circle-notch fa-spin"></i>';

            setTimeout(() => {
                alert(`¡Gracias por contactarnos, ${nombre}! Hemos recibido tu mensaje y te responderemos pronto al correo ${email}.`);
                formContacto.reset();
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalContent;
            }, 1200);
        });
    }

    // ==========================================
    // 4. EFECTO PARALLAX 3D (TARJETAS HERO)
    // ==========================================
    const cardWrapper = document.querySelector('.card-3d-wrapper');
    if (cardWrapper && window.innerWidth > 1024) {
        cardWrapper.addEventListener('mousemove', (e) => {
            const rect = cardWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const rotateX = (-y / rect.height) * 16;
            const rotateY = (x / rect.width) * 16;

            cardWrapper.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        cardWrapper.addEventListener('mouseleave', () => {
            cardWrapper.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
            cardWrapper.style.transition = 'transform 0.4s ease';
        });

        cardWrapper.addEventListener('mouseenter', () => {
            cardWrapper.style.transition = 'none';
        });
    }
});