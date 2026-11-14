package transferenciasInternas;

import java.util.HashMap;
import java.util.Scanner;

/**
 * Clase ejecutable para pruebas interactivas de transferencias internas Finara (HU-06).
 */
public class TestTransferenciasInternas {
    public static void main(String[] args) {
        System.out.println(">>> INICIANDO TEST DEL MÓDULO DE TRANSFERENCIAS INTERNAS (HU-06) <<<");
        Scanner scanner = new Scanner(System.in);
        ModuloTransferenciasInternasCLI.iniciar(scanner, new HashMap<>());
        scanner.close();
    }
}
