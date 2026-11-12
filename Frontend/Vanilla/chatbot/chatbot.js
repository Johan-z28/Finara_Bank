import { CATEGORIAS, CONVENIOS_SERVICIOS } from './chatbotData.js';

// Motor de disparadores e intenciones para HU-39 (Pago de servicios)
const DISPARADORES_SERVICIOS = [
  'pagar', 'pago', 'factura', 'facturas', 'servicio', 'servicios',
  'luz', 'agua', 'gas', 'internet', 'recibo', 'convenio', 'enel', 'epm', 'vanti', 'claro', 'referencia'
];

/**
 * Chat guiado por pasos e intenciones contextuales
 */
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
    burbuja.textContent = texto;
    burbuja.style.whiteSpace = 'pre-line';
    cuerpo.appendChild(burbuja);
    desplazar();
  }

  function tarjetaGuia(htmlContent) {
    const contenedor = document.createElement('div');
    contenedor.className = 'chat-guide-card';
    contenedor.innerHTML = htmlContent;
    cuerpo.appendChild(contenedor);
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
    mensaje('¿Con qué tema necesitas ayuda? Puedes seleccionar una categoría o ingresar a la guía de pago de servicios:');
    
    const listaOpciones = [
      { label: '💡 Pagar Servicios / Facturas (Paso a paso)', accion: () => iniciarFlujoPagoServicios() },
      ...CATEGORIAS.map(c => ({ label: c.titulo, accion: () => abrirCategoria(c.id) }))
    ];
    opciones(listaOpciones);
  }

  function abrirCategoria(id) {
    const categoria = CATEGORIAS.find(c => c.id === id);
    if (!categoria) return inicio();
    categoriaActual = categoria.id;
    mensaje(categoria.introduccion);

    const items = categoria.temas.map(t => ({
      label: t.titulo,
      accion: () => {
        if (t.esFlujoServicios) {
          iniciarFlujoPagoServicios();
        } else {
          abrirTema(t);
        }
      }
    }));

    opciones([
      ...items,
      { label: '⬅ Volver al menú principal', usuario: false, accion: inicio }
    ]);
  }

  function abrirTema(tema) {
    mensaje(tema.respuesta);
    const acciones = [];
    if (tema.vista && typeof navegar === 'function') {
      acciones.push({
        label: '↗ ' + (tema.etiqueta || 'Abrir sección'),
        usuario: false,
        accion: () => {
          navegar(tema.vista);
          mensaje('Abrí la sección solicitada. Puedes continuar consultando el asistente.');
          mostrarRetorno();
        }
      });
    }
    acciones.push({ label: '⬅ Otras preguntas de esta categoría', usuario: false, accion: () => abrirCategoria(categoriaActual) });
    acciones.push({ label: '⌂ Menú principal', usuario: false, accion: inicio });
    opciones(acciones);
  }

  function mostrarRetorno() {
    opciones([
      { label: '⬅ Volver a la categoría', usuario: false, accion: () => abrirCategoria(categoriaActual) },
      { label: '⌂ Menú principal', usuario: false, accion: inicio }
    ]);
  }

  // =========================================================================
  // FLUJO INTERACTIVO DE PAGO DE SERVICIOS PÚBLICOS Y PRIVADOS (HU-39)
  // =========================================================================

  /**
   * Paso 1: Selección de Categoría de Servicio
   */
  function iniciarFlujoPagoServicios() {
    mensaje('¡Con gusto te oriento en el pago de tus facturas! 📄💳\n\nPaso 1 de 3: ¿Qué tipo de servicio deseas pagar?');

    const opcionesCategorias = CONVENIOS_SERVICIOS.map(serv => ({
      label: serv.categoria,
      accion: () => paso2SeleccionarEmpresa(serv)
    }));

    opcionesCategorias.push({ label: '⬅ Volver al menú principal', usuario: false, accion: inicio });
    opciones(opcionesCategorias);
  }

  /**
   * Paso 2: Selección de Empresa / Convenio
   */
  function paso2SeleccionarEmpresa(servicio) {
    mensaje(`Paso 2 de 3: Selecciona la empresa prestadora de ${servicio.categoria}:`);

    const opcionesEmpresas = servicio.empresas.map(empresa => ({
      label: empresa,
      accion: () => paso3DetalleGuia(servicio, empresa)
    }));

    opcionesEmpresas.push({
      label: '⬅ Cambiar tipo de servicio',
      usuario: false,
      accion: () => iniciarFlujoPagoServicios()
    });
    opciones(opcionesEmpresas);
  }

  /**
   * Paso 3: Guía de Referencia, Requisitos y Ejemplo
   */
  function paso3DetalleGuia(servicio, empresa) {
    mensaje(`¡Excelente! Aquí tienes las instrucciones para pagar tu factura de ${empresa}:`);

    const htmlCard = `
      <div class="guide-step-header">
        <span class="guide-step-badge">Paso 3 de 3</span>
        <span class="guide-company-name"><i class="fa-solid ${servicio.icono}"></i> ${empresa}</span>
      </div>
      <div class="guide-info-row">
        <strong>📍 Dónde ubicar la referencia:</strong><br>
        ${servicio.dondeEstaReferencia}
      </div>
      <div class="guide-info-row">
        <strong>🔢 Formato / Longitud:</strong><br>
        ${servicio.longitudReferencia}
      </div>
      <div class="guide-info-row">
        <strong>⏱ Tiempo de acreditación:</strong><br>
        ${servicio.tiempoAcreditacion}
      </div>
      <div class="guide-info-row">
        <strong>⚠️ Requisitos indispensables:</strong><br>
        ${servicio.requisitos}
      </div>
      <div class="guide-security-notice">
        <i class="fa-solid fa-shield-halved"></i> Finara nunca solicitará tus claves ni PIN de seguridad.
      </div>
    `;

    tarjetaGuia(htmlCard);

    // Acciones y confirmación
    const acciones = [
      {
        label: '🔍 Ver ejemplo de referencia de pago',
        accion: () => mostrarEjemploReferencia(servicio, empresa)
      },
      {
        label: '🔄 Consultar otro servicio o empresa',
        usuario: false,
        accion: () => iniciarFlujoPagoServicios()
      }
    ];

    if (typeof navegar === 'function') {
      acciones.push({
        label: '↗ Ir a Mis Cuentas para verificar saldo',
        usuario: false,
        accion: () => {
          navegar('saldos');
          mensaje('Te he dirigido a Mis Cuentas para que verifiques tu saldo disponible antes de proceder.');
          opciones([
            { label: '🔄 Consultar otro servicio', usuario: false, accion: () => iniciarFlujoPagoServicios() },
            { label: '⌂ Menú principal', usuario: false, accion: inicio }
          ]);
        }
      });
    }

    acciones.push({ label: '⬅ Volver a ' + (categoriaActual ? 'operaciones' : 'menú'), usuario: false, accion: () => categoriaActual ? abrirCategoria(categoriaActual) : inicio() });
    acciones.push({ label: '⌂ Menú principal', usuario: false, accion: inicio });

    opciones(acciones);
  }

  /**
   * Muestra un tip visual interactivo de ejemplo de referencia
   */
  function mostrarEjemploReferencia(servicio, empresa) {
    const htmlEjemplo = `
      <div class="guide-step-header">
        <span class="guide-step-badge">Ejemplo de Factura</span>
        <span class="guide-company-name">${empresa}</span>
      </div>
      <div class="guide-info-row">
        Al digitar tu pago en el formulario oficial, ingresa la referencia tal como aparece en tu recibo:
      </div>
      <div style="text-align: center; margin: 0.5rem 0;">
        <span class="reference-highlight">REF: ${servicio.ejemploReferencia}</span>
      </div>
      <div class="guide-info-row" style="font-size: 0.74rem;">
        💡 <em>Consejo: Omite guiones o espacios a menos que el formulario lo solicite expresamente.</em>
      </div>
    `;

    tarjetaGuia(htmlEjemplo);

    opciones([
      { label: '🔄 Consultar otro servicio', usuario: false, accion: () => iniciarFlujoPagoServicios() },
      { label: '⌂ Menú principal', usuario: false, accion: inicio }
    ]);
  }

  // Eventos de apertura / cierre
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
