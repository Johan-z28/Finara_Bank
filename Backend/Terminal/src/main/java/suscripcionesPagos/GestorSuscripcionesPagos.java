package suscripcionesPagos;

import Prestamos.Prestamos;
import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Gestor de lógica de negocio para Suscripciones, Gastos Hormiga y Pagos Pendientes (HU-22).
 * Persiste por usuario en BaseDatosFinara y proyecta cuotas de préstamos y tarjetas Finara.
 */
public class GestorSuscripcionesPagos {
    private static final AtomicInteger secuencia = new AtomicInteger(1);

    public static class AhorroPotencial {
        private long mensual;
        private long anual;
        private double acumulado;

        public AhorroPotencial(long mensual, long anual, double acumulado) {
            this.mensual = mensual;
            this.anual = anual;
            this.acumulado = acumulado;
        }

        public long getMensual() { return mensual; }
        public long getAnual() { return anual; }
        public double getAcumulado() { return acumulado; }
    }

    public Suscripcion crearSuscripcion(String username, String nombre, String categoria,
                                         double monto, String frecuencia) {
        String user = normalizarUsuario(username);
        String id = "SUS-" + System.currentTimeMillis() + "-" + secuencia.getAndIncrement();
        Suscripcion s = new Suscripcion(id, user, nombre, categoria, monto, frecuencia);
        BaseDatosFinara.getInstancia().getSuscripcionesUsuario(user).add(0, s);
        return s;
    }

    public List<Suscripcion> obtenerSuscripciones(String username) {
        return new ArrayList<>(BaseDatosFinara.getInstancia().getSuscripcionesUsuario(normalizarUsuario(username)));
    }

    public Suscripcion cambiarEstadoSuscripcion(String username, String id, String nuevoEstado) {
        String user = normalizarUsuario(username);
        for (Suscripcion s : BaseDatosFinara.getInstancia().getSuscripcionesUsuario(user)) {
            if (s.getId().equals(id)) {
                s.setEstado(nuevoEstado);
                if ("PAUSADA".equals(s.getEstado()) || "CANCELADA".equals(s.getEstado())) {
                    s.setAhorroAcumulado(s.getAhorroAcumulado() + s.calcularCostoMensual());
                }
                return s;
            }
        }
        throw new IllegalArgumentException("Suscripción no encontrada: " + id);
    }

    public boolean eliminarSuscripcion(String username, String id) {
        return BaseDatosFinara.getInstancia().getSuscripcionesUsuario(normalizarUsuario(username))
                .removeIf(s -> s.getId().equals(id));
    }

    public PagoPendiente crearPagoPendiente(String username, String nombre, String tipo,
                                            double monto, LocalDate fechaVencimiento) {
        String user = normalizarUsuario(username);
        String id = "PAG-" + System.currentTimeMillis() + "-" + secuencia.getAndIncrement();
        PagoPendiente p = new PagoPendiente(id, user, nombre, tipo, monto, fechaVencimiento);
        BaseDatosFinara.getInstancia().getPagosUsuario(user).add(0, p);
        return p;
    }

    /**
     * Proyecta automáticamente cuotas próximas de préstamos activos y deuda de tarjetas Finara
     * sin duplicar registros existentes.
     */
    public void sincronizarPagosFinara(String username) {
        String user = normalizarUsuario(username);
        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        List<PagoPendiente> lista = db.getPagosUsuario(user);

        // Quitar proyecciones automáticas previas no pagadas para reflejar saldos actualizados
        lista.removeIf(p -> !p.isPagado() && (p.getId().startsWith("AUTO-PRE-") || p.getId().startsWith("AUTO-TC-")));

        // 1. Préstamos activos
        for (Prestamos pr : db.getPrestamosUsuario(user)) {
            if ("APROBADO".equalsIgnoreCase(pr.getEstado()) && pr.isActivo()) {
                LocalDate fechaVenc = pr.getFechaProximaCuota() != null ? pr.getFechaProximaCuota() : LocalDate.now().plusMonths(1);
                String idAuto = "AUTO-PRE-" + pr.getRadicado();
                String nombre = "Cuota #" + (pr.getCuotasPagadas() + 1) + "/" + pr.getMeses() + " Préstamo " + pr.getRadicado();
                lista.add(new PagoPendiente(idAuto, user, nombre, "CUOTA", pr.getCuotaMensual(), fechaVenc));
            }
        }

        // 2. Tarjetas de crédito con deuda actual > 0
        for (Map<String, String> c : db.getRepositorioCuentas().obtenerCuentasCredito(user)) {
            double deuda = RepositorioCuentas.parsearNumero(c.get("deudaActual"));
            if (deuda > 0) {
                String num = Consola.limpiarNumeroCuenta(c.get("numero"));
                String idAuto = "AUTO-TC-" + num;
                double pagoMin = Math.min(deuda, Math.max(50000.0, deuda * 0.10));
                lista.add(new PagoPendiente(idAuto, user,
                        "Pago Mínimo Tarjeta " + Consola.enmascararCuenta(num),
                        "TARJETA", pagoMin, LocalDate.now().plusDays(5)));
            }
        }
    }

    public List<PagoPendiente> obtenerPagosPendientes(String username) {
        String user = normalizarUsuario(username);
        sincronizarPagosFinara(user);
        return new ArrayList<>(BaseDatosFinara.getInstancia().getPagosUsuario(user));
    }

    public List<PagoPendiente> obtenerPagosProximosOVencidos(String username) {
        List<PagoPendiente> alertas = new ArrayList<>();
        for (PagoPendiente p : obtenerPagosPendientes(username)) {
            String estado = p.getEstadoPago();
            if ("VENCIDO".equals(estado) || "PROXIMO".equals(estado)) {
                alertas.add(p);
            }
        }
        return alertas;
    }

    public PagoPendiente marcarPagoComoPagado(String username, String id) {
        String user = normalizarUsuario(username);
        for (PagoPendiente p : BaseDatosFinara.getInstancia().getPagosUsuario(user)) {
            if (p.getId().equals(id)) {
                p.marcarComoPagado();
                return p;
            }
        }
        throw new IllegalArgumentException("Pago pendiente no encontrado: " + id);
    }

    public boolean eliminarPagoPendiente(String username, String id) {
        return BaseDatosFinara.getInstancia().getPagosUsuario(normalizarUsuario(username))
                .removeIf(p -> p.getId().equals(id));
    }

    public AhorroPotencial calcularAhorroPotencial(String username) {
        List<Suscripcion> lista = obtenerSuscripciones(username);
        long mensual = 0;
        long anual = 0;
        double acumulado = 0;

        for (Suscripcion s : lista) {
            String estado = s.getEstado();
            if ("PAUSADA".equals(estado) || "CANCELADA".equals(estado)) {
                mensual += s.calcularCostoMensual();
                anual += s.calcularCostoAnual();
            }
            acumulado += s.getAhorroAcumulado();
        }
        return new AhorroPotencial(mensual, anual, acumulado);
    }

    public long calcularGastoSuscripcionesActivasMensual(String username) {
        long total = 0;
        for (Suscripcion s : obtenerSuscripciones(username)) {
            if ("ACTIVA".equals(s.getEstado())) {
                total += s.calcularCostoMensual();
            }
        }
        return total;
    }

    public double calcularTotalPagosPorPagar(String username) {
        double total = 0;
        for (PagoPendiente p : obtenerPagosPendientes(username)) {
            if (!p.isPagado()) {
                total += p.getMonto();
            }
        }
        return total;
    }

    public double calcularGastoFijoMensual(String username) {
        return calcularGastoSuscripcionesActivasMensual(username) + calcularTotalPagosPorPagar(username);
    }

    public int contarAlertasVencimiento(String username) {
        int alertas = 0;
        for (PagoPendiente p : obtenerPagosPendientes(username)) {
            String estado = p.getEstadoPago();
            if ("VENCIDO".equals(estado) || "PROXIMO".equals(estado)) {
                alertas++;
            }
        }
        return alertas;
    }

    private String normalizarUsuario(String username) {
        return (username == null || username.trim().isEmpty()) ? "juan" : username.trim().toLowerCase();
    }
}
