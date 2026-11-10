package transferenciasInternas;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Representa el comprobante emitido tras una transferencia interna exitosa entre cuentas Finara (HU-06).
 */
public class ComprobanteTransferenciaInterna {
    private final String referencia;
    private final LocalDateTime fechaHora;
    private final String cuentaOrigenTipo;
    private final String cuentaOrigenNumero;
    private final String titularOrigen;
    private final String cuentaDestinoTipo;
    private final String cuentaDestinoNumero;
    private final String titularDestino;
    private final double monto;
    private final double comision;
    private final double totalDebitado;
    private final double saldoResultanteOrigen;
    private final String concepto;
    private final String estado;

    public ComprobanteTransferenciaInterna(String referencia, LocalDateTime fechaHora,
                                          String cuentaOrigenTipo, String cuentaOrigenNumero, String titularOrigen,
                                          String cuentaDestinoTipo, String cuentaDestinoNumero, String titularDestino,
                                          double monto, double comision, double totalDebitado,
                                          double saldoResultanteOrigen, String concepto, String estado) {
        this.referencia = referencia;
        this.fechaHora = fechaHora;
        this.cuentaOrigenTipo = cuentaOrigenTipo;
        this.cuentaOrigenNumero = cuentaOrigenNumero;
        this.titularOrigen = titularOrigen;
        this.cuentaDestinoTipo = cuentaDestinoTipo;
        this.cuentaDestinoNumero = cuentaDestinoNumero;
        this.titularDestino = titularDestino;
        this.monto = monto;
        this.comision = comision;
        this.totalDebitado = totalDebitado;
        this.saldoResultanteOrigen = saldoResultanteOrigen;
        this.concepto = concepto;
        this.estado = estado;
    }

    public String getReferencia() { return referencia; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public double getMonto() { return monto; }
    public double getComision() { return comision; }
    public double getTotalDebitado() { return totalDebitado; }
    public double getSaldoResultanteOrigen() { return saldoResultanteOrigen; }
    public String getEstado() { return estado; }

    public void imprimirComprobante() {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);
        DateTimeFormatter formatoFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        System.out.println("\n=======================================================");
        System.out.println("          COMPROBANTE DE TRANSFERENCIA FINARA          ");
        System.out.println("                     FINARA BANK                       ");
        System.out.println("=======================================================");
        System.out.println(" Número de Referencia:       " + referencia);
        System.out.println(" Fecha y Hora:               " + fechaHora.format(formatoFecha));
        System.out.println(" Estado de Transacción:      " + estado);
        System.out.println(" Entidad:                    Finara Bank (Operación Interna)");
        System.out.println("-------------------------------------------------------");
        System.out.println(" Cuenta Origen:              " + cuentaOrigenTipo + " •••• " + enmascarar(cuentaOrigenNumero));
        if (titularOrigen != null && !titularOrigen.isEmpty()) {
            System.out.println(" Ordenante:                  " + titularOrigen);
        }
        System.out.println(" Cuenta Destino:             " + cuentaDestinoTipo + " •••• " + enmascarar(cuentaDestinoNumero));
        if (titularDestino != null && !titularDestino.isEmpty()) {
            System.out.println(" Titular Beneficiario:       " + titularDestino);
        }
        System.out.println(" Concepto:                   " + (concepto != null && !concepto.isEmpty() ? concepto : "Transferencia en Línea"));
        System.out.println("-------------------------------------------------------");
        System.out.println(" Monto Transferido:          " + formatoCOP.format(monto));
        System.out.println(" Comisión de Transferencia:  " + formatoCOP.format(comision) + " COP (Tarifa $0 interna)");
        System.out.println(" Total Debitado en Origen:   " + formatoCOP.format(totalDebitado));
        System.out.println(" Saldo Restante en Origen:   " + formatoCOP.format(saldoResultanteOrigen));
        System.out.println("=======================================================");
    }

    private String enmascarar(String num) {
        if (num == null) return "0000";
        String limpio = num.replaceAll("\\D", "");
        return limpio.length() > 4 ? limpio.substring(limpio.length() - 4) : limpio;
    }
}
