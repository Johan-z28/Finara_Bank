package core;

import java.io.PrintStream;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Scanner;

/**
 * Utilidad centralizada de entrada/salida por consola.
 * Garantiza un único Scanner, salida en UTF-8 y validación segura de entradas.
 */
public final class Consola {
    private static Scanner scannerCompartido = new Scanner(System.in, StandardCharsets.UTF_8);
    private static boolean utf8Inicializado = false;

    private static final NumberFormat FORMATO_COP;

    static {
        FORMATO_COP = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-CO"));
        FORMATO_COP.setMaximumFractionDigits(0);
    }

    private Consola() {
    }

    public static synchronized void configurarUTF8() {
        if (utf8Inicializado) {
            return;
        }
        try {
            System.setOut(new PrintStream(System.out, true, "UTF-8"));
            System.setErr(new PrintStream(System.err, true, "UTF-8"));
        } catch (UnsupportedEncodingException ignored) {
            // Se conserva la salida estándar si la plataforma no soporta UTF-8 explícito
        }
        utf8Inicializado = true;
    }

    public static synchronized Scanner getScanner() {
        return scannerCompartido;
    }

    public static synchronized void setScanner(Scanner nuevoScanner) {
        if (nuevoScanner != null) {
            scannerCompartido = nuevoScanner;
        }
    }

    private static Scanner resolverScanner(Scanner s) {
        if (s != null) {
            return s;
        }
        return scannerCompartido;
    }

    public static String leerLinea(Scanner s, String prompt) {
        if (prompt != null && !prompt.isEmpty()) {
            System.out.print(prompt);
        }
        Scanner sc = resolverScanner(s);
        if (!sc.hasNextLine()) {
            return "";
        }
        return sc.nextLine().trim();
    }

    public static String leerLineaObligatoria(Scanner s, String prompt) {
        while (true) {
            String valor = leerLinea(s, prompt);
            if ("0".equals(valor)) {
                return null;
            }
            if (!valor.isEmpty()) {
                return valor;
            }
            System.out.println("[!] Este campo no puede estar vacío (escriba 0 para cancelar).");
        }
    }

    /**
     * Lee un entero en el rango [min, max]. Retorna (min - 1) si el usuario cancela con "0"
     * cuando min > 0, o maneja 0 como opción válida cuando min <= 0 <= max.
     */
    public static int leerEntero(Scanner s, String prompt, int min, int max) {
        while (true) {
            String raw = leerLinea(s, prompt);
            try {
                int val = Integer.parseInt(raw.trim());
                if (val == 0 && min > 0) {
                    return -1;
                }
                if (val >= min && val <= max) {
                    return val;
                }
                System.out.println("[!] Ingrese un número entre " + min + " y " + max + (min > 0 ? " (o 0 para cancelar)." : "."));
            } catch (NumberFormatException e) {
                System.out.println("[!] Entrada inválida. Debe ingresar un número entero.");
            }
        }
    }

    public static int leerEnteroConDefecto(Scanner s, String prompt, int defecto, int min, int max) {
        while (true) {
            String raw = leerLinea(s, prompt);
            if (raw.isEmpty()) {
                return defecto;
            }
            try {
                int val = Integer.parseInt(raw);
                if (val >= min && val <= max) {
                    return val;
                }
                System.out.println("[!] Ingrese un número entre " + min + " y " + max + ".");
            } catch (NumberFormatException e) {
                System.out.println("[!] Entrada inválida. Ingrese un número entero o Enter para usar " + defecto + ".");
            }
        }
    }

    /**
     * Lee un monto monetario positivo (> 0). Retorna -1 si el usuario ingresa "0" para cancelar.
     */
    public static double leerMonto(Scanner s, String prompt) {
        while (true) {
            String raw = leerLinea(s, prompt);
            if ("0".equals(raw)) {
                return -1;
            }
            double valor = parsearMontoSeguro(raw);
            if (valor > 0) {
                return valor;
            }
            System.out.println("[!] Ingrese un monto válido mayor a 0 (o 0 para cancelar).");
        }
    }

    /**
     * Lee un monto >= 0. Si el usuario presiona Enter retorna -1 para conservar valor previo.
     */
    public static double leerMontoOpcional(Scanner s, String prompt) {
        while (true) {
            String raw = leerLinea(s, prompt);
            if (raw.isEmpty()) {
                return -1;
            }
            double valor = parsearMontoSeguro(raw);
            if (!Double.isNaN(valor) && valor >= 0) {
                return valor;
            }
            System.out.println("[!] Monto inválido. Ingrese un número válido o presione Enter.");
        }
    }

    public static double parsearMontoSeguro(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return Double.NaN;
        }
        try {
            String limpio = raw.trim()
                    .replace("$", "")
                    .replace("COP", "")
                    .replace(" ", "")
                    .replace(".", "")
                    .replace(",", ".");
            if (limpio.isEmpty()) {
                return Double.NaN;
            }
            double val = Double.parseDouble(limpio);
            return (Double.isNaN(val) || Double.isInfinite(val)) ? Double.NaN : val;
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }

    public static String leerOpcion(Scanner s, String prompt) {
        return leerLinea(s, prompt);
    }

    public static boolean confirmar(Scanner s, String mensaje) {
        while (true) {
            String resp = leerLinea(s, mensaje + " (s/n): ").toLowerCase();
            if ("s".equals(resp) || "si".equals(resp) || "sí".equals(resp)) {
                return true;
            }
            if ("n".equals(resp) || "no".equals(resp) || "0".equals(resp)) {
                return false;
            }
            System.out.println("[!] Responda 's' para sí o 'n' para no.");
        }
    }

    public static void pausar(Scanner s) {
        System.out.print("\nPresione Enter para continuar...");
        Scanner sc = resolverScanner(s);
        if (sc.hasNextLine()) {
            sc.nextLine();
        }
    }

    public static void titulo(String texto) {
        System.out.println("\n=======================================================");
        System.out.println("  " + texto);
        System.out.println("=======================================================");
    }

    public static void subtitulo(String texto) {
        System.out.println("\n--- " + texto + " ---");
    }

    public static String formatoCOP(double valor) {
        return FORMATO_COP.format(valor);
    }

    public static String limpiarNumeroCuenta(String numero) {
        return numero == null ? "" : numero.replaceAll("\\D", "");
    }

    public static String enmascararCuenta(String numero) {
        String limpio = limpiarNumeroCuenta(numero);
        if (limpio.length() <= 4) {
            return limpio.isEmpty() ? "0000" : limpio;
        }
        return "•••• " + limpio.substring(limpio.length() - 4);
    }
}
