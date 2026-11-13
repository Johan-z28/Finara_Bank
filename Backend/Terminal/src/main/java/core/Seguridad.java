package core;

import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;

/**
 * Utilidad sencilla para cifrar (hash SHA-256 con salt) y verificar contraseñas.
 */
public class Seguridad {

    public static String hashPassword(String password) {
        if (password == null) {
            return "";
        }
        if (esHash(password)) {
            return password;
        }
        String salt = UUID.randomUUID().toString().substring(0, 8);
        String hash = generarSha256(salt + password);
        return "SHA256$" + salt + "$" + hash;
    }

    public static boolean verificarPassword(String passwordIngresada, String guardada) {
        if (passwordIngresada == null || guardada == null) {
            return false;
        }
        // Compatibilidad con claves en texto plano (ej. pruebas unitarias aisladas)
        if (!esHash(guardada)) {
            return guardada.equals(passwordIngresada);
        }
        String[] partes = guardada.split("\\$");
        if (partes.length != 3) {
            return false;
        }
        String salt = partes[1];
        String hashEsperado = partes[2];
        return hashEsperado.equals(generarSha256(salt + passwordIngresada));
    }

    public static boolean esHash(String valor) {
        return valor != null && valor.startsWith("SHA256$");
    }

    private static String generarSha256(String texto) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(texto.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            throw new RuntimeException("Error al cifrar la contraseña", e);
        }
    }
}
