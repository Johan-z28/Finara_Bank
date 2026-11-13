package core;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Utilidad criptográfica estándar (Java SE) para hash seguro de contraseñas con SHA-256 + salt.
 */
public final class Seguridad {
    private static final String PREFIJO_HASH = "SHA256$";
    private static final SecureRandom RANDOM = new SecureRandom();

    private Seguridad() {
    }

    /**
     * Genera un hash con salt aleatorio en formato SHA256$&lt;saltBase64&gt;$&lt;hashBase64&gt;.
     */
    public static String hashPassword(String password) {
        if (password == null) {
            return "";
        }
        if (esHash(password)) {
            return password;
        }
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        String saltB64 = Base64.getEncoder().encodeToString(salt);
        String hashB64 = calcularSha256(saltB64, password);
        return PREFIJO_HASH + saltB64 + "$" + hashB64;
    }

    /**
     * Verifica una contraseña en texto plano contra un valor almacenado (soporta hash SHA-256 + salt
     * y texto plano heredado para pruebas unitarias aisladas).
     */
    public static boolean verificarPassword(String passwordIngresada, String stored) {
        if (passwordIngresada == null || stored == null) {
            return false;
        }
        if (!esHash(stored)) {
            return stored.equals(passwordIngresada);
        }
        String resto = stored.substring(PREFIJO_HASH.length());
        int sep = resto.indexOf('$');
        if (sep <= 0) {
            return false;
        }
        String saltB64 = resto.substring(0, sep);
        String hashEsperado = resto.substring(sep + 1);
        String hashCalculado = calcularSha256(saltB64, passwordIngresada);
        return MessageDigest.isEqual(
                hashEsperado.getBytes(StandardCharsets.UTF_8),
                hashCalculado.getBytes(StandardCharsets.UTF_8)
        );
    }

    public static boolean esHash(String valor) {
        return valor != null && valor.startsWith(PREFIJO_HASH);
    }

    private static String calcularSha256(String saltB64, String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(saltB64.getBytes(StandardCharsets.UTF_8));
            byte[] digest = md.digest(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (Exception e) {
            throw new IllegalStateException("No fue posible inicializar SHA-256", e);
        }
    }
}
