<p align="center">
  <a href="CHANGELOG.md">English</a> · <strong>Español</strong>
</p>

# Changelog

Todos los cambios relevantes del proyecto se documentarán en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [Semantic Versioning](https://semver.org/lang/es/).

## [1.4.0] - 2026-09-19

### Añadido

- Las catorce recetas repetidas con otro personaje, con lo que necesita cada una, en [docs/CAMERA_TESTS_ES.md](docs/CAMERA_TESTS_ES.md). La órbita de 360° se completa con 124 fotogramas y falla con 192, y el ángulo holandés solo salió correcto con una segunda semilla.
- Releases en GitHub. Todas las versiones anteriores, de la 1.0.0 a la 1.3.9, tienen su tag en su propio commit, y al subir un tag `vX.Y.Z` se publica sola su Release con la entrada de esa versión en los dos historiales. El workflow rechaza un tag que no coincida con `pyproject.toml` o una versión sin entrada en el historial.

### Cambiado

- Las 14 recetas de cámara de MiniMax H3 llevan ahora, palabra por palabra, la frase de cámara publicada por LoopForge, con el encuadre de apertura y la acción del sujeto con los que se verificó cada toma. Las recetas anteriores eran paráfrasis: el eyes in se quedaba en "most of the final frame" en vez de llenar el cuadro con el ojo, el whip pan pedía desenfoque de movimiento (LoopForge comprobó que pedirlo no hace nada) y la grúa ascendente abría en plano general y desde arriba en vez de con el sujeto corriendo en plano medio.
- Cuando la frase de LoopForge nombra su propia escena, la receta usa la versión general de sus recetas de tomas y deja `{HUECOS}` para la escena del usuario. La snorricam sigue la receta de caminata recta que LoopForge midió como la que mejor fija el rostro, no la versión de fiesta de su página.
- Los pronombres de las recetas siguen al `<Subject 1>` de `subject_definitions` (he, she o they).
- La instrucción copiada para la IA enumera las 14 recetas palabra por palabra, incluye la receta elegida en el nodo y explica las condiciones medidas por LoopForge: una lámina de identidad sin placa de fondo, `[reference generation]`, 124 o 192 fotogramas, 20 pasos sin turbo y ningún segundo marcado.

### Corregido

- La órbita de 360° volvía de frente → derecha → espalda por el mismo costado. Su receta había sustituido la frase verificada de LoopForge por hitos en sentido horario marcados al segundo, y H3 no coloca sucesos en el tiempo. La receta vuelve a ser la de LoopForge: *arc shot … with large amplitude at fast speed, sweeping a complete circle … and coming back to the front*.
- La instrucción para la IA ya no pide hitos de cámara con tiempos y explica que `<Picture N>` sigue el orden de conexión de **Escena**.
- Un prompt con un `{HUECO}` sin rellenar se rechaza con un mensaje que lo nombra, en lugar de mandar el marcador a un render de media hora. La vista previa del prompt enseña ese mensaje.
- El nodo avisa cuando los fotogramas con los que se verificó una receta no coinciden con el nodo **Duración**.

## [1.3.9] - 2026-09-19

### Corregido

- La receta de órbita 360° y la guía para la IA exigen ahora un solo sentido de giro con cinco hitos: frente, perfil derecho, espalda, perfil izquierdo opuesto y frente. Regresar por el mismo lado deja de considerarse una vuelta completa.
- La receta sigue siendo una prueba: un prompt de texto no garantiza una trayectoria geométricamente exacta.

## [1.3.8] - 2026-09-19

### Añadido

- Catorce botones con recetas de cámara editables para MiniMax H3, basadas en las [pruebas publicadas de LoopForge](https://loopforge.cc/projects/h3-camera-shots/): crash zoom, yo-yo zoom, dolly zoom, Snorricam, rack focus, pantalla dividida, whip pan, ángulo holandés, super dolly in, eyes in, aerial pullback, cámara en mano, órbita 360° y grúa ascendente.
- Acceso rápido a 20 pasos en Render para comparar pruebas; no se modifica el valor de los workflows existentes.

### Corregido

- Las trayectorias de cámara pegadas desde una IA o elegidas como receta conservan su ritmo, movimientos combinados y punto de vista final; los controles simples ya no las reducen a una sola frase.
- La instrucción para la IA ya no obliga a iniciar todo movimiento inmediatamente ni a terminar en una composición distinta: una órbita completa y un yo-yo zoom pueden volver al encuadre inicial.
- Una lámina de personaje no se considera primer fotograma exacto solo por estar etiquetada como `<Picture 1>`.

Estas recetas son puntos de partida, no controles garantizados del modelo. Algunas necesitan dos sujetos, varios planos de profundidad o un sujeto en movimiento. Las condiciones de prueba de LoopForge figuran en su [índice de tomas](https://github.com/loopforge0/minimaxh3-shots-skills/blob/main/.claude/skills/h3-camera-shots/shots/INDEX.md).

## [1.3.7] - 2026-09-18

### Añadido

- Modos de guía en Escena: anclaje exacto del fotograma 0 o referencia visual flexible que prioriza la libertad de cámara.
- Intensidad H3 `amplia y lenta` para órbitas grandes y controladas.

### Corregido

- Los prompts con cámara móvil limitan ahora la composición inicial a `0.00 s` y exigen un punto de vista que cambie continuamente hasta una composición final observable.
- La intensidad de la órbita ya no se pierde por su cláusula de paralaje.
- La receta para la IA evita que el texto de retención congele el punto de vista inicial y aplica la cadena de cámara publicada para Singularity.

## [1.3.6] - 2026-09-18

### Cambiado

- Las estadísticas de Render y Escalar y Refinar conservan el primer paso como una línea horizontal de avance y después conectan los puntos iniciales, terminados y en curso mediante una curva naranja continua y un área sutilmente rellena. Las transiciones posteriores ya no aparecen como puntos separados.

## [1.3.5] - 2026-09-18

### Añadido

- El nodo Modelos ofrece ahora el checkpoint Singularity Ref2VA v1.3 int8 de 21 GB como descarga opcional de MiniMax H3. Se guarda en `models/diffusion_models` y nunca se descarga automáticamente.

### Cambiado

- Las entradas del catálogo pueden apuntar de forma segura a otro repositorio de Hugging Face, conservando los controles de familia y carpeta de destino existentes.

## [1.3.4] - 2026-09-18

### Corregido

- El botón **Cambiar la toma en el texto** escribe ahora la frase elegida directamente en el cuadro Cámara y la deja visible para confirmar qué se aplicará al prompt.

## [1.3.3] - 2026-09-18

### Corregido

- Los chips completan las instrucciones ausentes en la caja de cámara; el ángulo de LTX también se aplica al texto manual.
- El cambio de encuadre conserva el destino de un movimiento. El movimiento requiere un sujeto de cámara explícito, conserva acciones separadas por punto y coma y respeta la intensidad elegida.
- Las reglas de continuidad respetan el encuadre solicitado. Aplicar la toma ya no selecciona otra toma automáticamente.

### Añadido

- Vista del prompt final mediante el mismo constructor Python de ejecución, sin generar video. Las entradas conectadas se indican como pendientes.
- Aviso de imagen guía anclada al fotograma 0 y revisión bilingüe del workflow, perfiles y ejemplo AcademiaSD.

## [1.3.2] - 2026-09-18

### Corregido

- Cuando un bloque de cámara nombra dos tamaños de plano —dónde empieza y dónde acaba el movimiento, del tipo "framed as a medium shot ... tightening to a close-up"— ahora se lee y se sustituye el encuadre. Las tablas se recorrían en su propio orden, así que "close-up" ganaba solo por estar más arriba en la lista y los chips se quedaban con el plano equivocado.

## [1.3.1] - 2026-09-18

### Corregido

- La caja de cámara escrita a mano ya no anula las listas de plano, ángulo y movimiento. Ahora se sustituyen dentro de lo que haya en la caja y se respeta el resto de lo escrito. Una caja que quedaba de una toma anterior cancelaba los chips en silencio, así que una toma elegida en tres cuartos con zoom in salía frontal y quieta.
- Los ángulos ya escritos en el texto se pueden sustituir en su sitio; antes solo el plano y el movimiento.
- La frase del movimiento ya no se corta en el punto decimal de "8.00 seconds" dejando colgando un ".00 seconds.".

## [1.3.0] - 2026-09-18

### Añadido

- Nodo **Modelos**: enseña lo que necesita cada familia, marca lo que ya está en disco y descarga el resto directamente en la carpeta que le toca dentro de `models/`.
- Si se corta la conexión, la descarga sigue donde iba. El progreso se ve archivo a archivo dentro del nodo.
- El catálogo vive en el paquete, no en el workflow: el navegador solo manda el nombre de una familia y un índice, así que un workflow no puede redirigir una descarga ni elegir dónde se guarda.
- Pie con los enlaces del proyecto.

### Notas

- LTX-2.5 se sirve desde un repositorio con condiciones que hay que aceptar. El nodo lo avisa y enlaza la licencia; basta con poner `HF_TOKEN` o hacer `huggingface-cli login` una vez.

## [1.2.0] - 2026-09-18

### Añadido

- Selector de perfil de modelo en el nodo Cargar modelo: MiniMax H3, LTX-2.5, Wan 2.2, Hunyuan 1.5 y Personalizado.
- Al elegir un perfil se proponen el modelo, el codificador de texto y los VAE que le corresponden, y se ponen sus shifts y sus valores de VRAM.
- Personalizado no toca nada y deduce la familia por el nombre de los archivos elegidos.

### Cambiado

- El cargador deja de ser solo de MiniMax: el modo del codificador de texto, el nodo de sigma shift, el VAE de audio y los parches de VRAM de MiniMax siguen al perfil elegido.
- Las familias sin audio ya no cargan un segundo VAE, y la salida de VAE de audio repite la de vídeo.
- El sigma shift prueba los nodos que usa cada familia y, si no hay ninguno instalado, deja el modelo igual en vez de parar el render.

### Corregido

- El emparejado de archivos ya resuelve los choques entre familias (`hunyuan_video_vae` lleva dentro `video_vae`; `umt5_xxl` lleva dentro `t5`) quedándose con la pista más específica.

### Corregido

- Hunyuan 1.5 carga su codificador en modo `HUNYUAN_VIDEO_15` con Qwen2.5-VL; estaba usando el modo de la 1.0 y las pistas de llava/llama, que son de HunyuanVideo 1.0.
- LTX-2.5 busca su codificador Gemma en vez de T5, y carga su VAE de audio: sí genera audio.
- MiniMax H3 propone el modelo `ref2va` y el VAE de vídeo int8, en vez de `fl2va` y el fp16.
- Los archivos `.gguf` se proponen los últimos, porque este cargador usa `load_diffusion_model` y no los abre.

## [1.1.0] - 2026-09-17

### Añadido

- Pestañas y guías para conversar con una IA específicas para Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5 y Mochi 1.
- Separación automática en campos editables propios de cada modelo, con salidas positiva y negativa independientes.
- Fuentes oficiales de Hugging Face y referencias de compatibilidad con ComfyUI en ambos README.
- Gráficos reales de tiempo por paso, promedio y tiempo estimado para Render y Escalar y Refinar.

### Cambiado

- Las pestañas de Prompt se distribuyen en dos líneas cuando el nodo es estrecho.
- La guía de CogVideoX 1.5 respeta el límite documentado de 224 tokens de su codificador.
- Los valores de workflows anteriores y la primera salida de Prompt conservan su posición para mantener compatibilidad.

## [1.0.0] - 2026-09-17

### Añadido

- Primera publicación de los ocho nodos Cine con IA.
- Flujo completo para MiniMax H3: carga, escena, render, refinado y salida.
- Modos de prompt para MiniMax H3, LTX-2.5 y texto libre.
- Controles visuales, progreso integrado, historial de tomas y ayudas de VRAM.
- Metadatos y automatización para Comfy Registry y ComfyUI-Manager.
