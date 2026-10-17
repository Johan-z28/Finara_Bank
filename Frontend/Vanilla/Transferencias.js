// Vanilla/Transferencias.js

import {
    TIPOS, formatoCOP, calcularDisponible, obtenerCuentasOrigen, buscarCuentaDestino,
    validarTransferencia, ejecutarTransferencia, SesionExpiradaError
} from './transferenciasService.js';

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function el(tag, clase, texto) {
    const n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
}

const ultimos4 = numero => String(numero).replace(/\D/g, '').slice(-4);
const soloDigitos = v => String(v ?? '').replace(/\D/g, '');
const textoCuenta = c => `${TIPOS[c.tipo] || c.tipo} · •••• ${ultimos4(c.numero)}`;

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

export async function initTransferenciasView() {
    let modNotif = null;
    try {
        modNotif = await import('./notificaciones.js');
        if (modNotif && modNotif.initCampanaNotificaciones) {
            modNotif.initCampanaNotificaciones();
        }
    } catch {}

    const $ = id => document.getElementById(id);
    const form = $('formTransferencia');
    
    if (!form) return;

    const selOrigen = $('trOrigen'), selTipo = $('trTipoDestino'), selBanco =$('bancoDestinoSelect');
    const inpNumero = $('trNumeroDestino'), inpMonto = $('trMonto'), inpConcepto =$('trConcepto');
    const hintOrigen = $('trOrigenHint'), boxDestino =$('trDestino');
    const trOrigenCard = $('trOrigenCard'), trCardTipo =$('trCardTipo'), trCardSaldo = $('trCardSaldo'), trCardBadge =$('trCardBadge');
    const btnTransferirTodo = $('btnTransferirTodo'), chipsMonto =$('chipsMonto');
    const errOrigen = $('errOrigen'), errDestino = $('errDestino'), errMonto =$('errMonto');
    const vistas = { 1: $('vistaForm'), 2: $('vistaResumen'), 3:$('vistaExito') };
    const pasos = document.querySelectorAll('.tr-paso');
    const btnEditar = $('btnEditar'), btnConfirmar =$('btnConfirmar'), btnNueva = $('btnNueva'), btnContinuar =$('btnContinuar');
    const resumenError = $('resumenError'), resumenAlerta =$('resumenAlerta');
    const estadoGlobal = $('trEstado'), toast =$('trToast');

    let cuentas = [];
    let destino = null;
    let datos = null;
    let tokenDestino = 0;
    let temporizador = null;
    let enProceso = false;

    const irALogin = () => { window.location.href = '../index.html'; };

    function irAPaso(n) {
        Object.entries(vistas).forEach(([k, v]) => {
            if (v) v.classList.toggle('hidden', Number(k) !== n);
        });
        pasos.forEach(p => {
            const num = Number(p.dataset.paso);
            p.classList.toggle('activo', num === n);
            p.classList.toggle('completo', num < n);
            p.setAttribute('aria-current', num === n ? 'step' : 'false');
        });
        if (vistas[n]) {
            const titulo = vistas[n].querySelector('h2');
            if (titulo) {
                titulo.tabIndex = -1;
                titulo.focus();
            }
        }
    }

    function mostrarToast(mensaje) {
        if (!toast) return;
        toast.textContent = mensaje;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 3500);
    }

    const cuentaSeleccionada = () => cuentas.find(c => String(c.id) === selOrigen.value);
    const leerMonto = () => Number(inpMonto.value.replace(/\D/g, '')) || 0;

    function pintarHint() {
        const c = cuentaSeleccionada();
        if (!c) {
            if (hintOrigen) hintOrigen.textContent = '';
            if (trOrigenCard) trOrigenCard.style.display = 'none';
            return;
        }

        const estaBloqueada = Boolean(c.bloqueada || c.estado === 'BLOQUEADA' || (c.tarjetaAsociada && c.tarjetaAsociada.bloqueada));
        const disponible = calcularDisponible(c);
        let badgeTexto = 'Disponible';
        let saldoStr = formatoCOP.format(disponible);

        if (estaBloqueada) {
            badgeTexto = 'Bloqueada';
            if (hintOrigen) hintOrigen.textContent = `Cuenta o tarjeta bloqueada temporalmente. Desbloquéala desde Saldos para transferir.`;
        } else if (c.tipo === 'TARJETA_CREDITO') {
            if (hintOrigen) hintOrigen.textContent = `Cupo total de compras: ${formatoCOP.format(c.saldo)} · Avance permitido (50% del cupo): ${formatoCOP.format(disponible)}`;
            badgeTexto = 'Cupo Avance (50%)';
        } else if (c.tipo === 'CORRIENTE') {
            const extra = ' (incluye sobregiro del 20%)';
            if (hintOrigen) hintOrigen.textContent = `Saldo: ${formatoCOP.format(c.saldo)} · Disponible: ${formatoCOP.format(disponible)}${extra}`;
            badgeTexto = 'Disponible + Sobregiro';
        } else {
            if (hintOrigen) hintOrigen.textContent = `Saldo: ${formatoCOP.format(c.saldo)} · Disponible: ${formatoCOP.format(disponible)}`;
            badgeTexto = 'Disponible';
        }

        if (trOrigenCard) {
            trOrigenCard.style.display = 'flex';
            if (trCardTipo) trCardTipo.textContent = `${TIPOS[c.tipo] || c.tipo} · •••• ${ultimos4(c.numero)}`;
            if (trCardSaldo) trCardSaldo.textContent = saldoStr;
            if (trCardBadge) {
                trCardBadge.textContent = badgeTexto;
                trCardBadge.classList.toggle('tr-origen-card__badge--bloqueada', estaBloqueada);
            }
            trOrigenCard.classList.toggle('tr-origen-card--bloqueada', estaBloqueada);
            const iconEl = trOrigenCard.querySelector('.tr-origen-card__icon i');
            if (iconEl) {
                iconEl.className = estaBloqueada ? 'fa-solid fa-lock' : 'fa-solid fa-building-columns';
            }
        }

        if (inpNumero && inpNumero.value.trim()) {
            verificar();
        }
    }

    async function cargarCuentas() {
        const previa = selOrigen ? selOrigen.value : '';
        if (estadoGlobal) estadoGlobal.classList.add('hidden');

        try {
            const rawCuentas = await obtenerCuentasOrigen();
            cuentas = rawCuentas;
            
            if (cuentas.length === 0) {
                if (estadoGlobal) {
                    estadoGlobal.replaceChildren(el('p', '', 'No tienes cuentas o productos activos guardados en tu perfil. Solicita uno desde la sección Solicitar Producto.'));
                    estadoGlobal.classList.remove('hidden');
                }
                if (selOrigen) selOrigen.replaceChildren();
                pintarHint();
                return;
            }
        } catch (err) {
            if (err instanceof SesionExpiradaError) return irALogin();
            if (estadoGlobal) {
                estadoGlobal.replaceChildren(el('p', '', 'Ocurrió un problema leyendo los datos de tu navegador.'));
                estadoGlobal.classList.remove('hidden');
            }
            return;
        }

        if (selOrigen && cuentas.length > 0) {
            selOrigen.replaceChildren(...cuentas.map(c => {
                const o = el('option', '', textoCuenta(c));
                o.value = c.id;
                return o;
            }));
            if (previa && cuentas.some(c => String(c.id) === previa)) {
                selOrigen.value = previa;
            } else {
                selOrigen.selectedIndex = 0;
            }
        }

        pintarHint();
    }

    function actualizarChipsActivos(montoActual) {
        if (!chipsMonto) return;
        chipsMonto.querySelectorAll('.tr-chip').forEach(btn => {
            const val = Number(btn.dataset.monto);
            btn.classList.toggle('activo', val === montoActual);
        });
    }

    if (inpMonto) {
        inpMonto.addEventListener('input', () => {
            const digitos = inpMonto.value.replace(/\D/g, '').slice(0, 12);
            const num = Number(digitos) || 0;
            inpMonto.value = digitos ? new Intl.NumberFormat('es-CO').format(num) : '';
            if (errMonto) errMonto.textContent = '';
            actualizarChipsActivos(num);
        });
    }

    if (chipsMonto) {
        chipsMonto.querySelectorAll('.tr-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const monto = Number(btn.dataset.monto);
                if (inpMonto) inpMonto.value = new Intl.NumberFormat('es-CO').format(monto);
                if (errMonto) errMonto.textContent = '';
                actualizarChipsActivos(monto);
                if (inpMonto) inpMonto.focus();
            });
        });
    }

    if (btnTransferirTodo) {
        btnTransferirTodo.addEventListener('click', () => {
            const c = cuentaSeleccionada();
            if (!c) return;
            const disp = Math.max(0, calcularDisponible(c));
            if (disp > 0 && inpMonto) {
                inpMonto.value = new Intl.NumberFormat('es-CO').format(disp);
                if (errMonto) errMonto.textContent = '';
                actualizarChipsActivos(disp);
                inpMonto.focus();
            }
        });
    }

    if (selOrigen) {
        selOrigen.addEventListener('change', () => { 
            pintarHint(); 
            if (errOrigen) errOrigen.textContent = ''; 
            if (errMonto) errMonto.textContent = ''; 
        });
    }

    function pintarDestino(estado, dato, mensajeInvalido = null) {
        if (!boxDestino) return;
        boxDestino.replaceChildren();
        if (errDestino) errDestino.textContent = '';
        if (!estado) { boxDestino.classList.add('hidden'); return; }

        boxDestino.classList.remove('hidden');

        const esInvalida = Boolean(mensajeInvalido);
        const estadoFinal = esInvalida ? 'error' : estado;

        boxDestino.className = `tr-destino tr-destino--${estadoFinal}`;
        
        if (estadoFinal === 'error' || esInvalida) {
            boxDestino.style.background = 'rgba(239, 68, 68, 0.1)';
            boxDestino.style.border = '1px solid #ef4444';
            boxDestino.style.color = '#f87171';
        } else if (estadoFinal === 'ok') {
            boxDestino.style.background = 'rgba(16, 185, 129, 0.1)';
            boxDestino.style.border = '1px solid #10b981';
            boxDestino.style.color = '#34d399';
        } else {
            boxDestino.style.background = '';
            boxDestino.style.border = '';
            boxDestino.style.color = '';
        }

        const iconos = { cargando: 'fa-spinner fa-spin', ok: 'fa-circle-check', error: 'fa-circle-xmark' };
        const i = el('i', `fa-solid ${esInvalida ? 'fa-triangle-exclamation' : iconos[estadoFinal]}`);
        i.setAttribute('aria-hidden', 'true');
        const texto = el('div', 'tr-destino__texto');

        if (estado === 'ok') {
            const estaBloqueada = Boolean(dato.bloqueada || dato.estado === 'BLOQUEADA');
            const headerTitular = el('div', 'tr-destino__header-titular');
            headerTitular.append(el('strong', '', dato.titular));

            if (estaBloqueada) {
                const badgeBloqueo = el('span', 'tr-destino__badge-bloqueada', 'Bloqueada');
                badgeBloqueo.style.cssText = 'background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;';
                headerTitular.append(badgeBloqueo);
            }

            texto.append(
                el('span', 'tr-destino__label', 'Titular de la cuenta'),
                headerTitular,
                el('span', 'tr-destino__sub', `${TIPOS[dato.tipo] || dato.tipo} · •••• ${ultimos4(dato.numero)}${dato.esPropia ? ' · Tu cuenta' : ''}`)
            );

            if (esInvalida && errDestino) {
                errDestino.textContent = mensajeInvalido;
            }
        } else {
            texto.append(el('span', '', dato));
        }

        boxDestino.append(i, texto);
    }

    async function verificar() {
        const mio = ++tokenDestino;
        const numero = inpNumero ? soloDigitos(inpNumero.value) : '';
        destino = null;
        if (!numero) { pintarDestino(null); return; }

        pintarDestino('cargando', 'Verificando cuenta…');
        try {
            const r = await buscarCuentaDestino(numero, selTipo ? selTipo.value : 'AHORROS');
            if (mio !== tokenDestino) return;
            destino = r;

            if (r) {
                const origenActual = cuentaSeleccionada();
                const numOrigenLimpio = origenActual ? soloDigitos(origenActual.numero) : '';
                const numDestinoLimpio = soloDigitos(r.numero);
                const estaBloqueada = Boolean(r.bloqueada || r.estado === 'BLOQUEADA');

                let mensajeInvalido = null;

                if (numOrigenLimpio === numDestinoLimpio || (origenActual && origenActual.id === r.id)) {
                    mensajeInvalido = 'No puedes transferir al mismo producto de origen.';
                } else if (estaBloqueada) {
                    mensajeInvalido = 'La cuenta de destino se encuentra bloqueada temporalmente. No es posible recibir transferencias.';
                }

                pintarDestino('ok', r, mensajeInvalido);
            } else {
                pintarDestino('error', 'No encontramos una cuenta con ese número.');
            }
        } catch (err) {
            if (mio !== tokenDestino) return;
            if (err instanceof SesionExpiradaError) return irALogin();
            pintarDestino('error', 'No pudimos verificar la cuenta. Intenta de nuevo.');
        }
    }

    function programarVerificacion() {
        tokenDestino++;
        destino = null;
        clearTimeout(temporizador);
        if (!inpNumero || !soloDigitos(inpNumero.value)) { pintarDestino(null); return; }
        pintarDestino('cargando', 'Verificando cuenta…');
        temporizador = setTimeout(verificar, 450);
    }

    // 🚀 INTERCEPCIÓN DE PEGADO (PASTE) E INPUT MANUAL
    if (inpNumero) {
        inpNumero.addEventListener('paste', (e) => {
            e.preventDefault();
            const textoPegado = (e.clipboardData || window.clipboardData).getData('text');
            const soloNumeros = soloDigitos(textoPegado).slice(0, 16);
            const formateado = soloNumeros.replace(/(\d{4})(?=\d)/g, '$1 ');
            inpNumero.value = formateado;
            programarVerificacion();
        });

        inpNumero.addEventListener('input', () => {
            const soloNumeros = soloDigitos(inpNumero.value).slice(0, 16);
            const formateado = soloNumeros.replace(/(\d{4})(?=\d)/g, '$1 ');
            inpNumero.value = formateado;
            programarVerificacion();
        });
    }

    if (selTipo) selTipo.addEventListener('change', programarVerificacion);

    function mostrarErrorCampo(campo, mensaje) {
        const mapa = { origen: [errOrigen, selOrigen], destino: [errDestino, inpNumero], monto: [errMonto, inpMonto] };
        const [msg, input] = mapa[campo] || [];
        if (msg) msg.textContent = mensaje;
        if (input) input.focus();
    }

    async function procesarEnvioFormulario(e) {
        if (e) e.preventDefault();
        [errOrigen, errDestino, errMonto].forEach(m => { if (m) m.textContent = ''; });

        if (!destino && inpNumero && inpNumero.value.trim()) { 
            clearTimeout(temporizador); 
            await verificar(); 
        }

        const origen = cuentaSeleccionada();
        const monto = leerMonto();
        const v = validarTransferencia({ origen, destino, monto });

        if (!v.ok) {
            mostrarErrorCampo(v.campo, v.mensaje);

            if (window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'Operación no permitida',
                    text: v.mensaje,
                    background: '#12151c',
                    color: '#ffffff',
                    confirmButtonColor: '#e5a93c',
                    confirmButtonText: 'Entendido'
                });
            } else {
                alert(v.mensaje);
            }
            return;
        }

        datos = { 
            origen, 
            destino, 
            monto, 
            concepto: inpConcepto ? inpConcepto.value.trim() : '', 
            usaSobregiro: v.usaSobregiro, 
            esAvanceTC: v.esAvanceTC 
        };
        
        pintarResumen();
        irAPaso(2);
    }

    form.addEventListener('submit', procesarEnvioFormulario);
    if (btnContinuar) {
        btnContinuar.addEventListener('click', procesarEnvioFormulario);
    }

    function pintarResumen() {
        const { origen, destino: d, monto, concepto, usaSobregiro, esAvanceTC } = datos;
        
        const saldoActualNum = typeof origen.saldo === 'number'
            ? origen.saldo
            : Number(String(origen.saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;

        const saldoCalculado = saldoActualNum - monto;
        const labelSaldoFinal = origen.tipo === 'TARJETA_CREDITO' ? 'Cupo restante después del avance' : 'Saldo después de la operación';
        
        const resumenLista = $('resumenLista');
        if (resumenLista) {
            filas(resumenLista, [
                { label: 'Producto de origen', valor: textoCuenta(origen) },
                { label: 'Cuenta de destino', valor: d.titular, extra: `${TIPOS[d.tipo] || d.tipo} · •••• ${ultimos4(d.numero)}` },
                { label: esAvanceTC ? 'Monto del avance' : 'Monto a transferir', valor: formatoCOP.format(monto), destacado: true },
                { label: 'Concepto', valor: concepto || '—' },
                { label: labelSaldoFinal, valor: formatoCOP.format(saldoCalculado), negativo: saldoCalculado < 0 },
                { label: 'Costo', valor: 'Sin costo' }
            ]);
        }
        if (resumenError) resumenError.classList.add('hidden');
        if (resumenAlerta) {
            resumenAlerta.classList.toggle('hidden', !usaSobregiro && !esAvanceTC);
            if (usaSobregiro) {
                resumenAlerta.textContent = `Atención: esta transferencia usa ${formatoCOP.format(monto - saldoActualNum)} de tu sobregiro. Úsalo con cuidado.`;
            } else if (esAvanceTC) {
                resumenAlerta.textContent = `Operación de Avance: Se desembolsará el monto de tu Tarjeta de Crédito y se acreditará inmediatamente.`;
            }
        }
    }

    if (btnEditar) btnEditar.addEventListener('click', () => irAPaso(1));

    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', async () => {
            if (enProceso) return;
            enProceso = true;
            btnConfirmar.disabled = btnEditar.disabled = true;
            btnConfirmar.textContent = 'Procesando…';
            if (resumenError) resumenError.classList.add('hidden');

            try {
                const r = await ejecutarTransferencia({
                    origenId: datos.origen.id, destinoNumero: datos.destino.numero,
                    destinoTipo: datos.destino.tipo, monto: datos.monto, concepto: datos.concepto
                });

                try {
                    let movimientos = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
                    const perfilActivo = JSON.parse(localStorage.getItem('userProfile')) || {};
                    const usuarioActual = perfilActivo.username || datos.origen.username || 'maria17';

                    movimientos.unshift({
                        id: `MOV-OUT-${Date.now()}`,
                        fecha: new Date().toISOString(),
                        descripcion: `Transferencia enviada a ${datos.destino.titular}`,
                        categoria: 'Transferencia',
                        tipo: 'EGRESO',
                        valor: datos.monto,
                        cuentaId: datos.origen.id,
                        numeroCuenta: datos.origen.numero,
                        usuario: usuarioActual
                    });

                    movimientos.unshift({
                        id: `MOV-IN-${Date.now()}`,
                        fecha: new Date().toISOString(),
                        descripcion: `Transferencia recibida de ${usuarioActual}`,
                        categoria: 'Transferencia',
                        tipo: 'INGRESO',
                        valor: datos.monto,
                        cuentaId: datos.destino.id || 'CTA-DESTINO',
                        numeroCuenta: datos.destino.numero,
                        usuario: datos.destino.titular || 'Destino'
                    });

                    localStorage.setItem('finara_movimientos', JSON.stringify(movimientos));
                } catch (e) {
                    console.error("Error guardando movimiento:", e);
                }

                pintarExito(r);
                irAPaso(3);
                if (modNotif && modNotif.actualizarCampana) {
                    try { modNotif.actualizarCampana(); } catch {}
                }
                mostrarToast('Transferencia exitosa. Revisa tus notificaciones.');
            } catch (err) {
                if (err instanceof SesionExpiradaError) return irALogin();
                if (resumenError) {
                    resumenError.textContent = err.message || 'No se pudo completar la transferencia. Intenta de nuevo.';
                    resumenError.classList.remove('hidden');
                }
            } finally {
                enProceso = false;
                btnConfirmar.disabled = btnEditar.disabled = false;
                btnConfirmar.textContent = 'Confirmar transferencia';
            }
        });
    }

    function pintarExito(r) {
        const exitoLista = $('exitoLista');
        if (!exitoLista) return;
        filas(exitoLista, [
            { label: 'Referencia', valor: r.referencia },
            { label: 'Enviado a', valor: r.destino.titular, extra: `${TIPOS[r.destino.tipo] || r.destino.tipo} · •••• ${ultimos4(r.destino.numero)}` },
            { label: 'Monto', valor: formatoCOP.format(r.monto), destacado: true },
            { label: 'Nuevo saldo de la cuenta de origen', valor: formatoCOP.format(r.saldoOrigen), negativo: r.saldoOrigen < 0 },
            { label: 'Fecha', valor: formatoFechaHora.format(new Date(r.fecha)) }
        ]);
    }

    if (btnNueva) {
        btnNueva.addEventListener('click', async () => {
            form.reset();
            tokenDestino++;
            destino = null; datos = null;
            pintarDestino(null);
            [errOrigen, errMonto].forEach(m => { if (m) m.textContent = ''; });
            await cargarCuentas();
            irAPaso(1);
        });
    }

    await cargarCuentas();
}

document.addEventListener('DOMContentLoaded', () => {
    initTransferenciasView();
});