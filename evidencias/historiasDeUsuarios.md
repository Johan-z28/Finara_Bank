# 📋 Historias de Usuario - Finara Bank

Bienvenido al repositorio de gestión de requerimientos y especificaciones ágiles para **Finara Bank**. A continuación se detalla el conjunto completo de Historias de Usuario (HU-01 a la HU-40) divididas por módulos funcionales del sistema.

---

## 🔐 1. Módulo de Autenticación y Gestión de Clientes

### **HU-01 · Registro de cliente**
* **Como**: Cliente del banco.
* **Quiero**: Registrarme en la plataforma Finara proporcionando mis datos personales y de contacto.
* **Para**: Crear una cuenta de usuario y acceder a los servicios bancarios en línea.
* **Criterios de aceptación:**
    1. El sistema debe solicitar nombre, apellido, documento de identidad, correo electrónico, teléfono y fecha de nacimiento.
    2. El documento de identidad debe ser único y no permitir registros duplicados.
    3. El correo electrónico debe tener un formato válido.
    4. El sistema debe validar que los campos obligatorios estén completos.
    5. Al finalizar el registro, el sistema debe confirmar que la cuenta fue creada correctamente.

### **HU-02 · Inicio de sesión**
* **Como**: Cliente de Finara.
* **Quiero**: Iniciar sesión utilizando mis credenciales.
* **Para**: Acceder de manera segura a mis productos y servicios bancarios.
* **Criterios de aceptación:**
    1. El sistema debe solicitar correo electrónico o número de documento y contraseña.
    2. Las credenciales deben ser verificadas antes de permitir el acceso.
    3. Si las credenciales son incorrectas, el sistema debe mostrar un mensaje de error.
    4. Después de varios intentos fallidos, la cuenta debe aplicar una medida de seguridad.
    5. Una vez autenticado, el cliente debe acceder a su panel principal.

### **HU-03 · Recuperación de contraseña**
* **Como**: Cliente de Finara.
* **Quiero**: Recuperar mi contraseña cuando la haya olvidado.
* **Para**: Volver a acceder a mi cuenta sin tener que crear un usuario nuevo.
* **Criterios de aceptación:**
    1. El sistema debe ofrecer una opción de "¿Olvidaste tu contraseña?".
    2. El cliente debe proporcionar un dato previamente registrado para iniciar la recuperación.
    3. El sistema debe enviar un mecanismo de verificación al medio de contacto registrado.
    4. La nueva contraseña debe cumplir los requisitos mínimos de seguridad.
    5. El sistema debe confirmar cuando la contraseña haya sido actualizada.

### **HU-18 · Actualización de datos personales**
* **Como**: Cliente de Finara.
* **Quiero**: Actualizar mis datos personales y de contacto.
* **Para**: Mantener mi información actualizada en el banco.
* **Criterios de aceptación:**
    1. El cliente debe poder consultar sus datos personales registrados.
    2. El sistema debe permitir modificar los datos que sean actualizables.
    3. Los nuevos datos deben cumplir las validaciones correspondientes.
    4. El sistema debe solicitar una confirmación antes de guardar los cambios.
    5. Después de guardar, debe mostrarse la información actualizada.

### **HU-20 · Cerrar sesión**
* **Como**: Cliente de Finara.
* **Quiero**: Cerrar mi sesión cuando termine de utilizar la plataforma.
* **Para**: Evitar que otra persona pueda acceder a mi información bancaria desde el dispositivo.
* **Criterios de aceptación:**
    1. El sistema debe mostrar una opción para cerrar sesión.
    2. Al seleccionarla, la sesión debe finalizar.
    3. El cliente debe ser redirigido a la pantalla de inicio de sesión.
    4. Las páginas privadas no deben quedar disponibles después de cerrar sesión.
    5. Para volver a acceder a la información bancaria, el cliente debe autenticarse nuevamente.

---

## 💳 2. Módulo de Cuentas y Transacciones

### **HU-04 · Consulta de saldo**
* **Como**: Cliente de Finara.
* **Quiero**: Consultar el saldo disponible de mis cuentas.
* **Para**: Conocer cuánto dinero tengo disponible en cada producto bancario.
* **Criterios de aceptación:**
    1. El sistema debe mostrar las cuentas asociadas al cliente.
    2. Cada cuenta debe mostrar su saldo disponible.
    3. El sistema debe identificar claramente el tipo y número de cuenta.
    4. La información mostrada debe corresponder al saldo registrado actualmente.
    5. Los datos financieros solo deben estar disponibles para el cliente autenticado.

### **HU-05 · Consulta de movimientos**
* **Como**: Cliente de Finara.
* **Quiero**: Consultar los movimientos realizados en mi cuenta.
* **Para**: Conocer los ingresos, retiros, pagos y transferencias efectuados.
* **Criterios de aceptación:**
    1. El sistema debe mostrar una lista de movimientos de la cuenta seleccionada.
    2. Cada movimiento debe mostrar fecha, descripción, tipo y valor.
    3. Los ingresos y egresos deben diferenciarse claramente.
    4. El sistema debe permitir consultar movimientos de diferentes periodos.
    5. Los movimientos deben mostrarse ordenados por fecha.

### **HU-06 · Transferencia entre cuentas Finara**
* **Como**: Cliente de Finara.
* **Quiero**: Transferir dinero a otra cuenta del mismo banco.
* **Para**: Enviar dinero de manera rápida a otro cliente de Finara.
* **Criterios de aceptación:**
    1. El sistema debe solicitar la cuenta de destino y el valor de la transferencia.
    2. El sistema debe validar que exista saldo suficiente.
    3. El sistema debe verificar los datos de la cuenta de destino antes de confirmar la operación.
    4. Antes de realizar la transferencia, debe mostrarse un resumen para su confirmación.
    5. Después de realizarla, el sistema debe registrar el movimiento.

### **HU-07 · Transferencia a otro banco**
* **Como**: Cliente de Finara.
* **Quiero**: Realizar transferencias hacia cuentas de otras entidades bancarias.
* **Para**: Enviar dinero a personas o empresas que utilizan otros bancos.
* **Criterios de aceptación:**
    1. El sistema debe solicitar banco, tipo de cuenta, número de cuenta y beneficiario.
    2. El sistema debe validar los datos necesarios para realizar la transferencia.
    3. El sistema debe verificar la disponibilidad de fondos.
    4. El sistema debe mostrar cualquier costo asociado antes de confirmar la operación.
    5. El sistema debe generar una confirmación de la transferencia.

### **HU-08 · Registrar beneficiario**
* **Como**: Cliente de Finara.
* **Quiero**: Registrar beneficiarios frecuentes.
* **Para**: Facilitar futuras transferencias sin tener que ingresar nuevamente todos sus datos.
* **Criterios de aceptación:**
    1. El cliente debe poder agregar un nuevo beneficiario.
    2. El sistema debe solicitar los datos necesarios del beneficiario.
    3. El sistema debe validar la información proporcionada.
    4. El beneficiario debe quedar asociado únicamente a la cuenta del cliente autenticado.
    5. El cliente debe poder consultar sus beneficiarios registrados.

### **HU-09 · Eliminar beneficiario**
* **Como**: Cliente de Finara.
* **Quiero**: Eliminar un beneficiario registrado.
* **Para**: Mantener actualizada y segura mi lista de destinatarios.
* **Criterios de aceptación:**
    1. El sistema debe mostrar los beneficiarios registrados.
    2. El cliente debe poder seleccionar el beneficiario que desea eliminar.
    3. El sistema debe solicitar confirmación antes de eliminarlo.
    4. Una vez confirmado, el beneficiario no debe aparecer en la lista.
    5. La eliminación debe quedar registrada en el sistema.

### **HU-10 · Pago de servicios**
* **Como**: Cliente de Finara.
* **Quiero**: Pagar mis servicios públicos y facturas desde la plataforma.
* **Para**: Realizar mis pagos sin tener que acudir presencialmente a una oficina.
* **Criterios de aceptación:**
    1. El sistema debe permitir seleccionar el servicio que se desea pagar.
    2. El cliente debe ingresar o seleccionar la referencia de pago.
    3. El sistema debe mostrar el valor antes de realizar la operación.
    4. El sistema debe verificar que exista saldo suficiente.
    5. Después del pago, debe generarse una confirmación de la transacción.

### **HU-17 · Notificaciones bancarias**
* **Como**: Cliente de Finara.
* **Quiero**: Recibir notificaciones sobre las operaciones realizadas en mis cuentas.
* **Para**: Mantendré informado sobre la actividad de mis productos bancarios.
* **Criterios de aceptación:**
    1. El sistema debe generar una notificación después de determinadas operaciones.
    2. La notificación debe indicar el tipo de operación realizada.
    3. Debe incluir la fecha y el valor de la operación cuando corresponda.
    4. Las notificaciones deben estar disponibles dentro de la plataforma.
    5. El cliente debe poder consultar las notificaciones anteriores.

### **HU-19 · Descargar extracto**
* **Como**: Cliente de Finara.
* **Quiero**: Descargar el extracto de mi cuenta.
* **Para**: Conservar un documento con el resumen de mis movimientos bancarios.
* **Criterios de aceptación:**
    1. El cliente debe poder seleccionar la cuenta.
    2. Debe poder seleccionar el periodo del extracto.
    3. El sistema debe generar el documento con los movimientos correspondientes.
    4. El extracto debe incluir los datos básicos de la cuenta y sus movimientos.
    5. El cliente debe poder descargar el documento.

---

## 🏛️ 3. Módulo de Tarjetas y Préstamos

### **HU-11 · Solicitud de tarjeta**
* **Como**: Cliente de Finara.
* **Quiero**: Solicitar una tarjeta débito o crédito desde la plataforma.
* **Para**: Acceder a un medio de pago asociado a mis productos bancarios.
* **Criterios de aceptación:**
    1. El sistema debe mostrar las tarjetas disponibles para solicitar.
    2. El cliente debe seleccionar el tipo de tarjeta.
    3. El sistema debe solicitar la información necesaria para procesar la solicitud.
    4. El sistema debe informar el estado de la solicitud.
    5. El cliente debe poder consultar posteriormente el estado de su solicitud.

### **HU-12 · Bloqueo de tarjeta**
* **Como**: Cliente de Finara.
* **Quiero**: Bloquear temporalmente mi tarjeta.
* **Para**: Proteger mi dinero cuando haya perdido la tarjeta o sospeche de un uso no autorizado.
* **Criterios de aceptación:**
    1. El cliente debe poder seleccionar la tarjeta que desea bloquear.
    2. El sistema debe solicitar confirmación de la acción.
    3. Una vez bloqueada, la tarjeta no debe permitir nuevas operaciones autorizadas por el sistema.
    4. El sistema debe mostrar el estado actualizado de la tarjeta.
    5. El cliente debe recibir una confirmación del bloqueo.

### **HU-13 · Historial de tarjetas**
* **Como**: Cliente de Finara.
* **Quiero**: Consultar las tarjetas asociadas a mi perfil.
* **Para**: Conocer cuáles tarjetas tengo activas, bloqueadas o canceladas.
* **Criterios de aceptación:**
    1. El sistema debe mostrar las tarjetas asociadas al cliente.
    2. Cada tarjeta debe mostrar su estado.
    3. El sistema debe identificar la tarjeta sin exponer información sensible completa.
    4. El cliente debe poder consultar información básica de cada tarjeta.
    5. Las tarjetas canceladas deben identificarse como inactivas.

### **HU-14 · Solicitud de préstamo**
* **Como**: Cliente de Finara.
* **Quiero**: Solicitar un préstamo desde la plataforma.
* **Para**: Acceder a una opción de financiación sin acudir inicialmente a una oficina física.
* **Criterios de aceptación:**
    1. El sistema debe mostrar los tipos de préstamos disponibles.
    2. El cliente debe ingresar el monto solicitado y el plazo.
    3. El sistema debe mostrar las condiciones aplicables antes de enviar la solicitud.
    4. El sistema debe registrar la solicitud.
    5. El cliente debe poder consultar el estado de su solicitud.

### **HU-15 · Consulta de préstamo**
* **Como**: Cliente de Finara.
* **Quiero**: Consultar la información de mis préstamos activos.
* **Para**: Conocer el saldo pendiente, cuotas y fechas de pago.
* **Criterios de aceptación:**
    1. El sistema debe mostrar los préstamos asociados al cliente.
    2. Cada préstamo debe mostrar su saldo pendiente.
    3. Debe mostrarse el valor y fecha de la próxima cuota.
    4. El cliente debe poder consultar el historial de pagos.
    5. La información debe actualizarse después de registrar un nuevo pago.

### **HU-16 · Pago de cuota**
* **Como**: Cliente de Finara.
* **Quiero**: Pagar las cuotas de mis préstamos desde la plataforma.
* **Para**: Mantener mis obligaciones financieras al día.
* **Criterios de aceptación:**
    1. El sistema debe mostrar las cuotas pendientes.
    2. El cliente debe seleccionar la cuota que desea pagar.
    3. El sistema debe verificar que exista saldo suficiente.
    4. Antes de confirmar, debe mostrar el valor total a pagar.
    5. El sistema debe registrar el pago y actualizar el estado de la cuota.

---

## 📈 4. Módulo de Asesoría Financiera y Educación

### **HU-21 · Asesoría financiera personalizada**
* **Como**: Cliente de Finara.
* **Quiero**: Recibir una asesoría financiera basada en mi situación económica, ingresos, gastos, ahorros y objetivos.
* **Para**: Tomar decisiones financieras más informadas y organizar mejor mi dinero.
* **Criterios de aceptación:**
    1. El sistema debe permitir registrar información básica sobre los ingresos y gastos del cliente.
    2. El sistema debe identificar las principales necesidades financieras indicadas por el cliente.
    3. La plataforma debe presentar recomendaciones relacionadas con la información proporcionada.
    4. Las recomendaciones deben poder consultarse posteriormente.
    5. El sistema debe permitir actualizar la información financiera cuando cambie la situación del cliente.

### **HU-22 · Diagnóstico de salud financiera**
* **Como**: Cliente de Finara.
* **Quiero**: Realizar un diagnóstico de mi situación financiera.
* **Para**: Conocer cómo estoy administrando mis ingresos, gastos, ahorros y obligaciones.
* **Criterios de aceptación:**
    1. El sistema debe solicitar información relacionada con ingresos, gastos, deudas y ahorros.
    2. El sistema debe analizar la información proporcionada.
    3. La plataforma debe presentar un resumen de la situación financiera del cliente.
    4. El sistema debe identificar aspectos que el cliente puede revisar o mejorar.
    5. El diagnóstico debe poder actualizarse cuando se modifiquen los datos financieros.

### **HU-23 · Elaboración de presupuesto**
* **Como**: Cliente de Finara.
* **Quiero**: Crear un presupuesto mensual con mis ingresos y gastos.
* **Para**: Organizar mi dinero y controlar cuánto puedo destinar a cada categoría.
* **Criterios de aceptación:**
    1. El cliente debe poder registrar sus ingresos mensuales.
    2. El cliente debe poder registrar gastos por diferentes categorías.
    3. El sistema debe calcular automáticamente el total de ingresos y gastos.
    4. El sistema debe mostrar el dinero restante después de descontar los gastos.
    5. El sistema debe permitir modificar las categorías y valores registrados.

### **HU-24 · Asesoría para ahorro**
* **Como**: Cliente de Finara.
* **Quiero**: Recibir recomendaciones para mejorar mi capacidad de ahorro.
* **Para**: Alcanzar mis objetivos financieros de manera organizada.
* **Criterios de aceptación:**
    1. El sistema debe permitir establecer un objetivo de ahorro.
    2. El cliente debe indicar el valor que desea alcanzar.
    3. El sistema debe permitir establecer un plazo para alcanzar el objetivo.
    4. La plataforma debe calcular una cantidad de ahorro orientativa de acuerdo con los datos registrados.
    5. El cliente debe poder consultar el progreso hacia su objetivo.

### **HU-25 · Fondo de emergencia**
* **Como**: Cliente de Finara.
* **Quiero**: Recibir orientación para crear un fondo de emergencia.
* **Para**: Prepararme financieramente para gastos inesperados.
* **Criterios de aceptación:**
    1. El sistema debe permitir registrar los gastos básicos del cliente.
    2. La plataforma debe utilizar esta información para presentar una referencia de ahorro para emergencias.
    3. El cliente debe poder establecer una meta para su fondo.
    4. El sistema debe mostrar el progreso hacia la meta.
    5. La información debe poder actualizarse cuando cambien los gastos del cliente.

### **HU-26 · Asesoría sobre endeudamiento**
* **Como**: Cliente de Finara.
* **Quiero**: Consultar una orientación sobre mi nivel de endeudamiento.
* **Para**: Comprender cómo mis obligaciones actuales afectan mi presupuesto.
* **Criterios de aceptación:**
    1. El sistema debe permitir registrar las obligaciones financieras del cliente.
    2. Cada obligación debe incluir información como saldo, cuota y fecha de pago.
    3. El sistema debe calcular el total de las obligaciones registradas.
    4. La plataforma debe mostrar un resumen de las deudas del cliente.
    5. El sistema debe proporcionar información orientativa para facilitar la planificación de los pagos.

### **HU-27 · Comparación de opciones de crédito**
* **Como**: Cliente de Finara.
* **Quiero**: Comparar diferentes alternativas de crédito disponibles.
* **Para**: Conocer las diferencias entre sus condiciones antes de tomar una decisión.
* **Criterios de aceptación:**
    1. El sistema debe mostrar las alternativas disponibles para el cliente.
    2. Cada alternativa debe presentar información como plazo, tasa aplicable y valor estimado de cuota.
    3. El cliente debe poder seleccionar varias opciones para compararlas.
    4. La comparación debe mostrar las características de cada alternativa.
    5. El sistema debe permitir regresar al listado de opciones sin perder la información ingresada.

### **HU-28 · Asesoría para alcanzar una meta**
* **Como**: Cliente de Finara.
* **Quiero**: Recibir una orientación sobre cómo alcanzar una meta financiera específica.
* **Para**: Conocer cuánto necesito ahorrar periódicamente para acercarme al objetivo establecido.
* **Criterios de aceptación:**
    1. El cliente debe registrar el valor de la meta.
    2. Debe establecer una fecha límite.
    3. El sistema debe consultar el ahorro actual destinado a la meta.
    4. La plataforma debe calcular un valor orientativo de ahorro periódico.
    5. El sistema debe mostrar el progreso y el valor que falta para alcanzar la meta.

### **HU-29 · Asesoría sobre tarjetas de crédito**
* **Como**: Cliente de Finara.
* **Quiero**: Consultar información sobre el manejo responsable de una tarjeta de crédito.
* **Para**: Comprender conceptos como cupo, compras, pagos, intereses y fechas de pago.
* **Criterios de aceptación:**
    1. El sistema debe mostrar información sobre los principales conceptos de una tarjeta de crédito.
    2. El cliente debe poder consultar su fecha de corte y fecha límite de pago cuando corresponda.
    3. El sistema debe mostrar el saldo utilizado y el cupo disponible.
    4. La plataforma debe presentar recomendaciones generales para organizar los pagos.
    5. La información debe actualizarse de acuerdo con los movimientos registrados.

### **HU-30 · Planificación financiera mensual**
* **Como**: Cliente de Finara.
* **Quiero**: Crear una planificación financiera para cada mes.
* **Para**: Distribuir mis ingresos entre gastos, ahorro y obligaciones.
* **Criterios de aceptación:**
    1. El cliente debe registrar sus ingresos estimados del mes.
    2. Debe poder asignar valores a diferentes categorías financieras.
    3. El sistema debe calcular cuánto dinero queda disponible.
    4. La plataforma debe permitir comparar la planificación con los movimientos registrados.
    5. El cliente debe poder modificar la planificación durante el mes.

### **HU-31 · Seguimiento financiero**
* **Como**: Cliente de Finara.
* **Quiero**: Hacer seguimiento periódico de mi situación financiera.
* **Para**: Observar cómo evolucionan mis ingresos, gastos, ahorros y metas.
* **Criterios de aceptación:**
    1. El sistema debe conservar el historial de la información financiera registrada.
    2. El cliente debe poder consultar diferentes periodos.
    3. La plataforma debe mostrar cambios en ingresos, gastos y ahorro.
    4. El sistema debe mostrar el progreso de las metas financieras.
    5. La información debe presentarse mediante resúmenes fáciles de interpretar.

### **HU-32 · Agenda de asesoría financiera**
* **Como**: Cliente de Finara.
* **Quiero**: Solicitar una cita con un asesor financiero.
* **Para**: Recibir orientación sobre una situación financiera que requiera atención personalizada.
* **Criterios de aceptación:**
    1. El sistema debe mostrar los horarios disponibles para asesoría.
    2. El cliente debe poder seleccionar fecha y hora.
    3. Debe indicar el motivo general de la asesoría.
    4. El sistema debe confirmar la cita después de registrarla.
    5. El cliente debe poder consultar los datos de su cita programada.

---

## 🤖 5. Módulo de Asistente Virtual (Chatbot)

### **HU-33 · Chatbot — Saludo inicial**
* **Como**: Cliente de Finara.
* **Quiero**: Iniciar una conversación con el chatbot mediante un saludo.
* **Para**: Recibir orientación rápida sobre los servicios disponibles en la plataforma.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer saludos como "Hola", "Buenos días" y "Buenas tardes".
    2. El chatbot debe responder con un mensaje de bienvenida.
    3. La respuesta debe indicar que se trata del asistente virtual de Finara.
    4. El chatbot debe mostrar las principales categorías de ayuda disponibles.
    5. El cliente debe poder seleccionar una categoría para continuar la conversación.

### **HU-34 · Chatbot — Consulta de saldo**
* **Como**: Cliente de Finara.
* **Quiero**: Preguntarle al chatbot cómo consultar mi saldo.
* **Para**: Conocer rápidamente dónde puedo revisar el dinero disponible en mi cuenta.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer preguntas como "¿Cómo consulto mi saldo?".
    2. El chatbot debe responder con una instrucción previamente definida.
    3. La respuesta debe indicar dónde consultar el saldo dentro de Finara.
    4. El chatbot no debe proporcionar información financiera que no haya sido solicitada.
    5. El cliente debe poder seleccionar otra pregunta después de recibir la respuesta.

### **HU-35 · Chatbot — Transferencias**
* **Como**: Cliente de Finara.
* **Quiero**: Preguntar cómo realizar una transferencia.
* **Para**: Conocer los pasos necesarios para enviar dinero desde mi cuenta.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer preguntas relacionadas con transferencias.
    2. Debe responder con los pasos definidos por Finara.
    3. La respuesta debe explicar dónde iniciar una transferencia.
    4. El chatbot debe indicar qué información puede ser necesaria para realizarla.
    5. Debe existir una opción para regresar al menú principal.

### **HU-36 · Chatbot — Consultar horarios**
* **Como**: Cliente de Finara.
* **Quiero**: Preguntarle al chatbot cuáles son los horarios de atención.
* **Para**: Conocer cuándo puedo recibir atención por los canales disponibles.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer preguntas como "¿Cuál es el horario de atención?".
    2. Debe responder con los horarios previamente configurados.
    3. La respuesta debe diferenciar, cuando corresponda, entre atención virtual y presencial.
    4. La información debe mostrarse de forma clara.
    5. El chatbot debe permitir realizar otra consulta.

### **HU-37 · Chatbot — Bloqueo de tarjeta**
* **Como**: Cliente de Finara.
* **Quiero**: Preguntarle al chatbot cómo bloquear mi tarjeta.
* **Para**: Conocer rápidamente qué debo hacer si necesito bloquearla.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer preguntas -> El chatbot debe reconocer preguntas relacionadas con el bloqueo de tarjetas.
    2. Debe mostrar el procedimiento definido por Finara.
    3. La respuesta debe indicar dónde se encuentra la opción de bloqueo.
    4. Debe recomendar utilizar los canales oficiales de Finara cuando corresponda.
    5. El chatbot debe permitir regresar al menú de preguntas.

### **HU-38 · Chatbot — Recuperación de contraseña**
* **Como**: Cliente de Finara.
* **Quiero**: Preguntarle al chatbot cómo recuperar mi contraseña.
* **Para**: Conocer el procedimiento para volver a acceder a mi cuenta.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer preguntas relacionadas con contraseñas olvidadas.
    2. Debe proporcionar la respuesta previamente configurada.
    3. La respuesta debe indicar dónde iniciar el proceso de recuperación.
    4. El chatbot no debe solicitar ni almacenar la contraseña del cliente.
    5. Debe permitir continuar con otra consulta.

### **HU-39 · Chatbot — Pago de servicios**
* **Como**: Cliente de Finara.
* **Quiero**: Preguntarle al chatbot cómo pagar un servicio.
* **Para**: Conocer el procedimiento para realizar pagos desde la plataforma.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer preguntas relacionadas con el pago de servicios.
    2. Debe mostrar los pasos previamente definidos.
    3. La respuesta debe indicar dónde encontrar la opción de pagos.
    4. Debe explicar qué información puede solicitar el sistema.
    5. El chatbot debe permitir seleccionar otra categoría de ayuda.

### **HU-40 · Chatbot — Solicitud de crédito**
* **Como**: Cliente de Finara.
* **Quiero**: Preguntarle al chatbot cómo solicitar un crédito.
* **Para**: Conocer el proceso general para realizar una solicitud.
* **Criterios de aceptación:**
    1. El chatbot debe reconocer preguntas relacionadas con créditos.
    2. Debe mostrar información previamente definida sobre el proceso.
    3. La respuesta debe indicar dónde iniciar la solicitud.
    4. Debe informar que la aprobación está sujeta a las condiciones y validaciones correspondientes.
    5. El chatbot debe permitir realizar otra consulta.