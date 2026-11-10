package retiros;

import java.text.NumberFormat;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo CLI interactivo para retiros de dinero (HU-28).
 * Se puede ejecutar de forma aislada o invocarse desde main.java con iniciar(scanner, datosUsuario).
 */
public class ModuloRetirosCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);

        // Cuenta demo para operar en memoria
        Map<String, String> cuenta = new HashMap<>();
        cuenta.put("tipo", "Cuenta de Ahorros");
        cuenta.put("numero", "4021376783977068");
        cuenta.put("titular", datosUsuario.getOrDefault("nombre", "Juan Manuel Vélez"));
        cuenta.put("saldo", datosUsuario.getOrDefault("saldo", "3500000"));
        cuenta.put("estado", "ACTIVA");

        boolean enModulo = true;

        while (enModulo) {
            double disponible = ServicioRetiros.calcularDisponible(cuenta);
            System.out.println("\n=======================================================");
            System.out.println("        MÓDULO DE RETIROS DE DINERO - FINARA BANK      ");
            System.out.println("=======================================================");
            System.out.println(" Producto:            " + cuenta.get("tipo") + " •••• " + cuenta.get("numero").substring(12));
            System.out.println(" Saldo Real:          " + formatoCOP.format(Double.parseDouble(cuenta.get("saldo"))));
            System.out.println(" Monto Disponible:    " + formatoCOP.format(disponible));
            System.out.println(" Rendimiento Ahorros: 1.5% mensual aplicado al retiro");
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Retirar Dinero (Cajero Automático / Corresponsal)");
            System.out.println("2. Cambiar Tipo de Producto de Demostración (Ahorros / Corriente / Crédito)");
            System.out.println("3. Volver al menú anterior");
            System.out.print("Seleccione una opción (1-3): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    ejecutarRetiro(scanner, cuenta, formatoCOP);
                    break;
                case "2":
                    cambiarProductoDemo(scanner, cuenta);
                    break;
                case "3":
                    enModulo = false;
                    System.out.println("Saliendo del módulo de retiros...");
                    break;
                default:
                    System.out.println("❌ Opción inválida.");
            }
        }
    }

    private static void ejecutarRetiro(Scanner scanner, Map<String, String> cuenta, NumberFormat formatoCOP) {
        System.out.println("\n--- PASO 1: DATOS DEL RETIRO ---");
        System.out.print("Ingrese el monto a retirar (COP): ");
        String montoStr = scanner.nextLine().trim().replaceAll("[^0-9]", "");
        double monto = 0;
        try {
            monto = Double.parseDouble(montoStr);
        } catch (NumberFormatException e) {
            System.out.println("❌ Monto inválido. Operación cancelada.");
            return;
        }

        System.out.print("Concepto o motivo del retiro (opcional): ");
        String concepto = scanner.nextLine().trim();

        System.out.println("Seleccione el canal de retiro:");
        System.out.println(" 1. Cajero Automático Finara");
        System.out.println(" 2. Red de Corresponsales Bancarios");
        System.out.println(" 3. Retiro sin tarjeta con Token");
        System.out.print("Opción (1-3): ");
        String opcCanal = scanner.nextLine().trim();
        String canal = "Cajero Automático Finara";
        if ("2".equals(opcCanal)) canal = "Corresponsal Bancario";
        else if ("3".equals(opcCanal)) canal = "Retiro con Token";

        // PASO 2: Validación previa y desglose
        ServicioRetiros.ResultadoValidacionRetiro val = ServicioRetiros.validarRetiro(cuenta, monto);
        if (!val.isValido()) {
            System.out.println("\n❌ ERROR: " + val.getMensajeError());
            return;
        }

        System.out.println("\n=======================================================");
        System.out.println("          PASO 2: RESUMEN PREVIO Y CONFIRMACIÓN        ");
        System.out.println("=======================================================");
        System.out.println(" Producto:             " + cuenta.get("tipo") + " •••• " + cuenta.get("numero").substring(cuenta.get("numero").length() - 4));
        System.out.println(" Monto Solicitado:     " + formatoCOP.format(monto));
        if (val.getInteresRendimiento() > 0) {
            System.out.println(" Rendimiento Abonado:  +" + formatoCOP.format(val.getInteresRendimiento()) + " (1.5% beneficio)");
        }
        if (val.isUsaSobregiro()) {
            System.out.println(" Sobregiro Aplicado:   " + formatoCOP.format(val.getSobregiroUsado()));
        }
        System.out.println(" Total a Debitar:      " + formatoCOP.format(monto));
        System.out.println(" Saldo Resultante:     " + formatoCOP.format(val.getNuevoSaldo()));
        System.out.println(" Comisión de Retiro:   $0 COP");
        System.out.println("-------------------------------------------------------");
        System.out.print("¿Desea confirmar el retiro de dinero? (S/N): ");
        String confirm = scanner.nextLine().trim();

        if (!confirm.equalsIgnoreCase("S") && !confirm.equalsIgnoreCase("SI")) {
            System.out.println("❌ Retiro cancelado por el usuario.");
            return;
        }

        try {
            ComprobanteRetiro comp = ServicioRetiros.procesarRetiro(cuenta, monto, canal, concepto);
            System.out.println("\n✅ ¡RETIRO EXITOSO!");
            comp.imprimirComprobante();
        } catch (Exception e) {
            System.out.println("❌ Error inesperado: " + e.getMessage());
        }
    }

    private static void cambiarProductoDemo(Scanner scanner, Map<String, String> cuenta) {
        System.out.println("\nSeleccione el tipo de producto:");
        System.out.println(" 1. Cuenta de Ahorros (Con 1.5% rendimiento)");
        System.out.println(" 2. Cuenta Corriente (Con 20% sobregiro)");
        System.out.println(" 3. Tarjeta de Crédito (Con 50% avance de cupo)");
        System.out.print("Opción (1-3): ");
        String opc = scanner.nextLine().trim();

        if ("2".equals(opc)) {
            cuenta.put("tipo", "Cuenta Corriente");
            cuenta.put("saldo", "2000000");
            System.out.println("✔ Cambiado a Cuenta Corriente con saldo $2.000.000 (Disponible con sobregiro: $2.400.000)");
        } else if ("3".equals(opc)) {
            cuenta.put("tipo", "Tarjeta de Crédito");
            cuenta.put("saldo", "6000000");
            cuenta.put("cupoDisponible", "6000000");
            System.out.println("✔ Cambiado a Tarjeta de Crédito con cupo $6.000.000 (Disponible para avance 50%: $3.000.000)");
        } else {
            cuenta.put("tipo", "Cuenta de Ahorros");
            cuenta.put("saldo", "3500000");
            System.out.println("✔ Cambiado a Cuenta de Ahorros con saldo $3.500.000");
        }
    }
}
