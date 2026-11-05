package transferencias;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class ComprobanteTransferencia {
    private final String referencia;
    private final LocalDateTime fechaHora;
    private final String bancoOrigen;
    private final String cuentaOrigenTipo;
    private final String cuentaOrigenNumero;
    private final String bancoDestino;
    private final String tipoCuentaDestino;
    private final String numeroCuentaDestino;
    private final String titularBeneficiario;
    private final String documentoBeneficiario;
    private final double monto;
    private final double comisionACH;
    private final double totalDebitado;
    private final double saldoRestante;
    private final String concepto;
    private final String estado;

    public ComprobanteTransferencia(String referencia, LocalDateTime fechaHora, String bancoOrigen,
                                    String cuentaOrigenTipo, String cuentaOrigenNumero, String bancoDestino,
                                    String tipoCuentaDestino, String numeroCuentaDestino, String titularBeneficiario,
                                    String documentoBeneficiario, double monto, double comisionACH,
                                    double totalDebitado, double saldoRestante, String concepto, String estado) {
        this.referencia = referencia;
        this.fechaHora = fechaHora;
        this.bancoOrigen = bancoOrigen;
        this.cuentaOrigenTipo = cuentaOrigenTipo;
        this.cuentaOrigenNumero = cuentaOrigenNumero;
        this.bancoDestino = bancoDestino;
        this.tipoCuentaDestino = tipoCuentaDestino;
        this.numeroCuentaDestino = numeroCuentaDestino;
        this.titularBeneficiario = titularBeneficiario;
        this.documentoBeneficiario = documentoBeneficiario;
        this.monto = monto;
        this.comisionACH = comisionACH;
        this.totalDebitado = totalDebitado;
        this.saldoRestante = saldoRestante;
        this.concepto = concepto;
        this.estado = estado;
    }

    public String getReferencia() { return referencia; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public String getBancoDestino() { return bancoDestino; }
    public String getTitularBeneficiario() { return titularBeneficiario; }
    public double getMonto() { return monto; }
    public double getComisionACH() { return comisionACH; }
    public double getTotalDebitado() { return totalDebitado; }
    public double getSaldoRestante() { return saldoRestante; }
    public String getEstado() { return estado; }

    public void imprimirComprobante() {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);
        DateTimeFormatter formatoFecha = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        System.out.println("\n=======================================================");
        System.out.println("         FINARA BANK - COMPROBANTE OFICIAL ACH         ");
        System.out.println("       Red de Transferencias Interbancarias ACH        ");
        System.out.println("=======================================================");
        System.out.println(" Estado:                     " + estado + " (Aprobada)");
        System.out.println(" Número de Referencia (CUS): " + referencia);
        System.out.println(" Fecha y hora:               " + fechaHora.format(formatoFecha));
        System.out.println("-------------------------------------------------------");
        System.out.println(" ORIGEN");
        System.out.println("   Entidad Emisora:          " + bancoOrigen);
        System.out.println("   Producto:                 " + cuentaOrigenTipo + " •••• " + enmascararNumero(cuentaOrigenNumero));
        System.out.println(" DESTINO (INTERBANCARIO)");
        System.out.println("   Entidad Receptora:        " + bancoDestino);
        System.out.println("   Beneficiario:             " + titularBeneficiario);
        System.out.println("   Documento:                " + (documentoBeneficiario.isEmpty() ? "No informado" : documentoBeneficiario));
        System.out.println("   Tipo de Producto:         " + tipoCuentaDestino);
        System.out.println("   Número de Cuenta:         •••• " + enmascararNumero(numeroCuentaDestino));
        System.out.println("   Concepto:                 " + (concepto.isEmpty() ? "Sin concepto" : concepto));
        System.out.println("-------------------------------------------------------");
        System.out.println(" LIQUIDACIÓN FINANCIERA");
        System.out.println("   Monto transferido:        " + formatoCOP.format(monto));
        System.out.println("   Tarifa de red ACH:        " + formatoCOP.format(comisionACH));
        System.out.println("   TOTAL DEBITADO:           " + formatoCOP.format(totalDebitado));
        System.out.println("   Nuevo saldo disponible:   " + formatoCOP.format(saldoRestante));
        System.out.println("=======================================================");
        System.out.println("   Operación procesada y asegurada bajo red ACH-CENIT   ");
        System.out.println("=======================================================\n");
    }

    private String enmascararNumero(String numero) {
        String numLimpio = numero.replaceAll("\\D", "");
        if (numLimpio.length() <= 4) return numLimpio;
        return numLimpio.substring(numLimpio.length() - 4);
    }
}
