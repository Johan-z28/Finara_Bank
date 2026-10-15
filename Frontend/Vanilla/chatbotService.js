// Vanilla/chatbotService.js
// Servicio de Inteligencia y Procesamiento de Lenguaje Natural (NLP) para el Chatbot Finara
// HU-36: Chatbot — Consultar horarios (#47) y módulo de intenciones conversacionales.

/**
 * Horarios de atención oficiales de Finara Bank
 */
export const HORARIOS_ATENCION = {
    canalesVirtuales: {
        titulo: "Canales Digitales y Virtuales",
        disponibilidad: "24 horas al día, 7 días a la semana (24/7)",
        canales: [
            "Banca Web y Móvil (Dashboard, Saldos, Presupuesto, Metas, Seguimiento)",
            "Transferencias entre cuentas y pagos",
            "Chatbot Asistente Virtual Finara",
            "Línea de emergencias y bloqueo de tarjetas"
        ]
    },
    oficinasPresenciales: {
        titulo: "Oficinas y Sucursales Físicas",
        disponibilidad: "Lunes a Viernes de 8:00 a.m. a 4:30 p.m. (Jornada continua) y Sábados de 9:00 a.m. a 1:00 p.m.",
        canales: [
            "Atención en ventanilla y cajas",
            "Asesoría financiera personalizada con ejecutivos",
            "Trámites especiales y radicación de documentos",
            "Domingos y festivos: No hay atención presencial"
        ]
    }
};

/**
 * Normaliza un texto removiendo acentos, puntuación y convirtiendo a minúsculas.
 */
export function normalizarTexto(texto = '') {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[¿?¡!.,;:_()\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Diccionario de patrones e intenciones entrenadas para el chatbot.
 */
export const INTENCIONES_CHATBOT = {
    HORARIOS: {
        id: 'horarios',
        keywords: [
            'horario', 'horarios', 'hora', 'horas', 'abren', 'abierto',
            'atienden', 'atencion', 'cerrado', 'cierran', 'sucursal', 'sucursales',
            'oficina', 'oficinas', 'presencial', 'virtual', 'domingo', 'sabado',
            'festivo', 'jornada', 'sede', 'sedes'
        ],
        patronesFrase: [
            'horario de atencion',
            'cual es el horario',
            'a que hora abren',
            'a que hora cierran',
            'horarios de oficinas',
            'estan abiertos',
            'horario virtual',
            'horario presencial',
            'cuando puedo ir'
        ]
    },
    SALUDO: {
        id: 'saludo',
        keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'hey', 'alo'],
        patronesFrase: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches']
    },
    SALDOS: {
        id: 'saldos',
        keywords: ['saldo', 'saldos', 'dinero', 'cuenta', 'cuanto tengo', 'consultar saldo'],
        patronesFrase: ['como consulto mi saldo', 'ver mi saldo', 'consultar saldos']
    },
    TRANSFERENCIAS: {
        id: 'transferencias',
        keywords: ['transferir', 'transferencia', 'enviar plata', 'pasar dinero', 'giro'],
        patronesFrase: ['como transferir', 'hacer transferencia', 'enviar dinero']
    },
    BLOQUEO: {
        id: 'bloqueo',
        keywords: ['bloquear', 'bloqueo', 'tarjeta perdida', 'robo', 'bloquear tarjeta'],
        patronesFrase: ['bloquear mi tarjeta', 'como bloqueo mi tarjeta', 'perdi mi tarjeta']
    }
};

/**
 * Evalúa si el texto del usuario corresponde a la intención de consulta de horarios.
 * Cumple Criterio 1 de HU-36: "Entrenar al chatbot para intenciones de 'horarios de atención'".
 */
export function esIntencionHorarios(textoUsuario = '') {
    const normalizado = normalizarTexto(textoUsuario);
    if (!normalizado) return false;

    // 1. Verificación por frases clave
    const coincideFrase = INTENCIONES_CHATBOT.HORARIOS.patronesFrase.some(frase =>
        normalizado.includes(frase)
    );
    if (coincideFrase) return true;

    // 2. Verificación por palabras clave relevantes
    const palabras = normalizado.split(' ');
    const tieneKeywordPrincipal = palabras.some(p =>
        ['horario', 'horarios', 'hora', 'horas', 'abren', 'cierran', 'atienden'].includes(p)
    );
    const tieneContextoAtencion = palabras.some(p =>
        ['atencion', 'servicio', 'oficina', 'oficinas', 'sucursal', 'sucursales', 'presencial', 'virtual', 'hoy', 'manana'].includes(p)
    );

    return (tieneKeywordPrincipal && (tieneContextoAtencion || normalizado.includes('horario')));
}

/**
 * Genera la respuesta detallada de horarios de atención diferenciando canales virtuales vs presenciales.
 * Cumple Criterio 2 y 3 de HU-36: "Mapear respuesta aclarando diferencias entre atención en canales virtuales vs. oficinas presenciales".
 */
export function generarRespuestaHorarios() {
    return {
        tipo: 'horarios',
        titulo: 'Horarios de Atención Finara Bank',
        html: `
            <div class="chat-horarios-respuesta">
                <p>Nuestros horarios están diseñados para brindarte la mejor cobertura:</p>
                
                <div class="horario-seccion-item virtual">
                    <div class="horario-badge"><i class="fa-solid fa-globe"></i> <strong>Canales Digitales y Virtuales (24/7)</strong></div>
                    <p class="horario-tiempo"><i class="fa-solid fa-clock"></i> <strong>Atención continua: 24 horas, 7 días a la semana</strong></p>
                    <ul class="horario-lista">
                        <li>Portal Web y Banca Móvil disponible 24/7.</li>
                        <li>Consultas de saldos, transferencias y pagos en línea inmediatos.</li>
                        <li>Asesor virtual inteligente y soporte de bloqueo de tarjetas 24/7.</li>
                    </ul>
                </div>

                <div class="horario-seccion-item presencial">
                    <div class="horario-badge"><i class="fa-solid fa-building-columns"></i> <strong>Oficinas y Sucursales Físicas</strong></div>
                    <p class="horario-tiempo"><i class="fa-solid fa-calendar-days"></i> <strong>Lunes a Viernes:</strong> 8:00 a.m. a 4:30 p.m. (Jornada continua)</p>
                    <p class="horario-tiempo"><i class="fa-solid fa-calendar-day"></i> <strong>Sábados:</strong> 9:00 a.m. a 1:00 p.m.</p>
                    <p class="horario-tiempo text-muted"><i class="fa-solid fa-ban"></i> <em>Domingos y festivos: No hay atención presencial en oficinas.</em></p>
                </div>

                <p class="horario-footer-tip"><i class="fa-solid fa-lightbulb"></i> ¿Deseas realizar otra consulta o regresar al menú principal?</p>
            </div>
        `,
        opcionesSiguientes: [
            { texto: '🔍 Revisar Saldo', accion: 'consultar' },
            { texto: '💸 Enviar Dinero', accion: 'transferir' },
            { texto: '🕒 Horarios de Atención', accion: 'horarios' },
            { texto: '🔄 Menú Principal', accion: 'menu_principal' }
        ]
    };
}

/**
 * Procesa el mensaje del usuario y devuelve la intención y respuesta correspondiente.
 */
export function procesarMensajeChatbot(textoUsuario = '') {
    const normalizado = normalizarTexto(textoUsuario);

    if (esIntencionHorarios(normalizado)) {
        return generarRespuestaHorarios();
    }

    if (INTENCIONES_CHATBOT.SALUDO.keywords.some(s => normalizado.startsWith(s) || normalizado === s)) {
        return {
            tipo: 'saludo',
            html: `¡Hola! 👋 Bienvenido a <strong>Finara Bank</strong>. Soy tu asistente virtual inteligente. ¿En qué puedo orientarte hoy?`,
            opcionesSiguientes: [
                { texto: '🕒 Horarios de Atención', accion: 'horarios' },
                { texto: '🔍 Revisar Saldo', accion: 'consultar' },
                { texto: '💸 Enviar Dinero', accion: 'transferir' },
                { texto: '📖 Mis Tarjetas', accion: 'leer' }
            ]
        };
    }

    if (normalizado.includes('saldo') || normalizado.includes('cuanto tengo')) {
        return {
            tipo: 'saldos',
            html: `Puedes consultar tus cuentas y saldos en tiempo real dirigiéndote a la sección <strong><a href="Saldos.html" style="color:var(--gold-main);text-decoration:underline;">Saldos</a></strong> del menú lateral.`,
            opcionesSiguientes: [
                { texto: '🕒 Horarios de Atención', accion: 'horarios' },
                { texto: '🔄 Menú Principal', accion: 'menu_principal' }
            ]
        };
    }

    if (normalizado.includes('transfer') || normalizado.includes('enviar')) {
        return {
            tipo: 'transferencias',
            html: `Para realizar transferencias seguras, ingresa a <strong><a href="Transferencias.html" style="color:var(--gold-main);text-decoration:underline;">Transferencias</a></strong> con el número y tipo de cuenta de destino.`,
            opcionesSiguientes: [
                { texto: '🕒 Horarios de Atención', accion: 'horarios' },
                { texto: '🔄 Menú Principal', accion: 'menu_principal' }
            ]
        };
    }

    // Respuesta por defecto con opciones
    return {
        tipo: 'general',
        html: `Entendido. Puedes consultar información de <strong>Horarios de atención</strong>, revisar tus <strong>Saldos</strong>, realizar <strong>Transferencias</strong> o gestionar tus <strong>Tarjetas</strong>.`,
        opcionesSiguientes: [
            { texto: '🕒 Horarios de Atención', accion: 'horarios' },
            { texto: '🔍 Revisar Saldo', accion: 'consultar' },
            { texto: '💸 Enviar Dinero', accion: 'transferir' },
            { texto: '🔄 Menú Principal', accion: 'menu_principal' }
        ]
    };
}
