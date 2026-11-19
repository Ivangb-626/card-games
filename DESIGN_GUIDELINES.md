# Guías de diseño

## Dirección estética

La interfaz debe sentirse moderna, expresiva y legible. La inspiración es conceptual y puede tomar referencias de energía visual, jerarquía y tactilidad de Balatro, Marvel Snap y Hearthstone, pero no debe copiar elementos identificables, nombres, ilustraciones, marcas ni activos.

## Principios

- Claridad antes que decoración.
- Cada carta debe ser identificable a primera vista.
- Las acciones principales deben tener un lugar estable.
- El turno activo debe destacarse sin bloquear toda la pantalla.
- La textura y la profundidad deben reforzar la jerarquía, no distraer.
- Las animaciones deben ser rápidas y útiles.
- El diseño debe reducir el riesgo de misclicks.

## Layout responsive

### Escritorio

- Mesa central amplia.
- Jugadores y acciones secundarias alrededor de la mesa.
- Información de ronda visible sin abrir menús.

### Tablet

- Priorizar la mesa y las cartas propias.
- Mantener acciones principales en una zona fija o fácilmente alcanzable.
- Reducir elementos decorativos antes que contenido esencial.

### Móvil

- Una acción principal por contexto.
- Cartas grandes y escalables.
- Evitar menús profundos durante el turno.
- Evitar depender de gestos ocultos.
- Mantener textos y controles fuera de las zonas de gesto del sistema.

## Barajas y cartas

- Baraja española: palos, valores y numeración claramente definidos.
- Baraja americana: palos, rango y comunicación visual consistentes.
- Diferenciar valor y categoría para evitar confusión.
- Mantener una relación de aspecto estable.
- Mostrar el reverso con un patrón original.
- Usar imágenes o ilustraciones propias o licencias verificadas.

## Estados

Diseñar explícitamente:

- Lobby vacío.
- Esperando jugadores.
- Jugador conectado y desconectado.
- Turno propio y turno ajeno.
- Acción válida, inválida y pendiente.
- Confirmación reversible.
- Final de ronda.
- Final de partida.
- Error de invitación o acceso.
- Reconexión.

## Interacción

- Confirmar acciones con consecuencias duraderas.
- Mostrar el efecto antes de confirmar cuando sea posible.
- Permitir deshacer en el contexto donde ocurrió el error.
- Nunca mover a otro turno sin feedback visible.
- Proporcionar suficiente área táctil.
- Mantener el foco visible en navegación por teclado.
- Asociar errores con el campo o acción que los produjo.

## Color

- Construir paletas con contraste AA como mínimo.
- Reservar el color rojo para peligro o error.
- Reservar verde o otro color distinto para éxito y turno disponible.
- No usar solo el color para comunicar estado.
- Definir modo claro u oscuro solo si las decisiones de plataforma lo permiten.

## Tipografía

- Título corto y alto contraste.
- Texto de reglas legible.
- Valores de cartas y puntos con jerarquía clara.
- Evitar texto diminuto en móviles.
- Preferir familias disponibles en el sistema o recursos incluidos, evitando licencias desconocidas.

## Animación

- Duración breve para repartir, recoger y cambiar turno.
- Reducir movimiento cuando el sistema lo solicite.
- Evitar animaciones que oculten el estado actual.
- Animar el cambio de estado, no elementos decorativos sin propósito.

## Accesibilidad

- Nombre accesible para cada carta y acción.
- Contraste suficiente.
- Navegación completa con teclado.
- Anuncios para cambios de turno y reconexiones.
- Feedback visual además de sonido.
- Contenido no dependiente de temporización visual cuando sea posible.

## Propuestas pendientes

- Paleta concreta y tipografía.
- Identidad visual sin copiar referencias.
- Iconografía propia.
- Sonido.
- Preferencias visuales.
- Modo claro y/o oscuro.
- Ilustraciones de juegos y barajas.
