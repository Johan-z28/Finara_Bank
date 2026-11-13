package planificacion;

import core.BaseDatosFinara;
import core.Consola;

import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI de Planificación Financiera Mensual (HU-30).
 */
public class ModuloPlanificacionCLI {

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        iniciar(Consola.getScanner(), null);
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        Scanner sc = scanner != null ? scanner : Consola.getScanner();
        String correo = datosUsuario != null
                ? datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "cliente@finara.com")).toLowerCase()
                : "cliente@finara.com";

        String periodo = ServicioPlanificacion.obtenerPeriodoActual();
        boolean enModulo = true;

        while (enModulo) {
            PlanMensual plan = ServicioPlanificacion.obtenerOCrearPlan(correo, periodo);
            Consola.titulo("PLANIFICACIÓN FINANCIERA MENSUAL (HU-30)");
            System.out.println("Usuario: " + correo + " | Periodo: " + periodo);
            System.out.println("Ingresos estimados: " + Consola.formatoCOP(plan.getIngresosEstimados())
                    + " | Meta ahorro: " + Consola.formatoCOP(plan.getMetaAhorro()));
            System.out.println("Total asignado cat.: " + Consola.formatoCOP(plan.getTotalAsignado())
                    + " | Saldo sin asignar: " + Consola.formatoCOP(plan.getDisponibleSinAsignar()));
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Ver Comparativa Planificado vs. Ejecutado Real");
            System.out.println("2. Configurar Ingresos Estimados y Meta de Ahorro");
            System.out.println("3. Asignar / Editar Límite de Categoría");
            System.out.println("4. Cambiar Periodo Mensual (AAAA-MM)");
            System.out.println("0. Volver al menú anterior");

            int op = Consola.leerEntero(sc, "Seleccione una opción (0-4): ", 0, 4);
            switch (op) {
                case 1:
                    mostrarComparativa(correo, plan);
                    break;
                case 2:
                    configurarIngresosYMeta(sc, correo, plan);
                    break;
                case 3:
                    asignarCategoriaMenu(sc, correo, plan);
                    break;
                case 4:
                    String nuevo = Consola.leerLinea(sc, "Nuevo periodo (AAAA-MM, ej. 2026-11): ");
                    if (nuevo.matches("^\\d{4}-\\d{2}$")) {
                        periodo = nuevo;
                        System.out.println("[✓] Periodo cambiado a " + periodo);
                    } else {
                        System.out.println("[!] Formato inválido. Use AAAA-MM.");
                    }
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    private static void mostrarComparativa(String correo, PlanMensual plan) {
        Map<String, Double> ejecutado = ServicioPlanificacion.calcularEjecucionRealPorCategoria(correo, plan.getPeriodo());
        double ahorroReal = ServicioPlanificacion.calcularAhorroEjecutadoMes(correo, plan.getPeriodo());

        Consola.subtitulo("PLANIFICADO VS. EJECUTADO REAL (" + plan.getPeriodo() + ")");
        double totalPlan = 0.0;
        double totalReal = 0.0;

        for (String cat : ServicioPlanificacion.CATEGORIAS_PLAN) {
            double p = plan.getAsignacionesPorCategoria().getOrDefault(cat, 0.0);
            double r = ejecutado.getOrDefault(cat, 0.0);
            totalPlan += p;
            totalReal += r;
            String estado = ServicioPlanificacion.evaluarEstadoCategoria(p, r);
            System.out.printf(" • %-15s | Plan: %11s | Real: %11s | %s%n",
                    cat, Consola.formatoCOP(p), Consola.formatoCOP(r), estado);
        }
        System.out.println("-------------------------------------------------------");
        System.out.printf(" TOTAL GASTOS      | Plan: %11s | Real: %11s%n",
                Consola.formatoCOP(totalPlan), Consola.formatoCOP(totalReal));
        System.out.printf(" META DE AHORRO    | Meta: %11s | Aportado mes: %s%n",
                Consola.formatoCOP(plan.getMetaAhorro()), Consola.formatoCOP(ahorroReal));
    }

    private static void configurarIngresosYMeta(Scanner sc, String correo, PlanMensual plan) {
        Consola.subtitulo("CONFIGURAR INGRESOS Y META DE AHORRO");
        double ing = Consola.leerMontoOpcional(sc,
                "Ingresos mensuales estimados [" + Consola.formatoCOP(plan.getIngresosEstimados()) + "] (Enter conserva): ");
        if (ing >= 0) {
            plan.setIngresosEstimados(ing);
        }
        double meta = Consola.leerMontoOpcional(sc,
                "Meta de ahorro mensual [" + Consola.formatoCOP(plan.getMetaAhorro()) + "] (Enter conserva): ");
        if (meta >= 0) {
            plan.setMetaAhorro(meta);
        }
        ServicioPlanificacion.guardarPlan(correo, plan);
        System.out.println("[✓] Plan actualizado. Disponible para categorías: " + Consola.formatoCOP(plan.getDisponibleSinAsignar()));
    }

    private static void asignarCategoriaMenu(Scanner sc, String correo, PlanMensual plan) {
        Consola.subtitulo("ASIGNAR PRESUPUESTO A CATEGORÍA");
        for (int i = 0; i < ServicioPlanificacion.CATEGORIAS_PLAN.size(); i++) {
            String cat = ServicioPlanificacion.CATEGORIAS_PLAN.get(i);
            double actual = plan.getAsignacionesPorCategoria().getOrDefault(cat, 0.0);
            System.out.printf("%d. %-16s (Actual: %s)%n", (i + 1), cat, Consola.formatoCOP(actual));
        }
        System.out.println("0. Cancelar");

        int total = ServicioPlanificacion.CATEGORIAS_PLAN.size();
        int idx = Consola.leerEntero(sc, "Seleccione categoría (0-" + total + "): ", 1, total);
        if (idx <= 0) return;

        String catSel = ServicioPlanificacion.CATEGORIAS_PLAN.get(idx - 1);
        double monto = Consola.leerMontoOpcional(sc, "Nuevo tope mensual para '" + catSel + "' en COP (Enter cancela): ");
        if (monto < 0) return;

        plan.asignarCategoria(catSel, monto);
        ServicioPlanificacion.guardarPlan(correo, plan);
        System.out.println("[✓] Categoría '" + catSel + "' planificada en " + Consola.formatoCOP(monto) + ".");
    }
}
