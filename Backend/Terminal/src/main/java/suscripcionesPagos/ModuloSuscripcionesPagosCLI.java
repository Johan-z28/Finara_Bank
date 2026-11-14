package suscripcionesPagos;

import core.BaseDatosFinara;
import core.Consola;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI integrada para Suscripciones, Gastos Hormiga y Pagos Pendientes (HU-22).
 */
public class ModuloSuscripcionesPagosCLI {
    private final GestorSuscripcionesPagos gestor;
    private final Scanner scanner;

    public ModuloSuscripcionesPagosCLI() {
        this(Consola.getScanner());
    }

    public ModuloSuscripcionesPagosCLI(Scanner scanner) {
        this.gestor = new GestorSuscripcionesPagos();
        this.scanner = scanner != null ? scanner : Consola.getScanner();
    }

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        ModuloSuscripcionesPagosCLI cli = new ModuloSuscripcionesPagosCLI(Consola.getScanner());
        cli.iniciar("Juan");
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        String correo = datosUsuario != null
                ? datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "Juan"))
                : "Juan";
        ModuloSuscripcionesPagosCLI cli = new ModuloSuscripcionesPagosCLI(scanner);
        cli.iniciar(correo);
    }

    public void iniciar(String usuarioActivo) {
        String usuario = (usuarioActivo != null && !usuarioActivo.trim().isEmpty()) ? usuarioActivo : "Juan";
        boolean salir = false;

        while (!salir) {
            Consola.titulo("FINARA FINANZAS - SUSCRIPCIONES Y PAGOS PENDIENTES");
            System.out.println("Usuario: " + usuario);
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Ver Resumen 2 en 1 (Gasto Fijo, Ahorro Potencial y Alertas)");
            System.out.println("2. Ver Suscripciones y Gastos Hormiga");
            System.out.println("3. Agregar nueva Suscripción / Gasto Hormiga");
            System.out.println("4. Pausar / Reactivar / Cancelar Suscripción");
            System.out.println("5. Ver Agenda de Pagos Pendientes (incluye cuotas Finara)");
            System.out.println("6. Registrar nuevo Pago Pendiente manual");
            System.out.println("7. Marcar Pago Pendiente manual como Pagado");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-7): ", 0, 7);
            switch (opcion) {
                case 1:
                    mostrarResumen(usuario);
                    break;
                case 2:
                    listarSuscripciones(usuario);
                    break;
                case 3:
                    crearSuscripcionMenu(usuario);
                    break;
                case 4:
                    cambiarEstadoSuscripcionMenu(usuario);
                    break;
                case 5:
                    listarPagosPendientes(usuario);
                    break;
                case 6:
                    crearPagoPendienteMenu(usuario);
                    break;
                case 7:
                    marcarPagoPagadoMenu(usuario);
                    break;
                case 0:
                    salir = true;
                    break;
            }
        }
    }

    private void mostrarResumen(String usuario) {
        long gastoSuscripciones = gestor.calcularGastoSuscripcionesActivasMensual(usuario);
        double pagosPorPagar = gestor.calcularTotalPagosPorPagar(usuario);
        double gastoFijoTotal = gestor.calcularGastoFijoMensual(usuario);
        GestorSuscripcionesPagos.AhorroPotencial ahorro = gestor.calcularAhorroPotencial(usuario);
        int alertas = gestor.contarAlertasVencimiento(usuario);

        Consola.subtitulo("RESUMEN MÓDULO 2 EN 1");
        System.out.println("Gasto Suscripciones Activas (Mes): " + Consola.formatoCOP(gastoSuscripciones));
        System.out.println("Pagos Pendientes por Pagar       : " + Consola.formatoCOP(pagosPorPagar));
        System.out.println("Gasto Fijo Recurrente Mensual    : " + Consola.formatoCOP(gastoFijoTotal));
        System.out.println("Ahorro Potencial (Pausadas/Canc.): " + Consola.formatoCOP(ahorro.getMensual())
                + "/mes | " + Consola.formatoCOP(ahorro.getAnual()) + "/año");
        System.out.println("Alertas de Vencimiento (<=7 días): " + alertas);
    }

    private void listarSuscripciones(String usuario) {
        List<Suscripcion> lista = gestor.obtenerSuscripciones(usuario);
        if (lista.isEmpty()) {
            System.out.println("\n[i] No tienes suscripciones ni gastos hormiga registrados.");
            return;
        }
        Consola.subtitulo("SUSCRIPCIONES Y GASTOS HORMIGA");
        for (Suscripcion s : lista) {
            System.out.printf("  [%s] %-18s | %-15s | %-8s | %10s (%s/mes | %s/año) [%s]%n",
                    s.getId(), s.getNombre(), s.getCategoria(), s.getFrecuencia(),
                    Consola.formatoCOP(s.getMonto()),
                    Consola.formatoCOP(s.calcularCostoMensual()),
                    Consola.formatoCOP(s.calcularCostoAnual()),
                    s.getEstado());
        }
    }

    private void crearSuscripcionMenu(String usuario) {
        Consola.subtitulo("NUEVA SUSCRIPCIÓN / GASTO HORMIGA");
        String nombre = Consola.leerLineaObligatoria(scanner, "Nombre (ej. Netflix, Café diario, 0 cancelar): ");
        if (nombre == null) return;

        System.out.println("Categorías: Streaming | Membresía | Café y snacks | Apps y software | Transporte | Otro");
        String categoria = Consola.leerLinea(scanner, "Categoría: ");
        String frecuencia = Consola.leerLinea(scanner, "Frecuencia (SEMANAL / MENSUAL / ANUAL): ");
        double monto = Consola.leerMonto(scanner, "Monto en COP (0 cancelar): ");
        if (monto <= 0) return;

        try {
            Suscripcion s = gestor.crearSuscripcion(usuario, nombre, categoria, monto, frecuencia);
            BaseDatosFinara.guardar();
            System.out.println("[✓] Suscripción creada con ID: " + s.getId()
                    + " | Impacto anual: " + Consola.formatoCOP(s.calcularCostoAnual()));
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void cambiarEstadoSuscripcionMenu(String usuario) {
        List<Suscripcion> lista = gestor.obtenerSuscripciones(usuario);
        if (lista.isEmpty()) {
            System.out.println("\n[i] No tienes suscripciones registradas.");
            return;
        }
        listarSuscripciones(usuario);
        String id = Consola.leerLinea(scanner, "\nID de la suscripción (0 cancelar): ");
        if ("0".equals(id) || id.isEmpty()) return;
        String estado = Consola.leerLinea(scanner, "Nuevo estado (ACTIVA / PAUSADA / CANCELADA): ");

        try {
            Suscripcion s = gestor.cambiarEstadoSuscripcion(usuario, id, estado);
            BaseDatosFinara.guardar();
            System.out.println("[✓] Estado actualizado a " + s.getEstado() + ".");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void listarPagosPendientes(String usuario) {
        List<PagoPendiente> lista = gestor.obtenerPagosPendientes(usuario);
        if (lista.isEmpty()) {
            System.out.println("\n[i] No tienes pagos pendientes registrados ni cuotas Finara próximas.");
            return;
        }
        Consola.subtitulo("AGENDA DE PAGOS PENDIENTES");
        for (PagoPendiente p : lista) {
            System.out.printf("  [%s] %-26s | %-8s | Vence: %s | %11s | Estado: %s%n",
                    p.getId(), p.getNombre(), p.getTipo(), p.getFechaVencimiento(),
                    Consola.formatoCOP(p.getMonto()), p.getEstadoPago());
        }
    }

    private void crearPagoPendienteMenu(String usuario) {
        Consola.subtitulo("NUEVO PAGO PENDIENTE");
        String nombre = Consola.leerLineaObligatoria(scanner, "Concepto (ej. Internet, Agua, 0 cancelar): ");
        if (nombre == null) return;

        String tipo = Consola.leerLinea(scanner, "Tipo (SERVICIO / TARJETA / CUOTA / OTRO): ");
        double monto = Consola.leerMonto(scanner, "Monto en COP (0 cancelar): ");
        if (monto <= 0) return;

        String fechaStr = Consola.leerLinea(scanner,
                "Fecha vencimiento (AAAA-MM-DD, ej. " + LocalDate.now().plusDays(3) + "): ");

        try {
            LocalDate fecha = LocalDate.parse(fechaStr);
            PagoPendiente p = gestor.crearPagoPendiente(usuario, nombre, tipo, monto, fecha);
            BaseDatosFinara.guardar();
            System.out.println("[✓] Pago agendado con ID: " + p.getId() + " (" + p.getEstadoPago() + ")");
        } catch (Exception e) {
            System.out.println("[!] Error: Verifica los datos y el formato de fecha AAAA-MM-DD.");
        }
    }

    private void marcarPagoPagadoMenu(String usuario) {
        listarPagosPendientes(usuario);
        String id = Consola.leerLinea(scanner, "\nID del pago a marcar como PAGADO (0 cancelar): ");
        if ("0".equals(id) || id.isEmpty()) return;

        if (id.startsWith("AUTO-PRE-") || id.startsWith("AUTO-TC-")) {
            System.out.println("[i] Los pagos Finara automáticos se liquidan desde 'Préstamos' o 'Consignar / Pagar tarjeta'.");
            return;
        }
        try {
            PagoPendiente p = gestor.marcarPagoComoPagado(usuario, id);
            BaseDatosFinara.guardar();
            System.out.println("[✓] Pago '" + p.getNombre() + "' marcado como PAGADO.");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }
}
