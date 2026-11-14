import { CATEGORIAS } from './chatbotData.js';

// Chat guiado por botones: no utiliza IA, backend ni campos de texto.
export function initChatbot({ navegar } = {}) {
  const toggle = document.getElementById('btnToggleChat');
  const cerrar = document.getElementById('btnCloseChat');
  const ventana = document.getElementById('windowChat');
  const cuerpo = document.getElementById('chatBody');
  if (!toggle || !ventana || !cuerpo) {
    console.warn('Finara Chatbot: faltan elementos HTML de la interfaz.');
    return;
  }
  if (ventana.dataset.finaraChatInicializado === 'true') return;
  ventana.dataset.finaraChatInicializado = 'true';
  cargarEstilos();

  let iniciado = false;
  let categoriaActual = null;
  const desplazar = () => { cuerpo.scrollTop = cuerpo.scrollHeight; };

  function mensaje(texto, tipo = 'bot') {
    const burbuja = document.createElement('div');
    burbuja.className = `chat-bubble ${tipo === 'bot' ? 'bot-bubble' : 'user-bubble'}`;
    burbuja.textContent = texto; // No utilizar innerHTML con mensajes.
    burbuja.style.whiteSpace = 'pre-line';
    cuerpo.appendChild(burbuja);
    desplazar();
  }

  function opciones(items) {
    cuerpo.querySelector('.chat-options')?.remove();
    const grupo = document.createElement('div');
    grupo.className = 'chat-options finara-chat-options';
    for (const item of items) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'chat-option-btn';
      boton.textContent = '›  ' + item.label;
      boton.addEventListener('click', () => {
        grupo.remove();
        if (item.usuario !== false) mensaje(item.label, 'user');
        item.accion();
      });
      grupo.appendChild(boton);
    }
    cuerpo.appendChild(grupo);
    desplazar();
  }

  function inicio() {
    categoriaActual = null;
    mensaje('¿Con qué tema necesitas ayuda? Selecciona una categoría:');
    opciones(CATEGORIAS.map(c => ({label: c.titulo, accion: () => abrirCategoria(c.id)})));
  }

  function abrirCategoria(id) {
    const categoria = CATEGORIAS.find(c => c.id === id);
    if (!categoria) return inicio();
    categoriaActual = categoria.id;
    mensaje(categoria.introduccion);
    opciones([
      ...categoria.temas.map(t => ({ label: t.titulo, accion: () => abrirTema(t) })),
      {label: '⬅ Volver al menú principal', usuario: false, accion: inicio}
    ]);
  }

  function abrirTema(tema) {
    mensaje(tema.respuesta);
    const acciones = [];
    if (tema.vista && typeof navegar === 'function') {
      acciones.push({label: '↗ ' + (tema.etiqueta || 'Abrir sección'), usuario: false, accion: () => {
        navegar(tema.vista);
        mensaje('Abrí la sección solicitada. Puedes continuar consultando el asistente.');
        mostrarRetorno();
      }});
    }
    acciones.push({label: '⬅ Otras preguntas de esta categoría', usuario: false, accion: () => abrirCategoria(categoriaActual)});
    acciones.push({label: '⌂ Menú principal', usuario: false, accion: inicio});
    opciones(acciones);
  }

  function mostrarRetorno() {
    opciones([
      {label: '⬅ Volver a la categoría', usuario: false, accion: () => abrirCategoria(categoriaActual)},
      {label: '⌂ Menú principal', usuario: false, accion: inicio}
    ]);
  }

  toggle.addEventListener('click', () => {
    ventana.classList.toggle('hidden');
    if (!ventana.classList.contains('hidden')) {
      if (!iniciado) { iniciado = true; inicio(); }
      desplazar();
    }
  });
  cerrar?.addEventListener('click', () => ventana.classList.add('hidden'));
}

function cargarEstilos() {
  if (document.getElementById('finara-chatbot-css')) return;
  const link = document.createElement('link');
  link.id = 'finara-chatbot-css';
  link.rel = 'stylesheet';
  link.href = new URL('./chatbot.css', import.meta.url).href;
  document.head.appendChild(link);
}
