package planificacionFinanciera;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.Scanner;

public class ModuloPlanificacionCLI {
    private GestorPlanificacion gestor;
    private Scanner scanner;
    private NumberFormat formatoMoneda;

    public ModuloPlanificacionCLI() {
        this.gestor = new GestorPlanificacion();
        this.scanner = new Scanner(System.in);
        this.formatoMoneda = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        this.formatoMoneda.setMaximumFractionDigits(0);
    }

    public void iniciar(String usuarioActivo) {
        String usuario = (usuarioActivo != null && !usuarioActivo.trim().isEmpty()) ? usuarioActivo : "maria17";
        String periodo = "2026-11";

        boolean salir = false;
        while (!salir) {
            System.out.println("\n========================================================");
            System.out.println("   FINARA FINANZAS - PLANIFICACIÓN FINANCIERA MENSUAL   ");
            System.out.println("   Usuario: " + usuario + " | Periodo: " + periodo);
            System.out.println("========================================================");
            System.out.println("1. Ver plan presupuestal del periodo");
            System.out.println("2. Diseñar / Modificar estimaciones y asignaciones");
            System.out.println("3. Fijar meta de ahorro mensual");
            System.out.println("4. Copiar plan del mes anterior");
            System.out.println("5. Ver comparativa de Plan vs. Ejecución Real");
            System.out.println("6. Cambiar periodo mensual");
            System.out.println("7. Limpiar plan del mes");
            System.out.println("0. Volver al menú principal");
            System.out.print("Seleccione una opción: ");

            String opcion = scanner.nextLine().trim();
            switch (opcion) {
                case "1":
                    mostrarPlan(usuario, periodo);
                    break;
                case "2":
                    configurarPlan(usuario, periodo);
                    break;
                case "3":
                    fijarMetaAhorro(usuario, periodo);
                    break;
                case "4":
                    copiarMesAnterior(usuario, periodo);
                    break;
                case "5":
                    mostrarComparativa(usuario, periodo);
                    break;
                case "6":
                    System.out.print("Ingrese nuevo periodo (formato YYYY-MM, ej. 2026-12): ");
                    String nuevo = scanner.nextLine().trim();
                    if (nuevo.matches("^\\d{4}-\\d{2}$")) {
                        periodo = nuevo;
                        System.out.println("Periodo actualizado a: " + periodo);
                    } else {
                        System.out.println("Formato inválido. Debe ser YYYY-MM.");
                    }
                    break;
                case "7":
                    limpiarPlanMes(usuario, periodo);
                    break;
                case "0":
                    salir = true;
                    System.out.println("Saliendo del módulo de Planificación...");
                    break;
                default:
                    System.out.println("Opción no válida. Intente nuevamente.");
            }
        }
    }

    private void mostrarPlan(String usuario, String periodo) {
        PlanPresupuestal plan = gestor.obtenerPlan(usuario, periodo);
        if (plan == null) {
            System.out.println("\n[!] No hay plan configurado para " + periodo + ". Seleccione la opción 2 para crearlo.");
            return;
        }

        System.out.println("\n--- PLAN PRESUPUESTAL (" + periodo + ") ---");
        System.out.println("Ingresos Estimados: " + formatoMoneda.format(plan.getTotalIngresosEstimados()));
        System.out.println("Total Asignado en Gastos: " + formatoMoneda.format(plan.getTotalAsignaciones()));
        System.out.println("Meta de Ahorro: " + formatoMoneda.format(plan.getMetaAhorro()));
        System.out.println("Saldo por Asignar: " + formatoMoneda.format(plan.getSaldoPorAsignar()) + " [" + plan.getEstadoSaldo() + "]");

        System.out.println("\nAsignaciones por categoría:");
        for (CategoriaAsignacion asig : plan.getAsignaciones()) {
            double pct = plan.getTotalIngresosEstimados() > 0 ? (asig.getMontoPlanificado() / plan.getTotalIngresosEstimados()) * 100 : 0;
            System.out.printf(" - %-25s: %15s (%5.1f%%)%n", asig.getNombre(), formatoMoneda.format(asig.getMontoPlanificado()), pct);
        }
    }

    private void configurarPlan(String usuario, String periodo) {
        PlanPresupuestal plan = gestor.obtenerPlan(usuario, periodo);
        if (plan == null) {
            plan = new PlanPresupuestal(usuario, periodo);
        }

        System.out.println("\n--- CONFIGURACIÓN DE INGRESOS ---");
        System.out.print("Monto estimado Salario / Nómina: ");
        plan.setIngresoEstimado("salario", leerMonto());

        System.out.print("Monto estimado Honorarios / Otros: ");
        plan.setIngresoEstimado("otros_ingresos", leerMonto());

        System.out.println("\n--- ASIGNACIÓN DE GASTOS POR CATEGORÍA ---");
        String[][] categorias = {
            {"vivienda", "Vivienda y Servicios"},
            {"alimentacion", "Alimentación y Mercado"},
            {"transporte", "Transporte y Movilidad"},
            {"educacion", "Educación y Estudio"},
            {"salud", "Salud y Bienestar"},
            {"entretenimiento", "Entretenimiento y Ocio"},
            {"otros_gastos", "Otros Gastos"}
        };

        for (String[] cat : categorias) {
            System.out.print("Asignación para " + cat[1] + ": ");
            plan.agregarOActualizarAsignacion(cat[0], cat[1], leerMonto());
        }

        gestor.guardarPlan(plan);
        System.out.println("\n[✓] Plan presupuestal guardado exitosamente para " + periodo + ".");
    }

    private void fijarMetaAhorro(String usuario, String periodo) {
        PlanPresupuestal plan = gestor.obtenerPlan(usuario, periodo);
        if (plan == null) {
            plan = new PlanPresupuestal(usuario, periodo);
        }

        System.out.print("Ingrese el monto de meta de ahorro mensual: ");
        plan.setMetaAhorro(leerMonto());
        gestor.guardarPlan(plan);
        System.out.println("[✓] Meta de ahorro actualizada: " + formatoMoneda.format(plan.getMetaAhorro()));
    }

    private void copiarMesAnterior(String usuario, String periodo) {
        PlanPresupuestal copiado = gestor.copiarPlanMesAnterior(usuario, periodo);
        if (copiado != null) {
            System.out.println("[✓] Se ha copiado la planificación del mes anterior a " + periodo + ".");
        } else {
            System.out.println("[!] No se encontró ningún plan registrado en el mes anterior.");
        }
    }

    private void mostrarComparativa(String usuario, String periodo) {
        PlanPresupuestal plan = gestor.obtenerPlan(usuario, periodo);
        if (plan == null) {
            System.out.println("\n[!] Debe crear un plan presupuestal antes de consultar la comparativa.");
            return;
        }

        System.out.println("\n========================================================");
        System.out.println("   COMPARATIVA PLANIFICADO VS. EJECUTADO (" + periodo + ")   ");
        System.out.println("========================================================");
        System.out.printf("%-24s | %-12s | %-12s | %-12s | %-8s%n", "Categoría", "Plan", "Real", "Diferencia", "Estado");
        System.out.println("-------------------------------------------------------------------------");

        for (CategoriaAsignacion asig : plan.getAsignaciones()) {
            System.out.printf("%-24s | %12s | %12s | %12s | %-8s%n",
                asig.getNombre(),
                formatoMoneda.format(asig.getMontoPlanificado()),
                formatoMoneda.format(asig.getMontoEjecutado()),
                formatoMoneda.format(asig.getDiferencia()),
                asig.getEstado()
            );
        }
    }

    private void limpiarPlanMes(String usuario, String periodo) {
        System.out.print("¿Está seguro de limpiar el plan para " + periodo + "? (s/n): ");
        String confirm = scanner.nextLine().trim();
        if (confirm.equalsIgnoreCase("s")) {
            gestor.limpiarPlan(usuario, periodo);
            System.out.println("[✓] Plan eliminado para " + periodo + ".");
        }
    }

    private double leerMonto() {
        try {
            String input = scanner.nextLine().trim().replace("$", "").replace(".", "").replace(",", ".");
            if (input.isEmpty()) return 0.0;
            return Math.max(0, Double.parseDouble(input));
        } catch (Exception e) {
            return 0.0;
        }
    }
}
