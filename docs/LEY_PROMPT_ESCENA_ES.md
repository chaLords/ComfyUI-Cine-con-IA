# La ley del prompt de escena

Versión 1 · 2026-10-03 · rama `feature/director-camara-automatica`

> **El prompt de escena dice qué pasa. El Director de cámara decide cómo se ve.**

## Por qué

En los renders del workflow 050 del 2 y 3 de octubre, el prompt de escena decidía cosas que le tocaban a la cámara, y cada vez peleó con los botones del Director:

| En la escena | Botón del Director | Resultado |
| --- | --- | --- |
| «His feet remain in place» | Primerísimo primer plano | Una segunda figura de cuerpo entero detrás de la cara |
| «Looks toward a fixed point off-screen» | Frontal | Cara girada, parecida a un tres cuartos |
| «Softly blurred background» | Profundidad «profunda» | El botón de profundidad deja de mandar |
| Describir los paneles de la lámina | Cualquiera | El video copia la composición de la lámina |

Estado: **observado** en esos renders, **sin prueba controlada** de cada causa por separado.

## La ley, en siete reglas

1. Nada de cámara ni de encuadre en la escena.
2. Nada de foco: ni blur ni bokeh, ni background ni foreground.
3. La mirada atada al cuerpo, nunca a la cámara: `His head and gaze stay aligned with his body, looking straight ahead.`
4. En la acción, nada que dependa del tamaño del plano: ni pies, ni piernas, ni «brazos a los costados».
5. El lugar sin posiciones relativas al personaje ni a la cámara.
6. `<Subject 1> is the only person in the scene` (scene, no frame).
7. Sin negaciones, salvo `No speech.` en el sonido.

El texto completo y los ejemplos están en [skills/cineconia-escena-h3](../skills/cineconia-escena-h3/SKILL.md).

## Quién hace qué

| Parte | Escribe | Cambia cuando… |
| --- | --- | --- |
| Prompt de escena | La skill de Claude o ChatGPT, o el usuario con la ley | Cambian el personaje, los objetos, el lugar o la acción |
| Cámara | El Director, con «Texto de cámara automático» | Se pulsa un botón |

Con «Texto de cámara automático», cada botón reescribe la caja «instrucción de cámara» con el texto de siempre más frases que describen el resultado visible. Por ejemplo, frontal añade «The subject's face and shoulders are square to the lens». Esas frases viven en `cineconia_h3/camera_recipes.json` → `minimax_h3.director.refuerzos`, la fuente única.

Con el modo automático, el Director avisa si la escena trae palabras de cámara. No borra nada.

## Compatibilidad

- El modo automático es un campo nuevo, opcional, al final del Director y **apagado por defecto**. Los workflows anteriores se ven y generan exactamente igual; la prueba de regresión de las 241.920 combinaciones lo vigila.
- Con el modo apagado, el Director funciona como siempre: la caja más los botones.
- El workflow 051 es el 050 con el prompt universal y el modo automático; solo cambia la cámara.

## Pendiente para declararla probada

Matriz en GPU con semilla fija, cambiando un botón por corrida:

1. Primer plano: frontal, tres cuartos y perfil, todos fijos.
2. Plano general, frontal y fijo.
3. Plano medio con «acercarse» y con «órbita».
4. Profundidad reducida contra profunda.

Cada fila pasa a «probada» solo con su render.
