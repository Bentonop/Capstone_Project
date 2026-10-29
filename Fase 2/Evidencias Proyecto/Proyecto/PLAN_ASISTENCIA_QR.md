# Plan de Implementación: Sistema de Asistencia por Código QR

Este documento es una guía paso a paso diseñada para que el equipo de desarrollo pueda implementar el sistema de control de asistencia mediante códigos QR sin necesidad de mi intervención directa. Se detallan las dos opciones solicitadas para que el equipo pueda evaluar y ejecutar la que mejor se adapte al flujo físico de la academia.

> [!TIP]
> **Recomendación de Librerías:** 
> - Para **generar** códigos QR en React/Next.js: `npm install qrcode.react`
> - Para **escanear** códigos QR usando la cámara del dispositivo: `npm install html5-qrcode` o `react-qr-reader`

---

## Opción A: El alumno muestra, el profesor escanea (Flujo Ideal)

En este flujo, el alumno genera un QR único para su reserva y el profesor utiliza la cámara de su dispositivo (tablet o celular) para escanearlo a medida que los alumnos ingresan a la sala.

### 1. Interfaz del Alumno (Generador de QR)
**Archivos a modificar:** `src/app/alumno/mis-clases/page.tsx` o el detalle de la reserva.
- **Acción:** Integrar el componente `QRCode` de la librería `qrcode.react`.
- **Dato a encriptar:** El valor del código QR debe ser un JSON stringificado o una cadena segura que contenga el `id_reserva` y el `id_clase` (Ejemplo: `reserva-12345`).
- **UI:** Al presionar un botón "Ver Pase de Entrada" en una clase confirmada, se debe abrir un Modal mostrando el código QR en grande para facilitar el escaneo.

### 2. Interfaz del Profesor (Escáner de QR)
**Archivos a modificar:** `src/app/profesor/clase/[id]/page.tsx` (Vista de pase de lista).
- **Acción:** Añadir un botón flotante o principal que diga "Escanear QR de Ingreso".
- **Lógica:** Al hacer clic, se abre la cámara usando `html5-qrcode`.
- **Procesamiento:** 
  1. Al detectar el texto del QR, extraer el `id_reserva`.
  2. Verificar que la reserva corresponda a la clase actual.
  3. Ejecutar una consulta a Supabase:
     ```javascript
     const { error } = await supabase
       .from('asistencia')
       .update({ asistio: true })
       .eq('id_reserva', qr_reserva_id);
     ```
  4. Reproducir un sonido de éxito (opcional) y mostrar una alerta en pantalla: *"¡Asistencia registrada con éxito!"*.

---

## Opción B: Autoservicio (El profesor muestra, los alumnos escanean)

En este flujo, el profesor proyecta o muestra un QR en su dispositivo al inicio de la clase y los alumnos abren la app en sus propios teléfonos para escanearlo y registrar su asistencia.

### 1. Interfaz del Profesor (Generador de QR Dinámico)
**Archivos a modificar:** `src/app/profesor/clase/[id]/page.tsx`.
- **Acción:** Integrar `qrcode.react` para generar el QR.
- **Dato a encriptar:** El `id_clase` y un token de seguridad temporal o *timestamp* (Ejemplo: `clase-987-token-xyz`).
- **Seguridad extra (Opcional):** El componente en React debe actualizar el token (regenerando el QR) cada 30 segundos para evitar que los alumnos le tomen foto y la envíen por WhatsApp a quienes no asistieron.

### 2. Interfaz del Alumno (Escáner de QR)
**Archivos a modificar:** `src/app/alumno/dashboard/page.tsx` o en un botón central del menú de navegación.
- **Acción:** Implementar un botón "Marcar mi Asistencia" que abra la cámara del alumno.
- **Lógica de Escaneo:**
  1. El alumno escanea el QR y la app extrae el `id_clase`.
  2. La app busca en el estado local o hace un fetch para confirmar que el alumno actual tiene una reserva válida para esa clase.
  3. Ejecuta la actualización en Supabase:
     ```javascript
     const { error } = await supabase
       .from('asistencia')
       .update({ asistio: true })
       .eq('id_reserva', mi_reserva_id_para_esta_clase);
     ```
  4. Muestra pantalla de éxito.

---

## Tareas Comunes para el Equipo (Para ambas opciones)

### Base de Datos (Supabase)
La estructura actual (`reserva` y `asistencia`) ya soporta esta lógica. Asegurarse de que las políticas de seguridad (RLS) en la tabla `asistencia` permitan:
- **Opción A:** Que el rol `profesor` pueda hacer `UPDATE` en las asistencias de las clases que él imparte.
- **Opción B:** Que el rol `alumno` pueda hacer `UPDATE` **solo** en su propia asistencia (donde su perfil coincide con el dueño de la reserva).

### UI/UX
- Asegurar que en dispositivos móviles se soliciten correctamente los permisos de cámara (`navigator.mediaDevices.getUserMedia`).
- Manejar elegantemente los errores (QR inválido, clase equivocada, alumno no inscrito).

---

## User Review Required

> [!IMPORTANT]
> **Preguntas para ti antes de delegar al equipo:**
> 1. ¿Prefieres que el equipo implemente **solo una** de las opciones para no dispersar el esfuerzo? Si es así, ¿con cuál se quedan (Opción A u Opción B)?
> 2. ¿El equipo tiene claro cómo manejar las Políticas de Seguridad de Supabase (RLS) para proteger estos escaneos, o prefieres que agregue las reglas SQL exactas a este documento para que ellos las corran?
