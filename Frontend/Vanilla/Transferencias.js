import { initGlobalComponents } from './Global/app.js';
import { initCampanaNotificaciones, actualizarCampana } from './notificaciones.js';
import {
    TIPOS, formatoCOP, calcularDisponible, obtenerCuentasOrigen, buscarCuentaDestino,
    validarTransferencia, ejecutarTransferencia, SesionExpiradaError
} from './transferenciasService.js';

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto; // textContent: evita inyección HTML
    return n;
}

const ultimos4 = numero => String(numero).replace(/\D/g, '').slice(-4);
const textoCuenta = c => `${TIPOS[c.tipo]} · •••• ${ultimos4(c.numero)}`;

// Lista de filas "etiqueta / valor" para el resumen y el comprobante
function filas(contenedor, items) {
    contenedor.replaceChildren(...items.map(({ label, valor, extra, destacado, negativo }) => {
        const fila = el('div', 'tr-fila-resumen');
        const dd = el('dd', destacado ? 'tr-valor tr-valor--grande' : 'tr-valor', valor);
        if (negativo) dd.classList.add('tr-valor--negativo');
        if (extra) dd.append(el('span', 'tr-valor-extra', extra));
        fila.append(el('dt', '', label), dd);
        return fila;
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa la hamburguesa, el menú de perfil y los datos compartidos
    initGlobalComponents();
    initCampanaNotificaciones();

    const $ = id => document.getElementById(id);
    const form = $('formTransferencia');
    const selOrigen = $('trOrigen'), selTipo = $('trTipoDestino');
    const inpNumero = $('trNumeroDestino'), inpMonto = $('trMonto'), inpConcepto = $('trConcepto');
    const hintOrigen = $('trOrigenHint'), boxDestino = $('trDestino');
    const errOrigen = $('errOrigen'), errDestino = $('errDestino'), errMonto = $('errMonto');
    const vistas = { 1: $('vistaForm'), 2: $('vistaResumen'), 3: $('vistaExito') };
    const pasos = document.querySelectorAll('.tr-paso');
    const btnEditar = $('btnEditar'), btnConfirmar = $('btnConfirmar'), btnNueva = $('btnNueva');
    const resumenError = $('resumenError'), resumenAlerta = $('resumenAlerta');
    const estadoGlobal = $('trEstado'), toast = $('trToast');

    let cuentas = [];
    let destino = null;      // cuenta destino ya verificada
    let datos = null;        // datos validados que se muestran en el resumen
    let tokenDestino = 0;    // descarta verificaciones viejas si el usuario sigue escribiendo
    let temporizador = null;
    let enProceso = false;

    const irALogin = () => { window.location.href = '../index.html'; };

    // ---------- Pasos ----------
    function irAPaso(n) {
        Object.entries(vistas).forEach(([k, v]) => v.classList.toggle('hidden', Number(k) !== n));
        pasos.forEach(p => {
            const num = Number(p.dataset.paso);
            p.classList.toggle('activo', num === n);
            p.classList.toggle('completo', num < n);
            p.setAttribute('aria-current', num === n ? 'step' : 'false');
        });
        const titulo = vistas[n].querySelector('h2');
        titulo.tabIndex = -1;
        titulo.focus();
    }

    function mostrarToast(mensaje) {
        toast.textContent = mensaje;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 3500);
    }

    // ---------- Punto 1 y 2: formulario y saldo ----------
    const cuentaSeleccionada = () => cuentas.find(c => String(c.id) === selOrigen.value);
    const leerMonto = () => Number(inpMonto.value.replace(/\D/g, '')) || 0;

    function pintarHint() {
        const c = cuentaSeleccionada();
        if (!c) { hintOrigen.textContent = ''; return; }
        if (c.tipo === 'TARJETA_CREDITO') {
            hintOrigen.textContent = `Cupo Total: ${formatoCOP.format(c.saldo)} · Avance permitido (hasta 50%): ${formatoCOP.format(calcularDisponible(c))}`;
            return;
        }
        const extra = c.tipo === 'CORRIENTE' ? ' (incluye sobregiro del 20%)' : '';
        hintOrigen.textContent = `Saldo: ${formatoCOP.format(c.saldo)} · Disponible: ${formatoCOP.format(calcularDisponible(c))}${extra}`;
    }

    async function cargarCuentas() {
        const previa = selOrigen.value;
        try {
            cuentas = await obtenerCuentasOrigen();
        } catch (err) {
            if (err instanceof SesionExpiradaError) return irALogin();
            estadoGlobal.replaceChildren(el('p', '', 'No pudimos cargar tus cuentas. Intenta de nuevo.'));
            const b = el('button', 'tr-btn tr-btn--primary', 'Reintentar');
            b.type = 'button';
            b.addEventListener('click', () => { estadoGlobal.classList.add('hidden'); cargarCuentas(); });
            estadoGlobal.append(b);
            estadoGlobal.classList.remove('hidden');
            return;
        }
        selOrigen.replaceChildren(...cuentas.map(c => {
            const o = el('option', '', textoCuenta(c));
            o.value = c.id;
            return o;
        }));
        if (previa && cuentas.some(c => String(c.id) === previa)) selOrigen.value = previa;
        pintarHint();
    }

    inpMonto.addEventListener('input', () => {
        const digitos = inpMonto.value.replace(/\D/g, '').slice(0, 12);
        inpMonto.value = digitos ? new Intl.NumberFormat('es-CO').format(Number(digitos)) : '';
        errMonto.textContent = '';
    });
    selOrigen.addEventListener('change', () => { pintarHint(); errOrigen.textContent = ''; errMonto.textContent = ''; });

    // ---------- Punto 3: validar cuenta destino y mostrar titular ----------
    function pintarDestino(estado, dato) {
        boxDestino.replaceChildren();
        errDestino.textContent = '';
        if (!estado) { boxDestino.classList.add('hidden'); return; }

        boxDestino.className = `tr-destino tr-destino--${estado}`;
        const iconos = { cargando: 'fa-spinner fa-spin', ok: 'fa-circle-check', error: 'fa-circle-xmark' };
        const i = el('i', `fa-solid ${iconos[estado]}`);
        i.setAttribute('aria-hidden', 'true');
        const texto = el('div', 'tr-destino__texto');

        if (estado === 'ok') {
            texto.append(el('span', 'tr-destino__label', 'Titular de la cuenta'),
                el('strong', '', dato.titular),
                el('span', 'tr-destino__sub', `${TIPOS[dato.tipo]} · •••• ${ultimos4(dato.numero)}${dato.esPropia ? ' · Tu cuenta' : ''}`));
        } else {
            texto.append(el('span', '', dato));
        }
        boxDestino.append(i, texto);
    }

    async function verificar() {
        const mio = ++tokenDestino;
        const numero = inpNumero.value.replace(/\D/g, '');
        destino = null;
        if (!numero) { pintarDestino(null); return; }

        pintarDestino('cargando', 'Verificando cuenta…');
        try {
            const r = await buscarCuentaDestino(numero, selTipo.value);
            if (mio !== tokenDestino) return;
            destino = r;
            if (r) pintarDestino('ok', r);
            else pintarDestino('error', 'No encontramos una cuenta de ese tipo con ese número.');
        } catch (err) {
            if (mio !== tokenDestino) return;
            if (err instanceof SesionExpiradaError) return irALogin();
            pintarDestino('error', 'No pudimos verificar la cuenta. Intenta de nuevo.');
        }
    }

    function programarVerificacion() {
        tokenDestino++;           // invalida cualquier consulta en curso
        destino = null;
        clearTimeout(temporizador);
        if (!inpNumero.value.replace(/\D/g, '')) { pintarDestino(null); return; }
        pintarDestino('cargando', 'Verificando cuenta…');
        temporizador = setTimeout(verificar, 450);
    }

    inpNumero.addEventListener('input', () => {
        inpNumero.value = inpNumero.value.replace(/\D/g, '').slice(0, 16);
        programarVerificacion();
    });
    selTipo.addEventListener('change', programarVerificacion);

    // ---------- Continuar: valida y pasa al resumen ----------
    function mostrarErrorCampo(campo, mensaje) {
        const mapa = { origen: [errOrigen, selOrigen], destino: [errDestino, inpNumero], monto: [errMonto, inpMonto] };
        const [msg, input] = mapa[campo];
        msg.textContent = mensaje;
        input.focus();
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        [errOrigen, errDestino, errMonto].forEach(m => { m.textContent = ''; });

        if (!destino && inpNumero.value.trim()) { clearTimeout(temporizador); await verificar(); }

        const origen = cuentaSeleccionada();
        const monto = leerMonto();
        const v = validarTransferencia({ origen, destino, monto });
        if (!v.ok) {
            const esPorBloqueo = origen && (origen.bloqueada || origen.estado === 'BLOQUEADA' || (origen.tarjetaAsociada && origen.tarjetaAsociada.bloqueada));
            
            if (esPorBloqueo) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Tarjeta o Producto Bloqueado',
                        text: 'El producto o tarjeta seleccionada se encuentra bloqueada temporalmente. Desbloquéala desde Saldos para operar.',
                        background: '#12151c',
                        color: '#ffffff',
                        showCancelButton: true,
                        confirmButtonColor: '#e5a93c',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: '<i class="fa-solid fa-arrow-right"></i> Ir a Saldos',
                        cancelButtonText: 'Entendido'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = './Saldos.html';
                        }
                    });
                } else {
                    alert('El producto o tarjeta seleccionada se encuentra bloqueada temporalmente. Desbloquéala desde Saldos para operar.');
                }
            } else {
                mostrarErrorCampo(v.campo, v.mensaje);
            }
            return;
        }

        datos = { origen, destino, monto, concepto: inpConcepto.value.trim(), usaSobregiro: v.usaSobregiro };
        pintarResumen();
        irAPaso(2);
    });

    // ---------- Punto 4: resumen y confirmación ----------
    function pintarResumen() {
        const { origen, destino: d, monto, concepto, usaSobregiro, esAvanceTC } = datos;
        const saldoFinal = origen.saldo - monto;
        const labelSaldoFinal = origen.tipo === 'TARJETA_CREDITO' ? 'Cupo restante después del avance' : 'Saldo después de la operación';
        filas($('resumenLista'), [
            { label: 'Producto de origen', valor: textoCuenta(origen) },
            { label: 'Cuenta de destino', valor: d.titular, extra: `${TIPOS[d.tipo]} · •••• ${ultimos4(d.numero)}` },
            { label: esAvanceTC ? 'Monto del avance' : 'Monto a transferir', valor: formatoCOP.format(monto), destacado: true },
            { label: 'Concepto', valor: concepto || '—' },
            { label: labelSaldoFinal, valor: formatoCOP.format(saldoFinal), negativo: saldoFinal < 0 },
            { label: 'Costo', valor: 'Sin costo' }
        ]);
        resumenError.classList.add('hidden');
        resumenAlerta.classList.toggle('hidden', !usaSobregiro && !esAvanceTC);
        if (usaSobregiro) {
            resumenAlerta.textContent = `Atención: esta transferencia usa ${formatoCOP.format(monto - origen.saldo)} de tu sobregiro (hasta 20% sobre el saldo). Úsalo con cuidado.`;
        } else if (esAvanceTC) {
            resumenAlerta.textContent = `Operación de Avance: Se desembolsará el monto de tu Tarjeta de Crédito y se acreditará inmediatamente a la cuenta de destino.`;
        }
    }

    btnEditar.addEventListener('click', () => irAPaso(1));

    // ---------- Punto 5 y 6: ejecutar, descontar saldo, registrar movimiento y notificar ----------
    btnConfirmar.addEventListener('click', async () => {
        if (enProceso) return;          // evita doble envío
        enProceso = true;
        btnConfirmar.disabled = btnEditar.disabled = true;
        btnConfirmar.textContent = 'Procesando…';
        resumenError.classList.add('hidden');

        try {
            const r = await ejecutarTransferencia({
                origenId: datos.origen.id, destinoNumero: datos.destino.numero,
                destinoTipo: datos.destino.tipo, monto: datos.monto, concepto: datos.concepto
            });
            pintarExito(r);
            irAPaso(3);
            actualizarCampana();        // la notificación ya quedó guardada en localStorage
            mostrarToast('Transferencia exitosa. Revisa tus notificaciones.');
        } catch (err) {
            if (err instanceof SesionExpiradaError) return irALogin();
            resumenError.textContent = err.message || 'No se pudo completar la transferencia. Intenta de nuevo.';
            resumenError.classList.remove('hidden');
        } finally {
            enProceso = false;
            btnConfirmar.disabled = btnEditar.disabled = false;
            btnConfirmar.textContent = 'Confirmar transferencia';
        }
    });

    function pintarExito(r) {
        filas($('exitoLista'), [
            { label: 'Referencia', valor: r.referencia },
            { label: 'Enviado a', valor: r.destino.titular, extra: `${TIPOS[r.destino.tipo]} · •••• ${ultimos4(r.destino.numero)}` },
            { label: 'Monto', valor: formatoCOP.format(r.monto), destacado: true },
            { label: 'Nuevo saldo de la cuenta de origen', valor: formatoCOP.format(r.saldoOrigen), negativo: r.saldoOrigen < 0 },
            { label: 'Fecha', valor: formatoFechaHora.format(new Date(r.fecha)) }
        ]);
    }

    btnNueva.addEventListener('click', async () => {
        form.reset();
        tokenDestino++;
        destino = null; datos = null;
        pintarDestino(null);
        [errOrigen, errMonto].forEach(m => { m.textContent = ''; });
        await cargarCuentas();          // trae los saldos ya actualizados
        irAPaso(1);
    });

    cargarCuentas();
});
