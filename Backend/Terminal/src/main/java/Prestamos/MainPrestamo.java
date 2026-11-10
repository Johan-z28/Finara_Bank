package Prestamos;

import java.util.Scanner;

public class MainPrestamo {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        GestorPrestamos gestor = new GestorPrestamos();
        int opcion = 0;

        do {
            System.out.println("\n========================================");
            System.out.println("🏦 MÓDULO DE PRÉSTAMOS - FINARA BANK");
            System.out.println("========================================");
            System.out.println("1. Ver Lista de Préstamos Registrados");
            System.out.println("2. Simular y Solicitar Préstamo");
            System.out.println("3. Consultar Estado por Número de Radicado");
            System.out.println("4. Salir");
            System.out.print("Seleccione una opción: ");

            if (scanner.hasNextInt()) {
                opcion = scanner.nextInt();
                scanner.nextLine(); // Limpiar buffer
            } else {
                scanner.nextLine();
                continue;
            }

            switch (opcion) {
                case 1:
                    System.out.println("\n--- LISTA DE PRÉSTAMOS ---");
                    if (gestor.getPrestamos().isEmpty()) {
                        System.out.println("No hay préstamos registrados en este momento.");
                    } else {
                        for (Prestamos p : gestor.getPrestamos()) {
                            System.out.println("Radicado: " + p.getRadicado() + " | Concepto: " + p.getConcepto() + " | Monto: $" + p.getMonto() + " | Estado: " + p.getEstado() + " | Cuota: $" + p.getCuotaMensual());
                        }
                    }
                    break;

                case 2:
                    System.out.println("\n--- SIMULAR Y SOLICITAR PRÉSTAMO ---");
                    System.out.print("Tipo de crédito (libre / vehiculo / hipotecario): ");
                    String tipo = scanner.nextLine();
                    System.out.print("Monto a solicitar en COP (Ej. 5000000): ");
                    double monto = scanner.nextDouble();
                    System.out.print("Plazo en meses (ej. 6, 12, 24, 36): ");
                    int meses = scanner.nextInt();
                    scanner.nextLine();
                    System.out.print("Concepto o destino del crédito: ");
                    String concepto = scanner.nextLine();

                    String resultado = gestor.solicitarPrestamo(monto, meses, concepto, tipo);
                    System.out.println("\n" + resultado);
                    break;

                case 3:
                    System.out.println("\n--- CONSULTAR POR RADICADO ---");
                    System.out.print("Ingrese el número de radicado (Ej. PRES-202611-XXXX): ");
                    String rad = scanner.nextLine();
                    Prestamos encontrado = gestor.buscarPorRadicado(rad);
                    if (encontrado != null) {
                        System.out.println("\n📌 Encontrado:");
                        System.out.println("   - Radicado: " + encontrado.getRadicado());
                        System.out.println("   - Concepto: " + encontrado.getConcepto());
                        System.out.println("   - Monto: $" + encontrado.getMonto());
                        System.out.println("   - Plazo: " + encontrado.getMeses() + " meses");
                        System.out.println("   - Cuota Mensual: $" + encontrado.getCuotaMensual());
                        System.out.println("   - Estado: " + encontrado.getEstado());
                    } else {
                        System.out.println("❌ No se encontró ningún préstamo con el radicado: " + rad);
                    }
                    break;

                case 4:
                    System.out.println("Saliendo del módulo de préstamos...");
                    break;

                default:
                    System.out.println("Opción inválida. Intente de nuevo.");
            }
        } while (opcion != 4);

        scanner.close();
    }
}