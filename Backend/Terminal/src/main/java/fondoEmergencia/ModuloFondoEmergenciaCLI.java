package fondoEmergencia;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.Scanner;

/**
 * Interfaz de terminal (CLI) independiente para el módulo Fondo de Emergencia (HU-19).
 */
public class ModuloFondoEmergenciaCLI {
    private GestorFondoEmergencia gestor;
    private Scanner scanner;
    private NumberFormat formatoCOP;

    public ModuloFondoEmergenciaCLI() {
        this.gestor = new GestorFondoEmergencia();
        this.scanner = new Scanner(System.in);
        this.formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        this.formatoCOP.setMaximumFractionDigits(0);
    }

    public static void main(String[] args) {
        ModuloFondoEmergenciaCLI cli = new ModuloFondoEmergenciaCLI();
        cli.iniciar("Juan");
    }

    public void iniciar(String usuarioActivo) {
        String usuario = (usuarioActivo != null && !usuarioActivo.trim().isEmpty()) ? usuarioActivo : "Juan";
        boolean salir = false;

        while (!salir) {
            System.out.println("\n========================================================");
            System.out.println("     FINARA FINANZAS - FONDO DE EMERGENCIA (HU-19)      ");
            System.out.println("     Usuario: " + usuario);
            System.out.println("========================================================");
            System.out.println("1. Ver estado y progreso del Fondo de Emergencia");
            System.out.println("2. Simular meta sugerida (3 a 12 meses de gastos fijos)");
            System.out.println("3. Configurar / Actualizar meta y cuenta vinculada");
            System.out.println("4. Registrar abono al fondo");
            System.out.println("5. Proyectar tiempo para alcanzar la meta (plan de aportes)");
            System.out.println("6. Eliminar meta actual");
            System.out.println("0. Salir");
            System.out.print("Seleccione una opción: ");

            String opcion = scanner.nextLine().trim();
            switch (opcion) {
                case "1":
                    verEstadoFondo(usuario);
                    break;
                case "2":
                    simularMetaSugerida();
                    break;
                case "3":
                    configurarMeta(usuario);
                    break;
                case "4":
                    registrarAbono(usuario);
                    break;
                case "5":
                    proyectarTiempoMeta(usuario);
                    break;
                case "6":
                    eliminarMeta(usuario);
                    break;
                case "0":
                    salir = true;
                    System.out.println("Saliendo del módulo de Fondo de Emergencia...");
                    break;
                default:
                    System.out.println("[!] Opción inválida. Intente de nuevo.");
            }
        }
    }

    private void verEstadoFondo(String usuario) {
        FondoEmergencia fondo = gestor.obtenerMetaUsuario(usuario);
        if (fondo == null) {
            System.out.println("\n[!] Aún no tienes una meta configurada. Usa la opción 3 para crear tu Fondo de Emergencia.");
            return;
        }

        System.out.println("\n--- RESUMEN DEL FONDO DE EMERGENCIA ---");
        System.out.println("ID Meta             : " + fondo.getId());
        System.out.println("Estado de Seguridad : " + fondo.getNivelSeguridad());
        System.out.println("Meta Definida       : " + formatoCOP.format(fondo.getMetaMonto()) + " (" + fondo.getMesesCobertura() + " meses)");
        System.out.println("Gastos Fijos Base   : " + formatoCOP.format(fondo.getGastosFijosMensuales()));
        System.out.println("Cuenta Vinculada    : #" + fondo.getCuentaVinculadaNumero() + " (ID: " + fondo.getCuentaVinculadaId() + ")");
        System.out.println("Saldo Actual        : " + formatoCOP.format(fondo.getSaldoActual()));
        System.out.println("Avance              : " + fondo.getPorcentajeReal() + "% (Barra: " + fondo.getPorcentajeAvance() + "%)");
        System.out.println("Monto Faltante      : " + formatoCOP.format(fondo.getMontoFaltante()));
        System.out.printf("Meses Cubiertos     : %.1f meses%n", fondo.getMesesCubiertos());
        System.out.println("Última Actualización: " + fondo.getFechaActualizacion());
    }

    private void simularMetaSugerida() {
        System.out.println("\n--- SIMULADOR DE FONDO SUGERIDO ---");
        System.out.print("Ingrese el valor promedio de sus gastos fijos mensuales: ");
        double gastos = leerMonto();
        if (gastos <= 0) {
            System.out.println("[!] El valor de los gastos debe ser mayor a cero.");
            return;
        }

        System.out.print("Ingrese los meses de cobertura deseados (1 - 12, recomendado 6): ");
        int meses = leerEntero(6);

        GestorFondoEmergencia.ResultadoSimulacion res = gestor.calcularFondoSugerido(gastos, meses);
        System.out.println("\nResultados de la Simulación:");
        System.out.println(" - Gastos Fijos Base          : " + formatoCOP.format(res.getGastosFijosMensuales()));
        System.out.println(" - Cobertura Mínima (3 meses) : " + formatoCOP.format(res.getCoberturaMinima()));
        System.out.println(" - Cobertura Ideal (6 meses)  : " + formatoCOP.format(res.getCoberturaRecomendada()));
        System.out.println(" - Meta Sugerida (" + res.getMesesCobertura() + " meses)   : " + formatoCOP.format(res.getTotalSugerido()));
    }

    private void configurarMeta(String usuario) {
        System.out.println("\n--- CONFIGURAR / ACTUALIZAR META ---");
        System.out.print("Gastos fijos mensuales estimados: ");
        double gastos = leerMonto();

        System.out.print("Meses de cobertura objetivo (1 - 12): ");
        int meses = leerEntero(6);

        double metaSugerida = gastos * Math.max(1, Math.min(12, meses));
        System.out.println("Meta sugerida calculada: " + formatoCOP.format(metaSugerida));
        System.out.print("Ingrese la meta definitiva (o presione Enter para usar la sugerida): ");
        String metaStr = scanner.nextLine().trim();
        double metaDefinitiva = metaStr.isEmpty() ? metaSugerida : parsearMonto(metaStr);

        if (metaDefinitiva <= 0) {
            System.out.println("[!] La meta definitiva debe ser mayor a cero.");
            return;
        }

        System.out.print("ID de cuenta de ahorros/corriente a vincular (ej. CTA-01): ");
        String ctaId = scanner.nextLine().trim();
        if (ctaId.isEmpty()) ctaId = "CTA-01";

        System.out.print("Número de cuenta (ej. 4001-2345-6789): ");
        String ctaNum = scanner.nextLine().trim();
        if (ctaNum.isEmpty()) ctaNum = "4001-0000-1234";

        System.out.print("Saldo inicial en la cuenta vinculada: ");
        double saldoInicial = leerMonto();

        try {
            FondoEmergencia guardado = gestor.guardarMetaUsuario(usuario, metaDefinitiva, gastos, meses, ctaId, ctaNum, saldoInicial);
            System.out.println("\n[✓] Meta guardada exitosamente (" + guardado.getId() + "). Avance actual: " + guardado.getPorcentajeReal() + "%");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void registrarAbono(String usuario) {
        FondoEmergencia fondo = gestor.obtenerMetaUsuario(usuario);
        if (fondo == null) {
            System.out.println("\n[!] Primero debes configurar una meta (opción 3).");
            return;
        }

        System.out.print("Ingrese el valor del abono a realizar: ");
        double abono = leerMonto();
        try {
            FondoEmergencia actualizado = gestor.registrarAbono(usuario, abono);
            System.out.println("[✓] Abono registrado. Nuevo saldo: " + formatoCOP.format(actualizado.getSaldoActual())
                    + " (" + actualizado.getPorcentajeReal() + "% de la meta).");
        } catch (Exception e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void proyectarTiempoMeta(String usuario) {
        FondoEmergencia fondo = gestor.obtenerMetaUsuario(usuario);
        if (fondo == null) {
            System.out.println("\n[!] Primero debes configurar una meta (opción 3).");
            return;
        }

        double faltante = fondo.getMontoFaltante();
        if (faltante <= 0) {
            System.out.println("\n[✓] ¡Ya alcanzaste el 100% de tu Fondo de Emergencia!");
            return;
        }

        System.out.println("\nMonto faltante para completar tu meta: " + formatoCOP.format(faltante));
        System.out.print("¿Cuánto planeas aportar mensualmente?: ");
        double aporte = leerMonto();

        int mesesEstimados = gestor.simularMesesParaMeta(faltante, aporte);
        if (mesesEstimados < 0) {
            System.out.println("[!] El aporte mensual debe ser mayor a cero para calcular la proyección.");
        } else {
            System.out.println("Con aportes mensuales de " + formatoCOP.format(aporte)
                    + ", completarás tu Fondo de Emergencia en aproximadamente " + mesesEstimados + " mes(es).");
        }
    }

    private void eliminarMeta(String usuario) {
        System.out.print("¿Estás seguro de eliminar tu meta de Fondo de Emergencia? (s/n): ");
        String confirm = scanner.nextLine().trim();
        if (confirm.equalsIgnoreCase("s")) {
            if (gestor.eliminarMetaUsuario(usuario)) {
                System.out.println("[✓] Meta eliminada correctamente.");
            } else {
                System.out.println("[!] No había ninguna meta configurada.");
            }
        }
    }

    private double leerMonto() {
        return parsearMonto(scanner.nextLine().trim());
    }

    private double parsearMonto(String input) {
        try {
            String limpio = input.replace("$", "").replace(".", "").replace(",", ".");
            if (limpio.isEmpty()) return 0.0;
            return Math.max(0.0, Double.parseDouble(limpio));
        } catch (Exception e) {
            return 0.0;
        }
    }

    private int leerEntero(int valorDefecto) {
        try {
            String input = scanner.nextLine().trim();
            if (input.isEmpty()) return valorDefecto;
            return Integer.parseInt(input);
        } catch (Exception e) {
            return valorDefecto;
        }
    }
}
