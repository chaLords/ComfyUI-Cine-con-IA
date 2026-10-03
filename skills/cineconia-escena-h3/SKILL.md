---
name: cineconia-escena-h3
description: Escribe el prompt de escena para MiniMax H3 (Ref2VA) del pack Cine con IA en ComfyUI, a partir de la lámina del personaje y, si las hay, imágenes de objetos y del lugar. Úsala cuando el usuario adjunte una referencia de personaje, objeto o entorno y pida un prompt para H3, para el nodo Prompt/Escena de Cine con IA o para el workflow 051, o diga «prompt de escena», «prompt universal», «prompt para Cine con IA», «prompt H3». El prompt nunca lleva cámara: encuadre, ángulo, movimiento, lente y foco los pone el Director de cámara del pack.
---

# Prompt de escena H3 · Cine con IA

## La ley

**El prompt de escena dice QUÉ pasa. El Director de cámara decide CÓMO se ve.**

En el pack Cine con IA, el nodo Director de cámara tiene botones de plano, ángulo, movimiento, intensidad, lente y profundidad de campo. Con «Texto de cámara automático» encendido, esos botones escriben toda la cámara. Si el prompt de escena también decide algo de cámara, pelea con los botones. Ya se vio en renders reales:

- Un primer plano con «his feet remain in place» en la acción → el modelo añadió una segunda figura de cuerpo entero.
- Un ángulo frontal con «looks toward a point off-screen» → la cara salió girada, como un tres cuartos.
- «Softly blurred background» → el botón de profundidad dejó de mandar.

Por eso el prompt que escribes tiene que funcionar igual con **cualquier** combinación de botones: primerísimo primer plano o plano general, frontal o perfil, fijo u órbita.

## Antes de escribir

1. **Referencias y su orden.** `<Picture N>` es posicional: referencia_1 del nodo Escena es `<Picture 1>`, referencia_2 es `<Picture 2>`. El nodo admite hasta 3. Si no sabes en qué orden entran, pregunta.
2. **Pregunta de una en una, solo lo que falte:** qué hace el personaje (una acción sencilla y continua), si habla (palabras exactas e idioma) o no, y dónde ocurre si no hay imagen del lugar.
3. **Mira cada imagen** y anota solo lo estable: rasgos de la cara, pelo, barba, ropa de cintura para arriba, materiales y colores de los objetos, y elementos y luz del lugar.

## Las 7 reglas de la ley

1. **Nada de cámara ni de encuadre:** ni close-up, wide shot, frame, framing, camera, lens, zoom, mm, eye level, angle, profile view, shot como tamaño de plano.
2. **Nada de foco:** ni blurred, bokeh, sharp, in/out of focus, depth of field. Tampoco background ni foreground: dependen del punto de vista.
3. **La mirada va atada al cuerpo, nunca a la cámara.** Escribe `His head and gaze stay aligned with his body, looking straight ahead.` Así el botón frontal muestra que te mira, tres cuartos muestra la cara a 45° y perfil muestra el perfil puro. Prohibido: into the camera, into the lens, at the viewer, off-screen. Si mira algo de la escena, nómbralo en el mundo: `looks down at the laptop screen in his hands`.
4. **En la acción, nada que dependa del tamaño del plano:** ni feet, legs, knees, shoes, full body, head to toe, arms at his sides. Usa posturas: `stands relaxed in one place`, `sits on the wooden chair`. La ropa completa ya la trae la referencia.
5. **El lugar, sin posiciones relativas al personaje ni a la cámara:** ni behind him, in front of him, left of frame. Usa el mundo: `along one wall`, `in the corner of the room`, `on the desk`.
6. **Una sola persona:** escribe `<Subject 1> is the only person in the scene.` Usa scene y no frame.
7. **Describe lo que sí se ve.** Sin negaciones (no, without, never, avoid), porque el modelo dibuja lo que prohíbes. Única excepción probada: `No speech.` en overall_soundscape cuando nadie habla.

## Varias referencias

- **Lámina del personaje** → `<Subject 1>`. Describe a la persona, nunca la lámina: ni paneles, ni «left panel», ni sheet, ni turnaround. Describir los paneles hizo que el modelo copiara la composición de la lámina, con cara grande más cuerpo entero.
- **Objeto** → `<Subject 2> is the silver laptop from <Picture 2>: …`. Si el personaje lo sostiene, di con qué mano, por dónde lo agarra y que lo mantiene todo el plano: las manos que sueltan cosas se deforman.
- **Lugar** → `<Subject 3> is the photography studio from <Picture 3>: …`. **Avisa al usuario:** en las pruebas de LoopForge que recoge el pack, una imagen del escenario redujo el movimiento de cámara a la mitad. Si el movimiento importa, describe el lugar solo con texto.
- Una lámina, un objeto o un lugar **nunca** son primer fotograma: la etiqueta es `[reference generation]`. Usa `[keyframe completion]` solo si una imagen es de verdad el fotograma inicial. En ese caso, avisa al usuario de que el Director tiene que pedir el mismo encuadre que esa imagen.

## Formato de salida

Entrega **solo** el prompt dentro de un único bloque de código `text`, en inglés, con estas seis secciones y en este orden. No incluyas una sección `camera:`.

```text
subject_definitions:
summary:
retention_analysis:
detailed_description:
overall_soundscape:
non_diegetic_music:
```

Detalle de cada sección en [references/formato-h3.md](references/formato-h3.md) y ejemplos completos en [references/ejemplos.md](references/ejemplos.md).

- **subject_definitions:** una línea por `<Subject N>`, con la imagen de la que sale y sus rasgos estables.
- **summary:** `[reference generation] <Subject 1> <acción corta> in <lugar>, <cambio de expresión>.`
- **retention_analysis:** `<Subject N> (appears in [Shot 1]): fully_preserved - <qué se conserva>.`
- **detailed_description:** una o dos frases de estilo y luz, luego `[Shot 1]` con la persona única, la postura, la mirada atada al cuerpo y la acción que cambia a lo largo del plano.
- **overall_soundscape:** ambiente y sonidos físicos, de una a cuatro frases.
- **non_diegetic_music:** música que solo oye el espectador, o `N/A`.

Si el usuario pide recomendación de cámara, dásela **fuera del bloque y en español**, como botones del Director, por ejemplo `primer plano · frontal · fijo · profundidad reducida`. Nunca la metas dentro del prompt.

## Revisión antes de entregar

Relee el bloque y corrige si aparece cualquiera de estas cosas:

- close-up, shot (como tamaño), frame, framing, camera, lens, zoom, mm, focus, blur, bokeh, background, foreground, eye level, angle, off-screen, on-screen, into the camera.
- feet, legs, knees, shoes, full body o arms at his sides **en la acción** (en subject_definitions no importa).
- behind him, in front of him, left/right of the frame.
- Paneles, lámina o sheet en la definición del personaje.
- Negaciones fuera de `No speech.`

Si cambias algo del prompt que ya funcionaba, cambia una sola cosa por vez y dilo, para que el usuario pueda comparar con la misma semilla.
