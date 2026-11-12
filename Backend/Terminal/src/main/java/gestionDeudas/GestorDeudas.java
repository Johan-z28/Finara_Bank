package gestionDeudas;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class GestorDeudas {
    private List<Suscripcion> suscripciones;
    private List<PagoPendiente> pagosPendientes;

    public GestorDeudas() {
        this.suscripciones = new ArrayList<>();
        this.pagosPendientes = new ArrayList<>();
        inicializarDatosDemo();
    }

    private void inicializarDatosDemo() {
        suscripciones.add(new Suscripcion("susc_1", "Netflix Premium", "Streaming", 45900, "MENSUAL"));
        suscripciones.add(new Suscripcion("susc_2", "Spotify Familiar", "Streaming", 29900, "MENSUAL"));
        suscripciones.add(new Suscripcion("susc_3", "Café de Especialidad", "Café y snacks", 15000, "SEMANAL"));
        suscripciones.add(new Suscripcion("susc_4", "Membresía SmartFit", "Membresía", 89900, "MENSUAL"));

        pagosPendientes.add(new PagoPendiente("pago_1", "Internet Fibra Óptica", "SERVICIO", 85000, "2026-11-20", "MANUAL", "CLARO-441"));
        pagosPendientes.add(new PagoPendiente("pago_2", "Cuota Préstamo Libre Inversión", "CUOTA", 320000, "2026-11-25", "PRESTAMO", "PRES-202611-1234"));
    }

    public List<Suscripcion> getSuscripciones() { return suscripciones; }
    public List<PagoPendiente> getPagosPendientes() { return pagosPendientes; }

    public Suscripcion registrarSuscripcion(String nombre, String categoria, double monto, String frecuencia) {
        String id = "susc_" + (suscripciones.size() + 1);
        Suscripcion nueva = new Suscripcion(id, nombre, categoria, monto, frecuencia);
        suscripciones.add(nueva);
        return nueva;
    }

    public boolean cambiarEstadoSuscripcion(String id, String nuevoEstado) {
        for (Suscripcion s : suscripciones) {
            if (s.getId().equalsIgnoreCase(id)) {
                s.setEstado(nuevoEstado);
                return true;
            }
        }
        return false;
    }

    public boolean eliminarSuscripcion(String id) {
        return suscripciones.removeIf(s -> s.getId().equalsIgnoreCase(id));
    }

    public PagoPendiente registrarPago(String nombre, String tipo, double monto, String fechaVencimiento, String origen, String referencia) {
        String id = "pago_" + (pagosPendientes.size() + 1);
        PagoPendiente nuevo = new PagoPendiente(id, nombre, tipo, monto, fechaVencimiento, origen, referencia);
        pagosPendientes.add(nuevo);
        return nuevo;
    }

    public boolean marcarPagoPagado(String id, boolean pagado) {
        for (PagoPendiente p : pagosPendientes) {
            if (p.getId().equalsIgnoreCase(id)) {
                p.setPagado(pagado);
                return true;
            }
        }
        return false;
    }

    public boolean eliminarPago(String id) {
        return pagosPendientes.removeIf(p -> p.getId().equalsIgnoreCase(id));
    }

    public double calcularGastoFijoMensual() {
        double costSuscripciones = suscripciones.stream()
                .filter(s -> "ACTIVA".equalsIgnoreCase(s.getEstado()))
                .mapToDouble(Suscripcion::calcularCostoMensual)
                .sum();

        double pagosNoRealizados = pagosPendientes.stream()
                .filter(p -> !p.isPagado())
                .mapToDouble(PagoPendiente::getMonto)
                .sum();

        return costSuscripciones + pagosNoRealizados;
    }

    public double calcularAhorroPotencialMensual() {
        return suscripciones.stream()
                .filter(s -> "PAUSADA".equalsIgnoreCase(s.getEstado()) || "CANCELADA".equalsIgnoreCase(s.getEstado()))
                .mapToDouble(Suscripcion::calcularCostoMensual)
                .sum();
    }

    public double calcularAhorroPotencialAnual() {
        return suscripciones.stream()
                .filter(s -> "PAUSADA".equalsIgnoreCase(s.getEstado()) || "CANCELADA".equalsIgnoreCase(s.getEstado()))
                .mapToDouble(Suscripcion::calcularCostoAnual)
                .sum();
    }
}
