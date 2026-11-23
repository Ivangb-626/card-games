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
- Chinchón primero y Texas Hold'em como siguiente hito digital.
- Chinchón para 2-4 jugadores y 7 cartas por jugador. El marcador físico admite además 5 o 6 jugadores, con un aviso de que no es lo tradicional.
- Chinchón digital: baraja de 40 cartas más 2 comodines (7 y sota seguidos), cierre con como mucho una carta suelta de 5 o menos, ligar manual simultáneo, tope de 70 por ronda y validación en la Edge Function `chinchon-game` con las manos en secreto.
- Póker Texas Hold'em para 2-9 jugadores.
- Invitados admitidos con nombre temporal e identidad local persistente.
- Login opcional futuro para amigos y perfiles.
- Código corto y enlace compartible con validez de 24 horas; QR futuro.
- Desconexión y reincorporación.
- Deshacer todas las acciones dentro de la ronda; solo el creador/admin puede deshacer tras confirmar el cierre.
- Supabase Postgres para persistencia, Supabase Realtime para sincronización y RLS por pertenencia a sala.
- Historial cronológico de eventos válidos con jugador, tipo, datos, versión y fecha; checkpoints por ronda para deshacer sin alterar el historial.
- Tras 30 segundos sin volver, la partida queda pausada indefinidamente; el anfitrión puede jugar temporalmente por el ausente o expulsarlo, sin ventajas mecánicas.
- Texas Hold'em digital inicial completo para 2-9 jugadores con ciegas, fichas, apuestas, turnos, all-in y resolución automática; torneos, recompensas y variantes quedan fuera de alcance.
- Sala expirada a los 30 minutos.
- Persistencia tras cerrar el navegador.
- Modo físico offline/PWA.
- Sin estadísticas ni historial por ahora.
- Web responsive con español e inglés.
- MVP funcional básico primero y mejoras visuales después.
- Accesibilidad básica desde el inicio.
- Nombre temporal Card Games.
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

- Cambiar el stack propuesto después de confirmarlo.
- Cambiar backend o proveedor concretado.
- Cambiar las reglas confirmadas de chinchón o Texas Hold'em.
- Cambiar el mecanismo de invitación.
- Añadir login o definir su propósito.
- Añadir estadísticas o historial.
- Cambiar barajas, juegos o alcance del MVP.
- Cambiar las políticas de reconexión.
- Cambiar Supabase, el modelo de eventos, los checkpoints o las políticas RLS.
- Ampliar el alcance inicial de Texas Hold'em con torneos, recompensas o variantes.
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
