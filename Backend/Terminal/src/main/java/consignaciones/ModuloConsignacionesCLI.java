package consignaciones;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo CLI para realizar consignaciones a cuentas propias o pagar deuda de tarjetas de crédito.
 */
public class ModuloConsignacionesCLI {

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        iniciar(Consola.getScanner(), new java.util.HashMap<>());
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para realizar consignaciones.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
        List<Map<String, String>> cuentas = repo.obtenerCuentasUsuario(correo);

        Consola.titulo("CONSIGNAR DINERO / PAGAR TARJETA DE CRÉDITO");
        if (cuentas.isEmpty()) {
            System.out.println("[!] No tienes productos activos.");
            System.out.println("    Solicita primero una Cuenta de Ahorros, Corriente o Tarjeta desde el menú principal.");
            return;
        }

        System.out.println("Seleccione el producto destino:");
        for (int i = 0; i < cuentas.size(); i++) {
            Map<String, String> c = cuentas.get(i);
            String tipo = c.getOrDefault("tipo", "AHORROS").toUpperCase();
            if ("CREDITO".equals(tipo)) {
                double deuda = RepositorioCuentas.parsearNumero(c.get("deudaActual"));
                System.out.printf("%d. Tarjeta Crédito %s | Deuda actual: %s%n",
                        (i + 1), Consola.enmascararCuenta(c.get("numero")), Consola.formatoCOP(deuda));
            } else {
                double saldo = RepositorioCuentas.parsearNumero(c.get("saldo"));
                System.out.printf("%d. %-16s %s | Saldo actual: %s%n",
                        (i + 1), tipo, Consola.enmascararCuenta(c.get("numero")), Consola.formatoCOP(saldo));
            }
        }
        System.out.println("0. Cancelar");

        int idx = Consola.leerEntero(scanner, "Producto (0-" + cuentas.size() + "): ", 1, cuentas.size());
        if (idx <= 0) {
            System.out.println("Operación cancelada.");
            return;
        }

        Map<String, String> cuentaDestino = cuentas.get(idx - 1);
        double monto = Consola.leerMonto(scanner, "Monto a consignar/abonar en COP (0 para cancelar): ");
        if (monto <= 0) {
            System.out.println("Operación cancelada.");
            return;
        }

        String concepto = Consola.leerLinea(scanner, "Concepto / referencia (opcional): ");

        System.out.println("\n--- CONFIRMAR OPERACIÓN ---");
        System.out.println("Producto : " + cuentaDestino.get("tipo") + " " + Consola.enmascararCuenta(cuentaDestino.get("numero")));
        System.out.println("Valor    : " + Consola.formatoCOP(monto));
        if (!Consola.confirmar(scanner, "¿Desea confirmar esta transacción?")) {
            System.out.println("Operación cancelada por el usuario.");
            return;
        }

        ServicioConsignaciones.ResultadoConsignacion res =
                ServicioConsignaciones.procesarConsignacion(correo, cuentaDestino, monto, concepto);

        if (!res.isExito()) {
            System.out.println("\n[X] " + res.getMensaje());
            return;
        }

        String fecha = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        System.out.println("\n=======================================================");
        System.out.println("        FINARA BANK - COMPROBANTE DE CONSIGNACIÓN      ");
        System.out.println("=======================================================");
        System.out.println(" Referencia : " + res.getReferencia());
        System.out.println(" Fecha      : " + fecha);
        System.out.println(" Producto   : " + cuentaDestino.get("tipo") + " " + Consola.enmascararCuenta(cuentaDestino.get("numero")));
        System.out.println(" Monto      : " + Consola.formatoCOP(monto));
        if ("CREDITO".equalsIgnoreCase(cuentaDestino.get("tipo"))) {
            System.out.println(" Deuda rest.: " + Consola.formatoCOP(res.getNuevoSaldoODeuda()));
            System.out.println(" Cupo disp. : " + Consola.formatoCOP(RepositorioCuentas.parsearNumero(cuentaDestino.get("cupoDisponible"))));
        } else {
            System.out.println(" Nuevo saldo: " + Consola.formatoCOP(res.getNuevoSaldoODeuda()));
        }
        System.out.println("=======================================================");
    }
}
