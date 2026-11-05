package transferencias;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Comprobante oficial de operaciones internas y retiros (HU-06 y HU-28).
 */
public class ComprobanteTransaccion {
    private final String tipoTransaccion;
    private final String referencia;
    private final LocalDateTime fechaHora;
    private final String cuentaOrigenTipo;
    private final String cuentaOrigenNumero;
    private final String cuentaDestinoTipo;
    private final String cuentaDestinoNumero;
    private final String titularDestino;
    private final double monto;
    private final double interesAplicado;
    private final double totalDebitado;
    private final double saldoResultante;
    private final double cupoResultante;
    private final String concepto;
    private final String estado;

    public ComprobanteTransaccion(String tipoTransaccion, String referencia, LocalDateTime fechaHora,
                                  String cuentaOrigenTipo, String cuentaOrigenNumero,
                                  String cuentaDestinoTipo, String cuentaDestinoNumero,
                                  String titularDestino, double monto, double interesAplicado,
                                  double totalDebitado, double saldoResultante, double cupoResultante,
                                  String concepto, String estado) {
        this.tipoTransaccion = tipoTransaccion;
        this.referencia = referencia;
        this.fechaHora = fechaHora;
        this.cuentaOrigenTipo = cuentaOrigenTipo;
        this.cuentaOrigenNumero = cuentaOrigenNumero;
        this.cuentaDestinoTipo = cuentaDestinoTipo;
        this.cuentaDestinoNumero = cuentaDestinoNumero;
        this.titularDestino = titularDestino;
        this.monto = monto;
        this.interesAplicado = interesAplicado;
        this.totalDebitado = totalDebitado;
        this.saldoResultante = saldoResultante;
        this.cupoResultante = cupoResultante;
        this.concepto = concepto;
        this.estado = estado;
    }

    public String getReferencia() { return referencia; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public double getMonto() { return monto; }
    public double getInteresAplicado() { return interesAplicado; }
    public double getTotalDebitado() { return totalDebitado; }
    public double getSaldoResultante() { return saldoResultante; }
    public double getCupoResultante() { return cupoResultante; }
    public String getEstado() { return estado; }

    public void imprimirComprobante() {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);
        DateTimeFormatter formatoFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        System.out.println("\n=======================================================");
        System.out.println("              COMPROBANTE DE TRANSACCIÓN               ");
        System.out.println("                     FINARA BANK                       ");
        System.out.println("=======================================================");
        System.out.println(" Operación:                  " + tipoTransaccion);
        System.out.println(" Número de Referencia:       " + referencia);
        System.out.println(" Fecha y Hora:               " + fechaHora.format(formatoFecha));
        System.out.println(" Estado:                     " + estado);
        System.out.println("-------------------------------------------------------");

        if (cuentaOrigenNumero != null && !cuentaOrigenNumero.isEmpty()) {
            System.out.println(" Cuenta Origen:              " + cuentaOrigenTipo + " •••• " + enmascararNumero(cuentaOrigenNumero));
        }

        if (cuentaDestinoNumero != null && !cuentaDestinoNumero.isEmpty()) {
            System.out.println(" Cuenta Destino:             " + cuentaDestinoTipo + " •••• " + enmascararNumero(cuentaDestinoNumero));
            if (titularDestino != null && !titularDestino.isEmpty()) {
                System.out.println(" Titular Beneficiario:       " + titularDestino);
            }
        }

        System.out.println(" Concepto / Detalle:         " + (concepto != null && !concepto.isEmpty() ? concepto : "Operación Finara"));
        System.out.println("-------------------------------------------------------");
        System.out.println(" Monto Solicitado:           " + formatoCOP.format(monto));

        if (interesAplicado > 0.0) {
            System.out.println(" Rendimiento / Interés (1.5%): +" + formatoCOP.format(interesAplicado));
        }

        if (totalDebitado > 0.0) {
            System.out.println(" Total Debitado / Operación: " + formatoCOP.format(totalDebitado));
        }

        if (cupoResultante > 0.0) {
            System.out.println(" Cupo Disponible Resultante: " + formatoCOP.format(cupoResultante));
        } else {
            System.out.println(" Saldo Resultante:           " + formatoCOP.format(saldoResultante));
        }

        System.out.println(" Tarifa / Comisión:          $0 COP");
        System.out.println("=======================================================");
    }

    private String enmascararNumero(String num) {
        if (num == null) return "0000";
        String limpio = num.replaceAll("\\D", "");
        return limpio.length() > 4 ? limpio.substring(limpio.length() - 4) : limpio;
    }
}

