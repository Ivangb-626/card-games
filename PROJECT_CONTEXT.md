# Contexto del proyecto

## Objetivo

Crear una aplicación web de cartas que permita jugar tanto con cartas físicas como con partidas digitales privadas. El producto debe ser fácil de usar en pantalla, escalable y apto para servir como base de varias modalidades y juegos.

El MVP se centra en experiencia de usuario, representación visual de cartas, galería y mecánicas básicas. No pretende cubrir todavía estadísticas, historial competitivo ni una economía completa.

## Estado actual

- El repositorio está vacío y no contiene una implementación ni documentación previa.
- No se ha confirmado una tecnología, plataforma de servidor ni proveedor de infraestructura.
- Esta documentación define el punto de partida funcional y técnico; no implementa la aplicación.

## Decisiones confirmadas

| Área | Decisión |
|---|---|
| Producto | Aplicación de cartas con dos modos: ayuda para partidas físicas y partidas digitales privadas. |
| Modalidad física | Debe cubrir reglas, turnos y puntos. |
| Modalidad digital | Debe estar limitada por invitación. |
| Barajas | Baraja española y baraja americana. |
| Juegos iniciales | Chinchón y póker. |
| Invitados | Se admitirán invitados. El propósito y alcance del login futuro aún no están definidos. |
| Invitaciones | Se elegirá inicialmente el mecanismo más sencillo disponible. |
| Continuidad | Deben soportarse desconexiones y reincorporaciones. |
| Correcciones | Durante una ronda debe ser posible deshacer errores o misclicks. |
| Datos históricos | Sin estadísticas ni historial por ahora. |
| Plataforma | Recomendación inicial: interfaz web responsive. |
| Alcance inicial | MVP centrado en UX, cartas, galería y mecánicas básicas. |
| Estética | Moderna, inspirada en Balatro, Marvel Snap y Hearthstone, sin copiar sus identidades ni activos. |
| Arquitectura | Base escalable desde el primer diseño. |

## Propuestas pendientes

Estas opciones no están decididas y deben resolverse antes de una implementación que dependa de ellas:

- Elección del framework web y del lenguaje de servidor.
- Selección de proveedor de tiempo real, persistencia y alojamiento.
- Modelo exacto de invitados: nombre temporal, duración de sesión o identidad persistente.
- Propósito futuro del login: cuentas, identidad social, recuperación, moderación o perfiles.
- Mecanismo de invitación inicial: código, enlace compartible, QR o combinación.
- Número inicial de jugadores por juego y reglas específicas de mesa.
- Reglas detalladas de chinchón y póker dentro del alcance del MVP.
- Política de reconexión: tiempo de espera, caducidad de sala y condiciones de toma de control.
- Alcance y confirmación del deshacer de misclicks por ronda.
- Definición de “partida privada” y controles de acceso.
- Soporte offline, PWA o solo navegador.
- Estrategia de internacionalización, accesibilidad y idiomas.

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
