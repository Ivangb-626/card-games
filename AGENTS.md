# Guía para agentes

## Propósito

Este repositorio contiene primero una planificación de producto y técnica. Los agentes deben preservar las decisiones confirmadas y distinguirlas de propuestas abiertas.

## Reglas generales

1. Crear o modificar únicamente el alcance solicitado por el usuario.
2. No implementar código de producto mientras la tarea sea documentación de planificación.
3. No añadir dependencias, infraestructura o archivos fuera del alcance sin autorización.
4. No sobrescribir ni reformar trabajo ajeno.
5. Mantener el español en la documentación.
6. Conservar nombres y acuerdos existentes si se añadiera una implementación posterior.

## Antes de trabajar

- Revisar `PROJECT_CONTEXT.md` para conocer objetivos y decisiones.
- Revisar `ROADMAP.md` para respetar las fases.
- Revisar `TECHNICAL_DESIGN.md` antes de tomar decisiones técnicas.
- Revisar `DESIGN_GUIDELINES.md` antes de crear interfaces.
- Revisar `TASKS.md` y elegir tareas verificables.
- Consultar el estado Git y los cambios locales antes de editar.

## Decisiones confirmadas

Un agente no debe sustituir estas decisiones por suposiciones:

- Modos físico y digital privado por invitación.
- Barajas española y americana.
- Chinchón y póker inicialmente.
- Invitados admitidos.
- Login futuro sin propósito definido todavía.
- Invitación por el mecanismo más sencillo inicialmente.
- Desconexión y reincorporación.
- Deshacer errores o misclicks por ronda.
- Sin estadísticas ni historial por ahora.
- Web responsive como recomendación inicial.
- MVP centrado en UX, cartas, galería y mecánicas básicas.
- Estética inspirada en referencias, pero sin copia.
- Arquitectura escalable.

## Trabajo permitido

Durante una fase de implementación aprobada:

- Crear código dentro del alcance de la tarea asignada.
- Añadir tests directamente relacionados.
- Actualizar documentación técnica afectada.
- Elegir detalles menores dentro de convenciones ya aprobadas.
- Marcar como propuesta cualquier alternativa que cambie alcance o arquitectura.

## Trabajo que requiere autorización

- Cambiar stack, backend o proveedor.
- Cambiar reglas de chinchón o póker.
- Cambiar el mecanismo de invitación.
- Añadir login o definir su propósito.
- Añadir estadísticas o historial.
- Cambiar barajas, juegos o alcance del MVP.
- Cambiar las políticas de reconexión.
- Introducir moneda, rankings, comercio o perfiles públicos.

## Convenciones futuras

Hasta que exista una aplicación:

- No asumir nombres de frameworks o comandos.
- No asumir una estructura de carpetas.
- No escribir scripts de instalación o despliegue como si fueran decisiones confirmadas.
- Presentar alternativas con estado “propuesta” y esperar confirmación.

Cuando se implemente, el repositorio deberá declarar el stack y los comandos reales en una actualización de documentación.

## Criterios de una buena entrega

- Código pequeño y relacionado con una tarea.
- Tests que cubren el comportamiento solicitado.
- Estado visible coherente con el modelo.
- Acciones inválidas rechazadas en el dominio.
- Reconexión y correcciones tratadas como casos normales.
- Documentación actualizada si cambia una decisión confirmada.

## Comprobación mínima

Antes de entregar cambios de implementación:

- Ejecutar el comando de tests correspondiente al proyecto.
- Ejecutar el tipo de chequeo o build definido por el proyecto.
- Revisar cambios locales para evitar tocar archivos ajenos.
- Confirmar que no se añadieron estadísticas, historial o login fuera de alcance.
