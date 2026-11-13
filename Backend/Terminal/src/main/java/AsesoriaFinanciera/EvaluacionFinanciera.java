package AsesoriaFinanciera;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class EvaluacionFinanciera implements Serializable {
    private static final long serialVersionUID = 1L;
    private String idEvaluacion;
    private double ingresosMensuales;
    private double gastosMensuales;
    private double deudaTotal;
    private double ahorroActual;
    private String metaPrincipal;

    // Resultados del motor de reglas
    private int score;
    private String nivelSalud;
    private List<String> puntosFuertes;
    private List<String> oportunidadesMejora;
    private List<String> recomendaciones;
    private String fechaEvaluacion;

    public EvaluacionFinanciera(String idEvaluacion, double ingresosMensuales, double gastosMensuales,
                                double deudaTotal, double ahorroActual, String metaPrincipal,
                                int score, String nivelSalud,
                                List<String> puntosFuertes,
                                List<String> oportunidadesMejora,
                                List<String> recomendaciones) {
        this.idEvaluacion = idEvaluacion;
        this.ingresosMensuales = ingresosMensuales;
        this.gastosMensuales = gastosMensuales;
        this.deudaTotal = deudaTotal;
        this.ahorroActual = ahorroActual;
        this.metaPrincipal = metaPrincipal;
        this.score = score;
        this.nivelSalud = nivelSalud;
        this.puntosFuertes = puntosFuertes;
        this.oportunidadesMejora = oportunidadesMejora;
        this.recomendaciones = recomendaciones;

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        this.fechaEvaluacion = LocalDateTime.now().format(dtf);
    }

    // Getters
    public String getIdEvaluacion() { return idEvaluacion; }
    public double getIngresosMensuales() { return ingresosMensuales; }
    public double getGastosMensuales() { return gastosMensuales; }
    public double getDeudaTotal() { return deudaTotal; }
    public double getAhorroActual() { return ahorroActual; }
    public String getMetaPrincipal() { return metaPrincipal; }
    public int getScore() { return score; }
    public String getNivelSalud() { return nivelSalud; }
    public List<String> getPuntosFuertes() { return puntosFuertes; }
    public List<String> getOportunidadesMejora() { return oportunidadesMejora; }
    public List<String> getRecomendaciones() { return recomendaciones; }
    public String getFechaEvaluacion() { return fechaEvaluacion; }
}