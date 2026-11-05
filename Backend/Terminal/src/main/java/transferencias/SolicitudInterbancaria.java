package transferencias;

public class SolicitudInterbancaria {
    private String bancoDestino;
    private String tipoCuentaDestino;
    private String numeroCuentaDestino;
    private String titularBeneficiario;
    private String documentoBeneficiario;
    private double monto;
    private String concepto;

    public SolicitudInterbancaria(String bancoDestino, String tipoCuentaDestino, String numeroCuentaDestino,
                                  String titularBeneficiario, String documentoBeneficiario, double monto, String concepto) {
        this.bancoDestino = bancoDestino;
        this.tipoCuentaDestino = tipoCuentaDestino;
        this.numeroCuentaDestino = numeroCuentaDestino;
        this.titularBeneficiario = titularBeneficiario;
        this.documentoBeneficiario = documentoBeneficiario;
        this.monto = monto;
        this.concepto = concepto;
    }

    public String getBancoDestino() { return bancoDestino; }
    public String getTipoCuentaDestino() { return tipoCuentaDestino; }
    public String getNumeroCuentaDestino() { return numeroCuentaDestino; }
    public String getTitularBeneficiario() { return titularBeneficiario; }
    public String getDocumentoBeneficiario() { return documentoBeneficiario; }
    public double getMonto() { return monto; }
    public String getConcepto() { return concepto; }
}
