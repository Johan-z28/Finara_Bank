package retiros;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import core.RepositorioMovimientos;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI integrada para el módulo de Retiro de Dinero (HU-28).
 * Opera directamente sobre las cuentas reales compartidas del cliente.
 */
public class ModuloRetirosCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para retirar dinero.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
        RepositorioMovimientos repoMovs = BaseDatosFinara.getInstancia().getRepositorioMovimientos();

        boolean enModulo = true;
        while (enModulo) {
            List<Map<String, String>> cuentas = repo.obtenerCuentasUsuario(correo);
            Consola.titulo("MÓDULO DE RETIROS DE DINERO - FINARA BANK");
            if (cuentas.isEmpty()) {
                System.out.println("[!] No tienes productos activos en este momento.");
                System.out.println("    Solicita una Cuenta de Ahorros, Corriente o Tarjeta desde el menú principal.");
                return;
            }

            System.out.println("1. Realizar un Retiro o Avance en Efectivo");
            System.out.println("2. Consultar Capacidad Disponible de Retiro");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-2): ", 0, 2);
            switch (opcion) {
                case 1:
                    ejecutarRetiroInteractivo(scanner, correo, cuentas, repoMovs);
                    break;
                case 2:
                    mostrarCapacidades(cuentas);
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    private static Map<String, String> seleccionarCuenta(Scanner scanner, List<Map<String, String>> cuentas) {
        System.out.println("\nSeleccione el producto de origen:");
        for (int i = 0; i < cuentas.size(); i++) {
            Map<String, String> c = cuentas.get(i);
            String tipo = c.getOrDefault("tipo", "AHORROS").toUpperCase();
            double disp = ServicioRetiros.calcularDisponible(c);
            System.out.printf("%d. %-10s %s | Estado: %-8s | Disp. retiro: %s%n",
                    (i + 1), tipo, Consola.enmascararCuenta(c.get("numero")),
                    c.getOrDefault("estado", "ACTIVA"), Consola.formatoCOP(disp));
        }
        System.out.println("0. Cancelar");
        int idx = Consola.leerEntero(scanner, "Opción (0-" + cuentas.size() + "): ", 1, cuentas.size());
        return idx <= 0 ? null : cuentas.get(idx - 1);
    }

    private static void mostrarCapacidades(List<Map<String, String>> cuentas) {
        Consola.subtitulo("DISPONIBILIDAD DE RETIRO POR PRODUCTO");
        for (Map<String, String> c : cuentas) {
            String tipo = c.getOrDefault("tipo", "AHORROS").toUpperCase();
            double disp = ServicioRetiros.calcularDisponible(c);
            System.out.println(" • " + tipo + " " + Consola.enmascararCuenta(c.get("numero"))
                    + " -> Máximo disponible para retiro: " + Consola.formatoCOP(disp));
        }
    }

    private static void ejecutarRetiroInteractivo(
            Scanner scanner, String correo, List<Map<String, String>> cuentas, RepositorioMovimientos repoMovs) {

        Map<String, String> cuenta = seleccionarCuenta(scanner, cuentas);
        if (cuenta == null) {
            System.out.println("Operación cancelada.");
            return;
        }

        double monto = Consola.leerMonto(scanner, "Monto a retirar en COP (ej. 50000, 0 para cancelar): ");
        if (monto <= 0) {
            System.out.println("Retiro cancelado.");
            return;
        }

        String nota = Consola.leerLinea(scanner, "Nota / concepto del retiro (opcional): ");
        ServicioRetiros.ResultadoValidacionRetiro val = ServicioRetiros.validarRetiro(cuenta, monto);
        if (!val.isValido()) {
            System.out.println("\n[X] VALIDACIÓN FALLIDA: " + val.getMensajeError());
            return;
        }

        System.out.println("\n--- CONFIRMACIÓN DE RETIRO ---");
        System.out.println("Producto : " + cuenta.get("tipo") + " " + Consola.enmascararCuenta(cuenta.get("numero")));
        System.out.println("Monto    : " + Consola.formatoCOP(monto));
        if (!Consola.confirmar(scanner, "¿Confirma realizar este retiro?")) {
            System.out.println("Retiro cancelado por el usuario.");
            return;
        }

        try {
            ComprobanteRetiro comp = ServicioRetiros.procesarRetiro(cuenta, monto, "Terminal Finara", nota);
            comp.imprimirComprobante();

            String tipoProducto = cuenta.getOrDefault("tipo", "AHORROS");
            double saldoResultante = tipoProducto.contains("CREDITO")
                    ? comp.getNuevoCupoDisponible() : comp.getNuevoSaldo();
            String desc = nota.isEmpty()
                    ? "Retiro en canal Finara (" + tipoProducto + ")"
                    : nota;
            repoMovs.registrarMovimiento(
                    correo,
                    comp.getReferencia(),
                    cuenta.get("numero"),
                    tipoProducto,
                    "Retiro",
                    "EGRESO",
                    monto,
                    saldoResultante,
                    desc
            );
            BaseDatosFinara.guardar();
        } catch (Exception e) {
            System.out.println("\n[X] Error al procesar retiro: " + e.getMessage());
        }
    }
}
