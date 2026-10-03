# Ejemplos de prompt de escena (ley: sin cámara)

Cada ejemplo tiene que funcionar con cualquier combinación de botones del Director. Una prueba del pack (`tests/test_camera_recipes.py`) los comprueba contra todos los planos.

**Estado:** el 1 es la base del workflow 051. La versión anterior, con la mirada fuera de cuadro, se probó en GPU el 2026-10-03; esta versión universal todavía no tiene su matriz de ángulos en GPU. El 2 y el 3 están sin probar.

## 1. Un personaje (lámina en referencia_1)

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

## 2. Personaje y objeto (lámina en referencia_1, objeto en referencia_2)

El objeto se sostiene a la altura del pecho: en un primerísimo primer plano queda fuera, pero la acción no se contradice. Los botones de plano medio corto o más abiertos lo muestran.

```text
subject_definitions:
<Subject 1> is the adult woman in <Picture 1>, with her facial features, curly shoulder-length hair and freckles. She wears a mustard knitted cardigan over a white blouse.
<Subject 2> is the leather-bound notebook from <Picture 2>: dark brown cover, cream pages and a red ribbon bookmark.

summary:
[reference generation] <Subject 1> stands in a quiet reading room holding <Subject 2>, opens it, reads a line and smiles warmly.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve her facial structure, hairstyle, freckles and clothing from <Picture 1>.
<Subject 2> (appears in [Shot 1]): fully_preserved - preserve the cover, pages and ribbon of the notebook from <Picture 2>.

detailed_description:
Cinematic live-action style with warm lamplight and natural skin texture. The reading room has tall wooden bookshelves along the walls and a green glass lamp on a desk.
[Shot 1] <Subject 1> is the only person in the scene. She stands in one place holding <Subject 2> at chest height with both hands, her left hand under the spine and her right hand on the cover, and keeps hold of it throughout. She opens the notebook, lowers her gaze to the page, reads for a moment, then raises her head so her gaze is aligned with her body, looking straight ahead, and a warm smile spreads across her face.

overall_soundscape:
Soft rustle of paper as the pages turn, a faint creak of the floorboards and quiet room tone. No speech.

non_diegetic_music:
A gentle solo piano melody in a slow tempo, rising slightly in volume as she smiles.
```

## 3. Personaje en un lugar de referencia (lámina en referencia_1, lugar en referencia_2)

**Aviso para el usuario:** según las pruebas de LoopForge que recoge el pack, una imagen del escenario reduce el movimiento de cámara a la mitad. Si el movimiento importa, describe el lugar con texto, como en el ejemplo 1.

```text
subject_definitions:
<Subject 1> is the adult man in <Picture 1>, with his facial features, hairstyle and beard. He wears a brown leather jacket over a white shirt and a brown tie.
<Subject 2> is the rooftop terrace from <Picture 2>: terracotta tiles, potted lemon trees and a white railing over the city.

summary:
[reference generation] <Subject 1> stands on <Subject 2> at golden hour, breathing in the evening air as a calm smile forms.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - preserve his facial structure, hairstyle, beard and clothing from <Picture 1>.
<Subject 2> (appears in [Shot 1]): fully_preserved - preserve the tiles, lemon trees, railing and city view from <Picture 2>.

detailed_description:
Naturalistic live-action photography with warm golden-hour sunlight and gentle wind.
[Shot 1] <Subject 1> is the only person in the scene. He stands relaxed in one place on <Subject 2> and keeps his body orientation. His head and gaze stay aligned with his body, looking straight ahead. A light breeze moves his hair and the lemon leaves; he breathes in slowly and a calm smile forms.

overall_soundscape:
Distant city hum, leaves rustling in the breeze and a faint clothing rustle. No speech.

non_diegetic_music:
N/A
```
