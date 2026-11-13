package suscripcionesPagos;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Scanner;

/**
 * Interfaz de terminal (CLI) orientada al Frontend para Suscripciones, Gastos Hormiga y Pagos Pendientes (HU-22).
 */
public class ModuloSuscripcionesPagosCLI {
    private GestorSuscripcionesPagos gestor;
    private Scanner scanner;
    private NumberFormat formatoCOP;

    public ModuloSuscripcionesPagosCLI() {
        this.gestor = new GestorSuscripcionesPagos();
        this.scanner = new Scanner(System.in);
        this.formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        this.formatoCOP.setMaximumFractionDigits(0);
    }

    public static void main(String[] args) {
        ModuloSuscripcionesPagosCLI cli = new ModuloSuscripcionesPagosCLI();
        cli.iniciar("Juan");
    }

    public void iniciar(String usuarioActivo) {
        String usuario = (usuarioActivo != null && !usuarioActivo.trim().isEmpty()) ? usuarioActivo : "Juan";
        boolean salir = false;

        while (!salir) {
            System.out.println("\n=============================================================");
            System.out.println("   FINARA FINANZAS - SUSCRIPCIONES Y PAGOS PENDIENTES (HU-22)");
            System.out.println("   Usuario: " + usuario);
            System.out.println("=============================================================");
            System.out.println("1. Ver Resumen 2 en 1 (Gasto Fijo, Ahorro Potencial y Alertas)");
            System.out.println("2. Ver Suscripciones y Gastos Hormiga");
            System.out.println("3. Agregar nueva Suscripción / Gasto Hormiga");
            System.out.println("4. Pausar / Reactivar / Cancelar Suscripción");
            System.out.println("5. Ver Agenda de Pagos Pendientes");
            System.out.println("6. Registrar nuevo Pago Pendiente");
            System.out.println("7. Marcar Pago Pendiente como Pagado");
            System.out.println("0. Salir");
            System.out.print("Seleccione una opción: ");

            String opcion = scanner.nextLine().trim();
            switch (opcion) {
                case "1":
                    mostrarResumen(usuario);
                    break;
                case "2":
                    listarSuscripciones(usuario);
                    break;
                case "3":
                    crearSuscripcionMenu(usuario);
                    break;
                case "4":
                    cambiarEstadoSuscripcionMenu(usuario);
                    break;
                case "5":
                    listarPagosPendientes(usuario);
                    break;
                case "6":
                    crearPagoPendienteMenu(usuario);
                    break;
                case "7":
                    marcarPagoPagadoMenu(usuario);
                    break;
                case "0":
                    salir = true;
                    System.out.println("Saliendo del módulo de Suscripciones y Pagos...");
                    break;
                default:
                    System.out.println("[!] Opción inválida. Intente de nuevo.");
            }
        }
    }

    private void mostrarResumen(String usuario) {
        long gastoSuscripciones = gestor.calcularGastoSuscripcionesActivasMensual(usuario);
        double pagosPorPagar = gestor.calcularTotalPagosPorPagar(usuario);
        double gastoFijoTotal = gestor.calcularGastoFijoMensual(usuario);
        GestorSuscripcionesPagos.AhorroPotencial ahorro = gestor.calcularAhorroPotencial(usuario);
        int alertas = gestor.contarAlertasVencimiento(usuario);

        System.out.println("\n--- RESUMEN MÓDULO 2 EN 1 ---");
        System.out.println("Gasto Suscripciones Activas (Mes): " + formatoCOP.format(gastoSuscripciones));
        System.out.println("Pagos Pendientes por Pagar       : " + formatoCOP.format(pagosPorPagar));
        System.out.println("Gasto Fijo Recurrente Mensual    : " + formatoCOP.format(gastoFijoTotal));
        System.out.println("Ahorro Potencial (Pausadas/Canc.): " + formatoCOP.format(ahorro.getMensual())
                + "/mes | " + formatoCOP.format(ahorro.getAnual()) + "/año");
        System.out.println("Alertas de Vencimiento (<=3 días): " + alertas);
    }

    private void listarSuscripciones(String usuario) {
        List<Suscripcion> lista = gestor.obtenerSuscripciones(usuario);
        if (lista.isEmpty()) {
            System.out.println("\n[!] No tienes suscripciones ni gastos hormiga registrados.");
            return;
        }

        System.out.println("\n--- SUSCRIPCIONES Y GASTOS HORMIGA ---");
        for (Suscripcion s : lista) {
            System.out.printf("  [%s] %-18s | %-15s | %-8s | %10s (%s/mes | %s/año) [%s]%n",
                    s.getId(), s.getNombre(), s.getCategoria(), s.getFrecuencia(),
                    formatoCOP.format(s.getMonto()),
                    formatoCOP.format(s.calcularCostoMensual()),
                    formatoCOP.format(s.calcularCostoAnual()),
                    s.getEstado());
        }
    }

    private void crearSuscripcionMenu(String usuario) {
        System.out.println("\n--- NUEVA SUSCRIPCIÓN / GASTO HORMIGA ---");
        System.out.print("Nombre (ej. Netflix, Café diario): ");
        String nombre = scanner.nextLine().trim();

        System.out.println("Categorías: Streaming | Membresía | Café y snacks | Apps y software | Transporte | Otro");
        System.out.print("Categoría: ");
        String categoria = scanner.nextLine().trim();

        System.out.print("Frecuencia (SEMANAL / MENSUAL / ANUAL): ");
        String frecuencia = scanner.nextLine().trim();

        System.out.print("Monto (COP): ");
        double monto = leerMonto();

        try {
            Suscripcion s = gestor.crearSuscripcion(usuario, nombre, categoria, monto, frecuencia);
            System.out.println("[✓] Suscripción creada con ID: " + s.getId()
                    + " | Impacto anual: " + formatoCOP.format(s.calcularCostoAnual()));
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void cambiarEstadoSuscripcionMenu(String usuario) {
        listarSuscripciones(usuario);
        System.out.print("\nIngrese el ID de la suscripción: ");
        String id = scanner.nextLine().trim();
        System.out.print("Nuevo estado (ACTIVA / PAUSADA / CANCELADA): ");
        String estado = scanner.nextLine().trim();

        try {
            Suscripcion s = gestor.cambiarEstadoSuscripcion(usuario, id, estado);
            System.out.println("[✓] Estado actualizado a " + s.getEstado() + ".");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void listarPagosPendientes(String usuario) {
        List<PagoPendiente> lista = gestor.obtenerPagosPendientes(usuario);
        if (lista.isEmpty()) {
            System.out.println("\n[!] No tienes pagos pendientes registrados.");
            return;
        }

        System.out.println("\n--- AGENDA DE PAGOS PENDIENTES ---");
        for (PagoPendiente p : lista) {
            System.out.printf("  [%s] %-20s | %-9s | Vence: %s | %10s | Estado: %s%n",
                    p.getId(), p.getNombre(), p.getTipo(), p.getFechaVencimiento(),
                    formatoCOP.format(p.getMonto()), p.getEstadoPago());
        }
    }

    private void crearPagoPendienteMenu(String usuario) {
        System.out.println("\n--- NUEVO PAGO PENDIENTE ---");
        System.out.print("Concepto (ej. Internet, Tarjeta Finara): ");
        String nombre = scanner.nextLine().trim();

        System.out.print("Tipo (SERVICIO / TARJETA / CUOTA / OTRO): ");
        String tipo = scanner.nextLine().trim();

        System.out.print("Monto (COP): ");
        double monto = leerMonto();

        System.out.print("Fecha de vencimiento (YYYY-MM-DD, ej. " + LocalDate.now().plusDays(2) + "): ");
        String fechaStr = scanner.nextLine().trim();

        try {
            LocalDate fecha = LocalDate.parse(fechaStr);
            PagoPendiente p = gestor.crearPagoPendiente(usuario, nombre, tipo, monto, fecha);
            System.out.println("[✓] Pago agendado con ID: " + p.getId() + " (" + p.getEstadoPago() + ")");
        } catch (Exception e) {
            System.out.println("[!] Error: Verifica los datos y el formato de fecha YYYY-MM-DD.");
        }
    }

    private void marcarPagoPagadoMenu(String usuario) {
        listarPagosPendientes(usuario);
        System.out.print("\nIngrese el ID del pago a marcar como PAGADO: ");
        String id = scanner.nextLine().trim();

        try {
            PagoPendiente p = gestor.marcarPagoComoPagado(usuario, id);
            System.out.println("[✓] Pago '" + p.getNombre() + "' marcado como PAGADO.");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private double leerMonto() {
        try {
            String limpio = scanner.nextLine().trim().replace("$", "").replace(".", "").replace(",", ".");
            if (limpio.isEmpty()) return 0.0;
            return Double.parseDouble(limpio);
        } catch (Exception e) {
            return 0.0;
        }
    }
}
