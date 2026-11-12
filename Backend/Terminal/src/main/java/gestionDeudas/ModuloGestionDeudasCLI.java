package gestionDeudas;

import java.util.List;
import java.util.Scanner;

public class ModuloGestionDeudasCLI {
    private GestorDeudas gestor;
    private Scanner scanner;

    public ModuloGestionDeudasCLI() {
        this.gestor = new GestorDeudas();
        this.scanner = new Scanner(System.in);
    }

    public void iniciar() {
        int opcion = -1;
        do {
            mostrarEncabezado();
            System.out.println("1. Ver Resumen y KPIs de Deudas / Suscripciones");
            System.out.println("2. Gestionar Suscripciones y Gastos Hormiga");
            System.out.println("3. Gestionar Agenda de Pagos Pendientes (Cuentas por Pagar)");
            System.out.println("0. Salir del Módulo de Gestión de Deudas");
            System.out.print("\nSeleccione una opción: ");

            try {
                opcion = Integer.parseInt(scanner.nextLine().trim());
            } catch (Exception e) {
                opcion = -1;
            }

            switch (opcion) {
                case 1:
                    mostrarResumenGeneral();
                    break;
                case 2:
                    menuSuscripciones();
                    break;
                case 3:
                    menuPagos();
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
        System.out.println("       FINARA BANK - GESTIÓN DE DEUDAS Y SUSCRIPCIONES");
        System.out.println("         Módulo 2 en 1: Gastos Hormiga y Agenda");
        System.out.println("=======================================================");
    }

    private void mostrarResumenGeneral() {
        System.out.println("\n--- INDICADORES CLAVE (KPIS) ---");
        double gastoFijo = gestor.calcularGastoFijoMensual();
        double ahorroMes = gestor.calcularAhorroPotencialMensual();
        double ahorroAnio = gestor.calcularAhorroPotencialAnual();

        System.out.printf("• Gasto Fijo Recurrente / Mes: $%,12.0f COP%n", gastoFijo);
        System.out.printf("  (Proyección a 1 año:        $%,12.0f COP)%n", gastoFijo * 12);
        System.out.printf("• Ahorro Potencial Mensual:    $%,12.0f COP%n", ahorroMes);
        System.out.printf("• Ahorro Potencial Anual:      $%,12.0f COP%n", ahorroAnio);

        long activas = gestor.getSuscripciones().stream().filter(s -> "ACTIVA".equalsIgnoreCase(s.getEstado())).count();
        long pendientes = gestor.getPagosPendientes().stream().filter(p -> !p.isPagado()).count();
        System.out.printf("• Suscripciones Activas:       %d%n", activas);
        System.out.printf("• Pagos Pendientes del Mes:    %d%n", pendientes);
        pausar();
    }

    private void menuSuscripciones() {
        int op = -1;
        do {
            System.out.println("\n--- CONTROL DE SUSCRIPCIONES Y GASTOS HORMIGA ---");
            System.out.println("1. Listar suscripciones");
            System.out.println("2. Registrar nueva suscripción");
            System.out.println("3. Pausar suscripción");
            System.out.println("4. Reactivar suscripción");
            System.out.println("5. Cancelar suscripción");
            System.out.println("6. Eliminar suscripción");
            System.out.println("0. Volver");
            System.out.print("Seleccione: ");

            try {
                op = Integer.parseInt(scanner.nextLine().trim());
            } catch (Exception e) { op = -1; }

            switch (op) {
                case 1:
                    listarSuscripciones();
                    break;
                case 2:
                    registrarSuscripcion();
                    break;
                case 3:
                    cambiarEstadoSuscripcion("PAUSADA");
                    break;
                case 4:
                    cambiarEstadoSuscripcion("ACTIVA");
                    break;
                case 5:
                    cambiarEstadoSuscripcion("CANCELADA");
                    break;
                case 6:
                    eliminarSuscripcion();
                    break;
            }
        } while (op != 0);
    }

    private void listarSuscripciones() {
        System.out.println("\n--- LISTADO DE SUSCRIPCIONES ---");
        List<Suscripcion> lista = gestor.getSuscripciones();
        if (lista.isEmpty()) {
            System.out.println("No hay suscripciones registradas.");
        } else {
            for (Suscripcion s : lista) {
                System.out.printf("[%s] %s%n", s.getId(), s.toString());
            }
        }
        pausar();
    }

    private void registrarSuscripcion() {
        System.out.print("\nNombre del servicio/gasto: ");
        String nombre = scanner.nextLine().trim();
        System.out.print("Categoría (Streaming, Membresía, Café y snacks, Apps y software, Transporte, Otro): ");
        String cat = scanner.nextLine().trim();
        System.out.print("Monto en COP: ");
        double monto = Double.parseDouble(scanner.nextLine().trim());
        System.out.print("Frecuencia (SEMANAL, MENSUAL, ANUAL): ");
        String frec = scanner.nextLine().trim().toUpperCase();

        Suscripcion s = gestor.registrarSuscripcion(nombre, cat, monto, frec);
        System.out.println("✓ Suscripción registrada exitosamente: " + s.getNombre());
        System.out.printf("  Impacto mensual estimado: $%,.0f COP | Costo anual: $%,.0f COP%n",
                s.calcularCostoMensual(), s.calcularCostoAnual());
        pausar();
    }

    private void cambiarEstadoSuscripcion(String nuevoEstado) {
        System.out.print("\nIngrese el ID de la suscripción: ");
        String id = scanner.nextLine().trim();
        boolean exito = gestor.cambiarEstadoSuscripcion(id, nuevoEstado);
        if (exito) {
            System.out.println("✓ Estado actualizado a: " + nuevoEstado);
        } else {
            System.out.println("❌ No se encontró la suscripción con ID: " + id);
        }
        pausar();
    }

    private void eliminarSuscripcion() {
        System.out.print("\nIngrese el ID de la suscripción a eliminar: ");
        String id = scanner.nextLine().trim();
        boolean exito = gestor.eliminarSuscripcion(id);
        if (exito) {
            System.out.println("✓ Suscripción eliminada.");
        } else {
            System.out.println("❌ No se encontró la suscripción.");
        }
        pausar();
    }

    private void menuPagos() {
        int op = -1;
        do {
            System.out.println("\n--- AGENDA DE PAGOS PENDIENTES ---");
            System.out.println("1. Listar agenda de pagos (con semáforo)");
            System.out.println("2. Registrar compromiso de pago");
            System.out.println("3. Marcar pago como Pagado / Pendiente");
            System.out.println("4. Eliminar pago de la agenda");
            System.out.println("0. Volver");
            System.out.print("Seleccione: ");

            try {
                op = Integer.parseInt(scanner.nextLine().trim());
            } catch (Exception e) { op = -1; }

            switch (op) {
                case 1:
                    listarPagos();
                    break;
                case 2:
                    registrarPago();
                    break;
                case 3:
                    marcarPago();
                    break;
                case 4:
                    eliminarPago();
                    break;
            }
        } while (op != 0);
    }

    private void listarPagos() {
        System.out.println("\n--- AGENDA DE COMPROMISOS ---");
        List<PagoPendiente> lista = gestor.getPagosPendientes();
        if (lista.isEmpty()) {
            System.out.println("No hay pagos pendientes en la agenda.");
        } else {
            for (PagoPendiente p : lista) {
                System.out.printf("[%s] %s%n", p.getId(), p.toString());
            }
        }
        pausar();
    }

    private void registrarPago() {
        System.out.print("\nConcepto del pago: ");
        String nombre = scanner.nextLine().trim();
        System.out.print("Tipo (SERVICIO, TARJETA, CUOTA, OTRO): ");
        String tipo = scanner.nextLine().trim();
        System.out.print("Monto en COP: ");
        double monto = Double.parseDouble(scanner.nextLine().trim());
        System.out.print("Fecha de vencimiento (YYYY-MM-DD): ");
        String fecha = scanner.nextLine().trim();

        PagoPendiente p = gestor.registrarPago(nombre, tipo, monto, fecha, "MANUAL", "");
        System.out.println("✓ Pago agendado con éxito: " + p.getNombre());
        pausar();
    }

    private void marcarPago() {
        System.out.print("\nIngrese ID del pago: ");
        String id = scanner.nextLine().trim();
        System.out.print("¿Marcar como pagado? (s/n): ");
        String resp = scanner.nextLine().trim();
        boolean pagado = resp.equalsIgnoreCase("s");

        boolean exito = gestor.marcarPagoPagado(id, pagado);
        if (exito) {
            System.out.println("✓ Estado de pago actualizado.");
        } else {
            System.out.println("❌ No se encontró el pago.");
        }
        pausar();
    }

    private void eliminarPago() {
        System.out.print("\nIngrese ID del pago a eliminar: ");
        String id = scanner.nextLine().trim();
        boolean exito = gestor.eliminarPago(id);
        if (exito) {
            System.out.println("✓ Pago eliminado de la agenda.");
        } else {
            System.out.println("❌ No se encontró el pago.");
        }
        pausar();
    }

    private void pausar() {
        System.out.print("\nPresione ENTER para continuar...");
        scanner.nextLine();
    }

    public static void main(String[] args) {
        new ModuloGestionDeudasCLI().iniciar();
    }
}
