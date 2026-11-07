// Vanilla/SaludFinanciera.js
// Controlador para HU-17: Asesoría financiera personalizada (Paso 1: Captura de encuesta)

import { initGlobalComponents } from './Global/app.js';

document.addEventListener('DOMContentLoaded', () => {
    initGlobalComponents();

    const formEncuestaSalud = document.getElementById('formEncuestaSalud');

    if (formEncuestaSalud) {
        formEncuestaSalud.addEventListener('submit', (e) => {
            e.preventDefault();

            // 1. Capturar los valores ingresados en el formulario
            const ingresosMensuales = Number(document.getElementById('ingresosMensuales').value) || 0;
            const gastosMensuales = Number(document.getElementById('gastosMensuales').value) || 0;
            const deudaTotal = Number(document.getElementById('deudaTotal').value) || 0;
            const ahorroActual = Number(document.getElementById('ahorroActual').value) || 0;
            const metaPrincipal = document.getElementById('metaPrincipal').value;

            // 2. Validación básica de coherencia financiera
            if (gastosMensuales > ingresosMensuales * 1.5) {
                console.warn('Advertencia: Los gastos superan considerablemente los ingresos.');
            }

            // 3. Consolidar el objeto de la encuesta del usuario
            const datosEncuesta = {
                ingresosMensuales,
                gastosMensuales,
                deudaTotal,
                ahorroActual,
                metaPrincipal,
                fechaEvaluacion: new Date().toISOString()
            };

            // 4. Guardar temporalmente en localStorage (preparando el terreno para el motor de reglas)
            localStorage.setItem('finara_ultima_encuesta', JSON.stringify(datosEncuesta));

            // Feedback visual temporal antes de pasar al cálculo
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: '¡Encuesta registrada!',
                    text: 'Tus datos han sido guardados con éxito. Procediendo al análisis...',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1e293b',
                    color: '#f8fafc'
                }).then(() => {
                    // Aquí posteriormente redirigiremos al informe visual o calcularemos el score
                    console.log('Datos listos para el motor de reglas:', datosEncuesta);
                });
            } else {
                alert('¡Encuesta registrada con éxito!');
            }
        });
    }
});