// Frontend/Vanilla/beneficiariosService.js
// Capa de servicio para HU-08: Registrar y gestionar beneficiarios
// Permite asociar beneficiarios al usuario autenticado, validar datos, listar y notificar.

import { guardarNotificacion } from './notificaciones.js';
import { obtenerUsernameActivo, obtenerUsuarioAutenticado } from './cuentasService.js';

const CLAVE_BENEFICIARIOS = 'finara_beneficiarios';

export const BANCOS_COLOMBIA = [
    'Finara Bank',
    'Bancolombia',
    'Banco de Bogotá',
    'Davivienda',
    'Banco BBVA',
    'Banco de Occidente',
    'Banco Popular',
    'Banco AV Villas',
    'Scotiabank Colpatria',
    'Banco Caja Social',
    'Banco Falabella',
    'Nequi',
    'Daviplata',
    'Lulo Bank',
    'Nu Colombia'
];

export const TIPOS_DOCUMENTO = [
    { codigo: 'CC', nombre: 'Cédula de Ciudadanía' },
    { codigo: 'CE', nombre: 'Cédula de Extranjería' },
    { codigo: 'TI', nombre: 'Tarjeta de Identidad' },
    { codigo: 'PAS', nombre: 'Pasaporte' },
    { codigo: 'NIT', nombre: 'NIT' }
];

export const TIPOS_CUENTA = [
    { codigo: 'AHORROS', nombre: 'Cuenta de Ahorros' },
    { codigo: 'CORRIENTE', nombre: 'Cuenta Corriente' }
];

/**
 * Obtiene todos los beneficiarios guardados en el almacenamiento local.
 */
function leerTodosLosBeneficiarios() {
    try {
        const raw = JSON.parse(localStorage.getItem(CLAVE_BENEFICIARIOS));
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

/**
 * Guarda la colección completa de beneficiarios en localStorage.
 */
function guardarTodosLosBeneficiarios(lista) {
    try {
        localStorage.setItem(CLAVE_BENEFICIARIOS, JSON.stringify(lista));
    } catch {
        throw new Error('No se pudo guardar en el almacenamiento local del navegador.');
    }
}

/**
 * Obtiene los beneficiarios que pertenecen de manera exclusiva al usuario autenticado.
 */
export function obtenerBeneficiariosUsuario() {
    const username = obtenerUsernameActivo();
    const todos = leerTodosLosBeneficiarios();
    return todos.filter(b => b.usuarioPropietario === username);
}

/**
 * Valida minuciosamente los datos ingresados en el formulario de beneficiario.
 */
export function validarDatosBeneficiario({ nombre, tipoDocumento, numeroDocumento, banco, tipoCuenta, numeroCuenta, alias, email, telefono }) {
    if (!nombre || nombre.trim().length < 3) {
        return { ok: false, campo: 'nombre', mensaje: 'El nombre completo debe tener al menos 3 caracteres.' };
    }

    if (!tipoDocumento || !TIPOS_DOCUMENTO.some(t => t.codigo === tipoDocumento)) {
        return { ok: false, campo: 'tipoDocumento', mensaje: 'Selecciona un tipo de documento válido.' };
    }

    const numDocLimpio = String(numeroDocumento || '').trim().replace(/\D/g, '');
    if (!numDocLimpio || numDocLimpio.length < 5 || numDocLimpio.length > 15) {
        return { ok: false, campo: 'numeroDocumento', mensaje: 'El número de documento debe tener entre 5 y 15 dígitos numéricos.' };
    }

    if (!banco || !BANCOS_COLOMBIA.includes(banco)) {
        return { ok: false, campo: 'banco', mensaje: 'Selecciona una entidad bancaria válida.' };
    }

    if (!tipoCuenta || (tipoCuenta !== 'AHORROS' && tipoCuenta !== 'CORRIENTE')) {
        return { ok: false, campo: 'tipoCuenta', mensaje: 'Selecciona el tipo de cuenta (Ahorros o Corriente).' };
    }

    const numCtaLimpio = String(numeroCuenta || '').trim().replace(/\D/g, '');
    if (!numCtaLimpio || numCtaLimpio.length < 8 || numCtaLimpio.length > 20) {
        return { ok: false, campo: 'numeroCuenta', mensaje: 'El número de cuenta debe tener entre 8 y 20 dígitos numéricos.' };
    }

    if (email && email.trim() !== '') {
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(email.trim())) {
            return { ok: false, campo: 'email', mensaje: 'El correo electrónico ingresado no tiene un formato válido.' };
        }
    }

    if (telefono && telefono.trim() !== '') {
        const telLimpio = String(telefono).replace(/\D/g, '');
        if (telLimpio.length < 7 || telLimpio.length > 12) {
            return { ok: false, campo: 'telefono', mensaje: 'El número de teléfono/celular debe tener entre 7 y 12 dígitos.' };
        }
    }

    return { ok: true };
}

/**
 * Registra un nuevo beneficiario asociado exclusivamente al usuario autenticado.
 */
export async function registrarBeneficiario(datos) {
    await new Promise(r => setTimeout(r, 300)); // Simulación de latencia

    const validacion = validarDatosBeneficiario(datos);
    if (!validacion.ok) {
        throw new Error(validacion.mensaje);
    }

    const username = obtenerUsernameActivo();
    const todos = leerTodosLosBeneficiarios();

    const numCtaLimpio = String(datos.numeroCuenta).trim().replace(/\D/g, '');
    const numDocLimpio = String(datos.numeroDocumento).trim().replace(/\D/g, '');

    // Validar duplicado para este mismo usuario
    const yaExiste = todos.some(b => 
        b.usuarioPropietario === username && 
        b.banco === datos.banco && 
        b.numeroCuenta === numCtaLimpio && 
        b.tipoCuenta === datos.tipoCuenta
    );

    if (yaExiste) {
        throw new Error(`Ya tienes inscrito un beneficiario con esta misma cuenta en ${datos.banco}.`);
    }

    const nuevoBeneficiario = {
        id: `ben_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        usuarioPropietario: username,
        nombre: datos.nombre.trim(),
        tipoDocumento: datos.tipoDocumento,
        numeroDocumento: numDocLimpio,
        banco: datos.banco,
        tipoCuenta: datos.tipoCuenta,
        numeroCuenta: numCtaLimpio,
        alias: (datos.alias && datos.alias.trim()) || datos.nombre.trim().split(' ')[0],
        email: datos.email ? datos.email.trim().toLowerCase() : '',
        telefono: datos.telefono ? String(datos.telefono).replace(/\D/g, '') : '',
        fechaRegistro: new Date().toISOString(),
        estado: 'ACTIVO'
    };

    todos.unshift(nuevoBeneficiario);
    guardarTodosLosBeneficiarios(todos);

    // Integración opcional con finara_terceros para permitir transferencias inmediatas si es Finara Bank
    if (datos.banco === 'Finara Bank') {
        try {
            const tercerosRaw = JSON.parse(localStorage.getItem('finara_terceros')) || [];
            const existeTercero = tercerosRaw.some(t => String(t.numero).replace(/\D/g, '') === numCtaLimpio);
            if (!existeTercero) {
                tercerosRaw.push({
                    id: nuevoBeneficiario.id,
                    tipo: datos.tipoCuenta,
                    numero: numCtaLimpio,
                    titular: datos.nombre.trim(),
                    saldo: 1000000
                });
                localStorage.setItem('finara_terceros', JSON.stringify(tercerosRaw));
            }
        } catch { }
    }

    // Disparar Notificación oficial en localStorage
    guardarNotificacion({
        titulo: 'Beneficiario Inscrito',
        mensaje: `Has inscrito exitosamente a ${nuevoBeneficiario.nombre} (${nuevoBeneficiario.banco}) para transferencias.`,
        tipo: 'exito'
    });

    return nuevoBeneficiario;
}

/**
 * Elimina un beneficiario del usuario actual.
 */
export function eliminarBeneficiario(idBeneficiario) {
    const username = obtenerUsernameActivo();
    const todos = leerTodosLosBeneficiarios();
    const index = todos.findIndex(b => b.id === idBeneficiario && b.usuarioPropietario === username);

    if (index === -1) {
        throw new Error('El beneficiario no existe o no tienes autorización para eliminarlo.');
    }

    const eliminado = todos[index];
    todos.splice(index, 1);
    guardarTodosLosBeneficiarios(todos);

    guardarNotificacion({
        titulo: 'Beneficiario Eliminado',
        mensaje: `Has eliminado a ${eliminado.nombre} de tu lista de beneficiarios inscritos.`,
        tipo: 'alerta'
    });

    return eliminado;
}
