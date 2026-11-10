package transferenciasInternas;

import java.text.NumberFormat;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo CLI interactivo para transferencias entre cuentas Finara (HU-06).
 * Compatible con main.java mediante iniciar(scanner, datosUsuario).
 */
public class ModuloTransferenciasInternasCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);

        // Cuenta origen del usuario logueado
        Map<String, String> cuentaOrigen = new HashMap<>();
        cuentaOrigen.put("tipo", "Cuenta de Ahorros");
        cuentaOrigen.put("numero", "4021376783977068");
        cuentaOrigen.put("titular", datosUsuario.getOrDefault("nombre", "Juan Manuel Vélez"));
        cuentaOrigen.put("saldo", datosUsuario.getOrDefault("saldo", "3500000"));
        cuentaOrigen.put("estado", "ACTIVA");

        // Directorio en memoria de cuentas destino Finara para pruebas
        Map<String, Map<String, String>> directorioDestinos = new HashMap<>();

        Map<String, String> d1 = new HashMap<>();
        d1.put("tipo", "Cuenta de Ahorros");
        d1.put("numero", "4021999988887777");
        d1.put("titular", "Carlos Gómez");
        d1.put("saldo", "850000");
        d1.put("estado", "ACTIVA");

        Map<String, String> d2 = new HashMap<>();
        d2.put("tipo", "Cuenta Corriente");
        d2.put("numero", "4021444455556666");
        d2.put("titular", "Finara Tech SAS");
        d2.put("saldo", "5000000");
        d2.put("estado", "ACTIVA");

        Map<String, String> d3 = new HashMap<>();
        d3.put("tipo", "Cuenta de Ahorros");
        d3.put("numero", "4021111122223333");
        d3.put("titular", "Cuenta Bloqueada Demo");
        d3.put("saldo", "100000");
        d3.put("estado", "BLOQUEADA");

        directorioDestinos.put(d1.get("numero"), d1);
        directorioDestinos.put(d2.get("numero"), d2);
        directorioDestinos.put(d3.get("numero"), d3);

        boolean enModulo = true;

        while (enModulo) {
            double disponible = ServicioTransferenciasInternas.calcularDisponible(cuentaOrigen);
            System.out.println("\n=======================================================");
            System.out.println("   TRANSFERENCIAS ENTRE CUENTAS FINARA BANK (HU-06)   ");
            System.out.println("=======================================================");
            System.out.println(" Cuenta Origen:    " + cuentaOrigen.get("tipo") + " •••• " + cuentaOrigen.get("numero").substring(12));
            System.out.println(" Titular:          " + cuentaOrigen.get("titular"));
            System.out.println(" Saldo Disponible: " + formatoCOP.format(disponible));
            System.out.println(" Tarifa:           $0 COP (Transferencias internas gratis)");
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Realizar Transferencia a Cuenta Finara");
            System.out.println("2. Consultar Cuentas Finara de Prueba");
            System.out.println("3. Volver al menú anterior");
            System.out.print("Seleccione una opción (1-3): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    ejecutarFlujo(scanner, cuentaOrigen, directorioDestinos, formatoCOP);
                    break;
                case "2":
                    mostrarDirectorio(directorioDestinos);
                    break;
                case "3":
                    enModulo = false;
                    System.out.println("Saliendo del módulo de transferencias internas...");
                    break;
                default:
                    System.out.println("❌ Opción inválida.");
            }
        }
    }

    private static void ejecutarFlujo(Scanner scanner, Map<String, String> origen,
                                      Map<String, Map<String, String>> directorio, NumberFormat formatoCOP) {
        System.out.println("\n--- PASO 1: DATOS DE LA TRANSFERENCIA ---");
        System.out.print("Ingrese el número de cuenta Finara destino: ");
        String numDestino = scanner.nextLine().trim().replaceAll("\\D", "");

        Map<String, String> destino = directorio.get(numDestino);
        if (destino == null) {
            System.out.print("Cuenta no encontrada en la libreta. ¿Desea ingresar el nombre del titular para registrarla? (S/N): ");
            String reg = scanner.nextLine().trim();
            if (!reg.equalsIgnoreCase("S") && !reg.equalsIgnoreCase("SI")) {
                System.out.println("❌ Operación cancelada.");
                return;
            }
            System.out.print("Nombre del titular de la cuenta: ");
            String titular = scanner.nextLine().trim();
            destino = new HashMap<>();
            destino.put("tipo", "Cuenta de Ahorros");
            destino.put("numero", numDestino);
            destino.put("titular", titular);
            destino.put("saldo", "0");
            destino.put("estado", "ACTIVA");
            directorio.put(numDestino, destino);
        }

        System.out.println(" Beneficiario Identificado: " + destino.get("titular") + " (" + destino.get("tipo") + ")");

        System.out.print("Monto a transferir (COP): ");
        double monto = 0;
        try {
            monto = Double.parseDouble(scanner.nextLine().trim().replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            System.out.println("❌ Monto inválido. Operación cancelada.");
            return;
        }

        System.out.print("Concepto o motivo (opcional): ");
        String concepto = scanner.nextLine().trim();

        // PASO 2: Validación previa
        ServicioTransferenciasInternas.ResultadoValidacion val =
                ServicioTransferenciasInternas.validarTransferencia(origen, destino, monto);

        if (!val.isValido()) {
            System.out.println("\n❌ ERROR: " + val.getMensajeError());
            return;
        }

        System.out.println("\n=======================================================");
        System.out.println("          PASO 2: RESUMEN PREVIO Y CONFIRMACIÓN        ");
        System.out.println("=======================================================");
        System.out.println(" Cuenta Origen:         " + origen.get("tipo") + " •••• " + origen.get("numero").substring(12));
        System.out.println(" Cuenta Destino:        " + destino.get("tipo") + " •••• " + destino.get("numero").substring(destino.get("numero").length() - 4));
        System.out.println(" Titular Beneficiario:  " + destino.get("titular"));
        System.out.println(" Monto a Enviar:        " + formatoCOP.format(monto));
        System.out.println(" Comisión de Envío:     $0 COP");
        System.out.println(" Total a Debitar:       " + formatoCOP.format(monto));
        double saldoRestante = Double.parseDouble(origen.get("saldo")) - monto;
        System.out.println(" Saldo Restante Origen: " + formatoCOP.format(saldoRestante));
        System.out.println("-------------------------------------------------------");
        System.out.print("¿Desea confirmar la transferencia? (S/N): ");
        String confirm = scanner.nextLine().trim();

        if (!confirm.equalsIgnoreCase("S") && !confirm.equalsIgnoreCase("SI")) {
            System.out.println("❌ Transferencia cancelada por el usuario.");
            return;
        }

        try {
            ComprobanteTransferenciaInterna comp =
                    ServicioTransferenciasInternas.procesarTransferencia(origen, destino, monto, concepto);
            System.out.println("\n✅ ¡TRANSFERENCIA INTERNA EXITOSA!");
            comp.imprimirComprobante();
        } catch (Exception e) {
            System.out.println("❌ Error al procesar: " + e.getMessage());
        }
    }

    private static void mostrarDirectorio(Map<String, Map<String, String>> directorio) {
        System.out.println("\n--- CUENTAS FINARA DISPONIBLES EN MEMORIA ---");
        for (Map<String, String> c : directorio.values()) {
            System.out.println(" • N° Cuenta: " + c.get("numero") +
                    " | Tipo: " + c.get("tipo") +
                    " | Titular: " + c.get("titular") +
                    " | Estado: " + c.get("estado"));
        }
    }
}
