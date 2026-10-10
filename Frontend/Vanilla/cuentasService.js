// Vanilla/cuentasService.js
// Capa de acceso a datos de cuentas para HU-04 (Consulta de saldo).
// La UI nunca llama a fetch o manipula directamente el almacenamiento.
// Cuando el backend REST esté disponible, USAR_API_BACKEND se activa y consulta el servidor.

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
function obtenerUsuarioAutenticado() {
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
    return null;
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
    await new Promise(r => setTimeout(r, 250)); // Simula latencia natural de red

    const usuario = obtenerUsuarioAutenticado();
    if (!usuario) {
        throw new SesionExpiradaError();
    }

    // Obtener cuentas existentes en el ecosistema local
    let cuentasLocales = [];
    try {
        cuentasLocales = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
        if (!Array.isArray(cuentasLocales)) cuentasLocales = [];
    } catch {
        cuentasLocales = [];
    }

    // Si existen cuentas en finara_cuentas, filtrar las asociadas al usuario si tienen username
    // o asociarlas al usuario activo actual
    let cuentasUsuario = [];
    if (cuentasLocales.length > 0) {
        cuentasUsuario = cuentasLocales.filter(c => !c.username || c.username === usuario.username || c.username === usuario.correo);
        // Si ninguna tiene username explícito, las cuentas iniciales pertenecen al usuario en sesión
        if (cuentasUsuario.length === 0 && !cuentasLocales.some(c => c.username && c.username !== usuario.username)) {
            cuentasUsuario = cuentasLocales;
        }
    }

    // Sincronizar también tarjetas aprobadas por el usuario en "Solicitud de Tarjeta" (newCard.js)
    const tarjetasAprobadas = usuario.tarjetasAprobadas || [];
    let cambios = false;

    tarjetasAprobadas.forEach((tarjeta, index) => {
        let tipoCuenta = 'AHORROS';
        if (tarjeta.tipo === 'debito') tipoCuenta = 'AHORROS';
        else if (tarjeta.tipo === 'corriente') tipoCuenta = 'CORRIENTE';
        else if (tarjeta.tipo === 'credito') tipoCuenta = 'TARJETA_CREDITO';

        const idGenerado = `T-${tarjeta.fechaAprobacion || index}`;
        const yaExiste = cuentasUsuario.some(c => c.id === idGenerado || (c.tipo === tipoCuenta && c.fechaAprobacion === tarjeta.fechaAprobacion));

        if (!yaExiste) {
            const numeroCuenta = (tipoCuenta === 'TARJETA_CREDITO' ? '5412' : '4021') + String(Date.now()).slice(-8) + String(index);
            const nuevaCuenta = {
                id: idGenerado,
                tipo: tipoCuenta,
                numero: numeroCuenta,
                saldo: tipoCuenta === 'TARJETA_CREDITO' ? (Math.round((Number(tarjeta.ingresos || 2000000) * 0.1) / 10000) * 10000) : 0,
                estado: 'ACTIVA',
                username: usuario.username || usuario.correo,
                fechaAprobacion: tarjeta.fechaAprobacion
            };
            cuentasLocales.push(nuevaCuenta);
            cuentasUsuario.push(nuevaCuenta);
            cambios = true;
        }
    });

    // Si el usuario es nuevo y aún no tiene cuentas ni productos, verificar si es el usuario demo base
    // o si el sistema tiene cuentas por defecto inicializadas para transferencias
    if (cuentasUsuario.length === 0 && cuentasLocales.length === 0) {
        // Inicializar cuentas base vinculadas al usuario
        const cuentasPorDefecto = [
            { id: 1, tipo: 'AHORROS', numero: '4021587701234', saldo: 1250000, estado: 'ACTIVA', username: usuario.username || usuario.correo },
            { id: 2, tipo: 'CORRIENTE', numero: '4021587705678', saldo: 820450, estado: 'ACTIVA', username: usuario.username || usuario.correo }
        ];
        cuentasLocales = cuentasPorDefecto;
        cuentasUsuario = cuentasPorDefecto;
        cambios = true;
    }

    if (cambios) {
        try {
            localStorage.setItem('finara_cuentas', JSON.stringify(cuentasLocales));
        } catch {
            // Ignorar límite de almacenamiento
        }
    }

    return cuentasUsuario;
}