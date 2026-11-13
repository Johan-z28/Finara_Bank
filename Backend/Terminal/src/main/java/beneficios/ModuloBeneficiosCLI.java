package beneficios;

import core.BaseDatosFinara;
import core.Consola;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo CLI integrado para visualizar y redimir beneficios según productos reales del cliente (HU-08).
 */
public class ModuloBeneficiosCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        String correo = datosUsuario != null
                ? datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "cliente@finara.com")).toLowerCase()
                : "cliente@finara.com";
        String nombre = datosUsuario != null ? datosUsuario.getOrDefault("nombre", "Cliente Finara") : "Cliente Finara";

        boolean enModulo = true;
        while (enModulo) {
            int puntos = ServicioBeneficios.obtenerPuntosFinara(correo);
            int productos = BaseDatosFinara.getInstancia().getRepositorioCuentas().contarProductosUsuario(correo);

            Consola.titulo("PROGRAMA DE BENEFICIOS Y RECOMPENSAS FINARA");
            System.out.println("Cliente        : " + nombre + " (" + correo + ")");
            System.out.println("Productos act. : " + productos + " | Puntos Finara acumulados: " + puntos);
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Ver Mis Beneficios Disponibles / Redimidos");
            System.out.println("2. Descubrir nuevos beneficios según mis productos");
            System.out.println("3. Explorar Catálogo General de Beneficios Finara");
            System.out.println("4. Redimir Beneficio o Cupón Promocional (+100 pts)");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-4): ", 0, 4);
            switch (opcion) {
                case 1:
                    mostrarBeneficiosUsuario(correo, productos);
                    break;
                case 2:
                    descubrirNuevos(correo, productos);
                    break;
                case 3:
                    mostrarCatalogoGlobal();
                    break;
                case 4:
                    ejecutarRedencion(scanner, correo, productos);
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    private static void mostrarBeneficiosUsuario(String correo, int productos) {
        Consola.subtitulo("TUS BENEFICIOS POR PRODUCTOS ACTIVOS");
        if (productos == 0) {
            System.out.println("[i] Aún no tienes productos activos en Finara Bank.");
            System.out.println("    Solicita una Cuenta de Ahorros, Débito, Corriente o Crédito Gold en 'Solicitar producto' para desbloquear beneficios.");
            return;
        }
        List<Beneficio> misBeneficios = ServicioBeneficios.obtenerBeneficiosCliente(correo);
        if (misBeneficios.isEmpty()) {
            System.out.println("No hay beneficios disponibles en este momento.");
            return;
        }
        for (Beneficio b : misBeneficios) {
            b.imprimirFicha();
        }
    }

    private static void descubrirNuevos(String correo, int productos) {
        if (productos == 0) {
            System.out.println("\n[i] Primero solicita un producto Finara para desbloquear beneficios compatibles.");
            return;
        }
        List<Beneficio> nuevos = ServicioBeneficios.sincronizarBeneficiosElegibles(correo);
        if (nuevos.isEmpty()) {
            System.out.println("\n[i] Ya tienes todos los beneficios desbloqueables para tus productos actuales.");
        } else {
            System.out.println("\n[✓] ¡Se desbloquearon " + nuevos.size() + " nuevo(s) beneficio(s) sin perder los anteriores!");
            for (Beneficio b : nuevos) {
                b.imprimirFicha();
            }
        }
    }

    private static void mostrarCatalogoGlobal() {
        Consola.subtitulo("CATÁLOGO GENERAL DE BENEFICIOS FINARA");
        for (Beneficio b : ServicioBeneficios.getCatalogoGlobal()) {
            b.imprimirFicha();
        }
    }

    private static void ejecutarRedencion(Scanner scanner, String correo, int productos) {
        if (productos == 0) {
            System.out.println("\n[i] Necesitas al menos un producto activo para poder redimir beneficios.");
            return;
        }
        Consola.subtitulo("REDIMIR BENEFICIO O CUPÓN");
        String codigo = Consola.leerLinea(scanner, "ID del beneficio (ej. BEN-CB01) o código promocional (0 cancelar): ");
        if ("0".equals(codigo) || codigo.isEmpty()) {
            return;
        }

        boolean exito = ServicioBeneficios.redimirBeneficio(correo, codigo);
        if (exito) {
            int totalPts = ServicioBeneficios.obtenerPuntosFinara(correo);
            System.out.println("\n[✓] ¡BENEFICIO REDIMIDO CON ÉXITO!");
            System.out.println("    Has ganado +" + ServicioBeneficios.PUNTOS_POR_REDENCION + " Puntos Finara. Total: " + totalPts + " pts.");
        } else {
            System.out.println("\n[X] No fue posible redimir. Verifica que pertenezca a tus productos y no esté redimido.");
        }
    }
}
