# Hoja de ruta

## Fase 0 — Confirmación y preparación

Objetivo: cerrar decisiones bloqueantes y dejar criterios implementables.

- Revisar las decisiones confirmadas y separar las pendientes.
- Acordar variantes configurables y casos límite de chinchón.
- Elegir proveedor concreto de alojamiento, persistencia y tiempo real.
- Preparar el stack seleccionado: React, TypeScript, Vite/PWA y Node.js/TypeScript.
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

## Fase 2 — Modo físico con chinchón

Objetivo: ayudar a gestionar una partida real sin asumir que el usuario no puede actuar manualmente.

- Crear configuración de jugadores y baraja.
- Implementar asignación de turnos.
- Implementar registro de puntos por ronda.
- Añadir confirmación y deshacer por ronda.
- Implementar cierre por combinación completa o máximo de 5 puntos.
- Implementar bonificaciones y contabilización de puntos restantes.
- Implementar fin de partida y reenganche a 100 puntos.
- Guardar persistencia local de partida y jugador.
- Preparar PWA para uso offline.
- Mantener las reglas seleccionadas en una vista clara.

Resultado verificable: completar varias rondas offline, corregir una jugada y aplicar cierres y bonificaciones configurables.

## Fase 3 — Motores de juego iniciales

Objetivo: cubrir primero las reglas básicas de chinchón y preparar Texas Hold'em sin ampliar prematuramente las variantes.

- Extraer modelos comunes de partida, ronda y turno.
- Implementar y validar el motor de chinchón acordado.
- Preparar el motor extensible de variantes.
- Implementar Texas Hold'em como hito posterior dentro del mismo motor extensible.
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
