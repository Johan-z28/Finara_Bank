// Vanilla/extractoService.js
// Servicio generador de documentos oficiales (PDF / Extracto Bancario)
// HU-19: Descargar extracto bancario con resumen de movimientos y datos de cuenta.

import { obtenerUsuarioAutenticado, obtenerCuentas } from './cuentasService.js';
import { guardarNotificacion } from './notificaciones.js';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatoCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
});

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

const formatoHora = new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});

/**
 * Obtiene los datos consolidados de la cuenta y sus movimientos para el periodo especificado.
 */
export async function obtenerDatosExtracto(cuentaId, mes, anio) {
    const usuario = obtenerUsuarioAutenticado() || { nombre: 'Cliente Finara', username: 'maria17', documento: '1020304050' };
    const cuentas = await obtenerCuentas();
    const cuenta = cuentas.find(c => c.id === cuentaId || c.numero === cuentaId) || cuentas[0];

    if (!cuenta) {
        throw new Error('No se encontró la cuenta seleccionada para el extracto.');
    }

    // Filtrar movimientos del localStorage o generar base del mes
    let movimientosTodos = [];
    try {
        movimientosTodos = JSON.parse(localStorage.getItem('finara_movimientos')) || [];
    } catch {
        movimientosTodos = [];
    }

    const numCuentaLimpio = String(cuenta.numero).replace(/\D/g, '');
    const mNum = parseInt(mes, 10);
    const aNum = parseInt(anio, 10);

    let movimientosPeriodo = movimientosTodos.filter(m => {
        const mId = String(m.cuentaId || '');
        const mNumCuenta = String(m.cuentaNumero || '').replace(/\D/g, '');
        const esDeCuenta = (mId && mId === String(cuenta.id)) || (numCuentaLimpio && mNumCuenta && mNumCuenta === numCuentaLimpio);
        if (!esDeCuenta) return false;
        const f = new Date(m.fecha);
        return (f.getMonth() + 1) === mNum && f.getFullYear() === aNum;
    });

    // Ordenar cronológicamente descendente: los movimientos más recientes primero
    movimientosPeriodo.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Si no tiene movimientos en ese mes, generar transacciones representativas del periodo
    if (movimientosPeriodo.length === 0) {
        const dias = [28, 22, 15, 8, 3];
        const saldoActual = Number(cuenta.saldo) || 1500000;
        movimientosPeriodo = [
            {
                id: `EXT-MOV-${aNum}${mNum}-1`,
                fecha: new Date(aNum, mNum - 1, dias[0], 10, 15).toISOString(),
                descripcion: 'Abono de Intereses / Rendimientos',
                categoria: 'Rendimientos',
                tipo: 'INGRESO',
                valor: 32500
            },
            {
                id: `EXT-MOV-${aNum}${mNum}-2`,
                fecha: new Date(aNum, mNum - 1, dias[1], 16, 40).toISOString(),
                descripcion: 'Transferencia Recibida Finara Pay',
                categoria: 'Transferencia',
                tipo: 'INGRESO',
                valor: 650000
            },
            {
                id: `EXT-MOV-${aNum}${mNum}-3`,
                fecha: new Date(aNum, mNum - 1, dias[2], 12, 10).toISOString(),
                descripcion: 'Pago en Comercio / Compra Digital',
                categoria: 'Compras',
                tipo: 'EGRESO',
                valor: 185000
            },
            {
                id: `EXT-MOV-${aNum}${mNum}-4`,
                fecha: new Date(aNum, mNum - 1, dias[3], 9, 30).toISOString(),
                descripcion: 'Pago de Servicios Públicos y Suscripciones',
                categoria: 'Servicios',
                tipo: 'EGRESO',
                valor: 94000
            }
        ];
    }

    const totalIngresos = movimientosPeriodo
        .filter(m => m.tipo === 'INGRESO')
        .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);

    const totalEgresos = movimientosPeriodo
        .filter(m => m.tipo === 'EGRESO')
        .reduce((sum, m) => sum + (Number(m.valor) || 0), 0);

    const saldoFinal = Number(cuenta.saldo) || 0;
    const saldoInicial = Math.max(0, saldoFinal - totalIngresos + totalEgresos);

    return {
        banco: 'Finara Bank S.A.',
        nit: '901.452.880-1',
        folioCertificado: `EXT-${aNum}${String(mNum).padStart(2, '0')}-${String(Date.now()).slice(-6)}`,
        fechaEmision: new Date().toISOString(),
        periodoTexto: `${MESES[mNum - 1]} de ${aNum}`,
        mes: mNum,
        anio: aNum,
        titular: {
            nombre: usuario.nombre || usuario.nombreCompleto || 'Cliente Finara Bank',
            documento: usuario.cedula || usuario.documento || '1.020.450.982',
            correo: usuario.correo || usuario.email || 'cliente@finara.com',
            ciudad: 'Bogotá D.C., Colombia'
        },
        cuenta: {
            id: cuenta.id,
            tipo: cuenta.tipo === 'CORRIENTE' ? 'Cuenta Corriente' : (cuenta.tipo === 'TARJETA_CREDITO' ? 'Tarjeta de Crédito' : 'Cuenta de Ahorros'),
            numero: cuenta.numero,
            estado: cuenta.estado || 'ACTIVA'
        },
        resumenFinanciero: {
            saldoInicial,
            totalIngresos,
            totalEgresos,
            saldoFinal
        },
        movimientos: movimientosPeriodo
    };
}

/**
 * Genera el documento oficial en formato HTML / PDF estructurado con sellos de seguridad bancarios.
 */
export function generarHTMLDocumentoExtracto(datos) {
    const filasMovimientos = datos.movimientos.map(m => {
        const esIngreso = m.tipo === 'INGRESO';
        const d = new Date(m.fecha);
        const fStr = !isNaN(d.getTime()) ? `${formatoFecha.format(d)} <span style="display: block; font-size: 10px; color: #94a3b8;">${formatoHora.format(d)}</span>` : '—';
        return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                <td style="padding: 8px 10px; color: #475569; white-space: nowrap;">${fStr}</td>
                <td style="padding: 8px 10px; font-weight: 500; color: #1e293b;">${m.descripcion}</td>
                <td style="padding: 8px 10px; color: #64748b;">${m.categoria || 'Operación'}</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: ${esIngreso ? '#15803d' : '#b91c1c'};">
                    ${esIngreso ? '+' : '-'} ${formatoCOP.format(Number(m.valor) || 0)}
                </td>
            </tr>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Extracto Bancario - Finara Bank - ${datos.periodoTexto}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 24px;
            background: #fff;
            line-height: 1.4;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #e5a93c;
            padding-bottom: 16px;
            margin-bottom: 20px;
        }
        .brand h1 { margin: 0; font-size: 24px; color: #0f172a; letter-spacing: -0.5px; }
        .brand span { color: #e5a93c; font-weight: 800; }
        .brand p { margin: 2px 0 0 0; font-size: 10px; color: #64748b; }
        .doc-meta { text-align: right; }
        .doc-meta h2 { margin: 0; font-size: 16px; color: #0f172a; text-transform: uppercase; }
        .doc-meta p { margin: 3px 0 0 0; font-size: 11px; color: #64748b; }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
        }
        .box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
        }
        .box h3 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .box table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .box table td { padding: 3px 0; }
        .box table td.label { color: #64748b; width: 45%; }
        .box table td.val { font-weight: 600; color: #0f172a; }
        .resumen-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        .resumen-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
        }
        .resumen-card.destacada {
            background: #fffbeb;
            border-color: #fde68a;
        }
        .resumen-card span { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .resumen-card strong { font-size: 14px; color: #0f172a; }
        .resumen-card.destacada strong { color: #b45309; }
        .tabla-movs { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .tabla-movs th {
            background: #0f172a;
            color: #fff;
            padding: 8px 10px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: left;
        }
        .tabla-movs th.text-right { text-align: right; }
        .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #64748b;
        }
        .sello {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #15803d;
            font-weight: 700;
            border: 1px dashed #86efac;
            padding: 4px 8px;
            border-radius: 4px;
            background: #f0fdf4;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">
            <h1>FINARA <span>BANK</span></h1>
            <p>Finara Bank S.A. · Vigilado Superintendencia Financiera de Colombia · NIT ${datos.nit}</p>
        </div>
        <div class="doc-meta">
            <h2>Extracto Oficial de Cuenta</h2>
            <p><strong>Periodo:</strong> ${datos.periodoTexto}</p>
            <p><strong>Folio:</strong> ${datos.folioCertificado}</p>
        </div>
    </div>

    <div class="info-grid">
        <div class="box">
            <h3>Información del Titular</h3>
            <table>
                <tr><td class="label">Nombre:</td><td class="val">${datos.titular.nombre}</td></tr>
                <tr><td class="label">Documento:</td><td class="val">${datos.titular.documento}</td></tr>
                <tr><td class="label">Correo:</td><td class="val">${datos.titular.correo}</td></tr>
                <tr><td class="label">Plaza:</td><td class="val">${datos.titular.ciudad}</td></tr>
            </table>
        </div>
        <div class="box">
            <h3>Detalles del Producto</h3>
            <table>
                <tr><td class="label">Tipo de Cuenta:</td><td class="val">${datos.cuenta.tipo}</td></tr>
                <tr><td class="label">Número de Cuenta:</td><td class="val">•••• ${String(datos.cuenta.numero).slice(-4)}</td></tr>
                <tr><td class="label">Estado:</td><td class="val" style="color: #15803d;">${datos.cuenta.estado}</td></tr>
                <tr><td class="label">Fecha Expedición:</td><td class="val">${formatoFecha.format(new Date(datos.fechaEmision))}</td></tr>
            </table>
        </div>
    </div>

    <div class="resumen-cards">
        <div class="resumen-card">
            <span>Saldo Anterior</span>
            <strong>${formatoCOP.format(datos.resumenFinanciero.saldoInicial)}</strong>
        </div>
        <div class="resumen-card">
            <span>Total Abonos (+)</span>
            <strong style="color: #15803d;">${formatoCOP.format(datos.resumenFinanciero.totalIngresos)}</strong>
        </div>
        <div class="resumen-card">
            <span>Total Cargos (-)</span>
            <strong style="color: #b91c1c;">${formatoCOP.format(datos.resumenFinanciero.totalEgresos)}</strong>
        </div>
        <div class="resumen-card destacada">
            <span>Saldo al Cierre (=)</span>
            <strong>${formatoCOP.format(datos.resumenFinanciero.saldoFinal)}</strong>
        </div>
    </div>

    <h3 style="font-size: 12px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">Detalle de Movimientos y Operaciones</h3>
    <table class="tabla-movs">
        <thead>
            <tr>
                <th style="width: 15%;">Fecha</th>
                <th style="width: 45%;">Descripción</th>
                <th style="width: 20%;">Categoría</th>
                <th class="text-right" style="width: 20%;">Importe (COP)</th>
            </tr>
        </thead>
        <tbody>
            ${filasMovimientos}
        </tbody>
    </table>

    <div class="footer">
        <div>
            <span class="sello">✓ DOCUMENTO AUTÉNTICO DIGITAL</span>
            <span style="margin-left: 8px;">Código de Verificación: ${datos.folioCertificado}</span>
        </div>
        <div>
            <span>Este extracto tiene validez legal como constancia financiera bancaria ante entidades oficiales.</span>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Habilita la descarga directa del archivo PDF / documento desde el navegador web.
 * Utiliza iframe oculto / Blob URL para activar la descarga inmediata e impresión oficial a PDF.
 */
export function descargarExtractoPDF(datos) {
    const htmlContenido = generarHTMLDocumentoExtracto(datos);
    const nombreArchivo = `Extracto_Finara_${String(datos.cuenta.numero).slice(-4)}_${datos.mes}_${datos.anio}.html`;

    // 1. Descarga directa como archivo oficial HTML/PDF
    const blob = new Blob([htmlContenido], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkDescarga = document.createElement('a');
    linkDescarga.href = url;
    linkDescarga.setAttribute('download', nombreArchivo);
    document.body.appendChild(linkDescarga);
    linkDescarga.click();
    document.body.removeChild(linkDescarga);

    // 2. Abrir ventana de impresión nativa a PDF para guardar directo como .pdf si el usuario lo desea
    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
        ventanaImpresion.document.write(htmlContenido);
        ventanaImpresion.document.close();
        setTimeout(() => {
            ventanaImpresion.focus();
            ventanaImpresion.print();
        }, 350);
    }

    URL.revokeObjectURL(url);
    return { exito: true, nombreArchivo };
}

