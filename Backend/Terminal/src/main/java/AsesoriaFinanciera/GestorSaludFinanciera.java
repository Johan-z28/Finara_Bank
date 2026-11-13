package AsesoriaFinanciera;

import core.BaseDatosFinara;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Motor de evaluación de Salud Financiera (score base 100, reglas de liquidez, deuda y fondo de emergencia).
 * Persiste historial por usuario en BaseDatosFinara.
 */
public class GestorSaludFinanciera {
    private final String correoUsuario;

    public GestorSaludFinanciera() {
        this("cliente@finara.com");
    }

    public GestorSaludFinanciera(String correoUsuario) {
        this.correoUsuario = BaseDatosFinara.normalizarCorreo(
                correoUsuario == null || correoUsuario.isEmpty() ? "cliente@finara.com" : correoUsuario
        );
    }

    public EvaluacionFinanciera generarDiagnostico(
            double ingresos, double gastos, double deudaTotal, double ahorroActual, String meta) {

        int score = 100;
        List<String> fuertes = new ArrayList<>();
        List<String> mejoras = new ArrayList<>();
        List<String> recomendaciones = new ArrayList<>();

        // REGLA 1: Capacidad de ahorro / liquidez mensual
        double capacidadAhorro = ingresos - gastos;
        double porcentajeAhorro = (ingresos > 0) ? (capacidadAhorro / ingresos) * 100 : 0;

        if (porcentajeAhorro < 10) {
            score -= 30;
            mejoras.add("Capacidad de ahorro muy baja (menor al 10% mensual).");
            recomendaciones.add("Aplica la regla 50/30/20: reduce gastos no esenciales hasta ahorrar al menos 15% de tus ingresos.");
        } else if (porcentajeAhorro < 20) {
            score -= 15;
            mejoras.add("Ahorro moderado (entre 10% y 20%). Puedes optimizar tus gastos fijos.");
        } else {
            fuertes.add("Excelente liquidez mensual: ahorras más del 20% de tus ingresos.");
        }

        // REGLA 2: Nivel de endeudamiento
        if (deudaTotal > (ingresos * 3)) {
            score -= 30;
            mejoras.add("Nivel de deuda alto: tus deudas superan 3 veces tus ingresos mensuales.");
            recomendaciones.add("Usa el Simulador de Endeudamiento (Avalancha/Bola de Nieve) antes de tomar créditos nuevos.");
        } else if (deudaTotal == 0) {
            fuertes.add("Cero deudas acumuladas: mantienes tu capacidad crediticia limpia.");
        } else {
            score -= 10;
            recomendaciones.add("Destina parte de tu liquidez mensual a reducir tu saldo de deuda actual.");
        }

        // REGLA 3: Fondo de Emergencia
        double mesesCubiertos = (gastos > 0) ? (ahorroActual / gastos) : 0;
        if (mesesCubiertos < 1) {
            score -= 25;
            mejoras.add("Sin fondo de emergencia suficiente: tus ahorros cubren menos de 1 mes de gastos.");
            recomendaciones.add("Prioridad #1: construye un colchón de al menos 3 meses de gastos en 'Fondo de Emergencia'.");
        } else if (mesesCubiertos < 3) {
            score -= 10;
            mejoras.add("Fondo de emergencia en desarrollo (cubre entre 1 y 3 meses de gastos).");
        } else {
            fuertes.add("Sólido respaldo financiero: cuentas con ahorro superior a 3 meses de tus gastos.");
        }

        score = Math.max(0, Math.min(100, score));

        String nivel;
        if (score >= 80) {
            nivel = "EXCELENTE / ÓPTIMO";
        } else if (score >= 60) {
            nivel = "SALUDABLE / ESTABLE";
        } else if (score >= 40) {
            nivel = "EN OBSERVACIÓN / MEJORABLE";
        } else {
            nivel = "CRÍTICO / ALERTA FINANCIERA";
        }

        if (meta != null && !meta.trim().isEmpty()) {
            recomendaciones.add("Para tu meta '" + meta.trim() + "': automatiza un ahorro mensual acorde a tu superávit.");
        }

        String idEval = "EVAL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        EvaluacionFinanciera evaluacion = new EvaluacionFinanciera(
                idEval, ingresos, gastos, deudaTotal, ahorroActual, meta, score, nivel,
                fuertes, mejoras, recomendaciones
        );

        BaseDatosFinara.getInstancia().getEvaluacionesSaludUsuario(correoUsuario).add(0, evaluacion);
        BaseDatosFinara.guardar();
        return evaluacion;
    }

    public List<EvaluacionFinanciera> obtenerHistorial() {
        return BaseDatosFinara.getInstancia().getEvaluacionesSaludUsuario(correoUsuario);
    }

    public EvaluacionFinanciera buscarPorId(String id) {
        for (EvaluacionFinanciera ev : obtenerHistorial()) {
            if (ev.getIdEvaluacion().equalsIgnoreCase(id)) {
                return ev;
            }
        }
        return null;
    }
}
