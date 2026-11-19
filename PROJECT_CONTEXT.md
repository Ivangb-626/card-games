# Contexto del proyecto

## Objetivo

Crear una aplicación web de cartas que permita jugar tanto con cartas físicas como con partidas digitales privadas. El producto debe ser fácil de usar en pantalla, escalable y apto para servir como base de varias modalidades y juegos.

El MVP se centra en experiencia de usuario, representación visual de cartas, galería y mecánicas básicas. No pretende cubrir todavía estadísticas, historial competitivo ni una economía completa.

## Estado actual
- Existe únicamente documentación de planificación; no hay implementación de producto.
- Ya existe una primera base de documentos, que se mantiene y amplía con las decisiones acordadas.
- La tecnología se seleccionará durante la fase de preparación sin incorporar dependencias en esta etapa.
- Esta documentación define el punto de partida funcional y técnico; no implementa la aplicación.

## Decisiones confirmadas

| Área | Decisión |
|---|---|
| Producto | Aplicación de cartas con modo físico y modo digital privado por invitación. |
| Nombre temporal | Card Games. El nombre definitivo queda pendiente. |
| Modalidad física | Gestión manual de jugadores, turnos, rondas y puntuaciones; debe funcionar sin red mediante PWA. |
| Modalidad digital | Chinchón será el primer hito y Texas Hold'em el siguiente hito digital. |
| Barajas | Baraja española y baraja americana. |
| Chinchón | 2-4 jugadores, 7 cartas por jugador y reglas configurables para admitir variantes. |
| Cierre en chinchón | Cierre si todas las cartas están combinadas o quedan como máximo 5 puntos sin combinar. |
| Bonificaciones | Chinchón natural: -50 puntos. Cierre quedándose con cero: -10 puntos. |
| Puntuación | Se contabilizan los puntos de las cartas que quedan sin combinar. |
| Fin de partida | Termina cuando, al cierre de una ronda, solo queda un jugador por debajo de 100 puntos. Al llegar a 100, un jugador puede reengancharse a la puntuación del jugador con más puntos. |
| Póker | Texas Hold'em básico completo: ciegas, fichas virtuales, reparto automático, turnos, apuestas, all-in y resolución automática de manos; 2-9 jugadores. |
| Invitados | Nombre temporal sin registro obligatorio e identidad persistida localmente en el mismo dispositivo para reincorporarse. |
| Invitaciones | Código corto y enlace compartible; QR queda como mejora futura. |
| Login futuro | Opcional, destinado a añadir amigos y perfiles. No será obligatorio. |
| Continuidad | Desconexión marcada como ausente cuando se produzca fuera del turno o el usuario elija ese estado. Si pierde la conexión durante su turno, el comportamiento operativo concreto queda por precisar. |
| Expiración | La sala expira a los 30 minutos. |
| Reconexión | Recupera asiento, puntos y estado suficiente para continuar desde la siguiente ronda. |
| Correcciones | Todas las acciones pueden deshacerse dentro de una ronda. Al confirmar una ronda, solo el creador con rol de administrador puede deshacer. |
| Persistencia | Mantener estado tras cerrar el navegador. |
| Datos históricos | Sin estadísticas ni historial de producto por ahora. |
| Plataforma | Web responsive, con PWA para el modo físico sin red. |
| Idiomas | Español e inglés inicialmente. |
| Accesibilidad | Prácticas básicas desde el inicio: teclado, contraste y navegación clara. |
| Alcance inicial | MVP centrado en una interfaz funcional y cuidada, cartas, galería y mecánicas básicas. |
| Estética | Moderna, inspirada en Balatro, Marvel Snap y Hearthstone, sin copiar identidades, activos ni elementos reconocibles. |
| Arquitectura | Base escalable desde el primer diseño. |

## Propuestas pendientes

Estas opciones no están decididas y deben resolverse antes de una implementación que dependa de ellas:

- Selección de proveedor de tiempo real, persistencia y alojamiento.
- Detalle operativo si el jugador pierde la conexión durante su turno.
- Política exacta para ausencias prolongadas y toma de control.
- Definición detallada del reenganche y su interacción con variantes de puntuación.
- Secuencia exacta de cierre y confirmación de ronda.
- Qué comprobaciones de integridad pueden abortar o recuperar una partida.
- Estrategia de sincronización offline/online para el modo físico PWA.

## Principios de producto

1. Una acción común debe necesitar pocos pasos.
2. El estado visible debe explicar siempre el turno, el jugador activo y las cartas disponibles.
3. La experiencia física no debe exigir dispositivos para ser útil.
4. El estado digital debe tolerar interrupciones sin perder la partida.
5. Las mecánicas deben modelarse por conceptos reutilizables: baraja, carta, mesa, ronda, turno y puntuación.
6. Los errores deben poder corregirse sin reiniciar toda la ronda.
7. El MVP debe facilitar validar las reglas y la interfaz antes de optimizar datos o rankings.

## Criterios de éxito del MVP

- Crear y unirse a una partida privada mediante el mecanismo confirmado.
- Mostrar barajas española y americana con cartas legibles.
- Iniciar una partida de chinchón o póker con turnos básicos.
- Permitir puntuación o resolución acordada para el juego seleccionado.
- Reintegrar a un jugador desconectado sin perder su asiento.
- Permitir correcciones controladas dentro de una ronda.
- Usar una interfaz responsive usable en escritorio y móvil.
- Mantener una arquitectura que permita incorporar después login, nuevos juegos y nuevas barajas.
- Mantener el modo físico operativo sin red y el digital recuperable tras una desconexión.
