package asesoriaEndeudamiento;

import java.util.List;
import java.util.Scanner;

public class ModuloEndeudamientoCLI {
    private GestorEndeudamiento gestor;
    private Scanner scanner;

    public ModuloEndeudamientoCLI() {
        this.gestor = new GestorEndeudamiento();
        this.scanner = new Scanner(System.in);
    }

    public void iniciar() {
        int opcion = -1;
        do {
            mostrarEncabezado();
            System.out.println("1. Ver Diagnóstico y Nivel de Endeudamiento");
            System.out.println("2. Modificar Ingreso Mensual Neto");
            System.out.println("3. Listar Obligaciones Financieras Consolidadas");
            System.out.println("4. Registrar Obligación Financiera Manual");
            System.out.println("5. Eliminar Obligación Financiera");
            System.out.println("6. Simular Estrategias de Amortización (Avalancha vs Bola de Nieve)");
            System.out.println("0. Salir del Módulo de Endeudamiento");
            System.out.print("\nSeleccione una opción: ");

            try {
                opcion = Integer.parseInt(scanner.nextLine().trim());
            } catch (Exception e) {
                opcion = -1;
            }

            switch (opcion) {
                case 1:
                    mostrarDiagnostico();
                    break;
                case 2:
                    modificarIngreso();
                    break;
                case 3:
                    listarObligaciones();
                    break;
                case 4:
                    registrarObligacion();
                    break;
                case 5:
                    eliminarObligacion();
                    break;
                case 6:
                    simularEstrategias();
                    break;
                case 0:
                    System.out.println("\nVolviendo al menú principal...");
                    break;
                default:
                    System.out.println("\nOpción inválida. Intente de nuevo.");
            }
        } while (opcion != 0);
    }

    private void mostrarEncabezado() {
        System.out.println("\n=======================================================");
        System.out.println("       FINARA BANK - ASESORÍA SOBRE ENDEUDAMIENTO");
        System.out.println("         Diagnóstico, Consolidación y Estrategias");
        System.out.println("=======================================================");
    }

    private void mostrarDiagnostico() {
        System.out.println("\n--- DIAGNÓSTICO FINANCIERO ---");
        double ingreso = gestor.getIngresoMensual();
        double deuda = gestor.calcularDeudaTotal();
        double cuotas = gestor.calcularCuotaTotal();
        double pct = gestor.calcularNivelEndeudamiento();
        double libre = gestor.calcularIngresoLibre();
        double intereses = gestor.calcularCostoInteresesMensual();

        System.out.printf("• Ingreso Mensual Neto:       $%,12.0f COP%n", ingreso);
        System.out.printf("• Deuda Total Consolidada:     $%,12.0f COP (%.2fx tu ingreso anual)%n", deuda, (ingreso > 0 ? deuda / (ingreso * 12) : 0));
        System.out.printf("• Cuotas Mensuales Totales:    $%,12.0f COP%n", cuotas);
        System.out.printf("• Intereses Estimados / Mes:   $%,12.0f COP%n", intereses);
        System.out.printf("• Ingreso Libre Disponible:    $%,12.0f COP%n", libre);
        System.out.printf("• Nivel de Endeudamiento:      %6.1f%%%n", pct);
        System.out.println("  Semáforo: " + gestor.clasificarNivel(pct));
        pausar();
    }

    private void modificarIngreso() {
        System.out.print("\nIngrese su nuevo ingreso mensual neto en COP: ");
        try {
            double nuevo = Double.parseDouble(scanner.nextLine().trim());
            gestor.setIngresoMensual(nuevo);
            System.out.printf("✓ Ingreso actualizado a $%,.0f COP%n", nuevo);
        } catch (Exception e) {
            System.out.println("❌ Valor numérico inválido.");
        }
        pausar();
    }

    private void listarObligaciones() {
        System.out.println("\n--- OBLIGACIONES FINANCIERAS ---");
        List<Obligacion> lista = gestor.getObligaciones();
        if (lista.isEmpty()) {
            System.out.println("No hay obligaciones registradas.");
        } else {
            for (Obligacion o : lista) {
                System.out.printf("[%s] %s%n", o.getId(), o.toString());
            }
        }
        pausar();
    }

    private void registrarObligacion() {
        System.out.print("\nTipo (TARJETA, PRESTAMO, HIPOTECA, VEHICULO, LIBRANZA, OTRO): ");
        String tipo = scanner.nextLine().trim().toUpperCase();
        System.out.print("Entidad o acreedor: ");
        String entidad = scanner.nextLine().trim();
        System.out.print("Saldo total pendiente (COP): ");
        double saldo = Double.parseDouble(scanner.nextLine().trim());
        System.out.print("Cuota mensual (COP): ");
        double cuota = Double.parseDouble(scanner.nextLine().trim());
        System.out.print("Tasa E.A. (%): ");
        double tasa = Double.parseDouble(scanner.nextLine().trim());
        System.out.print("Plazo restante (meses): ");
        int plazo = Integer.parseInt(scanner.nextLine().trim());

        Obligacion o = gestor.registrarObligacion(tipo, entidad, saldo, cuota, tasa, plazo);
        System.out.println("✓ Obligación registrada exitosamente: " + o.getEntidad());
        pausar();
    }

    private void eliminarObligacion() {
        System.out.print("\nIngrese ID de la obligación a eliminar (no aplicable a Finara Bank): ");
        String id = scanner.nextLine().trim();
        boolean exito = gestor.eliminarObligacion(id);
        if (exito) {
            System.out.println("✓ Obligación eliminada.");
        } else {
            System.out.println("❌ No se encontró la obligación o es un crédito automático de Finara Bank.");
        }
        pausar();
    }

    private void simularEstrategias() {
        System.out.println("\n--- COMPARADOR DE ESTRATEGIAS DE SALIDA ---");
        System.out.print("Monto de abono extra mensual (COP, ej. 200000): ");
        double abono = 0;
        try {
            abono = Double.parseDouble(scanner.nextLine().trim());
        } catch (Exception e) {
            abono = 100000;
        }

        GestorEndeudamiento.ResultadoSimulacion resAvalancha = gestor.simularEstrategia(abono, "AVALANCHA");
        GestorEndeudamiento.ResultadoSimulacion resNieve = gestor.simularEstrategia(abono, "BOLA_NIEVE");

        System.out.println("\n1. MÉTODO AVALANCHA (Mayor Tasa Primero):");
        System.out.printf("   • Tiempo para ser libre de deudas: %d meses%n", resAvalancha.meses);
        System.out.printf("   • Total intereses pagados:        $%,.0f COP%n", resAvalancha.totalIntereses);
        System.out.printf("   • Ahorro en intereses:             $%,.0f COP%n", resAvalancha.ahorroIntereses);

        System.out.println("\n2. MÉTODO BOLA DE NIEVE (Menor Saldo Primero):");
        System.out.printf("   • Tiempo para ser libre de deudas: %d meses%n", resNieve.meses);
        System.out.printf("   • Total intereses pagados:        $%,.0f COP%n", resNieve.totalIntereses);
        System.out.printf("   • Ahorro en intereses:             $%,.0f COP%n", resNieve.ahorroIntereses);

        if (resAvalancha.ahorroIntereses >= resNieve.ahorroIntereses) {
            System.out.println("\n⭐ Estrategia Recomendada: AVALANCHA (Ahorra más dinero en intereses).");
        } else {
            System.out.println("\n⭐ Estrategia Recomendada: BOLA DE NIEVE (Liquida deudas más rápido para impulso psicológico).");
        }
        pausar();
    }

    private void pausar() {
        System.out.print("\nPresione ENTER para continuar...");
        scanner.nextLine();
    }

    public static void main(String[] args) {
        new ModuloEndeudamientoCLI().iniciar();
    }
}
