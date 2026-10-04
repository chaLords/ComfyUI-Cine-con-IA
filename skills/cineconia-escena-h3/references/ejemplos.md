# Ejemplos de prompt de escena (ley: sin cámara)

Todos rellenan la plantilla canónica del workflow 051 y conservan sus anclas fijas. Cada ejemplo tiene que funcionar con cualquier combinación de botones del Director. Una prueba del pack (`tests/test_skills.py`) comprueba que cumplen la ley con todos los planos, que conservan las anclas y que las `<Picture N>` van seguidas.

**Estado:** el 1 es el prompt del workflow 051. Su versión anterior, con la mirada fuera de cuadro, se probó en GPU el 2026-10-03, y la versión universal funciona en los renders del usuario. Todavía no tiene su matriz de ángulos en GPU. Del 2 al 4 están **sin probar**, y también la ropa de cintura para abajo en subject_definitions.

## 1. La plantilla llena (solo el personaje)

El usuario adjunta la lámina y escribe: «está de pie en el estudio y sonríe».

```text
subject_definitions:
<Subject 1> is the adult man in <Picture 1>, with his facial features, hairstyle and beard. He wears a brown leather jacket over a white shirt and a brown tie.

summary:
[reference generation] <Subject 1> stands calmly in a bright, spacious photography studio, breathing naturally and gradually forming a subtle, relaxed smile.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, hairstyle, beard and clothing from <Picture 1>.

detailed_description:
Naturalistic live-action photography with realistic skin texture and soft daylight. The studio has a wooden floor, tall windows along one wall and brick pillars.
[Shot 1] <Subject 1> is the only person in the scene. He stands relaxed in one place and keeps his body orientation. His head and gaze stay aligned with his body, looking straight ahead. He breathes naturally, blinks occasionally and gradually forms a subtle smile.

overall_soundscape:
Quiet studio ambience and faint clothing rustle. No speech.

non_diegetic_music:
N/A
```

Conexión en el nodo Escena:

```
referencia_1 · lámina del personaje
```

## 2. Personaje con boina, un objeto y el lugar desde su foto

El usuario adjunta su lámina (con boina), la foto de un cuaderno y la foto de una sala de lectura, y escribe: «abre el cuaderno, lee una línea y sonríe».

La boina está en subject_definitions y en retention_analysis. La sala se describe a partir de su foto, pero no se conecta. El cuaderno se sostiene a la altura del pecho: en un primerísimo primer plano queda fuera, pero la acción no se contradice.

```text
subject_definitions:
<Subject 1> is the adult woman in <Picture 1>, with her facial features, curly shoulder-length hair and freckles. She wears a burgundy wool beret, a mustard knitted cardigan over a white blouse, a dark green pleated skirt and brown leather ankle boots.
<Subject 2> is the leather-bound notebook from <Picture 2>: dark brown cover, cream pages and a red ribbon bookmark.

summary:
[reference generation] <Subject 1> stands holding <Subject 2> in a quiet reading room, opening it, reading a line and gradually forming a warm smile.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve her facial structure, hairstyle, freckles, beret and clothing from <Picture 1>.
<Subject 2> (appears in [Shot 1]): fully_preserved - preserve the cover, pages and ribbon of the notebook from <Picture 2>.

detailed_description:
Naturalistic live-action photography with realistic skin texture and warm lamplight. The reading room has tall wooden bookshelves along the walls, a green glass lamp on a desk and a worn red rug on the floor.
[Shot 1] <Subject 1> is the only person in the scene. She stands relaxed in one place and keeps her body orientation. She holds <Subject 2> at chest height with both hands, her left hand under the spine and her right hand on the cover, and keeps hold of it throughout. Her head and gaze stay aligned with her body, looking straight ahead. She opens the notebook, lowers her gaze to the page and reads for a moment, then raises her head so her gaze is aligned with her body again as a warm smile forms.

overall_soundscape:
Soft rustle of paper as the pages turn, a faint creak of the floorboards, quiet room tone and faint clothing rustle. No speech.

non_diegetic_music:
N/A
```

Conexión en el nodo Escena:

```
referencia_1 · lámina de la mujer
referencia_2 · foto del cuaderno
sala de lectura · solo texto, no la conectes
```

## 3. Personaje en un lugar conectado

El usuario adjunta su lámina y la foto de una azotea, escribe «respira el aire de la tarde y sonríe» y pide que el lugar sea exactamente el de la foto.

**Aviso para el usuario:** según las pruebas de LoopForge que recoge el pack, una imagen del escenario reduce el movimiento de cámara a la mitad. Si el movimiento importa, describe el lugar con texto, como en los ejemplos 1 y 2.

```text
subject_definitions:
<Subject 1> is the adult man in <Picture 1>, with his facial features, hairstyle and beard. He wears a brown leather jacket over a white shirt and a brown tie, dark grey trousers and brown leather shoes.
<Subject 2> is the rooftop terrace from <Picture 2>: terracotta tiles, potted lemon trees and a white railing over the city.

summary:
[reference generation] <Subject 1> stands on <Subject 2> at golden hour, breathing in the evening air as a calm smile forms.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, hairstyle, beard and clothing from <Picture 1>.
<Subject 2> (appears in [Shot 1]): fully_preserved - preserve the tiles, lemon trees, railing and city view from <Picture 2>.

detailed_description:
Naturalistic live-action photography with realistic skin texture and warm golden-hour sunlight. A gentle wind moves across the terrace.
[Shot 1] <Subject 1> is the only person in the scene. He stands relaxed in one place on <Subject 2> and keeps his body orientation. His head and gaze stay aligned with his body, looking straight ahead. A light breeze moves his hair and the lemon leaves; he breathes in slowly and a calm smile forms.

overall_soundscape:
Distant city hum, leaves rustling in the breeze and faint clothing rustle. No speech.

non_diegetic_music:
N/A
```

Conexión en el nodo Escena:

```
referencia_1 · lámina del personaje
referencia_2 · foto de la azotea
```

## 4. Más imágenes que entradas, con gorra y diálogo

El usuario adjunta cinco imágenes: su lámina (con gorra), una taza, un portátil, una planta y una cafetería. Escribe: «está sentado en la cafetería con el portátil abierto, toma un sorbo de café y dice "Buenos días a todos"».

Solo hay tres entradas. La taza y el portátil, que el personaje usa, van conectados. La planta es decoración y va en la frase del lugar. La cafetería se describe con texto.

```text
subject_definitions:
<Subject 1> is the young man in <Picture 1>, with his facial features, short dark hair visible under the cap and light stubble. He wears a navy baseball cap with a white curved brim, a grey hooded sweatshirt over a white t-shirt, black jeans and white canvas sneakers.
<Subject 2> is the coffee mug from <Picture 2>: matte red ceramic, a white handle and a small chip on the rim.
<Subject 3> is the laptop from <Picture 3>: a silver aluminium body with a sticker on the lid that reads "Cine con IA".

summary:
[reference generation] <Subject 1> sits at a table in a cozy café with <Subject 3> open, taking a slow sip from <Subject 2> and greeting with a friendly smile.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, hairstyle, stubble, cap and clothing from <Picture 1>.
<Subject 2> (appears in [Shot 1]): fully_preserved - preserve the red ceramic, white handle and chipped rim of the mug from <Picture 2>.
<Subject 3> (appears in [Shot 1]): fully_preserved - preserve the silver body and the lid sticker of the laptop from <Picture 3>.

detailed_description:
Naturalistic live-action photography with realistic skin texture and soft morning daylight. The café has exposed brick walls, warm pendant lamps over wooden tables and a large monstera plant in a white ceramic pot on the windowsill.
[Shot 1] <Subject 1> is the only person in the scene. He sits on a wooden chair at the table and keeps his body orientation. <Subject 3> rests open on the table. His head and gaze stay aligned with his body, looking straight ahead. He holds <Subject 2> by its handle with his right hand and keeps hold of it throughout. He lifts the mug, takes a slow sip, lowers it to chest height and smiles. <Subject 1> (S1) says in a warm, relaxed voice, <d>[Spanish] Buenos días a todos.</d>

overall_soundscape:
Quiet café ambience with soft clinking of cups, a coffee machine hissing and faint clothing rustle.

non_diegetic_music:
N/A
```

Conexión en el nodo Escena:

```
referencia_1 · lámina del chico de la gorra
referencia_2 · foto de la taza
referencia_3 · foto del portátil
planta · solo texto, va en la frase del lugar
cafetería · solo texto, no la conectes
```
