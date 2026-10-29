// Vanilla/extractoService.js
import { obtenerMovimientos } from './movimientosService.js';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
});

const MESES = {
    "1": "Enero", "2": "Febrero", "3": "Marzo", "4": "Abril",
    "5": "Mayo", "6": "Junio", "7": "Julio", "8": "Agosto",
    "9": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};

const TIPOS_TEXTO = {
    "AHORROS": "Cuenta de Ahorros",
    "CORRIENTE": "Cuenta Corriente",
    "TARJETA_CREDITO": "Tarjeta de Crédito"
};

function asegurarJsPDF() {
    return new Promise((resolve, reject) => {
        if (window.jspdf && window.jspdf.jsPDF) {
            resolve(window.jspdf.jsPDF);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            if (window.jspdf && window.jspdf.jsPDF) {
                resolve(window.jspdf.jsPDF);
            } else {
                reject(new Error('No se pudo inicializar jsPDF'));
            }
        };
        script.onerror = () => reject(new Error('Error de red al cargar jsPDF'));
        document.head.appendChild(script);
    });
}

// Carga directa de tu logo PNG desde la ruta exacta
async function cargarLogoPNGReal() {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 400;
                canvas.height = img.naturalHeight || 120;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => {
            console.error("ERROR CRÍTICO: No se encontró la imagen en '../Style/image/logo_finara.png'");
            resolve(null);
        };
        img.src = '../Style/image/logo_finara.png';
    });
}

export async function obtenerDatosExtracto(cuentaId, mes, anio) {
    const cuentas = JSON.parse(localStorage.getItem('finara_cuentas')) || [];
    const cuenta = cuentas.find(c => String(c.id) === String(cuentaId) || String(c.numero) === String(cuentaId)) || {
        tipo: 'AHORROS',
        numero: '8084',
        nombre: 'Cuenta de Ahorros'
    };

    const perfil = JSON.parse(localStorage.getItem('userProfile')) || {};
    const titular = perfil.nombre || perfil.username || 'Johan Zapata Cifuentes';

    const resMovs = await obtenerMovimientos({
        cuentaId: cuenta.id || cuenta.numero,
        periodo: 'todo',
        tamano: 1000
    });

    const itemsFiltrados = (resMovs.items || []).filter(mov => {
        const fecha = new Date(mov.fecha);
        if (isNaN(fecha.getTime())) return false;
        return (fecha.getMonth() + 1) === Number(mes) && fecha.getFullYear() === Number(anio);
    });

    let totalIngresos = 0;
    let totalEgresos = 0;
    itemsFiltrados.forEach(m => {
        const val = Number(m.valor) || 0;
        if (m.tipo === 'INGRESO') totalIngresos += val;
        else totalEgresos += val;
    });

    const folioCertificado = `EXT-${anio}${String(mes).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;
    const saldoInicialCalculado = Number(cuenta.saldo || 3472000) - totalIngresos + totalEgresos;

    return {
        titular,
        cuenta: {
            tipo: TIPOS_TEXTO[cuenta.tipo] || cuenta.tipo || 'Cuenta de Ahorros',
            numero: cuenta.numero || '8084'
        },
        periodoTexto: `${MESES[String(mes)]} de ${anio}`,
        folioCertificado,
        fechaGeneracion: new Date().toLocaleDateString('es-CO', { dateStyle: 'long' }),
        resumen: {
            saldoInicial: saldoInicialCalculado,
            totalIngresos,
            totalEgresos,
            saldoFinal: saldoInicialCalculado + totalIngresos - totalEgresos
        },
        movimientos: itemsFiltrados
    };
}

export async function descargarExtractoPDF(datos) {
    try {
        const [jsPDFLib, logoDataUrl] = await Promise.all([asegurarJsPDF(), cargarLogoPNGReal()]);
        const doc = new jsPDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        // --- ENCABEZADO CORPORATIVO OSCURO ESTILO FINARA (#121620) ---
        doc.setFillColor(18, 22, 32); 
        doc.rect(0, 0, pageWidth, 44, 'F');

        // IMPRESIÓN DEL LOGO PNG
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', 15, 10, 42, 14);
            } catch (err) {
                console.error('Error al pintar la imagen PNG en jsPDF:', err);
            }
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); 
        doc.text('Banca Digital S.A. · Certificación Oficial de Extracto Bancario', 15, 32);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('ESTADO DE CUENTA', pageWidth - 15, 17, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(52, 211, 153); 
        doc.text(`Folio: ${datos.folioCertificado}`, pageWidth - 15, 24, { align: 'right' });
        doc.setTextColor(148, 163, 184);
        doc.text(`Emisión: ${datos.fechaGeneracion}`, pageWidth - 15, 30, { align: 'right' });

        y = 52;

        // --- TARJETA DE DATOS DEL TITULAR ---
        doc.setFillColor(23, 28, 40);
        doc.setDrawColor(45, 55, 72);
        doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'FD');

        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('TITULAR DE LA CUENTA', 20, y + 6);
        doc.text('TIPO DE PRODUCTO', 115, y + 6);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9.5);
        doc.text(datos.titular.toUpperCase(), 20, y + 13);
        doc.text(`${datos.cuenta.tipo} (•••• ${String(datos.cuenta.numero).slice(-4)})`, 115, y + 13);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('PERIODO:', 20, y + 18.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text(datos.periodoTexto, 38, y + 18.5);

        y += 28;

        // --- RESUMEN FINANCIERO ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Resumen Financiero del Periodo', 15, y);
        y += 5;

        const anchoTotalCajas = pageWidth - 30;
        const gapCajas = 4;
        const colW = (anchoTotalCajas - (gapCajas * 3)) / 4;

        const cajasResumen = [
            { titulo: 'Saldo Inicial', valor: formatoCOP.format(datos.resumen.saldoInicial), color: [255, 255, 255] },
            { titulo: 'Total Ingresos', valor: formatoCOP.format(datos.resumen.totalIngresos), color: [52, 211, 153] },
            { titulo: 'Total Egresos', valor: formatoCOP.format(datos.resumen.totalEgresos), color: [248, 113, 113] },
            { titulo: 'Saldo Final', valor: formatoCOP.format(datos.resumen.saldoFinal), color: [229, 169, 60] }
        ];

        cajasResumen.forEach((caja, idx) => {
            const x = 15 + (idx * (colW + gapCajas));
            doc.setFillColor(23, 28, 40);
            doc.setDrawColor(45, 55, 72);
            doc.roundedRect(x, y, colW, 16, 2, 2, 'FD');
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text(caja.titulo.toUpperCase(), x + 6, y + 5.5);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(caja.color[0], caja.color[1], caja.color[2]);
            doc.text(caja.valor, x + 6, y + 12.5);
        });

        y += 23;

        // --- TABLA DE MOVIMIENTOS ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Detalle de Transacciones', 15, y);
        y += 5;

        doc.setFillColor(18, 22, 32);
        doc.rect(15, y, pageWidth - 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('FECHA Y HORA', 18, y + 5.5);
        doc.text('DESCRIPCIÓN Y CUENTA DE DESTINO', 62, y + 5.5);
        doc.text('TIPO', 142, y + 5.5);
        doc.text('VALOR', pageWidth - 18, y + 5.5, { align: 'right' });

        y += 8;

        doc.setFontSize(7.5);
        if (datos.movimientos.length === 0) {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.rect(15, y, pageWidth - 30, 10, 'FD');
            doc.setTextColor(100, 116, 139);
            doc.text('No se registraron movimientos para el periodo seleccionado.', pageWidth / 2, y + 6.5, { align: 'center' });
            y += 10;
        } else {
            datos.movimientos.forEach((mov, index) => {
                if (y > 272) {
                    doc.addPage();
                    y = 20;
                }

                const esIngreso = mov.tipo === 'INGRESO';
                if (index % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(15, y, pageWidth - 30, 9, 'F');
                }

                doc.setTextColor(51, 65, 85);
                const fechaObj = new Date(mov.fecha);
                const fechaHoraStr = !isNaN(fechaObj.getTime()) ? formatoFechaHora.format(fechaObj) : mov.fecha;
                
                doc.text(fechaHoraStr, 18, y + 6);
                
                let textoDescripcion = mov.descripcion || 'Transacción';
                const destinoCuenta = mov.cuentaDestino || mov.numeroCuentaDestino || mov.destino;
                if (destinoCuenta) {
                    textoDescripcion += ` | Destino: ${destinoCuenta}`;
                }
                
                const descCortada = textoDescripcion.substring(0, 52);
                doc.text(descCortada, 62, y + 6);

                doc.setFont('helvetica', 'bold');
                doc.setTextColor(esIngreso ? 52 : 248, esIngreso ? 211 : 113, esIngreso ? 153 : 113);
                doc.text(esIngreso ? 'Ingreso' : 'Egreso', 142, y + 6);
                
                // Sin signos de más (+) ni caracteres raros: estricta limpieza del valor numérico
                const valorStr = formatoCOP.format(Number(mov.valor) || 0);
                doc.text(valorStr, pageWidth - 18, y + 6, { align: 'right' });
                doc.setFont('helvetica', 'normal');

                y += 9;
            });
        }

        y += 10;

        // --- PIE DE PÁGINA ---
        if (y > 275) doc.addPage();
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 282, pageWidth - 15, 282);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Finara Bank S.A. · Vigilado Superintendencia Financiera de Colombia · Documento generado digitalmente.', pageWidth / 2, 287, { align: 'center' });
        doc.text(`Página 1 de 1 · Folio ${datos.folioCertificado}`, pageWidth / 2, 291, { align: 'center' });

        doc.save(`Extracto_Finara_${datos.cuenta.tipo}_${datos.periodoTexto.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        console.error('Error al generar PDF de extracto:', err);
        throw new Error('No se pudo cargar la librería para exportar el PDF.');
    }
}