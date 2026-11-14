// Vanilla/Transferencias.js

import {
    TIPOS, formatoCOP, calcularDisponible, obtenerCuentasOrigen, buscarCuentaDestino,
    validarTransferencia, ejecutarTransferencia, SesionExpiradaError, COMISION_INTERBANCARIA
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
const formatearNumeroConEspacios = numero => soloDigitos(numero).replace(/(\d{4})(?=\d)/g, '$1 ');
const textoCuenta = c => `${TIPOS[c.tipo] || c.tipo} · •••• ${ultimos4(c.numero)}`;

function filas(contenedor, items) {
    contenedor.replaceChildren(...items.map(({ label, valor, extra, htmlVal, destacado, negativo }) => {
        const fila = el('div', 'tr-fila-resumen');
        const dd = el('dd', destacado ? 'tr-valor tr-valor--grande' : 'tr-valor');

        if (htmlVal) {
            dd.innerHTML = htmlVal;
        } else {
            dd.textContent = valor;
            if (negativo) dd.classList.add('tr-valor--negativo');
            if (extra) dd.append(el('span', 'tr-valor-extra', extra));
        }

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
    } catch { }

    const $ = id => document.getElementById(id);
    const form = $('formTransferencia');
    if (!form) return;

    const selOrigen = $('trOrigen'), selTipo = $('trTipoDestino');
    const inpNumero = $('trNumeroDestino'), inpMonto = $('trMonto'), inpConcepto = $('trConcepto');
    const hintOrigen = $('trOrigenHint'), boxDestino = $('trDestino');

    // Elementos interbancarios (HU-07)
    const tabFinara = $('tabFinara'), tabOtroBanco = $('tabOtroBanco'), inpModalidad = $('trModalidad');
    const campoBancoDestino = $('campoBancoDestino'), selBancoDestino = $('trBancoDestino'), errBancoDestino = $('errBancoDestino');
    const camposBeneficiarioInterbancario = $('camposBeneficiarioInterbancario');
    const inpBeneficiarioNombre = $('trBeneficiarioNombre'), errBeneficiarioNombre = $('errBeneficiarioNombre');
    const inpBeneficiarioDocumento = $('trBeneficiarioDocumento'), errBeneficiarioDocumento = $('errBeneficiarioDocumento');

    const sideInfo = document.querySelector('.tr-info');
    const sideOrigenSaldo = $('sideOrigenSaldo'), sideOrigenSub = $('sideOrigenSub'), sideOrigenBadge = $('sideOrigenBadge');
    const sideDestinoTxt = $('sideDestinoTxt'), sideMontoTxt = $('sideMontoTxt');

    const btnTransferirTodo = $('btnTransferirTodo'), chipsMonto = $('chipsMonto');
    const errOrigen = $('errOrigen'), errDestino = $('errDestino'), errMonto = $('errMonto');
    const vistas = { 1: $('vistaForm'), 2: $('vistaResumen'), 3: $('vistaExito') };
    const pasos = document.querySelectorAll('.tr-paso');
    const btnEditar = $('btnEditar'), btnConfirmar = $('btnConfirmar'), btnNueva = $('btnNueva'), btnContinuar = $('btnContinuar');
    const btnDescargarPDF = $('btnDescargarPDF'), btnVerMovimientos = $('btnVerMovimientos');
    const resumenError = $('resumenError'), resumenAlerta = $('resumenAlerta');
    const estadoGlobal = $('trEstado'), toast = $('trToast');

    let cuentas = [];
    let destino = null;
    let datos = null;
    let resultadoFinal = null;
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

        if (sideInfo) {
            sideInfo.style.display = n === 1 ? 'flex' : 'none';
        }

        const trLayout = document.querySelector('.tr-layout');
        if (trLayout) {
            trLayout.style.gridTemplateColumns = n === 1 ? 'minmax(0, 1.8fr) minmax(300px, 1fr)' : '1fr';
        }

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

    const cuentaSeleccionada = () => cuentas.find(c => String(c.id) === selOrigen.value || soloDigitos(c.numero) === soloDigitos(selOrigen.value));
    const leerMonto = () => Number(inpMonto.value.replace(/\D/g, '')) || 0;
    const esModoInterbancario = () => inpModalidad && inpModalidad.value === 'OTRO_BANCO';

    // Manejo de pestañas de modalidad (Finara vs Otro Banco)
    function cambiarModalidad(modo) {
        if (!inpModalidad) return;
        inpModalidad.value = modo;

        const esInterbancario = modo === 'OTRO_BANCO';
        if (tabFinara) {
            tabFinara.classList.toggle('activo', !esInterbancario);
            tabFinara.setAttribute('aria-selected', !esInterbancario);
        }
        if (tabOtroBanco) {
            tabOtroBanco.classList.toggle('activo', esInterbancario);
            tabOtroBanco.setAttribute('aria-selected', esInterbancario);
        }

        if (campoBancoDestino) campoBancoDestino.classList.toggle('hidden', !esInterbancario);
        if (camposBeneficiarioInterbancario) camposBeneficiarioInterbancario.classList.toggle('hidden', !esInterbancario);

        // Limpiar errores y datos de destino
        destino = null;
        if (errDestino) errDestino.textContent = '';
        if (errBancoDestino) errBancoDestino.textContent = '';
        if (errBeneficiarioNombre) errBeneficiarioNombre.textContent = '';
        if (errBeneficiarioDocumento) errBeneficiarioDocumento.textContent = '';

        const sideComision = document.querySelector('.tr-side-summary .tr-side-summary__row:last-child strong');
        if (sideComision) {
            if (esInterbancario) {
                sideComision.textContent = formatoCOP.format(COMISION_INTERBANCARIA);
                sideComision.className = 'gold-text';
            } else {
                sideComision.textContent = 'Sin costo';
                sideComision.className = 'green-text';
            }
        }

        if (esInterbancario) {
            actualizarDestinoInterbancario();
        } else {
            if (boxDestino) boxDestino.classList.add('hidden');
            verificar();
        }
        actualizarResumenLateral();
    }

    if (tabFinara) tabFinara.addEventListener('click', () => cambiarModalidad('FINARA'));
    if (tabOtroBanco) tabOtroBanco.addEventListener('click', () => cambiarModalidad('OTRO_BANCO'));

    function actualizarDestinoInterbancario() {
        if (!esModoInterbancario()) return;
        const banco = selBancoDestino ? selBancoDestino.value : '';
        const num = inpNumero ? soloDigitos(inpNumero.value) : '';
        const titular = inpBeneficiarioNombre ? inpBeneficiarioNombre.value.trim() : '';
        const doc = inpBeneficiarioDocumento ? soloDigitos(inpBeneficiarioDocumento.value) : '';
        const tipo = selTipo ? selTipo.value : 'AHORROS';

        if (banco && num && titular) {
            destino = {
                banco,
                numero: num,
                titular,
                documento: doc,
                tipo,
                esInterbancario: true
            };
        } else {
            destino = null;
        }
        actualizarResumenLateral();
    }

    if (selBancoDestino) selBancoDestino.addEventListener('change', () => {
        if (errBancoDestino) errBancoDestino.textContent = '';
        actualizarDestinoInterbancario();
    });
    if (inpBeneficiarioNombre) inpBeneficiarioNombre.addEventListener('input', () => {
        if (errBeneficiarioNombre) errBeneficiarioNombre.textContent = '';
        actualizarDestinoInterbancario();
    });
    if (inpBeneficiarioDocumento) inpBeneficiarioDocumento.addEventListener('input', () => {
        if (errBeneficiarioDocumento) errBeneficiarioDocumento.textContent = '';
        actualizarDestinoInterbancario();
    });

    function actualizarResumenLateral() {
        const monto = leerMonto();
        if (sideMontoTxt) {
            sideMontoTxt.textContent = formatoCOP.format(monto);
        }
        if (sideDestinoTxt) {
            if (esModoInterbancario()) {
                const banco = selBancoDestino ? selBancoDestino.value : '';
                const titular = inpBeneficiarioNombre ? inpBeneficiarioNombre.value.trim() : '';
                const num = inpNumero ? formatearNumeroConEspacios(inpNumero.value) : '';
                const tipoTexto = selTipo ? (TIPOS[selTipo.value] || 'Cuenta de Ahorros') : 'Cuenta de Ahorros';

                if (titular || banco) {
                    sideDestinoTxt.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                            <span style="color: #ffffff; font-weight: 700;">${titular || 'Beneficiario'}</span>
                            <span style="color: #e5a93c; font-size: 0.78rem; font-weight: 600;">${banco || 'Red ACH'}</span>
                            <span style="color: #94a3b8; font-size: 0.78rem;">${tipoTexto}</span>
                            ${num ? `<span style="color: #94a3b8; font-size: 0.82rem; font-family: monospace;">N° ${num}</span>` : ''}
                        </div>
                    `;
                } else {
                    sideDestinoTxt.innerHTML = `<span style="color: #64748b;">A Otro Banco (ACH)</span>`;
                }
            } else if (destino && destino.titular) {
                const tipoTexto = TIPOS[destino.tipo] || destino.tipo || 'Cuenta de Ahorros';
                const numConEspacios = formatearNumeroConEspacios(destino.numero);

                sideDestinoTxt.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                        <span style="color: #ffffff; font-weight: 700;">${destino.titular}</span>
                        <span style="color: #94a3b8; font-size: 0.78rem;">${tipoTexto}</span>
                        <span style="color: #e5a93c; font-size: 0.82rem; font-family: monospace;">N° ${numConEspacios}</span>
                    </div>
                `;
            } else if (inpNumero && inpNumero.value.trim()) {
                const numIngresado = formatearNumeroConEspacios(inpNumero.value.trim());
                const tipoSel = selTipo ? (TIPOS[selTipo.value] || 'Cuenta de Ahorros') : 'Cuenta de Ahorros';
                sideDestinoTxt.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                        <span style="color: #94a3b8;">Por verificar</span>
                        <span style="color: #64748b; font-size: 0.78rem;">${tipoSel}</span>
                        <span style="color: #94a3b8; font-size: 0.82rem; font-family: monospace;">N° ${numIngresado}</span>
                    </div>
                `;
            } else {
                sideDestinoTxt.innerHTML = `<span style="color: #64748b;">Por definir</span>`;
            }
        }
    }

    function pintarHint() {
        const c = cuentaSeleccionada();
        if (!c) {
            if (hintOrigen) hintOrigen.textContent = '';
            if (sideOrigenSaldo) sideOrigenSaldo.textContent = '$ 0';
            if (sideOrigenSub) sideOrigenSub.textContent = 'Ninguna cuenta seleccionada';
            return;
        }

        const estaBloqueada = Boolean(c.bloqueada || c.estado === 'BLOQUEADA' || (c.tarjetaAsociada && c.tarjetaAsociada.bloqueada));
        const disponible = calcularDisponible(c);
        let saldoStr = formatoCOP.format(disponible);

        if (estaBloqueada) {
            if (hintOrigen) hintOrigen.textContent = `Cuenta o tarjeta bloqueada temporalmente. Desbloquéala desde Saldos para transferir.`;
        } else if (c.tipo === 'TARJETA_CREDITO') {
            if (hintOrigen) hintOrigen.textContent = `Cupo total de compras: ${formatoCOP.format(c.saldo)} · Avance permitido (50% del cupo): ${formatoCOP.format(disponible)}`;
        } else if (c.tipo === 'CORRIENTE') {
            const extra = ' (incluye sobregiro del 20%)';
            if (hintOrigen) hintOrigen.textContent = `Saldo: ${formatoCOP.format(c.saldo)} · Disponible: ${formatoCOP.format(disponible)}${extra}`;
        } else {
            if (hintOrigen) hintOrigen.textContent = `Saldo: ${formatoCOP.format(c.saldo)} · Disponible: ${formatoCOP.format(disponible)}`;
        }

        if (sideOrigenSaldo) sideOrigenSaldo.textContent = saldoStr;
        if (sideOrigenSub) sideOrigenSub.textContent = `${TIPOS[c.tipo] || c.tipo} · •••• ${ultimos4(c.numero)}`;
        if (sideOrigenBadge) {
            sideOrigenBadge.textContent = estaBloqueada ? 'Bloqueada' : 'Activa';
            sideOrigenBadge.className = `tr-side-card__badge ${estaBloqueada ? 'badge--bloqueada' : 'badge--activa'}`;
        }

        if (inpNumero && inpNumero.value.trim()) {
            verificar();
        }
        actualizarResumenLateral();
    }

    async function cargarCuentas() {
        const previa = selOrigen ? selOrigen.value : '';
        if (estadoGlobal) estadoGlobal.classList.add('hidden');

        try {
            const rawCuentas = await obtenerCuentasOrigen();
            cuentas = rawCuentas;

            if (!selOrigen) return;

            if (cuentas.length === 0) {
                selOrigen.innerHTML = '<option value="" disabled selected>No hay cuentas disponibles</option>';
                if (estadoGlobal) {
                    estadoGlobal.replaceChildren(el('p', '', 'No tienes cuentas o productos activos guardados en tu perfil. Solicita uno desde "Solicitar Producto".'));
                    estadoGlobal.classList.remove('hidden');
                }
                pintarHint();
                return;
            }

            selOrigen.replaceChildren(...cuentas.map(c => {
                const o = el('option', '', textoCuenta(c));
                o.value = c.id || c.numero;
                return o;
            }));

            if (previa && cuentas.some(c => String(c.id) === previa || String(c.numero) === previa)) {
                selOrigen.value = previa;
            } else {
                selOrigen.selectedIndex = 0;
            }

        } catch (err) {
            if (err instanceof SesionExpiradaError) return irALogin();
            if (selOrigen) {
                selOrigen.innerHTML = '<option value="" disabled selected>Error al cargar cuentas</option>';
            }
            if (estadoGlobal) {
                estadoGlobal.replaceChildren(el('p', '', 'Ocurrió un problema leyendo los datos de tu navegador.'));
                estadoGlobal.classList.remove('hidden');
            }
            return;
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
            actualizarResumenLateral();
        });
    }

    if (chipsMonto) {
        chipsMonto.querySelectorAll('.tr-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const monto = Number(btn.dataset.monto);
                if (inpMonto) inpMonto.value = new Intl.NumberFormat('es-CO').format(monto);
                if (errMonto) errMonto.textContent = '';
                actualizarChipsActivos(monto);
                actualizarResumenLateral();
                if (inpMonto) inpMonto.focus();
            });
        });
    }

    if (btnTransferirTodo) {
        btnTransferirTodo.addEventListener('click', () => {
            const c = cuentaSeleccionada();
            if (!c) return;
            const comision = esModoInterbancario() ? COMISION_INTERBANCARIA : 0;
            const disp = Math.max(0, calcularDisponible(c) - comision);
            if (disp > 0 && inpMonto) {
                inpMonto.value = new Intl.NumberFormat('es-CO').format(disp);
                if (errMonto) errMonto.textContent = '';
                actualizarChipsActivos(disp);
                actualizarResumenLateral();
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
        if (boxDestino) {
            boxDestino.replaceChildren();
            boxDestino.classList.add('hidden');
        }

        if (errDestino) errDestino.textContent = '';

        if (!estado) {
            actualizarResumenLateral();
            return;
        }

        if (estado === 'cargando') {
            if (sideDestinoTxt) {
                sideDestinoTxt.innerHTML = `<span style="color: #e5a93c;">Verificando cuenta…</span>`;
            }
            return;
        }

        const esInvalida = Boolean(mensajeInvalido);

        if (estado === 'ok' && dato) {
            if (esInvalida) {
                if (sideDestinoTxt) {
                    sideDestinoTxt.innerHTML = `<span style="color: #f87171;">Cuenta no permitida</span>`;
                }
            } else {
                actualizarResumenLateral();
            }
        } else {
            if (sideDestinoTxt) {
                sideDestinoTxt.innerHTML = `<span style="color: #f87171;">Cuenta no encontrada</span>`;
            }
        }
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

    if (inpNumero) {
        inpNumero.addEventListener('paste', (e) => {
            e.preventDefault();
            const textoPegado = (e.clipboardData || window.clipboardData).getData('text');
            const soloNumeros = soloDigitos(textoPegado).slice(0, 16);
            const formateado = formatearNumeroConEspacios(soloNumeros);
            inpNumero.value = formateado;
            programarVerificacion();
        });

        inpNumero.addEventListener('input', () => {
            const soloNumeros = soloDigitos(inpNumero.value).slice(0, 16);
            const formateado = formatearNumeroConEspacios(soloNumeros);
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
        [errOrigen, errDestino, errMonto, errBancoDestino, errBeneficiarioNombre, errBeneficiarioDocumento].forEach(m => { if (m) m.textContent = ''; });

        const esInterbancaria = esModoInterbancario();

        if (esInterbancaria) {
            actualizarDestinoInterbancario();
            const banco = selBancoDestino ? selBancoDestino.value : '';
            const titular = inpBeneficiarioNombre ? inpBeneficiarioNombre.value.trim() : '';
            const documento = inpBeneficiarioDocumento ? inpBeneficiarioDocumento.value.trim() : '';
            const numero = inpNumero ? soloDigitos(inpNumero.value) : '';

            let tieneError = false;
            if (!banco) {
                if (errBancoDestino) errBancoDestino.textContent = 'Selecciona una entidad bancaria receptora.';
                tieneError = true;
            }
            if (!numero || numero.length < 5) {
                if (errDestino) errDestino.textContent = 'Ingresa un número de cuenta destino válido.';
                tieneError = true;
            }
            if (!titular) {
                if (errBeneficiarioNombre) errBeneficiarioNombre.textContent = 'Ingresa el nombre del beneficiario.';
                tieneError = true;
            }
            if (!documento || documento.length < 5) {
                if (errBeneficiarioDocumento) errBeneficiarioDocumento.textContent = 'Ingresa el documento del beneficiario.';
                tieneError = true;
            }

            if (tieneError) {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Campos incompletos',
                        text: 'Por favor completa todos los datos requeridos para la transferencia interbancaria.',
                        background: '#12151c',
                        color: '#ffffff',
                        confirmButtonColor: '#e5a93c',
                        confirmButtonText: 'Revisar'
                    });
                }
                return;
            }
        } else {
            if (!destino && inpNumero && inpNumero.value.trim()) {
                clearTimeout(temporizador);
                await verificar();
            }
        }

        const origen = cuentaSeleccionada();
        const monto = leerMonto();
        const v = validarTransferencia({ origen, destino, monto, esInterbancaria });

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
            esAvanceTC: v.esAvanceTC,
            esInterbancaria,
            comision: v.comision || 0,
            totalADebitar: v.totalADebitar || (monto + (v.comision || 0))
        };

        pintarResumen();
        irAPaso(2);
    }

    form.addEventListener('submit', procesarEnvioFormulario);
    if (btnContinuar) {
        btnContinuar.addEventListener('click', procesarEnvioFormulario);
    }

    function pintarResumen() {
        const { origen, destino: d, monto, concepto, usaSobregiro, esAvanceTC, esInterbancaria, comision, totalADebitar } = datos;

        const saldoActualNum = typeof origen.saldo === 'number'
            ? origen.saldo
            : Number(String(origen.saldo || 0).replace(/[^0-9.-]+/g, "")) || 0;

        const saldoCalculado = saldoActualNum - (totalADebitar || monto);
        const labelSaldoFinal = origen.tipo === 'TARJETA_CREDITO' ? 'Cupo restante después de la operación' : 'Saldo después de la operación';

        const numDestinoEspaciado = formatearNumeroConEspacios(d.numero);
        const tipoDestinoTexto = TIPOS[d.tipo] || d.tipo || 'Cuenta de Ahorros';

        const resumenLista = $('resumenLista');
        if (resumenLista) {
            if (esInterbancaria) {
                const htmlDestinoInterbancario = `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                        <span style="color: #ffffff; font-weight: 700; font-size: 0.95rem;">${d.titular}</span>
                        <span style="color: #e5a93c; font-size: 0.82rem; font-weight: 600;">${d.banco}</span>
                        <span style="color: #94a3b8; font-size: 0.82rem;">${tipoDestinoTexto}</span>
                        <span style="color: #e5a93c; font-size: 0.88rem; font-family: monospace; font-weight: 600;">N° ${numDestinoEspaciado}</span>
                        ${d.documento ? `<span style="color: #64748b; font-size: 0.78rem;">Doc: ${d.documento}</span>` : ''}
                    </div>
                `;

                filas(resumenLista, [
                    { label: 'Producto de origen', valor: textoCuenta(origen) },
                    { label: 'Cuenta de destino', htmlVal: htmlDestinoInterbancario },
                    { label: 'Monto a transferir', valor: formatoCOP.format(monto), destacado: true },
                    { label: 'Comisión red interbancaria (ACH)', valor: formatoCOP.format(comision || COMISION_INTERBANCARIA) },
                    { label: 'Total a debitar', valor: formatoCOP.format(totalADebitar), destacado: true },
                    { label: 'Concepto', valor: concepto || 'Sin concepto' },
                    { label: labelSaldoFinal, valor: formatoCOP.format(saldoCalculado), negativo: saldoCalculado < 0 }
                ]);
            } else {
                const htmlDestino3Niveles = `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                        <span style="color: #ffffff; font-weight: 700; font-size: 0.95rem;">${d.titular}</span>
                        <span style="color: #94a3b8; font-size: 0.82rem;">${tipoDestinoTexto}</span>
                        <span style="color: #e5a93c; font-size: 0.88rem; font-family: monospace; font-weight: 600;">N° ${numDestinoEspaciado}</span>
                    </div>
                `;

                filas(resumenLista, [
                    { label: 'Producto de origen', valor: textoCuenta(origen) },
                    { label: 'Cuenta de destino', htmlVal: htmlDestino3Niveles },
                    { label: esAvanceTC ? 'Monto del avance' : 'Monto a transferir', valor: formatoCOP.format(monto), destacado: true },
                    { label: 'Concepto', valor: concepto || 'Sin concepto' },
                    { label: labelSaldoFinal, valor: formatoCOP.format(saldoCalculado), negativo: saldoCalculado < 0 },
                    { label: 'Costo', valor: 'Sin costo' }
                ]);
            }
        }
        if (resumenError) resumenError.classList.add('hidden');
        if (resumenAlerta) {
            resumenAlerta.classList.toggle('hidden', !usaSobregiro && !esAvanceTC && !esInterbancaria);
            if (esInterbancaria) {
                resumenAlerta.textContent = `Operación Interbancaria ACH: Se transferirá a través de la red ACH a ${d.banco}. Costo de red de ${formatoCOP.format(comision || COMISION_INTERBANCARIA)} liquidado en el total a debitar.`;
            } else if (usaSobregiro) {
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
            btnConfirmar.textContent = datos.esInterbancaria ? 'Transmitiendo por red ACH…' : 'Procesando…';
            if (resumenError) resumenError.classList.add('hidden');

            try {
                const r = await ejecutarTransferencia({
                    origenId: datos.origen.id || datos.origen.numero,
                    destinoNumero: datos.destino.numero,
                    destinoTipo: datos.destino.tipo,
                    monto: datos.monto,
                    concepto: datos.concepto,
                    esInterbancaria: datos.esInterbancaria,
                    destinoInterbancario: datos.esInterbancaria ? datos.destino : null
                });

                resultadoFinal = r;

                // REGISTRO DE MOVIMIENTOS EN LOCALSTORAGE
                try {
                    let movimientos = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
                    const perfilActivo = JSON.parse(localStorage.getItem('userProfile')) || {};
                    const usuarioActual = perfilActivo.username || perfilActivo.nombre || datos.origen.username || 'Johan Zapata Cifuentes';
                    const textoConcepto = datos.concepto ? ` - Concepto: ${datos.concepto}` : '';

                    const descripcionEgreso = datos.esInterbancaria
                        ? `Transferencia ACH a ${datos.destino.titular} (${datos.destino.banco})${textoConcepto}`
                        : `Transferencia enviada a ${datos.destino.titular}${textoConcepto}`;

                    movimientos.unshift({
                        id: `MOV-OUT-${Date.now()}`,
                        fecha: new Date().toISOString(),
                        descripcion: descripcionEgreso,
                        categoria: datos.esInterbancaria ? 'Transferencia Interbancaria' : 'Transferencia',
                        tipo: 'EGRESO',
                        valor: datos.totalADebitar || datos.monto,
                        cuentaId: datos.origen.id || datos.origen.numero,
                        numeroCuenta: datos.origen.numero,
                        usuario: usuarioActual
                    });

                    if (!datos.esInterbancaria) {
                        movimientos.unshift({
                            id: `MOV-IN-${Date.now()}`,
                            fecha: new Date().toISOString(),
                            descripcion: `Transferencia recibida de ${usuarioActual}${textoConcepto}`,
                            categoria: 'Transferencia',
                            tipo: 'INGRESO',
                            valor: datos.monto,
                            cuentaId: datos.destino.id || 'CTA-DESTINO',
                            numeroCuenta: datos.destino.numero,
                            usuario: datos.destino.titular || 'Destino'
                        });
                    }

                    localStorage.setItem('finara_movimientos', JSON.stringify(movimientos));
                } catch (e) {
                    console.error("Error al guardar movimientos en localStorage:", e);
                }

                pintarExito(r);
                irAPaso(3);
                if (modNotif && modNotif.actualizarCampana) {
                    try { modNotif.actualizarCampana(); } catch { }
                }
                mostrarToast(datos.esInterbancaria
                    ? 'Transferencia interbancaria procesada con éxito a través de ACH.'
                    : 'Transferencia exitosa. Revisa tus movimientos.');
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

        const numDestinoEspaciado = formatearNumeroConEspacios(r.destino.numero);
        const tipoDestinoTexto = TIPOS[r.destino.tipo] || r.destino.tipo || 'Cuenta de Ahorros';

        if (r.esInterbancaria) {
            const htmlExitoInterbancario = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                    <span style="color: #ffffff; font-weight: 700; font-size: 0.95rem;">${r.destino.titular}</span>
                    <span style="color: #e5a93c; font-size: 0.82rem; font-weight: 600;">${r.bancoDestino || r.destino.banco}</span>
                    <span style="color: #94a3b8; font-size: 0.82rem;">${tipoDestinoTexto}</span>
                    <span style="color: #e5a93c; font-size: 0.88rem; font-family: monospace; font-weight: 600;">N° ${numDestinoEspaciado}</span>
                </div>
            `;

            filas(exitoLista, [
                { label: 'Referencia ACH', valor: r.referencia },
                { label: 'Red de procesamiento', valor: 'Red ACH Colombia / Pasarela Interbancaria' },
                { label: 'Enviado a', htmlVal: htmlExitoInterbancario },
                { label: 'Monto transferido', valor: formatoCOP.format(r.monto), destacado: true },
                { label: 'Comisión de red ACH', valor: formatoCOP.format(r.comision || COMISION_INTERBANCARIA) },
                { label: 'Total debitado', valor: formatoCOP.format(r.totalDebitado || (r.monto + (r.comision || 0))), destacado: true },
                { label: 'Concepto', valor: datos.concepto || 'Sin concepto' },
                { label: 'Nuevo saldo disponible', valor: formatoCOP.format(r.saldoOrigen), negativo: r.saldoOrigen < 0 },
                { label: 'Fecha y hora de transmisión', valor: formatoFechaHora.format(new Date(r.fecha)) }
            ]);
        } else {
            const htmlExitoDestino = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                    <span style="color: #ffffff; font-weight: 700; font-size: 0.95rem;">${r.destino.titular}</span>
                    <span style="color: #94a3b8; font-size: 0.82rem;">${tipoDestinoTexto}</span>
                    <span style="color: #e5a93c; font-size: 0.88rem; font-family: monospace; font-weight: 600;">N° ${numDestinoEspaciado}</span>
                </div>
            `;

            filas(exitoLista, [
                { label: 'Referencia', valor: r.referencia },
                { label: 'Enviado a', htmlVal: htmlExitoDestino },
                { label: 'Monto', valor: formatoCOP.format(r.monto), destacado: true },
                { label: 'Concepto', valor: datos.concepto || 'Sin concepto' },
                { label: 'Nuevo saldo de la cuenta de origen', valor: formatoCOP.format(r.saldoOrigen), negativo: r.saldoOrigen < 0 },
                { label: 'Fecha', valor: formatoFechaHora.format(new Date(r.fecha)) }
            ]);
        }
    }

    // NAVEGACIÓN A MOVIMIENTOS
    if (btnVerMovimientos) {
        btnVerMovimientos.addEventListener('click', () => {
            const enlaceMovimientos = document.querySelector('[data-view="movimientos"]') || document.querySelector('a[href*="movimientos"]');
            if (enlaceMovimientos) {
                enlaceMovimientos.click();
            } else {
                window.location.href = './app.html#movimientos';
            }
        });
    }

    // IMPRESIÓN Y DESCARGA DEL COMPROBANTE CON CONTENEDOR OSCURO UNIFICADO
    if (btnDescargarPDF) {
        btnDescargarPDF.addEventListener('click', async () => {
            if (!resultadoFinal) return;

            const previo = document.getElementById('impresionVoucher');
            if (previo) previo.remove();

            const numDestinoEspaciado = formatearNumeroConEspacios(resultadoFinal.destino.numero);
            const tipoDestinoTexto = TIPOS[resultadoFinal.destino.tipo] || resultadoFinal.destino.tipo || 'Cuenta de Ahorros';
            const rutaLogo = '../Style/image/Logo_finara.svg';

            let logoDataUrl = rutaLogo;
            try {
                const resp = await fetch(rutaLogo);
                if (resp.ok) {
                    const svgTexto = await resp.text();
                    logoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgTexto)}`;
                }
            } catch (e) {
                console.warn("Cargando ruta del logo SVG...");
            }

            const voucher = document.createElement('div');
            voucher.id = 'impresionVoucher';
            // Se unifica el fondo de todo el contenedor de impresión al color oscuro corporativo
            voucher.style.cssText = `
                display: none;
                background: #121620 !important;
                color: #ffffff !important;
                padding: 40px !important;
                font-family: 'Poppins', Arial, sans-serif !important;
                width: 100% !important;
                max-width: 560px !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                border: 1px solid rgba(229, 169, 60, 0.4);
                border-radius: 20px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            `;

            voucher.innerHTML = `
                <!-- Encabezado con Logo y Estado -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 18px; margin-bottom: 25px;">
                    <img src="${logoDataUrl}" alt="Finara Bank Logo" style="height: 38px; width: auto; display: block;">
                    <div style="font-size: 11px; font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.3); padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                        ✓ Transacción Exitosa
                    </div>
                </div>

                <!-- Título -->
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="font-size: 20px; color: #ffffff; font-weight: 700; margin: 0 0 4px 0;">Comprobante de Transferencia</h2>
                    <p style="font-size: 11px; color: #94a3b8; margin: 0; letter-spacing: 0.3px;">Finara Bank Digital · Certificación de Operación</p>
                </div>

                <!-- Bloque de Monto Destacado (Dorado Finara) -->
                <div style="background: rgba(229, 169, 60, 0.1); border: 1px solid rgba(229, 169, 60, 0.35); border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 25px;">
                    <div style="font-size: 11px; font-weight: 600; color: #e5a93c; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Monto Transferido</div>
                    <div style="font-size: 28px; font-weight: 800; color: #e5a93c;">${formatoCOP.format(resultadoFinal.monto)}</div>
                </div>

                <!-- Detalles -->
                <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 14px; padding: 6px 18px; margin-bottom: 25px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Referencia</span>
                        <strong style="color: #ffffff; font-family: monospace; font-size: 13px;">${resultadoFinal.referencia}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Fecha y hora</span>
                        <strong style="color: #ffffff;">${formatoFechaHora.format(new Date(resultadoFinal.fecha))}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Origen</span>
                        <strong style="color: #ffffff;">${textoCuenta(datos.origen)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); align-items: flex-start;">
                        <span style="color: #94a3b8; font-weight: 500;">Destinatario</span>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; color: #ffffff;">${resultadoFinal.destino.titular}</div>
                            ${resultadoFinal.esInterbancaria ? `<div style="font-size: 11px; color: #e5a93c; font-weight: 600;">${resultadoFinal.bancoDestino || resultadoFinal.destino.banco} (ACH)</div>` : ''}
                            <div style="font-size: 11px; color: #94a3b8;">${tipoDestinoTexto}</div>
                            <div style="font-size: 11px; color: #e5a93c; font-family: monospace; font-weight: 600;">N° ${numDestinoEspaciado}</div>
                        </div>
                    </div>
                    ${resultadoFinal.esInterbancaria ? `
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Comisión red ACH</span>
                        <strong style="color: #ffffff;">${formatoCOP.format(resultadoFinal.comision || COMISION_INTERBANCARIA)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                        <span style="color: #94a3b8; font-weight: 500;">Total debitado</span>
                        <strong style="color: #e5a93c; font-weight: 700;">${formatoCOP.format(resultadoFinal.totalDebitado || (resultadoFinal.monto + (resultadoFinal.comision || COMISION_INTERBANCARIA)))}</strong>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                        <span style="color: #94a3b8; font-weight: 500;">Concepto</span>
                        <strong style="color: #ffffff;">${datos.concepto || 'Sin concepto'}</strong>
                    </div>
                </div>

                <!-- Nota al pie -->
                <div style="text-align: center; font-size: 10px; color: #64748b; border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 15px; line-height: 1.4;">
                    Este documento es un comprobante digital válido emitido por Finara Bank S.A.<br>
                    Garantizado bajo estrictos estándares de seguridad y cifrado digital.
                </div>
            `;

            document.body.appendChild(voucher);

            setTimeout(() => {
                window.print();
                voucher.remove();
            }, 150);
        });
    }

    if (btnNueva) {
        btnNueva.addEventListener('click', async () => {
            form.reset();
            tokenDestino++;
            destino = null; datos = null; resultadoFinal = null;
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