package AsesoriaFinanciera;

import java.util.Scanner;

public class MainSaludFinanciera {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        GestorSaludFinanciera gestor = new GestorSaludFinanciera();
        int opcion = 0;

        do {
            System.out.println("\n==================================================");
            System.out.println("🤖 MÓDULO DE ASESORÍA Y SALUD FINANCIERA - FINARA BANK");
            System.out.println("==================================================");
            System.out.println("1. Realizar Evaluación de Salud Financiera");
            System.out.println("2. Ver Historial de Evaluaciones");
            System.out.println("3. Salir");
            System.out.print("Seleccione una opción: ");

            if (scanner.hasNextInt()) {
                opcion = scanner.nextInt();
                scanner.nextLine();
            } else {
                scanner.nextLine();
                continue;
            }

            switch (opcion) {
                case 1:
                    System.out.println("\n--- NUEVA EVALUACIÓN DE SALUD FINANCIERA ---");
                    System.out.print("Ingresos mensuales totales (COP): ");
                    double ingresos = scanner.nextDouble();
                    System.out.print("Gastos fijos mensuales (COP): ");
                    double gastos = scanner.nextDouble();
                    System.out.print("Monto total de deudas activas (COP): ");
                    double deudas = scanner.nextDouble();
                    System.out.print("Ahorro actual / fondo de emergencia (COP): ");
                    double ahorros = scanner.nextDouble();
                    scanner.nextLine();
                    System.out.print("Meta principal (ahorro, deudas, inversion, control): ");
                    String meta = scanner.nextLine();

                    EvaluacionFinanciera resultado = gestor.evaluarSaludFinanciera(ingresos, gastos, deudas, ahorros, meta);

                    System.out.println("\n========================================");
                    System.out.println("📊 REPORTE DE SALUD FINANCIERA GENERADO");
                    System.out.println("========================================");
                    System.out.println("ID Evaluación: " + resultado.getIdEvaluacion());
                    System.out.println("Score: " + resultado.getScore() + " / 100");
                    System.out.println("Nivel: " + resultado.getNivelSalud());
                    System.out.println("\n💪 Puntos Fuertes:");
                    for (String pf : resultado.getPuntosFuertes()) {
                        System.out.println(" - " + pf);
                    }
                    System.out.println("\n⚠️ Oportunidades de Mejora:");
                    for (String om : resultado.getOportunidadesMejora()) {
                        System.out.println(" - " + om);
                    }
                    System.out.println("\n💡 Recomendaciones Personalizadas:");
                    for (String rec : resultado.getRecomendaciones()) {
                        System.out.println(" - " + rec);
                    }
                    break;

                case 2:
                    System.out.println("\n--- HISTORIAL DE EVALUACIONES ---");
                    if (gestor.getHistorialEvaluaciones().isEmpty()) {
                        System.out.println("No hay evaluaciones registradas en este momento.");
                    } else {
                        for (EvaluacionFinanciera ev : gestor.getHistorialEvaluaciones()) {
                            System.out.println("ID: " + ev.getIdEvaluacion() + " | Fecha: " + ev.getFechaEvaluacion() + " | Score: " + ev.getScore() + " (" + ev.getNivelSalud() + ")");
                        }
                    }
                    break;

                case 3:
                    System.out.println("Saliendo del módulo de asesoría financiera...");
                    break;

                default:
                    System.out.println("Opción inválida. Intente de nuevo.");
            }
        } while (opcion != 3);

        scanner.close();
    }
}