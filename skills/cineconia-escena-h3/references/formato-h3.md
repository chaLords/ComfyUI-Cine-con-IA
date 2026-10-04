# Formato H3 (Ref2VA) para el prompt de escena

Resumen de la guía que trae el pack (`INSTRUCCION_H3` en `web/cineconia.js`), sin lo de cámara: la cámara la escribe el Director.

## subject_definitions

Una línea por etiqueta. `<Subject N>` es contenido visible reutilizable: personas, animales, objetos, escenarios, ropa o estilos. Cita la imagen dentro de la definición del sujeto; una imagen que solo define un personaje, objeto o lugar **no** lleva entrada `<Picture N>` propia. Una etiqueta significa lo mismo en todas las secciones.

```text
<Subject 1> is the adult woman in <Picture 1>, with her facial features, curly shoulder-length hair and freckles. She wears a burgundy wool beret, a mustard knitted cardigan over a white blouse, a dark green pleated skirt and brown leather ankle boots.
<Subject 2> is the vintage film camera from <Picture 2>: black leather body, silver dials and a worn brown strap.
<Subject 3> is a brass pocket watch: a round polished case on a thin chain.
```

- La ropa del personaje va completa y de la cabeza a los pies, con la prenda de cabeza primero. Solo aquí: en la acción no se nombran pies, piernas ni zapatos.
- Un sujeto **sin imagen conectada** (como `<Subject 3>`) se define solo con texto, sin `from <Picture N>`, y no lleva línea en retention_analysis.

## summary

Un párrafo corto que empieza con el tipo de tarea entre corchetes:

| Etiqueta | Cuándo |
| --- | --- |
| `[reference generation]` | Una imagen guía sin ser un fotograma concreto. Es el caso de la lámina, el objeto y el lugar. |
| `[keyframe completion]` | Una imagen es de verdad el primer, el último o un fotograma clave. |
| `[audio reference]` / `[audio reuse]` | Audio de referencia o audio copiado. |

Si hay varias relaciones: `[keyframe completion + reference generation]`. Usa solo etiquetas ya definidas.

## retention_analysis

Vocabulario fijo, una línea por etiqueta:

```text
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve her facial structure, hairstyle and clothing from <Picture 1>.
```

| Valor | Significado |
| --- | --- |
| `fully_preserved` | Se conserva entero el papel definido. |
| `partially_preserved` | Se usa, pero cambian algunas características. |
| `attribute_transfer` | Las características pasan a otro sujeto. |
| `weak_reference` | Solo un parecido de estilo, categoría o ambiente. |

Para audio, los valores son `fully_copy`, `partially_copy`, `reference` y `weak_reference`. Que el personaje haga cosas nuevas no es pérdida de fidelidad.

## detailed_description

1. Una o dos frases de estilo y luz **antes** de `[Shot 1]`. Palabras que el modelo conoce: cinematic, live-action, naturalistic, 2D-animated, 3D CG, claymation, watercolor, vintage film.
2. `[Shot 1]` y la acción, en un solo plano continuo. Un corte hace que la cara derive.
3. Termina con algo que **cambia** a lo largo del plano: una sonrisa que se forma o una mirada que baja al objeto. Nunca congeles al personaje (completely still, rigid pose): le quita recorrido a la cámara.

## Diálogo

Cada voz tiene un identificador estable por orden de aparición: (S1), (S2). El texto hablado va en `<d>` con la etiqueta del idioma y las palabras exactas, sin traducir:

```text
<Subject 1> (S1) says in a calm, warm voice, <d>[Spanish] Bienvenidos al canal.</d>
```

Quien habla y cómo lo dice va fuera de `<d>`. Con voz en off se escribe `says in an off-screen voiceover` y después que los labios siguen cerrados. Es el único uso permitido de off-screen, porque se refiere al sonido y no a la mirada.

## Texto en pantalla

Carteles y letreros, entre comillas dobles inglesas y tal cual: `The wall lettering reads "Cine con IA".`

## overall_soundscape y non_diegetic_music

- **overall_soundscape:** ambiente, sonidos físicos y sonidos humanos no verbales. No repitas el diálogo ni la música diegética. Si nadie habla, `No speech.` al final.
- **non_diegetic_music:** instrumentos, ritmo y cómo cambia el volumen, o `N/A`. Nunca nombres la cámara, el objetivo ni el movimiento.

## Límites útiles

- Ref2VA admite hasta 9 imágenes, pero el nodo Escena del pack usa hasta 3. El nodo numera solo las conectadas: si referencia_2 está vacía, referencia_3 pasa a ser `<Picture 2>`. Lo que no cabe se describe con texto.
- MiniMax documenta clips de 4 a 15 s. Por debajo de unos 5,2 s el pack observó peores resultados.
- Si hay dos imágenes del mismo personaje (lámina y rostro), di cuál manda en qué: el rostro manda en las proporciones de la cara y la lámina en el peinado y la ropa.
