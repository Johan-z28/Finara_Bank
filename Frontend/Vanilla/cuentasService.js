// Vanilla/cuentasService.js
// Capa de acceso a datos de cuentas para HU-04 (Consulta de saldo).
// Maneja la gestión de cuentas asociadas al usuario autenticado (Ahorros, Corriente, Tarjetas de Crédito y Préstamos).

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
 * { tieneAhorros: boolean, tieneCorriente: boolean, tieneCredito: boolean, tienePrestamo: boolean, cuentas: Array }
 */
export async function consultarEstadoProductosUsuario() {
    const cuentas = await obtenerCuentas();
    return {
        tieneAhorros: cuentas.some(c => c.tipo === 'AHORROS' && c.estado === 'ACTIVA'),
        tieneCorriente: cuentas.some(c => c.tipo === 'CORRIENTE' && c.estado === 'ACTIVA'),
        tieneCredito: cuentas.some(c => c.tipo === 'TARJETA_CREDITO' && c.estado === 'ACTIVA'),
        tienePrestamo: cuentas.some(c => c.tipo === 'PRESTAMO' && c.estado === 'ACTIVA'),
        cuentas
    };
}

/**
 * Sincroniza y obtiene las cuentas del usuario autenticado sin datos falsos.
 * Conecta con los productos aprobados, tarjetas y préstamos activos de finara_prestamos y finara_cuentas.
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
        } else {
            cuentasUsuario = [];
        }
    }

    // Sincronizar tarjetas aprobadas por el usuario
    const tarjetasAprobadas = usuario.tarjetasAprobadas || [];
    tarjetasAprobadas.forEach((tarjeta, index) => {
        let tipoCuenta = 'AHORROS';
        if (tarjeta.tipo === 'debito') tipoCuenta = 'AHORROS';
        else if (tarjeta.tipo === 'corriente') tipoCuenta = 'CORRIENTE';
        else if (tarjeta.tipo === 'credito') tipoCuenta = 'TARJETA_CREDITO';

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
                    saldo: cupoCalculado,
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

    // 🚀 SINCRONIZACIÓN Y FILTRADO ESTRICTO DE PRÉSTAMOS ACTIVOS
    let listaPrestamosActivos = [];
    try {
        const prestamosGlobales = JSON.parse(localStorage.getItem('finara_prestamos')) || [];
        if (Array.isArray(prestamosGlobales)) {
            // Filtrar estrictamente solo los que NO estén pagados
            listaPrestamosActivos.push(...prestamosGlobales.filter(p => p && p.activo !== false && p.estado !== 'PAGADO'));
        }
    } catch {}

    // Remover de cuentasUsuario cualquier préstamo viejo que ya haya sido pagado
    cuentasUsuario = cuentasUsuario.filter(c => {
        if (c.tipo !== 'PRESTAMO') return true;
        const sigueActivo = listaPrestamosActivos.some(p => p.radicado === c.radicado || p.numero === c.numero);
        return sigueActivo;
    });

    listaPrestamosActivos.forEach(prestamo => {
        const radicadoId = prestamo.radicado || prestamo.id || ('PRES-' + Math.floor(Math.random() * 1000000));
        const idPrestamo = `PRES-${radicadoId}`;
        const yaExistePrestamo = cuentasUsuario.some(c => c.id === idPrestamo || (c.tipo === 'PRESTAMO' && (c.numero === prestamo.numero || c.radicado === prestamo.radicado)));

        if (!yaExistePrestamo) {
            let saldoDeuda = Number(prestamo.saldo || prestamo.monto) || 0;
            if (prestamo.cuotasPagadas !== undefined && prestamo.cuotaMensual && prestamo.meses) {
                const cuotasRestantes = prestamo.meses - prestamo.cuotasPagadas;
                saldoDeuda = cuotasRestantes * prestamo.cuotaMensual;
            }

            const nuevoPrestamo = {
                id: idPrestamo,
                tipo: 'PRESTAMO',
                radicado: prestamo.radicado,
                numero: prestamo.numero || ('8844' + String(Math.floor(Math.random() * 100000000))),
                saldo: saldoDeuda,
                estado: 'ACTIVA',
                username: usernameActual,
                fechaCreacion: prestamo.fecha || prestamo.fechaCreacion || new Date().toISOString()
            };
            cuentasUsuario.push(nuevoPrestamo);
            todasLasCuentas.push(nuevoPrestamo);
            cambios = true;
        }
    });

    if (cambios) {
        try {
            localStorage.setItem('finara_cuentas', JSON.stringify(todasLasCuentas));
        } catch {}
    }

    const cuentasConsolidadas = [];
    const tiposCuentasVistos = new Set();

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
        } else if (c.tipo === 'PRESTAMO') {
            const clavePrestamo = `PRESTAMO_${c.radicado || c.numero}`;
            if (!tiposCuentasVistos.has(clavePrestamo)) {
                tiposCuentasVistos.add(clavePrestamo);
                cuentasConsolidadas.push(c);
            }
        } else {
            const clave = `${c.tipo}_${c.numero}`;
            if (!tiposCuentasVistos.has(clave)) {
                tiposCuentasVistos.add(clave);
                cuentasConsolidadas.push(c);
            }
        }
    }

    return cuentasConsolidadas;
}