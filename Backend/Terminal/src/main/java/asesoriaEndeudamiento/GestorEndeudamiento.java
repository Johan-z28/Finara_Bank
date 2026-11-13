package asesoriaEndeudamiento;

import java.util.ArrayList;
import java.util.List;

public class GestorEndeudamiento {
    private double ingresoMensual;
    private List<Obligacion> obligaciones;

    public GestorEndeudamiento() {
        this.ingresoMensual = 4500000.0;
        this.obligaciones = new ArrayList<>();
        inicializarDatosDemo();
    }

    private void inicializarDatosDemo() {
        obligaciones.add(new Obligacion("obl_1", "PRESTAMO", "Finara Bank (Libre Inversión)", 12500000, 385000, 24.0, 36, "FINARA", "PRES-101"));
        obligaciones.add(new Obligacion("obl_2", "TARJETA", "Finara Bank (Tarjeta Gold)", 2800000, 280000, 28.5, 10, "FINARA", "TC-4501"));
        obligaciones.add(new Obligacion("obl_3", "VEHICULO", "Financiera Vehicular", 18000000, 520000, 18.5, 48, "MANUAL", ""));
    }

    public double getIngresoMensual() { return ingresoMensual; }
    public void setIngresoMensual(double ingresoMensual) { this.ingresoMensual = Math.max(0, ingresoMensual); }
    public List<Obligacion> getObligaciones() { return obligaciones; }

    public Obligacion registrarObligacion(String tipo, String entidad, double saldo, double cuota, double tasaEA, int plazo) {
        String id = "obl_" + (obligaciones.size() + 1);
        Obligacion o = new Obligacion(id, tipo, entidad, saldo, cuota, tasaEA, plazo, "MANUAL", "");
        obligaciones.add(o);
        return o;
    }

    public boolean eliminarObligacion(String id) {
        return obligaciones.removeIf(o -> o.getId().equalsIgnoreCase(id) && !o.getOrigen().equalsIgnoreCase("FINARA"));
    }

    public double calcularDeudaTotal() {
        return obligaciones.stream().mapToDouble(Obligacion::getSaldoTotal).sum();
    }

    public double calcularCuotaTotal() {
        return obligaciones.stream().mapToDouble(Obligacion::getCuotaMensual).sum();
    }

    public double calcularNivelEndeudamiento() {
        if (ingresoMensual <= 0) return 0.0;
        return (calcularCuotaTotal() / ingresoMensual) * 100.0;
    }

    public String clasificarNivel(double pct) {
        if (pct <= 30.0) return "🟢 SALUDABLE (≤ 30%): Excelente salud financiera y margen de maniobra.";
        if (pct <= 40.0) return "🟡 PRECAUCIÓN (30% - 40%): Cerca del límite prudencial. Evitar nuevos pasivos.";
        if (pct <= 50.0) return "🔴 RIESGO ALTO (40% - 50%): Carga financiera pesada. Priorizar amortización.";
        return "⛔ CRÍTICO (> 50%): Sobreendeudamiento severo. Requiere consolidación urgente.";
    }

    public double calcularIngresoLibre() {
        return Math.max(0, ingresoMensual - calcularCuotaTotal());
    }

    public double calcularCostoInteresesMensual() {
        return obligaciones.stream().mapToDouble(Obligacion::calcularInteresMensual).sum();
    }

    public static class ResultadoSimulacion {
        public int meses;
        public double totalIntereses;
        public double ahorroIntereses;

        public ResultadoSimulacion(int meses, double totalIntereses, double ahorroIntereses) {
            this.meses = meses;
            this.totalIntereses = totalIntereses;
            this.ahorroIntereses = ahorroIntereses;
        }
    }

    public ResultadoSimulacion simularEstrategia(double abonoExtra, String modo) {
        ResultadoSimulacion base = simularMotor(0, "BASE");
        ResultadoSimulacion est = simularMotor(abonoExtra, modo);
        double ahorro = Math.max(0, base.totalIntereses - est.totalIntereses);
        return new ResultadoSimulacion(est.meses, est.totalIntereses, ahorro);
    }

    private ResultadoSimulacion simularMotor(double abonoExtra, String modo) {
        List<double[]> deudas = new ArrayList<>();
        for (Obligacion o : obligaciones) {
            if (o.getSaldoTotal() > 0) {
                double tasaM = Math.pow(1 + (o.getTasaEA() / 100.0), 1.0 / 12.0) - 1;
                deudas.add(new double[]{o.getSaldoTotal(), o.getCuotaMensual(), tasaM, o.getTasaEA()});
            }
        }

        int meses = 0;
        double intereses = 0;
        int maxMeses = 600;

        while (deudas.stream().anyMatch(d -> d[0] > 0.01) && meses < maxMeses) {
            meses++;

            if ("AVALANCHA".equalsIgnoreCase(modo)) {
                deudas.sort((a, b) -> Double.compare(b[3], a[3])); // mayor tasa primero
            } else if ("BOLA_NIEVE".equalsIgnoreCase(modo)) {
                deudas.sort((a, b) -> Double.compare(a[0], b[0])); // menor saldo primero
            }

            for (double[] d : deudas) {
                if (d[0] > 0) {
                    double intMes = d[0] * d[2];
                    intereses += intMes;
                    d[0] += intMes;
                }
            }

            double cuotasLiberadas = 0;
            for (double[] d : deudas) {
                if (d[0] > 0) {
                    double pago = Math.min(d[0], d[1]);
                    d[0] -= pago;
                    if (d[0] <= 0.01) {
                        d[0] = 0;
                        cuotasLiberadas += d[1];
                    }
                }
            }

            double extra = abonoExtra + cuotasLiberadas;
            for (double[] d : deudas) {
                if (d[0] > 0 && extra > 0) {
                    double pagoExt = Math.min(d[0], extra);
                    d[0] -= pagoExt;
                    extra -= pagoExt;
                }
            }
        }

        return new ResultadoSimulacion(meses, intereses, 0);
    }
}
