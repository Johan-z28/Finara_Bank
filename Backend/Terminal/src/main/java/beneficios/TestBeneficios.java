package beneficios;

import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

/**
 * Clase ejecutable para probar de forma directa el módulo de beneficios por terminal (HU-08).
 */
public class TestBeneficios {
    public static void main(String[] args) {
        System.out.println(">>> INICIANDO TEST DEL MÓDULO DE BENEFICIOS (HU-08) <<<");
        Scanner scanner = new Scanner(System.in);
        Map<String, String> usuarioDemo = new HashMap<>();
        usuarioDemo.put("nombre", "Johan Zapata");
        usuarioDemo.put("correo", "johanzapatacifuentes@gmail.com");

        ModuloBeneficiosCLI.iniciar(scanner, usuarioDemo);
        scanner.close();
    }
}
