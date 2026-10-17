// Vanilla/cuentasService.js
// Capa de acceso a datos de cuentas para HU-04 (Consulta de saldo).
// Maneja la gestión de cuentas asociadas al usuario autenticado (Ahorros, Corriente y Tarjetas de Crédito).
// Evita mezclar o duplicar cuentas entre diferentes usuarios.

const USAR_API_BACKEND = false;
const API_URL = 'http://localhost:8080/api/cuentas';

export class SesionExpiradaError extends Error {
    constructor(mensaje = 'Tu sesión ha expirado o no estás autenticado.') {
        super(mensaje);
        this.name = 'SesionExpiradaError';
    }
}

/**
 * Obtiene el usuario autenticado desde el almacenamiento local
 * usando las diferentes claves compatibles del proyecto.
 */
export function obtenerUsuarioAutenticado() {
    try {
        const perfil = JSON.parse(localStorage.getItem('userProfile'));
        if (perfil) return perfil;

        const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo'));
        if (usuarioActivo) return usuarioActivo;

        const emailLogueado = localStorage.getItem('usuarioLogueado') || localStorage.getItem('emailSesion');
        if (emailLogueado) {
            const usuarios = JSON.parse(localStorage.getItem('finara_usuarios_local')) || [];
            const encontrado = usuarios.find(u => u.correo === emailLogueado || u.username === emailLogueado);
            if (encontrado) return encontrado;
            return { username: emailLogueado, nombre: emailLogueado };
        }

        const userName = localStorage.getItem('userName');
        if (userName) {
            return { username: userName, nombre: userName };
        }
    } catch {
        // En caso de JSON corrupto
    }
    // Usuario estándar de sesión por defecto si Login.js no guardó en localStorage
    return { username: 'maria17', nombre: 'María Gómez' };
}

/**
 * Obtiene el identificador canónico único del usuario activo.
 */
export function obtenerUsernameActivo() {
    const u = obtenerUsuarioAutenticado();
    return u ? (u.username || u.correo || 'maria17') : 'maria17';
}

/**
 * Consulta qué productos bancarios iniciales tiene activos el usuario actual:
 * { tieneAhorros: boolean, tieneCorriente: boolean, tieneCredito: boolean, cuentas: Array }
 */
export async function consultarEstadoProductosUsuario() {
    const cuentas = await obtenerCuentas();
    return {
        tieneAhorros: cuentas.some(c => c.tipo === 'AHORROS' && c.estado === 'ACTIVA'),
        tieneCorriente: cuentas.some(c => c.tipo === 'CORRIENTE' && c.estado === 'ACTIVA'),
        tieneCredito: cuentas.some(c => c.tipo === 'TARJETA_CREDITO' && c.estado === 'ACTIVA'),
        cuentas
    };
}

/**
 * Sincroniza y obtiene las cuentas del usuario autenticado sin datos falsos.
 * Conecta con los productos aprobados en solicitud de tarjetas (tarjetasAprobadas)
 * y con las cuentas persistentes en finara_cuentas (compartidas con transferencias y operaciones).
 */
export async function obtenerCuentas() {
    if (USAR_API_BACKEND) {
        const token = localStorage.getItem('authToken');
        if (!token) throw new SesionExpiradaError();

        const respuesta = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (respuesta.status === 401 || respuesta.status === 403) throw new SesionExpiradaError();
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status} al consultar las cuentas`);

        return respuesta.json();
    }

    // Modo simulación local con persistencia real del usuario autenticado
    await new Promise(r => setTimeout(r, 150)); // Latencia fluida de UI

    const usuario = obtenerUsuarioAutenticado();
    if (!usuario) {
        throw new SesionExpiradaError();
    }

    const usernameActual = obtenerUsernameActivo();

    // Obtener cuentas existentes en el ecosistema local
    let todasLasCuentas = [];
    try {
        todasLasCuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        if (!Array.isArray(todasLasCuentas)) todasLasCuentas = [];
    } catch {
        todasLasCuentas = [];
    }

    // Identificadores reales del usuario activo (username, correo y alias)
    const correoActual = usuario.correo || '';
    const usernameNorm = String(usernameActual || '').trim().toLowerCase();
    const correoNorm = String(correoActual || '').trim().toLowerCase();

    // Filtrar estrictamente las cuentas reales del usuario actual
    let cuentasUsuario = todasLasCuentas.filter(c => {
        if (!c) return false;
        const cUser = String(c.username || '').trim().toLowerCase();
        if (cUser === usernameNorm || (correoNorm && cUser === correoNorm)) return true;
        if (!c.username && usernameNorm === 'maria17') return true;
        return false;
    });

    // Si el usuario es nuevo y no tiene ninguna cuenta registrada en finara_cuentas,
    // configurar sus cuentas iniciales según su perfil (Ahorros y Corriente por defecto para maria17)
    let cambios = false;
    if (cuentasUsuario.length === 0) {
        if (usernameActual === 'maria17') {
            const cuentasInicialesMaria = [
                { id: 'CTA-AHO-01', tipo: 'AHORROS', numero: '4021587701234', saldo: 1248767, estado: 'ACTIVA', username: 'maria17', fechaCreacion: new Date().toISOString() },
                { id: 'CTA-CORR-02', tipo: 'CORRIENTE', numero: '4021587705678', saldo: 699236, estado: 'ACTIVA', username: 'maria17', fechaCreacion: new Date().toISOString() }
            ];
            cuentasUsuario = cuentasInicialesMaria;
            todasLasCuentas.push(...cuentasInicialesMaria);
            cambios = true;
        } else if (usuario.cuentaInicial) {
            // Si el usuario se registró con una cuenta específica (ej: sólo Ahorros)
            const nuevaCta = {
                id: `CTA-${usuario.cuentaInicial.slice(0, 3).toUpperCase()}-${Date.now()}`,
                tipo: usuario.cuentaInicial === 'corriente' ? 'CORRIENTE' : 'AHORROS',
                numero: '4021' + String(Date.now()).slice(-8),
                saldo: 0,
                estado: 'ACTIVA',
                username: usernameActual,
                fechaCreacion: new Date().toISOString()
            };
            cuentasUsuario = [nuevaCta];
            todasLasCuentas.push(nuevaCta);
            cambios = true;
        } else {
            // Usuario recién registrado sin productos solicitados aún: No forzar cuenta automática
            cuentasUsuario = [];
        }
    }

    // Sincronizar tarjetas aprobadas por el usuario (newCard.js)
    const tarjetasAprobadas = usuario.tarjetasAprobadas || [];
    tarjetasAprobadas.forEach((tarjeta, index) => {
        let tipoCuenta = 'AHORROS';
        if (tarjeta.tipo === 'debito') tipoCuenta = 'AHORROS';
        else if (tarjeta.tipo === 'corriente') tipoCuenta = 'CORRIENTE';
        else if (tarjeta.tipo === 'credito') tipoCuenta = 'TARJETA_CREDITO';

        // Si es tarjeta débito o corriente, vincularla a la cuenta correspondiente para que se vea asociada en Saldos
        if (tipoCuenta === 'AHORROS' || tipoCuenta === 'CORRIENTE') {
            const ctaMatch = cuentasUsuario.find(c => c.tipo === tipoCuenta);
            if (ctaMatch) {
                ctaMatch.tarjetaAsociada = {
                    tipo: tarjeta.tipo,
                    titulo: tarjeta.titulo,
                    numero: tarjeta.numeroTarjeta || ('4532' + String(Date.now()).slice(-12)),
                    fechaVencimiento: tarjeta.fechaVencimiento || '09/29',
                    cvv: tarjeta.cvv || '584',
                    bloqueada: tarjeta.bloqueada || false
                };
            }
        }

        // Si es tarjeta de crédito aprobada, agregar como producto independiente
        if (tipoCuenta === 'TARJETA_CREDITO') {
            const idTarjeta = `TC-${tarjeta.numeroTarjeta || tarjeta.fechaAprobacion || index}`;
            const yaExisteTC = cuentasUsuario.some(c => c.id === idTarjeta || c.numero === tarjeta.numeroTarjeta || (c.tipo === 'TARJETA_CREDITO' && c.fechaAprobacion === tarjeta.fechaAprobacion));

            if (!yaExisteTC) {
                const cupoCalculado = Math.min(20000000, Math.max(1000000, Math.round(((Number(tarjeta.ingresos) || 2000000) * 1.5) / 100000) * 100000));
                const nuevaTC = {
                    id: idTarjeta,
                    tipo: 'TARJETA_CREDITO',
                    numero: tarjeta.numeroTarjeta || ('5412' + String(Date.now()).slice(-12)),
                    fechaVencimiento: tarjeta.fechaVencimiento || '09/29',
                    cvv: tarjeta.cvv || '584',
                    saldo: cupoCalculado, // Cupo disponible
                    estado: 'ACTIVA',
                    bloqueada: tarjeta.bloqueada || false,
                    username: usernameActual,
                    fechaAprobacion: tarjeta.fechaAprobacion || new Date().toISOString()
                };
                cuentasUsuario.push(nuevaTC);
                todasLasCuentas.push(nuevaTC);
                cambios = true;
            }
        }
    });

    if (cambios) {
        try {
            localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));
        } catch {
            // Manejo de cuota de almacenamiento
        }
    }

    // Depurar y consolidar cuentas para evitar duplicidad de productos del mismo tipo:
    // 1) Si una cuenta tiene tipo AHORROS o CORRIENTE y su número empieza con 4532 (número de tarjeta)
    //    mientras ya existe la cuenta original 4021..., descartar el registro huérfano.
    // 2) Mantener como máximo una Cuenta de Ahorros y una Cuenta Corriente por usuario.
    const cuentasConsolidadas = [];
    const tiposCuentasVistos = new Set();

    // Priorizar cuentas bancarias reales (número 4021 o saldos con dinero)
    cuentasUsuario.sort((a, b) => {
        const aEsCuentaReal = String(a.numero).startsWith('4021') ? 1 : 0;
        const bEsCuentaReal = String(b.numero).startsWith('4021') ? 1 : 0;
        if (aEsCuentaReal !== bEsCuentaReal) return bEsCuentaReal - aEsCuentaReal;
        return (Number(b.saldo) || 0) - (Number(a.saldo) || 0);
    });

    for (const c of cuentasUsuario) {
        if (c.tipo === 'AHORROS' || c.tipo === 'CORRIENTE') {
            if (!tiposCuentasVistos.has(c.tipo)) {
                tiposCuentasVistos.add(c.tipo);
                cuentasConsolidadas.push(c);
            }
        } else {
            // Tarjetas de crédito u otros productos
            const clave = `${c.tipo}_${c.numero}`;
            if (!tiposCuentasVistos.has(clave)) {
                tiposCuentasVistos.add(clave);
                cuentasConsolidadas.push(c);
            }
        }
    }

    // Actualizar storage si se eliminaron cuentas huérfanas duplicadas
    if (cuentasConsolidadas.length !== cuentasUsuario.length) {
        const cuentasOtrosUsuarios = todasLasCuentas.filter(c => c && !(c.username === usernameActual || (!c.username && usernameActual === 'maria17')));
        try {
            localStorage.setItem('finara_cuentas', JSON.stringify([...cuentasOtrosUsuarios, ...cuentasConsolidadas]));
        } catch {
            // Manejo de cuota
        }
    }

    return cuentasConsolidadas;
}
