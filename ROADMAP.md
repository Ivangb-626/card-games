# Hoja de ruta

## Fase 0 — Confirmación y preparación

Objetivo: cerrar decisiones bloqueantes y dejar criterios implementables.

- Revisar las decisiones confirmadas y separar las pendientes.
- Definir el alcance exacto de chinchón y póker para el MVP.
- Elegir el mecanismo de invitación inicial.
- Elegir el stack y el proveedor de infraestructura.
- Definir reglas mínimas de sala, turno, ronda y desconexión.

Resultado verificable: documentos técnicos aprobados y una lista corta de tareas de construcción.

## Fase 1 — Fundación visual y experiencia

Objetivo: validar navegación y componentes antes de integrar complejidad.

- Crear una shell responsive.
- Diseñar estados de lobby, mesa, ronda, confirmación y error.
- Construir la representación básica de cartas española y americana.
- Crear una galería interna de barajas y variantes visuales.
- Definir interacción táctil, teclado y estados accesibles.

Resultado verificable: flujos principales navegables en móvil y escritorio con datos de demostración.

## Fase 2 — Modo físico

Objetivo: ayudar a gestionar una partida real sin asumir que el usuario no puede actuar manualmente.

- Crear configuración de jugadores y baraja.
- Implementar asignación de turnos.
- Implementar registro de puntos por ronda.
- Añadir confirmación y deshacer por ronda.
- Mantener las reglas seleccionadas en una vista clara.

Resultado verificable: completar varias rondas con persistencia local mínima y corregir una jugada incorrecta.

## Fase 3 — Motores de juego iniciales

Objetivo: cubrir reglas básicas de chinchón y póker sin ampliación prematura.

- Extraer modelos comunes de partida, ronda y turno.
- Implementar chinchón según las reglas acordadas.
- Implementar póker según las reglas acordadas.
- Diferenciar claramente reglas confirmadas de extensiones futuras.

Resultado verificable: pruebas de reglas para casos normales, empates y errores controlados.

## Fase 4 — Partida digital privada

Objetivo: permitir sesiones privadas invitadas con continuidad.

- Crear sala privada.
- Implementar mecanismo de invitación elegido.
- Permitir unir invitados.
- Sincronizar estado básico de mesa y turnos.
- Gestionar desconexión y reincorporación.
- Impedir entradas no invitadas.

Resultado verificable: dos o más jugadores pueden jugar y restaurar su asiento tras una desconexión.

## Fase 5 — Pulido y estabilidad

Objetivo: preparar el MVP para uso real controlado.

- Revisar responsive y accesibilidad.
- Mejorar estados de carga, error y reconexión.
- Verificar recuperación ante cierre o pérdida de conexión.
- Ejecutar pruebas de integración y aceptación.
- Documentar operación y limitaciones conocidas.

Resultado verificable: recorrido completo sin datos de prueba ni errores visibles en los flujos principales.

## Fuera del alcance inicial

- Estadísticas.
- Historial de partidas.
- Clasificaciones.
- Comercio o moneda virtual.
- Perfiles públicos.
- Motor de chat avanzado.
- Compatibilidad avanzada con todos los juegos o barajas.
- Integración definitiva de login hasta decidir su propósito.
