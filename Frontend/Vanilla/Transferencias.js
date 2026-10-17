import { initGlobalComponents } from './Global/app.js';
let initCampanaNotificaciones = () => {};
let actualizarCampana = () => {};
import('./notificaciones.js')
    .then(modNotif => {
        if (modNotif) {
            initCampanaNotificaciones = modNotif.initCampanaNotificaciones || initCampanaNotificaciones;
            actualizarCampana = modNotif.actualizarCampana || actualizarCampana;
        }
    })
        // Si el módulo está desacoplado, opera normalmente sin bloquear transferencias
    });
import {
    TIPOS, formatoCOP, calcularDisponible, obtenerCuentasOrigen, buscarCuentaDestino,
    validarTransferencia, ejecutarTransferencia, SesionExpiradaError, COMISION_INTERBANCARIA
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
    const trOrigenCard = $('trOrigenCard'), trCardTipo = $('trCardTipo'), trCardSaldo = $('trCardSaldo'), trCardBadge = $('trCardBadge');
    const btnTransferirTodo = $('btnTransferirTodo'), chipsMonto = $('chipsMonto');
    const errOrigen = $('errOrigen'), errDestino = $('errDestino'), errMonto = $('errMonto');
    
    // Elementos interbancarios (HU-07)
    const tabFinara = $('tabFinara'), tabOtroBanco = $('tabOtroBanco'), trModalidad = $('trModalidad');
    const campoBancoDestino = $('campoBancoDestino'), selBancoDestino = $('trBancoDestino'), errBancoDestino = $('errBancoDestino');
    const camposBeneficiarioInterbancario = $('camposBeneficiarioInterbancario');
    const inpBeneficiarioNombre = $('trBeneficiarioNombre'), errBeneficiarioNombre = $('errBeneficiarioNombre');
    const inpBeneficiarioDocumento = $('trBeneficiarioDocumento'), errBeneficiarioDocumento = $('errBeneficiarioDocumento');

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

    // ---------- Manejo de Pestañas Finara vs Interbancario (HU-07) ----------
    function esModoInterbancario() {
        return trModalidad ? trModalidad.value === 'INTERBANCARIO' : false;
    }

    function cambiarModalidad(modo) {
        if (!trModalidad) return;
        trModalidad.value = modo;

        const esInter = modo === 'INTERBANCARIO';
        if (tabFinara && tabOtroBanco) {
            tabFinara.classList.toggle('activo', !esInter);
            tabFinara.setAttribute('aria-selected', !esInter ? 'true' : 'false');
            tabOtroBanco.classList.toggle('activo', esInter);
            tabOtroBanco.setAttribute('aria-selected', esInter ? 'true' : 'false');
        }

        if (campoBancoDestino) campoBancoDestino.classList.toggle('hidden', !esInter);
        if (camposBeneficiarioInterbancario) camposBeneficiarioInterbancario.classList.toggle('hidden', !esInter);

        // Limpiar errores y reseteo de destino
        limpiarErrores();
        tokenDestino++;
        destino = null;

        if (esInter) {
            actualizarPreviewInterbancario();
        } else {
            pintarDestino(null);
            if (inpNumero.value.trim()) {
                programarVerificacion();
            }
        }
    }

    if (tabFinara && tabOtroBanco) {
        tabFinara.addEventListener('click', () => cambiarModalidad('FINARA'));
        tabOtroBanco.addEventListener('click', () => cambiarModalidad('INTERBANCARIO'));
    }

    function actualizarPreviewInterbancario() {
        if (!esModoInterbancario()) return;
        const banco = selBancoDestino ? selBancoDestino.value : '';
        const num = inpNumero.value.replace(/\D/g, '');
        const titular = inpBeneficiarioNombre ? inpBeneficiarioNombre.value.trim() : '';

        if (!banco && !num && !titular) {
            pintarDestino(null);
            return;
        }

        boxDestino.replaceChildren();
        boxDestino.className = 'tr-destino tr-destino--ok';
        const i = el('i', 'fa-solid fa-building-columns');
        i.setAttribute('aria-hidden', 'true');
        const texto = el('div', 'tr-destino__texto');

        const header = el('div', 'tr-destino__header-titular');
        header.append(el('strong', '', titular || 'Beneficiario interbancario'));
        if (banco) {
            const badgeBanco = el('span', 'tr-destino__badge-bloqueada', banco);
            badgeBanco.style.background = 'rgba(229, 169, 60, 0.15)';
            badgeBanco.style.borderColor = 'rgba(229, 169, 60, 0.4)';
            badgeBanco.style.color = '#e5a93c';
            header.append(badgeBanco);
        }

        const tipoTxt = TIPOS[selTipo.value] || 'Cuenta';
        const numTxt = num ? `•••• ${ultimos4(num)}` : '••••';
        texto.append(
            el('span', 'tr-destino__label', `Red Interbancaria ACH · ${banco || 'Selecciona un banco'}`),
            header,
            el('span', 'tr-destino__sub', `${tipoTxt} · ${numTxt} · Tarifa ACH: ${formatoCOP.format(COMISION_INTERBANCARIA)}`)
        );
        boxDestino.append(i, texto);
    }

    if (selBancoDestino) {
        selBancoDestino.addEventListener('change', () => {
            if (errBancoDestino) errBancoDestino.textContent = '';
            actualizarPreviewInterbancario();
        });
    }

    if (inpBeneficiarioNombre) {
        inpBeneficiarioNombre.addEventListener('input', () => {
            if (errBeneficiarioNombre) errBeneficiarioNombre.textContent = '';
            actualizarPreviewInterbancario();
        });
    }

    if (inpBeneficiarioDocumento) {
        inpBeneficiarioDocumento.addEventListener('input', () => {
            inpBeneficiarioDocumento.value = inpBeneficiarioDocumento.value.replace(/\D/g, '').slice(0, 15);
            if (errBeneficiarioDocumento) errBeneficiarioDocumento.textContent = '';
        });
    }

    function limpiarErrores() {
        [errOrigen, errDestino, errMonto].forEach(m => { if (m) m.textContent = ''; });
        if (errBancoDestino) errBancoDestino.textContent = '';
        if (errBeneficiarioNombre) errBeneficiarioNombre.textContent = '';
        if (errBeneficiarioDocumento) errBeneficiarioDocumento.textContent = '';
    }

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
        if (!c) {
            hintOrigen.textContent = '';
            if (trOrigenCard) trOrigenCard.style.display = 'none';
            return;
        }

        const estaBloqueada = Boolean(c.bloqueada || c.estado === 'BLOQUEADA' || (c.tarjetaAsociada && c.tarjetaAsociada.bloqueada));
        const disponible = calcularDisponible(c);
        let badgeTexto = 'Disponible';
        let saldoStr = formatoCOP.format(disponible);

        if (estaBloqueada) {
            badgeTexto = 'Bloqueada';
            hintOrigen.textContent = `Cuenta o tarjeta bloqueada temporalmente. Desbloquéala desde Saldos para transferir.`;
        } else if (c.tipo === 'TARJETA_CREDITO') {
            hintOrigen.textContent = `Cupo total de compras: ${formatoCOP.format(c.saldo)} · Avance permitido (50% del cupo): ${formatoCOP.format(disponible)}`;
            badgeTexto = 'Cupo Avance (50%)';
        } else if (c.tipo === 'CORRIENTE') {
            const extra = ' (incluye sobregiro del 20%)';
            hintOrigen.textContent = `Saldo: ${formatoCOP.format(c.saldo)} · Disponible: ${formatoCOP.format(disponible)}${extra}`;
            badgeTexto = 'Disponible + Sobregiro';
        } else {
            hintOrigen.textContent = `Saldo: ${formatoCOP.format(c.saldo)} · Disponible: ${formatoCOP.format(disponible)}`;
            badgeTexto = 'Disponible';
        }

        if (trOrigenCard) {
            trOrigenCard.style.display = 'flex';
            if (trCardTipo) trCardTipo.textContent = `${TIPOS[c.tipo]} · •••• ${ultimos4(c.numero)}`;
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
    }

    async function cargarCuentas() {
        const previa = selOrigen.value;
        try {
            const rawCuentas = await obtenerCuentasOrigen();
            // Desduplicar estrictamente por número y tipo
            const cuentasUnicas = [];
            const vistos = new Set();
            for (const c of rawCuentas) {
                const clave = `${c.tipo}_${String(c.numero || '').replace(/\D/g, '')}`;
                if (!vistos.has(clave)) {
                    vistos.add(clave);
                    cuentasUnicas.push(c);
                }
            }
            cuentas = cuentasUnicas;
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

    function actualizarChipsActivos(montoActual) {
        if (!chipsMonto) return;
        chipsMonto.querySelectorAll('.tr-chip').forEach(btn => {
            const val = Number(btn.dataset.monto);
            btn.classList.toggle('activo', val === montoActual);
        });
    }

    inpMonto.addEventListener('input', () => {
        const digitos = inpMonto.value.replace(/\D/g, '').slice(0, 12);
        const num = Number(digitos) || 0;
        inpMonto.value = digitos ? new Intl.NumberFormat('es-CO').format(num) : '';
        errMonto.textContent = '';
        actualizarChipsActivos(num);
    });

    if (chipsMonto) {
        chipsMonto.querySelectorAll('.tr-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const monto = Number(btn.dataset.monto);
                inpMonto.value = new Intl.NumberFormat('es-CO').format(monto);
                errMonto.textContent = '';
                actualizarChipsActivos(monto);
                inpMonto.focus();
            });
        });
    }

    if (btnTransferirTodo) {
        btnTransferirTodo.addEventListener('click', () => {
            const c = cuentaSeleccionada();
            if (!c) return;
            const comision = esModoInterbancario() ? COMISION_INTERBANCARIA : 0;
            const disp = Math.max(0, calcularDisponible(c) - comision);
            if (disp > 0) {
                inpMonto.value = new Intl.NumberFormat('es-CO').format(disp);
                errMonto.textContent = '';
                actualizarChipsActivos(disp);
                inpMonto.focus();
            }
        });
    }

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
            const estaBloqueada = Boolean(dato.bloqueada || dato.estado === 'BLOQUEADA');
            const badgeBloqueo = estaBloqueada
                ? el('span', 'tr-destino__badge-bloqueada', 'Bloqueada')
                : null;

            const headerTitular = el('div', 'tr-destino__header-titular');
            headerTitular.append(el('strong', '', dato.titular));
            if (badgeBloqueo) headerTitular.append(badgeBloqueo);

            texto.append(
                el('span', 'tr-destino__label', 'Titular de la cuenta'),
                headerTitular,
                el('span', 'tr-destino__sub', `${TIPOS[dato.tipo]} · •••• ${ultimos4(dato.numero)}${dato.esPropia ? ' · Tu cuenta' : ''}${estaBloqueada ? ' · No disponible para transferencias' : ''}`)
            );
            if (estaBloqueada) {
                boxDestino.classList.add('tr-destino--bloqueada');
                i.className = 'fa-solid fa-lock';
            }
        } else {
            texto.append(el('span', '', dato));
        }
        boxDestino.append(i, texto);
    }

    async function verificar() {
        if (esModoInterbancario()) return;
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
        if (esModoInterbancario()) {
            actualizarPreviewInterbancario();
            return;
        }
        tokenDestino++;           // invalida cualquier consulta en curso
        destino = null;
        clearTimeout(temporizador);
        if (!inpNumero.value.replace(/\D/g, '')) { pintarDestino(null); return; }
        pintarDestino('cargando', 'Verificando cuenta…');
        temporizador = setTimeout(verificar, 450);
    }

    inpNumero.addEventListener('input', () => {
        inpNumero.value = inpNumero.value.replace(/\D/g, '').slice(0, 20);
        programarVerificacion();
    });
    selTipo.addEventListener('change', programarVerificacion);

    // ---------- Continuar: valida y pasa al resumen ----------
    function mostrarErrorCampo(campo, mensaje) {
        const mapa = {
            origen: [errOrigen, selOrigen],
            destino: [errDestino, inpNumero],
            banco: [errBancoDestino, selBancoDestino],
            beneficiario: [errBeneficiarioNombre, inpBeneficiarioNombre],
            documento: [errBeneficiarioDocumento, inpBeneficiarioDocumento],
            monto: [errMonto, inpMonto]
        };
        const [msg, input] = mapa[campo] || [errDestino, inpNumero];
        if (msg) msg.textContent = mensaje;
        if (input) input.focus();
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        limpiarErrores();

        const esInterbancaria = esModoInterbancario();
        const numero = inpNumero.value.replace(/\D/g, '');

        if (esInterbancaria) {
            const banco = selBancoDestino ? selBancoDestino.value : '';
            const titular = inpBeneficiarioNombre ? inpBeneficiarioNombre.value.trim() : '';
            const documento = inpBeneficiarioDocumento ? inpBeneficiarioDocumento.value.trim() : '';

            if (!banco) {
                mostrarErrorCampo('banco', 'Selecciona la entidad bancaria receptora.');
                return;
            }
            if (!numero || numero.length < 5) {
                mostrarErrorCampo('destino', 'Ingresa un número de cuenta destino válido.');
                return;
            }
            if (!titular || titular.length < 3) {
                mostrarErrorCampo('beneficiario', 'Ingresa el nombre completo del beneficiario.');
                return;
            }
            if (!documento || documento.length < 5) {
                mostrarErrorCampo('documento', 'Ingresa el documento de identidad del beneficiario.');
                return;
            }

            destino = {
                banco,
                titular,
                documento,
                tipo: selTipo.value,
                numero,
                esPropia: false
            };
        } else {
            if (!destino && numero) {
                clearTimeout(temporizador);
                await verificar();
            }
        }

        const origen = cuentaSeleccionada();
        const monto = leerMonto();
        const v = validarTransferencia({ origen, destino, monto, esInterbancaria });
        if (!v.ok) {
            const esPorBloqueoOrigen = origen && (origen.bloqueada || origen.estado === 'BLOQUEADA' || (origen.tarjetaAsociada && origen.tarjetaAsociada.bloqueada));
            const esPorBloqueoDestino = !esInterbancaria && destino && (destino.bloqueada || destino.estado === 'BLOQUEADA');

            if (esPorBloqueoOrigen) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Tarjeta o Producto Bloqueado',
                        text: 'El producto o tarjeta de origen se encuentra bloqueada temporalmente. Desbloquéala desde Saldos para operar.',
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
                    alert('El producto o tarjeta de origen se encuentra bloqueada temporalmente. Desbloquéala desde Saldos para operar.');
                }
            } else if (esPorBloqueoDestino) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Cuenta Destino Bloqueada',
                        text: `La cuenta de ${destino.titular} se encuentra bloqueada temporalmente y no puede recibir transferencias en este momento.`,
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: 'Entendido'
                    });
                } else {
                    alert(`La cuenta de destino se encuentra bloqueada temporalmente y no puede recibir transferencias.`);
                }
            } else {
                mostrarErrorCampo(v.campo, v.mensaje);
            }
            return;
        }

        datos = {
            origen,
            destino,
            monto,
            concepto: inpConcepto.value.trim(),
            usaSobregiro: v.usaSobregiro,
            esAvanceTC: v.esAvanceTC,
            esInterbancaria,
            comision: v.comision || 0,
            totalADebitar: v.totalADebitar || (monto + (v.comision || 0))
        };
        pintarResumen();
        irAPaso(2);
    });

    // ---------- Punto 4: resumen y desglose de costos previo a la confirmación (HU-07) ----------
    function pintarResumen() {
        const { origen, destino: d, monto, concepto, usaSobregiro, esAvanceTC, esInterbancaria, comision, totalADebitar } = datos;
        const saldoFinal = origen.saldo - totalADebitar;
        const labelSaldoFinal = origen.tipo === 'TARJETA_CREDITO' ? 'Cupo restante después de la operación' : 'Saldo después de la operación';

        const filasResumen = [
            { label: 'Producto de origen', valor: textoCuenta(origen) }
        ];

        if (esInterbancaria) {
            filasResumen.push(
                { label: 'Entidad bancaria destino', valor: d.banco },
                { label: 'Beneficiario', valor: d.titular, extra: `Doc: ${d.documento}` },
                { label: 'Cuenta destino', valor: `${TIPOS[d.tipo]} · •••• ${ultimos4(d.numero)}` },
                { label: 'Monto a transferir', valor: formatoCOP.format(monto), destacado: true },
                { label: 'Comisión red interbancaria (ACH)', valor: formatoCOP.format(comision) },
                { label: 'Total a debitar', valor: formatoCOP.format(totalADebitar), destacado: true },
                { label: 'Concepto', valor: concepto || '—' },
                { label: labelSaldoFinal, valor: formatoCOP.format(saldoFinal), negativo: saldoFinal < 0 }
            );
        } else {
            filasResumen.push(
                { label: 'Cuenta de destino', valor: d.titular, extra: `${TIPOS[d.tipo]} · •••• ${ultimos4(d.numero)}` },
                { label: esAvanceTC ? 'Monto del avance' : 'Monto a transferir', valor: formatoCOP.format(monto), destacado: true },
                { label: 'Concepto', valor: concepto || '—' },
                { label: labelSaldoFinal, valor: formatoCOP.format(saldoFinal), negativo: saldoFinal < 0 },
                { label: 'Costo de transferencia', valor: 'Sin costo (Cuentas Finara)' }
            );
        }

        filas($('resumenLista'), filasResumen);
        resumenError.classList.add('hidden');
        resumenAlerta.classList.toggle('hidden', !usaSobregiro && !esAvanceTC && !esInterbancaria);

        if (esInterbancaria) {
            resumenAlerta.textContent = `Operación Interbancaria ACH: Se transferirá a través de la red ACH a ${d.banco}. Costo de red de ${formatoCOP.format(comision)} liquidado en el total a debitar.`;
        } else if (usaSobregiro) {
            resumenAlerta.textContent = `Atención: esta transferencia usa ${formatoCOP.format(monto - origen.saldo)} de tu sobregiro (hasta 20% sobre el saldo). Úsalo con cuidado.`;
        } else if (esAvanceTC) {
            resumenAlerta.textContent = `Operación de Avance: Se desembolsará el monto de tu Tarjeta de Crédito y se acreditará inmediatamente a la cuenta de destino.`;
        }
    }

    btnEditar.addEventListener('click', () => irAPaso(1));

    // ---------- Punto 5 y 6: ejecutar transferencia interbancaria o Finara ----------
    btnConfirmar.addEventListener('click', async () => {
        if (enProceso) return;          // evita doble envío
        enProceso = true;
        btnConfirmar.disabled = btnEditar.disabled = true;
        btnConfirmar.textContent = 'Procesando en red interbancaria…';
        resumenError.classList.add('hidden');

        try {
            const r = await ejecutarTransferencia({
                origenId: datos.origen.id,
                destinoNumero: datos.destino.numero,
                destinoTipo: datos.destino.tipo,
                monto: datos.monto,
                concepto: datos.concepto,
                esInterbancaria: datos.esInterbancaria,
                destinoInterbancario: datos.esInterbancaria ? datos.destino : null
            });
            pintarExito(r);
            irAPaso(3);
            actualizarCampana();        // la notificación ya quedó guardada en localStorage
            mostrarToast(datos.esInterbancaria
                ? 'Transferencia interbancaria procesada con éxito a través de ACH.'
                : 'Transferencia exitosa. Revisa tus notificaciones.');
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

    // ---------- Comprobante de transferencia (HU-07) ----------
    function pintarExito(r) {
        const items = [
            { label: 'Número de comprobante', valor: r.referencia }
        ];

        if (r.esInterbancaria) {
            items.push(
                { label: 'Red de procesamiento', valor: 'Red ACH Colombia / Pasarela Interbancaria' },
                { label: 'Banco receptor', valor: r.bancoDestino || r.destino.banco },
                { label: 'Beneficiario', valor: r.destino.titular, extra: `Doc: ${r.destino.documento || 'No informado'}` },
                { label: 'Cuenta de destino', valor: `${TIPOS[r.destino.tipo]} · •••• ${ultimos4(r.destino.numero)}` },
                { label: 'Monto transferido', valor: formatoCOP.format(r.monto), destacado: true },
                { label: 'Comisión de red ACH', valor: formatoCOP.format(r.comision || COMISION_INTERBANCARIA) },
                { label: 'Total debitado de tu cuenta', valor: formatoCOP.format(r.totalDebitado || (r.monto + (r.comision || 0))) },
                { label: 'Nuevo saldo disponible', valor: formatoCOP.format(r.saldoOrigen), negativo: r.saldoOrigen < 0 },
                { label: 'Fecha y hora de transmisión', valor: formatoFechaHora.format(new Date(r.fecha)) }
            );
        } else {
            items.push(
                { label: 'Enviado a', valor: r.destino.titular, extra: `${TIPOS[r.destino.tipo]} · •••• ${ultimos4(r.destino.numero)}` },
                { label: 'Monto', valor: formatoCOP.format(r.monto), destacado: true },
                { label: 'Nuevo saldo de la cuenta de origen', valor: formatoCOP.format(r.saldoOrigen), negativo: r.saldoOrigen < 0 },
                { label: 'Fecha', valor: formatoFechaHora.format(new Date(r.fecha)) }
            );
        }

        filas($('exitoLista'), items);
    }

    btnNueva.addEventListener('click', async () => {
        form.reset();
        tokenDestino++;
        destino = null; datos = null;
        pintarDestino(null);
        limpiarErrores();
        cambiarModalidad('FINARA');
        await cargarCuentas();          // trae los saldos ya actualizados
        irAPaso(1);
    });

    cargarCuentas();
});
