// Gestor global de componentes (Sidebar, Navbar, Perfil y Chatbot)
let procesarMensajeChatbotFn = null;
import('../chatbotService.js')
    .then(moduloChat => {
        if (moduloChat) {
            procesarMensajeChatbotFn = moduloChat.procesarMensajeChatbot;
        }
    })
    .catch(() => {
        // Si el módulo fue reestructurado o no está en la raíz, se maneja de forma tolerante
    });

let isGlobalListenersInitialized = false;

export function initGlobalComponents() {
    updateUserData();
    highlightActiveMenu();
    ensureChatbotWidget();

    if (!isGlobalListenersInitialized) {
        setupGlobalEvents();
        isGlobalListenersInitialized = true;
    }
}

/**
 * Asegura que el widget del Chatbot esté presente en cualquier página del ecosistema.
 */
function ensureChatbotWidget() {
    if (document.getElementById('chatWidgetContainer')) return;

    const widgetHTML = `
    <div id="chatWidgetContainer">
        <div id="windowChat" class="chatbot-window hidden">
            <div class="chatbot-header">
                <div class="chatbot-info">
                    <div class="bot-avatar-container">
                        <img src="../Style/image/bot_finara.png" alt="Finara Bot" class="bot-avatar-img">
                    </div>
                    <div>
                        <h6>Asistente Finara</h6>
                        <small class="status-online">• En línea</small>
                    </div>
                </div>
                <button id="btnCloseChat" class="close-chat-btn" aria-label="Cerrar chat">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div id="chatBody" class="chatbot-body">
                <div class="chat-bubble bot-bubble">
                    ¡Hola! 👋 Soy tu asistente virtual de <strong>Finara Bank</strong>. ¿En qué puedo orientarte hoy?
                </div>
            </div>

            <div class="chat-input-bar">
                <input type="text" id="chatInputText" class="chat-input-field" placeholder="Escribe tu consulta (ej: horarios)..." />
                <button id="chatSendBtn" class="chat-send-btn" title="Enviar"><i class="fa-solid fa-paper-plane"></i></button>
            </div>

            <div class="chatbot-footer" id="chatOptions">
                <button class="option-btn highlight-btn" data-action="horarios">🕒 Horarios de Atención</button>
                <button class="option-btn" data-action="consultar">🔍 Revisar Saldo</button>
                <button class="option-btn" data-action="transferir">💸 Enviar Dinero</button>
                <button class="option-btn" data-action="menu_principal">🔄 Ayuda General</button>
            </div>
        </div>

        <button id="btnToggleChat" class="chatbot-float-btn" title="Asistente Virtual Finara">
            <img src="../Style/image/bot_finara.png" alt="Finara Bot" class="float-btn-img">
        </button>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
}

/**
 * Carga e inyecta los datos del usuario en el Navbar desde LocalStorage
 */
function updateUserData() {
    let storedUserName = localStorage.getItem('userName');
    let storedUserAvatar = localStorage.getItem('userAvatar');

    if (!storedUserName || storedUserName === 'Sin Nombre' || storedUserName === 'Usuario') {
        try {
            const perfil = JSON.parse(localStorage.getItem('userProfile'));
            if (perfil && (perfil.nombre || perfil.username)) {
                storedUserName = perfil.nombre || perfil.username;
                if (!storedUserAvatar) storedUserAvatar = perfil.avatar;
            }
        } catch {}
    }

    if (!storedUserName || storedUserName === 'Sin Nombre' || storedUserName === 'Usuario') {
        try {
            const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
            if (usuarioActivo && (usuarioActivo.nombre || usuarioActivo.username)) {
                storedUserName = usuarioActivo.nombre || usuarioActivo.username;
                if (!storedUserAvatar) storedUserAvatar = usuarioActivo.avatar;
            }
        } catch {}
    }

    if (!storedUserName || storedUserName === 'Sin Nombre' || storedUserName === 'Usuario') {
        try {
            const emailLogueado = localStorage.getItem('usuarioLogueado') || localStorage.getItem('emailSesion');
            const usuarios = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
            if (emailLogueado && usuarios.length > 0) {
                const encontrado = usuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado);
                if (encontrado && (encontrado.nombre || encontrado.username)) {
                    storedUserName = encontrado.nombre || encontrado.username;
                    if (!storedUserAvatar) storedUserAvatar = encontrado.avatar;
                }
            } else if (usuarios.length > 0) {
                // Último usuario registrado en el sistema local
                const ultimo = usuarios[usuarios.length - 1];
                if (ultimo && (ultimo.nombre || ultimo.username)) {
                    storedUserName = ultimo.nombre || ultimo.username;
                    if (!storedUserAvatar) storedUserAvatar = ultimo.avatar;
                }
            }
        } catch {}
    }

    if (!storedUserName || storedUserName === 'Sin Nombre') {
        storedUserName = 'Usuario';
    }

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
 * Maneja el envío y procesamiento de mensajes del Chatbot (HU-36)
 */
function enviarMensajeChat(texto) {
    if (!texto || !texto.trim()) return;

    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInputText');
    const chatOptions = document.getElementById('chatOptions');
    if (!chatBody) return;

    // 1. Mensaje del usuario
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble';
    userBubble.style.alignSelf = 'flex-end';
    userBubble.style.background = 'var(--gold-main)';
    userBubble.style.color = '#000000';
    userBubble.style.fontWeight = '600';
    userBubble.textContent = texto.trim();
    chatBody.appendChild(userBubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    if (chatInput) chatInput.value = '';

    // 2. Respuesta del bot procesada mediante el servicio de intenciones (HU-36)
    setTimeout(() => {
        let respuesta = {
            html: 'Hola. Nuestro asesor virtual está disponible para orientarte sobre los productos y servicios de Finara Bank.',
            opcionesSiguientes: [
                { accion: 'consultar', texto: '🔍 Revisar Saldo' },
                { accion: 'transferir', texto: '💸 Enviar Dinero' }
            ]
        };

        if (typeof procesarMensajeChatbotFn === 'function') {
            try {
                respuesta = procesarMensajeChatbotFn(texto);
            } catch {
                // Fallback por defecto
            }
        }

        const botBubble = document.createElement('div');
        botBubble.className = 'chat-bubble bot-bubble';
        botBubble.innerHTML = respuesta.html;
        chatBody.appendChild(botBubble);
        chatBody.scrollTop = chatBody.scrollHeight;

        // Actualizar opciones rápidas disponibles
        if (chatOptions && respuesta.opcionesSiguientes) {
            chatOptions.innerHTML = respuesta.opcionesSiguientes.map(op => `
                <button class="option-btn ${op.accion === 'horarios' ? 'highlight-btn' : ''}" data-action="${op.accion}">${op.texto}</button>
            `).join('');
        }
    }, 300);
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
            if (windowChat) {
                windowChat.classList.toggle('hidden');
                if (!windowChat.classList.contains('hidden')) {
                    const inp = document.getElementById('chatInputText');
                    if (inp) inp.focus();
                }
            }
            return;
        }

        if (closeChatBtn) {
            e.preventDefault();
            if (windowChat) windowChat.classList.add('hidden');
            return;
        }

        // E. Opciones rápidas del Chatbot (HU-36)
        const btnOpcionChat = e.target.closest('.option-btn');
        if (btnOpcionChat && btnOpcionChat.closest('#chatWidgetContainer')) {
            e.preventDefault();
            const action = btnOpcionChat.getAttribute('data-action');
            if (action === 'horarios') {
                enviarMensajeChat('¿Cuáles son los horarios de atención?');
            } else if (action === 'consultar') {
                enviarMensajeChat('¿Cómo consulto mi saldo?');
            } else if (action === 'transferir') {
                enviarMensajeChat('¿Cómo realizar una transferencia?');
            } else if (action === 'menu_principal') {
                enviarMensajeChat('Hola');
            } else {
                enviarMensajeChat(btnOpcionChat.textContent);
            }
            return;
        }

        // F. Botón Enviar mensaje del Chatbot
        const chatSendBtn = e.target.closest('#chatSendBtn');
        if (chatSendBtn) {
            e.preventDefault();
            const input = document.getElementById('chatInputText');
            if (input) enviarMensajeChat(input.value);
            return;
        }

        // G. Clic fuera del sidebar en móviles
        if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !e.target.closest('#mobileMenuBtn')) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Enter para enviar mensaje en el Chatbot
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const chatInput = document.getElementById('chatInputText');
            if (chatInput && document.activeElement === chatInput) {
                e.preventDefault();
                enviarMensajeChat(chatInput.value);
            }
        }
    });
}