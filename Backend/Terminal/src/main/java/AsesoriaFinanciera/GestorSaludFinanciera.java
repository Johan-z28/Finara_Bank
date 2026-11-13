package AsesoriaFinanciera;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class GestorSaludFinanciera {
    private List<EvaluacionFinanciera> historialEvaluaciones;

    public GestorSaludFinanciera() {
        this.historialEvaluaciones = new ArrayList<>();
    }

    public List<EvaluacionFinanciera> getHistorialEvaluaciones() {
        return historialEvaluaciones;
    }

    // Motor de reglas financiero
    public EvaluacionFinanciera evaluarSaludFinanciera(double ingresosMensuales, double gastosMensuales,
                                                       double deudaTotal, double ahorroActual, String metaPrincipal) {
        int score = 100;
        List<String> recomendaciones = new ArrayList<>();
        List<String> puntosFuertes = new ArrayList<>();
        List<String> oportunidadesMejora = new ArrayList<>();

        // 1. Regla de Liquidez / Capacidad de Ahorro
        double flujoLibre = ingresosMensuales - gastosMensuales;
        double porcentajeAhorro = ingresosMensuales > 0 ? (flujoLibre / ingresosMensuales) * 100 : 0;

        if (porcentajeAhorro < 10) {
            score -= 30;
            oportunidadesMejora.add("Tus gastos fijos consumen casi la totalidad de tus ingresos, dejando poco margen de maniobra.");
        } else if (porcentajeAhorro >= 20) {
            puntosFuertes.add("Tienes una excelente capacidad de ahorro mensual superior al 20%.");
        } else {
            score -= 15;
            oportunidadesMejora.add("Tu margen de ahorro es moderado; intenta optimizar tus gastos hormiga.");
        }

        // 2. Regla de Endeudamiento
        if (ingresosMensuales > 0 && deudaTotal > ingresosMensuales * 3) {
            score -= 30;
            oportunidadesMejora.add("El nivel de tus deudas es elevado en relación con tus ingresos actuales.");
            recomendaciones.add("Prioriza el pago de deudas con mayores tasas de interés (método avalancha o bola de nieve).");
        } else if (deudaTotal == 0) {
            puntosFuertes.add("¡Felicitaciones! Te encuentras libre de deudas activas.");
        } else {
            score -= 10;
            recomendaciones.add("Mantén tus pagos al día para evitar sobrecargar tus finanzas con intereses.");
        }

        // 3. Regla del Fondo de Emergencia (mínimo 3 meses de gastos básicos)
        double mesesColchon = gastosMensuales > 0 ? ahorroActual / gastosMensuales : 0;

        if (mesesColchon < 1) {
            score -= 25;
            oportunidadesMejora.add("No cuentas con un fondo de emergencia sólido para imprevistos.");
            recomendaciones.add("Destina una pequeña parte de tus ingresos mensuales a construir un fondo de emergencia equivalente a 3 meses de tus gastos fijos.");
        } else if (mesesColchon >= 3) {
            puntosFuertes.add("Tienes un fondo de emergencia saludable que cubre 3 o más meses de tus gastos.");
        } else {
            score -= 10;
            recomendaciones.add("Estás cerca de la meta de tu fondo de emergencia, ¡continúa ahorrando con constancia!");
        }

        // Asegurar que el score no baje de 0 ni suba de 100
        score = Math.max(0, Math.min(100, score));

        // Determinar nivel de salud
        String nivelSalud = "Crítico";
        if (score >= 80) {
            nivelSalud = "Excelente";
        } else if (score >= 60) {
            nivelSalud = "Saludable / Estable";
        } else if (score >= 40) {
            nivelSalud = "En Observación";
        }

        // Generar identificador único de evaluación
        String idEvaluacion = "SALUD-202611-" + (1000 + new Random().nextInt(9000));

        EvaluacionFinanciera evaluacion = new EvaluacionFinanciera(
                idEvaluacion, ingresosMensuales, gastosMensuales, deudaTotal, ahorroActual, metaPrincipal,
                score, nivelSalud, puntosFuertes, oportunidadesMejora, recomendaciones
        );

        // Almacenar en el historial en memoria (orden más reciente primero)
        historialEvaluaciones.add(0, evaluacion);

        return evaluacion;
    }

    public EvaluacionFinanciera buscarEvaluacionPorId(String idEvaluacion) {
        return historialEvaluaciones.stream()
                .filter(e -> e.getIdEvaluacion().equalsIgnoreCase(idEvaluacion.trim()))
                .findFirst()
                .orElse(null);
    }
}