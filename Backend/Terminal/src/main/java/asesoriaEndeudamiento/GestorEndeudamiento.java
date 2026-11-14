package asesoriaEndeudamiento;

import Prestamos.Prestamos;
import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Gestor integrado de Asesoría y Control de Endeudamiento.
 * Persiste estado por usuario en BaseDatosFinara y sincroniza préstamos activos y tarjetas Finara.
 */
public class GestorEndeudamiento {
    private final String correoUsuario;

    public GestorEndeudamiento() {
        this("cliente@finara.com");
    }

    public GestorEndeudamiento(String correoUsuario) {
        this.correoUsuario = BaseDatosFinara.normalizarCorreo(
                correoUsuario == null || correoUsuario.isEmpty() ? "cliente@finara.com" : correoUsuario
        );
    }

    public void sincronizarObligacionesFinara() {
        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        List<Obligacion> lista = db.getObligacionesUsuario(correoUsuario);

        // Remover obligaciones FINARA previas para regenerarlas fielmente según el estado vivo
        lista.removeIf(o -> "FINARA".equalsIgnoreCase(o.getOrigen()));

        // 1. Préstamos Finara activos
        for (Prestamos p : db.getPrestamosUsuario(correoUsuario)) {
            if ("APROBADO".equalsIgnoreCase(p.getEstado()) && p.isActivo()) {
                double saldoRestante = p.getSaldoPendienteEstimado();
                if (saldoRestante > 0) {
                    int mesesRestantes = Math.max(1, p.getMeses() - p.getCuotasPagadas());
                    double tasaMensual = "vehiculo".equalsIgnoreCase(p.getTipoId()) ? 0.0138
                            : ("hipotecario".equalsIgnoreCase(p.getTipoId()) ? 0.0110 : 0.018);
                    double tasaEA = (Math.pow(1 + tasaMensual, 12) - 1) * 100.0;
                    lista.add(new Obligacion(
                            "OBL-PRE-" + p.getRadicado(),
                            "PRESTAMO",
                            "Finara Bank - " + p.getConcepto(),
                            saldoRestante,
                            p.getCuotaMensual(),
                            Math.round(tasaEA * 10.0) / 10.0,
                            mesesRestantes,
                            "FINARA",
                            p.getRadicado()
                    ));
                }
            }
        }

        // 2. Tarjetas de Crédito Finara con deuda > 0
        for (Map<String, String> c : db.getRepositorioCuentas().obtenerCuentasCredito(correoUsuario)) {
            double deuda = RepositorioCuentas.parsearNumero(c.get("deudaActual"));
            if (deuda > 0) {
                double cuotaSug = Math.min(deuda, Math.max(50000.0, deuda * 0.05));
                lista.add(new Obligacion(
                        "OBL-TC-" + Consola.limpiarNumeroCuenta(c.get("numero")),
                        "TARJETA",
                        "Tarjeta Crédito Finara " + Consola.enmascararCuenta(c.get("numero")),
                        deuda,
                        cuotaSug,
                        28.0,
                        12,
                        "FINARA",
                        c.get("numero")
                ));
            }
        }
    }

    public double getIngresoMensual() {
        return BaseDatosFinara.getInstancia().getIngresoEndeudamiento(correoUsuario);
    }

    public void setIngresoMensual(double ingreso) {
        if (ingreso >= 0) {
            BaseDatosFinara.getInstancia().setIngresoEndeudamiento(correoUsuario, ingreso);
            BaseDatosFinara.guardar();
        }
    }

    public List<Obligacion> getObligaciones() {
        sincronizarObligacionesFinara();
        return BaseDatosFinara.getInstancia().getObligacionesUsuario(correoUsuario);
    }

    public void agregarObligacion(Obligacion ob) {
        if (ob != null) {
            BaseDatosFinara.getInstancia().getObligacionesUsuario(correoUsuario).add(ob);
            BaseDatosFinara.guardar();
        }
    }

    public boolean eliminarObligacion(String id) {
        List<Obligacion> obligaciones = BaseDatosFinara.getInstancia().getObligacionesUsuario(correoUsuario);
        for (int i = 0; i < obligaciones.size(); i++) {
            Obligacion o = obligaciones.get(i);
            if (o.getId().equals(id)) {
                if ("FINARA".equalsIgnoreCase(o.getOrigen())) {
                    return false; // Protegido: obligación real Finara
                }
                obligaciones.remove(i);
                BaseDatosFinara.guardar();
                return true;
            }
        }
        return false;
    }

    public double calcularDeudaTotal() {
        double suma = 0;
        for (Obligacion o : getObligaciones()) {
            suma += o.getSaldoTotal();
        }
        return suma;
    }

    public double calcularCuotaMensualTotal() {
        double suma = 0;
        for (Obligacion o : getObligaciones()) {
            suma += o.getCuotaMensual();
        }
        return suma;
    }

    public double calcularPorcentajeEndeudamiento() {
        double ingresoMensual = getIngresoMensual();
        if (ingresoMensual <= 0) return 0;
        return (calcularCuotaMensualTotal() / ingresoMensual) * 100.0;
    }

    public double calcularCapacidadDisponible() {
        double maxRecomendado = getIngresoMensual() * 0.30;
        return Math.max(0, maxRecomendado - calcularCuotaMensualTotal());
    }

    public String clasificarNivelRiesgo(double porcentaje) {
        if (porcentaje <= 30) return "SALUDABLE (Nivel optimo <= 30%)";
        if (porcentaje <= 40) return "PRECAUCION (Zona intermedia 31% - 40%)";
        if (porcentaje <= 50) return "RIESGO ALTO (Carga pesada 41% - 50%)";
        return "CRITICO (Sobreendeudamiento > 50%)";
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
        for (Obligacion o : getObligaciones()) {
            if (o.getSaldoTotal() > 0) {
                double tasaM = Math.pow(1 + (o.getTasaEA() / 100.0), 1.0 / 12.0) - 1;
                deudas.add(new double[]{o.getSaldoTotal(), Math.max(1.0, o.getCuotaMensual()), tasaM, o.getTasaEA()});
            }
        }

        int meses = 0;
        double intereses = 0;
        int maxMeses = 600;

        while (deudas.stream().anyMatch(d -> d[0] > 0.01) && meses < maxMeses) {
            meses++;

            if ("AVALANCHA".equalsIgnoreCase(modo)) {
                deudas.sort((a, b) -> Double.compare(b[3], a[3]));
            } else if ("BOLA_NIEVE".equalsIgnoreCase(modo)) {
                deudas.sort((a, b) -> Double.compare(a[0], b[0]));
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
