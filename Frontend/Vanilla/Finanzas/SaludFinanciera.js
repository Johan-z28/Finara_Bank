import { calcularSaludFinanciera } from './saludFinancieraService.js';

export function initSaludFinancieraView() {
    const chatBody = document.getElementById('chatConversacionBody');
    const inputContainer = document.getElementById('chatInputContainer');
    const seccionResultado = document.getElementById('seccionResultado');
    const seccionChatCard = document.getElementById('seccionChatCard');
    const seccionHistorialLista = document.getElementById('seccionHistorialLista');
    const contenedorListaHistorial = document.getElementById('contenedorListaHistorial');

    const btnReiniciar = document.getElementById('btnReiniciarChat');
    const btnRepetir = document.getElementById('btnRepetirEvaluacion');
    const btnVerScore = document.getElementById('btnVerUltimoScore');
    const btnHistorial = document.getElementById('btnHistorialAsesorias');
    const btnVolverAlChat = document.getElementById('btnVolverAlChatDesdeHistorial');
    const btnVerHistorialDesdeReporte = document.getElementById('btnVerHistorialDesdeReporte');

    let pasoActual = 0;
    const respuestasUsuario = {
        ingresosMensuales: 0,
        gastosMensuales: 0,
        deudaTotal: 0,
        ahorroActual: 0,
        metaPrincipal: ''
    };

    const pasosPreguntas = [
        {
            pregunta: "¡Hola! Soy tu Asesor Financiero de Finara Bank. Estoy aquí para ayudarte a entender cómo están tus finanzas y darte una estrategia a la medida. Para comenzar, ¿cuáles son tus <strong>ingresos mensuales totales aproximados (COP)</strong>?",
            tipo: "number",
            placeholder: "Ej: 4.500.000",
            key: "ingresosMensuales"
        },
        {
            pregunta: "Entendido. Ahora dime, ¿cuánto sumas en tus <strong>gastos fijos mensuales</strong> (arriendo, servicios, mercado, etc.)?",
            tipo: "number",
            placeholder: "Ej: 2.800.000",
            key: "gastosMensuales"
        },
        {
            pregunta: "Perfecto. ¿Cuál es el <strong>monto total de tus deudas activas actuales</strong> (tarjetas de crédito, préstamos)? Si no tienes, escribe 0.",
            tipo: "number",
            placeholder: "Ej: 5.000.000",
            key: "deudaTotal"
        },
        {
            pregunta: "¿Cuánto tienes actualmente acumulado en <strong>ahorros o fondo de emergencia</strong>?",
            tipo: "number",
            placeholder: "Ej: 2.000.000",
            key: "ahorroActual"
        },
        {
            pregunta: "Excelente, ya casi terminamos. ¿Cuál es tu <strong>principal objetivo o meta financiera</strong> en este momento?",
            tipo: "select",
            options: [
                { value: "ahorro", texto: "Construir mi fondo de emergencia o ahorrar" },
                { value: "deudas", texto: "Salir de deudas rápidamente" },
                { value: "inversion", texto: "Comenzar a invertir" },
                { value: "control", texto: "Controlar mejor mis gastos diarios" }
            ],
            key: "metaPrincipal"
        }
    ];

    function agregarBurbuja(texto, remitente = 'bot') {
        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.className = `chat-message-wrapper ${remitente === 'bot' ? 'bot-message-row' : 'user-message-row'}`;

        if (remitente === 'bot') {
            const avatarImg = document.createElement('img');
            avatarImg.src = '../Style/image/bot_finara_esmeralda.png';
            avatarImg.className = 'chat-bubble-avatar';
            bubbleWrapper.appendChild(avatarImg);
        }

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${remitente === 'bot' ? 'bot-bubble' : 'user-bubble'}`;
        bubble.innerHTML = texto;

        bubbleWrapper.appendChild(bubble);
        chatBody.appendChild(bubbleWrapper);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function mostrarSiguientePregunta() {
        if (pasoActual < pasosPreguntas.length) {
            const paso = pasosPreguntas[pasoActual];
            agregarBurbuja(paso.pregunta, 'bot');
            renderizarInputControl(paso);
        } else {
            finalizarConversacionYCalcular();
        }
    }

    function renderizarInputControl(paso) {
        inputContainer.innerHTML = '';

        if (paso.tipo === 'number') {
            const wrapper = document.createElement('form');
            wrapper.className = 'chat-input-form';
            wrapper.innerHTML = `
                <input type="text" id="chatInputVal" placeholder="${paso.placeholder}" autocomplete="off" autofocus>
                <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            `;

            const inputEl = wrapper.querySelector('#chatInputVal');

            inputEl.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val !== '') {
                    val = Number(val).toLocaleString('es-CO');
                }
                e.target.value = val;
            });

            wrapper.onsubmit = (e) => {
                e.preventDefault();
                const rawVal = Number(inputEl.value.replace(/\./g, ''));
                if (isNaN(rawVal) || rawVal < 0) return;

                agregarBurbuja(`$ ${inputEl.value}`, 'user');
                respuestasUsuario[paso.key] = rawVal;
                pasoActual++;
                inputContainer.innerHTML = '';
                setTimeout(mostrarSiguientePregunta, 500);
            };
            inputContainer.appendChild(wrapper);
            inputEl.focus();
        } else if (paso.tipo === 'select') {
            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'chat-options-stack';
            
            paso.options.forEach(opt => {
                const btnOpt = document.createElement('button');
                btnOpt.type = 'button';
                btnOpt.className = 'chat-option-chip';
                btnOpt.textContent = opt.texto;
                btnOpt.onclick = () => {
                    agregarBurbuja(opt.texto, 'user');
                    respuestasUsuario[paso.key] = opt.value;
                    pasoActual++;
                    inputContainer.innerHTML = '';
                    setTimeout(mostrarSiguientePregunta, 600);
                };
                selectWrapper.appendChild(btnOpt);
            });
            inputContainer.appendChild(selectWrapper);
        }
    }

    function finalizarConversacionYCalcular() {
        agregarBurbuja("Analizando tus respuestas con el motor de reglas de Finara... ¡Un momento por favor! ⏳", 'bot');
        
        setTimeout(() => {
            const resultadoDiagnostico = calcularSaludFinanciera({
                ...respuestasUsuario,
                fechaEvaluacion: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            });

            const evaluacionCompleta = {
                ...respuestasUsuario,
                ...resultadoDiagnostico
            };

            // Guardar última y añadir al historial en localStorage
            localStorage.setItem('finara_ultima_evaluacion_salud', JSON.stringify(evaluacionCompleta));
            
            let historial = JSON.parse(localStorage.getItem('finara_historial_asesorias') || '[]');
            historial.unshift(evaluacionCompleta);
            localStorage.setItem('finara_historial_asesorias', JSON.stringify(historial));

            mostrarReporteEnUI(evaluacionCompleta);
        }, 1000);
    }

    function mostrarReporteEnUI(data) {
        if (seccionChatCard) seccionChatCard.style.display = 'none';
        if (seccionHistorialLista) seccionHistorialLista.style.display = 'none';
        if (seccionResultado) {
            seccionResultado.style.display = 'block';

            document.getElementById('lblScore').textContent = `${data.score} / 100`;
            document.getElementById('lblNivel').textContent = `Nivel: ${data.nivelSalud}`;
            document.getElementById('txtEnfoqueAsesoria').textContent = data.enfoqueAsesoria || "Asesoría personalizada basada en tu perfil financiero.";

            document.getElementById('listaPuntosFuertes').innerHTML = data.puntosFuertes?.length > 0 
                ? data.puntosFuertes.map(item => `<li>${item}</li>`).join('')
                : '<li>No se detectaron fortalezas destacadas en este periodo.</li>';

            document.getElementById('listaOportunidades').innerHTML = data.oportunidadesMejora?.length > 0 
                ? data.oportunidadesMejora.map(item => `<li>${item}</li>`).join('')
                : '<li>¡Ninguna alerta crítica detectada! Tus finanzas van por buen camino.</li>';

            document.getElementById('listaRecomendaciones').innerHTML = data.recomendaciones?.length > 0 
                ? data.recomendaciones.map(item => `<li>${item}</li>`).join('')
                : '<li>Mantén tus hábitos financieros actuales y revisa tus metas periódicamente.</li>';
        }
    }

    function renderizarListaHistorial() {
        const historial = JSON.parse(localStorage.getItem('finara_historial_asesorias') || '[]');
        contenedorListaHistorial.innerHTML = '';

        if (historial.length === 0) {
            contenedorListaHistorial.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #64748b;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>Aún no tienes asesorías guardadas. Realiza tu primera evaluación con el Asesor Finara.</p>
                </div>
            `;
            return;
        }

        historial.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'historial-item-card';
            card.innerHTML = `
                <div class="historial-item-info">
                    <span class="historial-item-fecha"><i class="fa-regular fa-calendar"></i> ${item.fechaEvaluacion || `Evaluación #${historial.length - index}`}</span>
                    <span class="historial-item-score">Score: ${item.score} / 100</span>
                    <span class="historial-item-nivel">Nivel: ${item.nivelSalud}</span>
                </div>
                <button type="button" class="btn-ver-detalle-historial">
                    Ver Reporte <i class="fa-solid fa-chevron-right"></i>
                </button>
            `;

            card.querySelector('.btn-ver-detalle-historial').onclick = () => {
                mostrarReporteEnUI(item);
            };

            contenedorListaHistorial.appendChild(card);
        });
    }

    function abrirVistaHistorial() {
        if (seccionChatCard) seccionChatCard.style.display = 'none';
        if (seccionResultado) seccionResultado.style.display = 'none';
        if (seccionHistorialLista) {
            seccionHistorialLista.style.display = 'block';
            renderizarListaHistorial();
        }
    }

    function iniciarChat() {
        chatBody.innerHTML = '';
        pasoActual = 0;
        if (seccionResultado) seccionResultado.style.display = 'none';
        if (seccionHistorialLista) seccionHistorialLista.style.display = 'none';
        if (seccionChatCard) seccionChatCard.style.display = 'block';
        mostrarSiguientePregunta();
    }

    // Eventos de botones
    if (btnReiniciar) btnReiniciar.onclick = iniciarChat;
    if (btnRepetir) btnRepetir.onclick = iniciarChat;
    if (btnHistorial) btnHistorial.onclick = abrirVistaHistorial;
    if (btnVerHistorialDesdeReporte) btnVerHistorialDesdeReporte.onclick = abrirVistaHistorial;
    if (btnVolverAlChat) btnVolverAlChat.onclick = iniciarChat;

    if (btnVerScore) {
        btnVerScore.onclick = () => {
            const guardado = localStorage.getItem('finara_ultima_evaluacion_salud');
            if (!guardado) {
                alert("Aún no tienes ninguna evaluación guardada. Realiza la asesoría conversacional primero.");
                return;
            }
            const data = JSON.parse(guardado);
            mostrarReporteEnUI(data);
        };
    }

    iniciarChat();
}