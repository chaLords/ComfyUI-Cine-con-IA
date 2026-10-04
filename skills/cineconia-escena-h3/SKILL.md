---
name: cineconia-escena-h3
description: Escribe el prompt de escena para MiniMax H3 (Ref2VA) del pack Cine con IA en ComfyUI. El usuario adjunta las imágenes que necesite (la lámina del personaje con toda su ropa, gorro o sombrero incluido, objetos y el lugar) y escribe solo la acción. La skill describe cada imagen, rellena la plantilla canónica del workflow 051 y dice en qué referencia del nodo Escena va cada imagen. Úsala cuando el usuario adjunte un personaje, un objeto o un entorno y pida un prompt para H3, para el nodo Prompt/Escena de Cine con IA o para el workflow 051, o diga «prompt de escena», «prompt universal», «prompt para Cine con IA» o «prompt H3», aunque solo escriba la acción junto a las imágenes. El prompt nunca lleva cámara: encuadre, ángulo, movimiento, lente y foco los pone el Director de cámara del pack.
---

# Prompt de escena H3 · Cine con IA

## La ley

**El prompt de escena dice QUÉ pasa. El Director de cámara decide CÓMO se ve.**

En el pack Cine con IA, el nodo Director de cámara tiene botones de plano, ángulo, movimiento, intensidad, lente y profundidad de campo. Con «Texto de cámara automático» encendido, esos botones escriben toda la cámara. Si el prompt de escena también decide algo de cámara, pelea con los botones. Ya se vio en renders reales:

- Un primer plano con «his feet remain in place» en la acción → el modelo añadió una segunda figura de cuerpo entero.
- Un ángulo frontal con «looks toward a point off-screen» → la cara salió girada, como un tres cuartos.
- «Softly blurred background» → el botón de profundidad dejó de mandar.

Por eso el prompt que escribes tiene que funcionar igual con **cualquier** combinación de botones: primerísimo primer plano o plano general, frontal o perfil, fijo u órbita.

## Cómo trabaja

El usuario hace dos cosas: **adjunta imágenes** y **escribe la acción**. Lo demás lo pones tú.

| Lo da el usuario | Lo escribes tú |
| --- | --- |
| La lámina del personaje | Rasgos, pelo y la ropa completa, gorro o sombrero incluido |
| Imágenes de objetos | Material, color, forma, marcas y texto legible de cada objeto |
| La imagen del lugar | Elementos, materiales y luz del sitio |
| La acción, con sus palabras | La acción en inglés dentro de la plantilla |

Pregunta solo lo imprescindible, de una en una:

- No hay acción → qué hace el personaje.
- No distingues cuál imagen es el personaje, o qué objeto es uno → cuál es.
- La prenda de cabeza aparece aparte (en un maniquí o en un panel suelto) y no puesta → si la lleva en la escena.

No preguntes lo demás:

- **Diálogo:** solo si el usuario da palabras exactas o dice que habla. Si no, `No speech.`
- **Lugar:** si no hay imagen ni texto, usa el estudio fotográfico de la plantilla y dilo fuera del bloque.
- **Orden de las referencias:** lo propones tú (ver «Las imágenes y el nodo Escena»). Si el usuario ya dio un orden, respétalo.

## La plantilla canónica

Es el prompt del workflow 051, el que ya funciona con los botones del Director. Lo tienes lleno como ejemplo 1 en [references/ejemplos.md](references/ejemplos.md). **Rellénala; no la reescribas.**

```text
subject_definitions:
<Subject 1> is the {PERSONA} in <Picture 1>, with his facial features, {PELO_Y_RASGOS}. He wears {ROPA_COMPLETA}.
{UNA LÍNEA POR CADA OBJETO O LUGAR CON ETIQUETA}

summary:
[reference generation] <Subject 1> {ACCIÓN_CORTA} in {LUGAR}, {CAMBIO_DE_EXPRESIÓN}.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, {PELO_Y_RASGOS}, {PRENDA_DE_CABEZA} and clothing from <Picture 1>.
{UNA LÍNEA POR CADA OTRA ETIQUETA QUE TENGA IMAGEN}

detailed_description:
Naturalistic live-action photography with realistic skin texture and {LUZ}. {EL_LUGAR}
[Shot 1] <Subject 1> is the only person in the scene. He {POSTURA} and keeps his body orientation. His head and gaze stay aligned with his body, looking straight ahead. {ACCIÓN}

overall_soundscape:
{AMBIENTE} and faint clothing rustle. No speech.

non_diegetic_music:
N/A
```

**Lo fijo.** No lo cambies; solo adapta el pronombre (he/his, she/her, they/their):

- `with his facial features`
- `[reference generation]`
- `fully_preserved - preserve his facial structure, … and clothing from <Picture 1>.`
- `Naturalistic live-action photography with realistic skin texture`. Otro estilo, solo si el usuario lo pide.
- `<Subject 1> is the only person in the scene.`
- `and keeps his body orientation.`
- `His head and gaze stay aligned with his body, looking straight ahead.`
- `faint clothing rustle` y, si nadie habla, `No speech.` Música `N/A` salvo que el usuario la pida.

**Lo que rellenas:** persona, pelo y rasgos, ropa, objetos, lugar y luz, postura, acción, cambio de expresión y ambiente sonoro. Si no tienes nada nuevo para un hueco, usa el texto de la plantilla llena (ejemplo 1).

## El personaje: toda su ropa

Describe todo lo que lleva en la lámina, de la cabeza a los pies y en este orden:

1. **Cabeza:** gorro, sombrero, gorra, boina, capucha, pañuelo o casco, con color, material y forma: `a black wool beanie`, `a wide-brimmed straw hat`, `a red baseball cap worn backwards`. Nómbralo también en retention_analysis (`…, beard, cap and clothing from <Picture 1>`): sin esa línea, los modelos tienden a perder los sombreros. Si tapa el pelo, describe solo el que se ve: `short dark hair visible under the cap`.
2. **Torso**, de fuera hacia dentro: `a brown leather jacket over a white shirt and a brown tie`.
3. **De la cintura para abajo:** pantalón o falda, cinturón y calzado.
4. **Accesorios:** gafas, pendientes, collar, reloj, guantes, bufanda o bolso.

Toda la ropa va en subject_definitions y **solo ahí**. En la acción no se nombran pies, piernas, rodillas ni zapatos (regla 4). Los avisos del Director solo leen summary y detailed_description, así que el calzado puede ir en subject_definitions.

**experimental/SUPUESTO:** la ropa de cintura para abajo en subject_definitions no tiene matriz en GPU. El personaje duplicado se vio con los pies en la acción, no en la descripción. Si con un primer plano aparece una segunda figura de cuerpo entero, prueba primero a quitar el pantalón y el calzado de subject_definitions, con la misma semilla.

Describe a la persona, nunca la lámina: ni paneles, ni «left panel», ni sheet, ni turnaround. Describir los paneles hizo que el modelo copiara la composición de la lámina, con cara grande más cuerpo entero.

## Las imágenes y el nodo Escena

El nodo Escena tiene tres entradas: referencia_1, referencia_2 y referencia_3. `<Picture N>` es la imagen conectada número N, y el nodo **se salta las entradas vacías**: con referencia_1 y referencia_3 conectadas, la tercera pasa a ser `<Picture 2>`. Pide al usuario que las conecte en orden, sin huecos.

Reparto por defecto, si el usuario no pide otro:

1. **referencia_1** → la lámina del personaje: `<Subject 1>` con `<Picture 1>`.
2. **referencia_2 y referencia_3** → los objetos que el personaje toca o usa, el más importante primero: `<Subject 2> is the {objeto} from <Picture 2>: {material, color, forma, marcas}.`
3. **El lugar va solo como texto:** lo describes a partir de su imagen en `{EL_LUGAR}` y no se conecta. En las pruebas de LoopForge que recoge el pack, una imagen del escenario redujo el movimiento de cámara a la mitad. Si el usuario quiere el lugar exacto, va como `<Subject N>` con la siguiente referencia libre (ejemplo 3) y le avisas de ese riesgo.
4. **Lo que no cabe en tres referencias va solo como texto.** Un objeto que el personaje usa sigue teniendo etiqueta, pero sin imagen: `<Subject 4> is a {objeto}: {…}.` Tampoco lleva línea en retention_analysis, porque no hay imagen que conservar. La decoración va en la frase del lugar.

Numera los `<Subject N>` por orden de aparición en subject_definitions. Cada `<Picture N>` coincide con su entrada del nodo.

- **Objeto en la mano:** di con qué mano, por dónde lo agarra y que lo mantiene todo el plano (`keeps hold of it throughout`). Las manos que sueltan cosas se deforman.
- **Texto legible** (etiquetas, pegatinas, letreros): entre comillas dobles y tal cual: `a sticker that reads "Cine con IA"`.
- **Dos imágenes del mismo personaje** (lámina y rostro): ver [references/formato-h3.md](references/formato-h3.md).
- **Un segundo personaje:** la plantilla es de una persona. Escribe `<Subject 1> and <Subject 2> are the only people in the scene.` y avisa de que está **sin probar**.
- Una lámina, un objeto o un lugar **nunca** son primer fotograma: la etiqueta es `[reference generation]`. Usa `[keyframe completion]` solo si una imagen es de verdad el fotograma inicial, y avisa de que el Director tiene que pedir el mismo encuadre que esa imagen.

## La acción del usuario

Traduce la acción al inglés y colócala en la plantilla. Respeta lo que pidió: no añadas gestos que no dijo, salvo respirar y parpadear.

- **`{POSTURA}`:** `stands relaxed in one place`, `sits on a wooden chair at the table`, `leans against the counter`.
- **`{ACCIÓN}`:** presente y verbos sencillos, en un solo plano continuo. Termina con algo que **cambia**: una sonrisa que se forma o la mirada que baja al objeto. Nunca congeles al personaje (completely still, rigid pose), porque le quita recorrido a la cámara.
- **Mirar algo de la escena:** nómbralo en el mundo, `lowers his gaze to <Subject 2> in his hands`. Si vuelve: `then raises his head so his gaze is aligned with his body again`.
- **Desplazarse** (camina hacia, se gira, baila): cambia `{POSTURA} and keeps his body orientation` por el movimiento con un destino del mundo: `walks slowly toward the tall windows`. Esto se aparta de la plantilla y está **sin probar** con los botones; dilo fuera del bloque.
- **Acciones con piernas o pies** (arrodillarse, patear, saltar): usa el verbo sin nombrar la parte del cuerpo (`kneels`, `jumps`) y avisa de que los planos cerrados no la muestran, así que conviene un plano entero o general.
- **Varias acciones seguidas:** H3 hace planos de 4 a 15 s. Si caben, encadénalas en orden; si no, propón dividirlas en clips.
- **Si habla:** añade al final de la acción `<Subject 1> (S1) says in a {tono} voice, <d>[Spanish] {palabras exactas}</d>` y quita `No speech.`

## Las 7 reglas de la ley

1. **Nada de cámara ni de encuadre:** ni close-up, wide shot, frame, framing, camera, lens, zoom, mm, eye level, angle, profile view, ni shot como tamaño de plano.
2. **Nada de foco:** ni blurred, bokeh, sharp, in/out of focus, depth of field. Tampoco background ni foreground: dependen del punto de vista.
3. **La mirada va atada al cuerpo, nunca a la cámara:** `His head and gaze stay aligned with his body, looking straight ahead.` Así el botón frontal muestra que te mira, tres cuartos muestra la cara a 45° y perfil muestra el perfil puro. Prohibido: into the camera, into the lens, at the viewer, off-screen. Si mira algo de la escena, nómbralo en el mundo.
4. **En la acción, nada que dependa del tamaño del plano:** ni feet, legs, knees, shoes, full body, head to toe, arms at his sides. Usa posturas. La ropa completa va en subject_definitions.
5. **El lugar, sin posiciones relativas al personaje ni a la cámara:** ni behind him, in front of him, left of frame. Usa el mundo: `along one wall`, `in the corner of the room`, `on the desk`.
6. **Una sola persona:** `<Subject 1> is the only person in the scene.` Usa scene, nunca frame.
7. **Describe lo que sí se ve:** sin negaciones (no, without, never, avoid), porque el modelo dibuja lo que prohíbes. Única excepción probada: `No speech.` en overall_soundscape cuando nadie habla.

## Formato de salida

1. El prompt en un único bloque de código `text`, en inglés, con las seis secciones en este orden y sin sección `camera:`: subject_definitions, summary, retention_analysis, detailed_description, overall_soundscape, non_diegetic_music. Formato de cada sección en [references/formato-h3.md](references/formato-h3.md).
2. Debajo, en español, **Conexión en el nodo Escena**, con una línea por imagen recibida:

   ```
   referencia_1 · lámina del personaje
   referencia_2 · taza roja
   lugar · solo texto, no lo conectes
   ```

3. Avisos solo si los hay (lugar conectado, desplazamiento, piernas, segundo personaje, lugar por defecto), una línea cada uno.

Si el usuario pide recomendación de cámara, dásela fuera del bloque y en español, como botones del Director: `primer plano · frontal · fijo · profundidad reducida`. Nunca la metas dentro del prompt.

## Revisión antes de entregar

Relee el bloque y corrige si:

- Falta alguna ancla fija o cambió algo más que el pronombre.
- Aparece close-up, shot (como tamaño), frame, framing, camera, lens, zoom, mm, focus, blur, bokeh, background, foreground, eye level, angle, off-screen, on-screen o into the camera.
- Aparecen feet, legs, knees, shoes, full body o arms at his sides **en la acción** (en subject_definitions no importa).
- Aparece behind him, in front of him o left/right of the frame.
- La definición del personaje habla de paneles, de la lámina o de sheet.
- Hay negaciones fuera de `No speech.`
- La prenda de cabeza que se ve en la lámina falta en subject_definitions o en retention_analysis.
- Algún `<Picture N>` no coincide con la línea de conexión, o hay huecos en la numeración.

Si el usuario vuelve con un prompt que ya funcionaba, cambia una sola cosa por vez y dile cuál, para que pueda comparar con la misma semilla.
