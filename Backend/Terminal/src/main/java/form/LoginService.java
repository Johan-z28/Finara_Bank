package form;

import core.Seguridad;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

/**
 * Servicio encargado de la autenticación segura y control de bloqueo por intentos fallidos (HU-02).
 */
public class LoginService {

    public static final int MAX_INTENTOS_FALLIDOS = 3;

    public static class ResultadoAutenticacion {
        private final boolean autenticado;
        private final boolean cuentaBloqueada;
        private final int intentosRestantes;
        private final String mensaje;
        private final Map<String, String> usuario;

        public ResultadoAutenticacion(boolean autenticado, boolean cuentaBloqueada, int intentosRestantes, String mensaje, Map<String, String> usuario) {
            this.autenticado = autenticado;
            this.cuentaBloqueada = cuentaBloqueada;
            this.intentosRestantes = intentosRestantes;
            this.mensaje = mensaje;
            this.usuario = usuario;
        }

        public boolean isAutenticado() { return autenticado; }
        public boolean isCuentaBloqueada() { return cuentaBloqueada; }
        public int getIntentosRestantes() { return intentosRestantes; }
        public String getMensaje() { return mensaje; }
        public Map<String, String> getUsuario() { return usuario; }
    }

    /**
     * Valida las credenciales aplicando la política de seguridad de 3 intentos máximos y bloqueo de cuenta.
     */
    public static ResultadoAutenticacion autenticar(Map<String, Map<String, String>> baseDatosUsuarios, String identificador, String password) {
        if (baseDatosUsuarios == null || baseDatosUsuarios.isEmpty()) {
            return new ResultadoAutenticacion(false, false, MAX_INTENTOS_FALLIDOS, "No hay usuarios registrados en el sistema.", null);
        }

        if (identificador == null || identificador.trim().isEmpty()) {
            return new ResultadoAutenticacion(false, false, MAX_INTENTOS_FALLIDOS, "El usuario o correo no puede estar vacío.", null);
        }

        if (password == null || password.trim().isEmpty()) {
            return new ResultadoAutenticacion(false, false, MAX_INTENTOS_FALLIDOS, "La contraseña no puede estar vacía.", null);
        }

        String idLimpio = identificador.trim();

        // Buscar por correo o por username
        Map<String, String> usuario = null;
        if (baseDatosUsuarios.containsKey(idLimpio)) {
            usuario = baseDatosUsuarios.get(idLimpio);
        } else if (baseDatosUsuarios.containsKey(idLimpio.toLowerCase())) {
            usuario = baseDatosUsuarios.get(idLimpio.toLowerCase());
        } else {
            for (Map<String, String> u : baseDatosUsuarios.values()) {
                if (idLimpio.equalsIgnoreCase(u.get("username"))
                        || idLimpio.equalsIgnoreCase(u.get("correo"))
                        || idLimpio.equalsIgnoreCase(u.get("email"))) {
                    usuario = u;
                    break;
                }
            }
        }

        if (usuario == null) {
            return new ResultadoAutenticacion(false, false, MAX_INTENTOS_FALLIDOS, "El usuario o correo no se encuentra registrado.", null);
        }

        // 1. Verificar si la cuenta ya está bloqueada
        boolean bloqueada = Boolean.parseBoolean(usuario.getOrDefault("bloqueada", "false"))
                || "BLOQUEADA".equalsIgnoreCase(usuario.getOrDefault("estado", "ACTIVA"));

        if (bloqueada) {
            String fechaBloqueo = usuario.getOrDefault("fechaBloqueo", "Reciente");
            return new ResultadoAutenticacion(false, true, 0,
                    "⛔ ACCESO DENEGADO: Tu cuenta se encuentra BLOQUEADA por seguridad debido a múltiples intentos fallidos (" + fechaBloqueo + "). Comunícate con soporte.", usuario);
        }

        // Obtener contador actual de intentos fallidos
        int intentosFallidos = 0;
        try {
            intentosFallidos = Integer.parseInt(usuario.getOrDefault("intentosFallidos", "0"));
        } catch (NumberFormatException e) {
            intentosFallidos = 0;
        }

        // 2. Comprobar contraseña (soporta hash SHA-256 + salt y texto plano en tests aislados)
        if (Seguridad.verificarPassword(password, usuario.getOrDefault("password", ""))) {
            // Éxito: Resetear contador de intentos fallidos
            usuario.put("intentosFallidos", "0");
            return new ResultadoAutenticacion(true, false, MAX_INTENTOS_FALLIDOS,
                    "¡Autenticación exitosa! Bienvenido(a), " + usuario.getOrDefault("nombre", "Usuario"), usuario);
        } else {
            // Contraseña incorrecta: Incrementar intentos
            intentosFallidos++;
            usuario.put("intentosFallidos", String.valueOf(intentosFallidos));
            int restantes = Math.max(0, MAX_INTENTOS_FALLIDOS - intentosFallidos);

            if (intentosFallidos >= MAX_INTENTOS_FALLIDOS) {
                // Al tercer intento fallido, bloquear cuenta
                usuario.put("bloqueada", "true");
                usuario.put("estado", "BLOQUEADA");
                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
                usuario.put("fechaBloqueo", LocalDateTime.now().format(dtf));

                return new ResultadoAutenticacion(false, true, 0,
                        "🚫 ALERTA DE SEGURIDAD: Has alcanzado el límite de 3 intentos fallidos. Tu cuenta ha sido BLOQUEADA temporalmente.", usuario);
            } else {
                return new ResultadoAutenticacion(false, false, restantes,
                        "Contraseña incorrecta. Intentos restantes: " + restantes + " de " + MAX_INTENTOS_FALLIDOS + ".", usuario);
            }
        }
    }

    /**
     * Permite a un administrador o proceso desbloquear la cuenta y reiniciar sus intentos.
     */
    public static void desbloquearCuenta(Map<String, String> usuario) {
        if (usuario != null) {
            usuario.put("bloqueada", "false");
            usuario.put("estado", "ACTIVA");
            usuario.put("intentosFallidos", "0");
            usuario.remove("fechaBloqueo");
        }
    }
}
