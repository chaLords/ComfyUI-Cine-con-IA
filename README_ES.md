<p align="center">
  <a href="README.md">English</a> · <strong>Español</strong>
</p>

<p align="center">
  <img src="docs/assets/logo.png" alt="Cine con IA" width="190">
</p>

<h1 align="center">ComfyUI · Cine con IA</h1>

<p align="center">
  <strong>Nueve nodos estables, tres herramientas de interfaz y cuatro módulos H3 experimentales para rodar vídeo con IA en local.</strong><br>
  Proporción y Tamaño • Duración • Prompt • Cargar modelo • Escena • Render • Escalar y Refinar • Salida • Modelos<br>
  Cronómetro • Interruptor • Selector
</p>

<p align="center">
  <a href="https://github.com/chaLords/ComfyUI-Cine-con-IA/releases/latest"><img alt="Última versión" src="https://img.shields.io/github/v/release/chaLords/ComfyUI-Cine-con-IA?style=flat-square&label=versi%C3%B3n&color=e08a3c"></a>
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-blue?style=flat-square"></a>
  <img alt="ComfyUI 0.34.2 o superior" src="https://img.shields.io/badge/ComfyUI-%E2%89%A5%200.34.2-6b46c1?style=flat-square">
  <img alt="Nueve nodos estables, tres herramientas y cuatro experimentales" src="https://img.shields.io/badge/nodos-9%20%2B%203%20%2B%204%20H3-e08a3c?style=flat-square">
  <img alt="Interfaz en español" src="https://img.shields.io/badge/interfaz-espa%C3%B1ol-2ea043?style=flat-square">
  <a href="https://www.youtube.com/@cineconia.oficial"><img alt="Canal de YouTube" src="https://img.shields.io/badge/youtube-Cine%20con%20IA-red?style=flat-square&logo=youtube&logoColor=white"></a>
  <a href="https://discord.gg/hXKJ78cEua"><img alt="Comunidad en Discord" src="https://img.shields.io/badge/discord-Cine%20con%20IA-5865F2?style=flat-square&logo=discord&logoColor=white"></a>
</p>

<p align="center">
  <a href="#instalación">📥 Instalar</a> ·
  <a href="#qué-incluye">🎬 Los nodos</a> ·
  <a href="#flujo-recomendado">▶️ Cómo se usa</a> ·
  <a href="#uso-del-nodo-prompt">✍️ El nodo Prompt</a> ·
  <a href="CHANGELOG_ES.md">🛠 Novedades</a> ·
  <a href="https://www.youtube.com/@cineconia.oficial">📺 Tutoriales</a> ·
  <a href="https://discord.gg/hXKJ78cEua">💬 Discord</a>
</p>

---

> [!TIP]
> **💬 Únete a la comunidad de Cine con IA en Discord:** dudas, errores, ideas y tus propios renders. [discord.gg/hXKJ78cEua](https://discord.gg/hXKJ78cEua) · Tutoriales en [YouTube](https://www.youtube.com/@cineconia.oficial).

Nodos personalizados para simplificar los flujos cinematográficos de vídeo con IA en ComfyUI. Los nombres visibles son deliberadamente genéricos para que el paquete pueda crecer y trabajar con varios modelos. Su primer flujo completo integra MiniMax H3 —preparación, prompt, carga, generación, refinado y salida— mientras que el nodo Prompt ofrece pestañas específicas para MiniMax H3, LTX-2.5, Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, Mochi 1 y un modo Libre independiente del modelo.

La interfaz está en español y añade controles visuales, avisos de memoria, progreso de render, ayudas contextuales y herramientas para planificar la cámara sin convertir el workflow en una maraña de nodos técnicos.

> [!IMPORTANT]
> Este repositorio contiene los nodos y su interfaz. No incluye ComfyUI, modelos, LoRAs, VAEs ni pesos de interpolación o escalado. El nodo **Modelos** te los descarga a su carpeta con un botón.

### Rama experimental: cargador Acc/PDD propio

El nodo **Cargar modelo** aplica la LoRA Acc/PDD original de Alibaba sin instalar Deno. Se implementaron las rutas completo y pruned/INT8; la segunda usa dos grillas auxiliares AdaLN de ~11 MB incluidas en el paquete ([procedencia](cineconia_h3/assets/NOTICE.md)). Estas grillas son la excepción al aviso anterior: el modelo y la LoRA se descargan por separado.

Para empezar, abre el [workflow 050](examples/050.REALminimax-H3-CineconIA-Acc-PDD-propio-8pasos.json), elige una referencia y conserva 8 pasos, Euler/Simple, CFG 1 y shift 12/3, sin refinado ni progresivo. Pasaron las comprobaciones CPU con el archivo Ref2VA oficial; el render completo, la calidad, velocidad y VRAM siguen **sin probar**. [Uso, evidencia y límites](docs/ANALISIS_ACC_PDD.md).

> [!CAUTION]
> Los cuatro nodos H3 (Scene/Prompt H3, Camera Director H3, H3 Optimizer y H3 Optimized Sampler) son experimentales. Su semáforo de VRAM está calibrado con renders reales en una RTX 4060 Ti de 16 GB; las tarjetas de 8, 12, 24 y 32 GB todavía no tienen benchmark. Consulta [H3 Optimizer v1](docs/H3_OPTIMIZER_V1_ES.md).

## Qué incluye

| Nodo | Función |
| --- | --- |
| **Cine con IA · Proporción y Tamaño** | Calcula ancho y alto desde proporciones de cine, redes sociales o fotografía. Permite trabajar por megapíxeles o lado principal y ajusta el resultado al múltiplo requerido por el modelo. |
| **Cine con IA · Duración** | Convierte segundos y FPS en una cantidad válida de fotogramas. Incluye la rejilla de MiniMax H3 y ajustes avanzados para otros modelos. |
| **Cine con IA · Prompt** | Construye y separa prompts específicos para MiniMax H3, LTX-2.5, Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, Mochi 1 o cualquier modelo mediante el modo Libre. |
| **Cine con IA · Cargar modelo** | Carga el modelo, codificador de texto y VAEs de video/audio, en safetensors o GGUF. Encadena hasta cuatro LoRAs y aplica optimizaciones de VRAM, sigma shift y vista previa cuando están disponibles. |
| **Cine con IA · Escena** | Crea el condicionamiento y el latente audiovisual de H3. Acepta hasta tres imágenes de referencia y una imagen guía anclada a un fotograma. Una línea del prompt que empieza por `<Picture N>` se deja fuera si esa imagen no está conectada. |
| **Cine con IA · Render** | Ejecuta el primer pase de muestreo con controles directos de pasos, sampler, scheduler, semilla y denoise. |
| **Cine con IA · Escalar y Refinar** | Escala el latente de video con un upscaler 3D y realiza un segundo pase de refinado. Incluye perfiles de 3, 4 y 5 pasos y mensajes claros ante falta de VRAM. |
| **Cine con IA · Salida** | Decodifica video y audio, interpola fotogramas opcionalmente y entrega un objeto `VIDEO`, fotogramas, audio, FPS e información del resultado. |
| **Cine con IA · Modelos** | Enseña qué archivos necesita cada familia de modelos, marca los que ya tienes en disco y descarga los que falten directamente a su carpeta dentro de `models/`, con progreso y reanudación. |
| **CineConIA · Scene / Prompt H3** | Separa personajes, acción, lugar, estilo y sonido y produce una escena estructurada para H3. |
| **CineConIA · Camera Director H3** | Añade encuadre, ángulo, movimiento, lente, profundidad o una receta H3 completa y compila el prompt final de seis secciones. |
| **CineConIA · H3 Optimizer** | Detecta VRAM, aplica perfiles AUTO/8/12/16/24/32 GB, ejecuta el Memory Planner y entrega una configuración reutilizable. Muestreo progresivo opcional para tamaños grandes (necesita el pack comfyui-SelfLift). |
| **CineConIA · H3 Optimized Sampler** | Consume la configuración del Optimizer y ejecuta el primer pase mediante los nodos avanzados del core de ComfyUI. |
| **Cine con IA · Cronómetro** | Nodo del navegador, no forma parte del render: mide la corrida completa y cada nodo, y guarda en el workflow las últimas 20 corridas con el modelo (de cualquier cargador), las LoRA, los pasos, el sampler, el progresivo, el refinado, la semilla, la resolución final y la duración. Un clic en una corrida muestra su desglose por nodo; *Copiar tabla* copia el historial para una hoja de cálculo. Los modelos y LoRA conocidos se anotan con su nombre oficial, y cada corrida queda además en un registro permanente (`ComfyUI/user/default/cineconia/registro_cronometro.csv`) que se baja con *Descargar registro*. |
| **Cine con IA · Interruptor** | Nodo del navegador, no se envía al servidor: cada botón enciende unos nodos y apaga los de los demás botones. Los botones salen de los grupos cuyo título empieza por un prefijo ("RAMA" por defecto) o se crean con **+ botón** a partir de los nodos seleccionados. Con clic derecho se renombran, se colorean, se ordenan o se ocultan, y se elige el modo (una siempre, una o ninguna, varias) y si se apaga con bypass o silenciando. |
| **Cine con IA · Selector** | Nodo del navegador, no se envía al servidor: filas de botones independientes (por ejemplo MODELO y PASOS) que ponen valores en otros nodos o encienden y apagan un nodo, para combinar opciones sin duplicar ramas. Nombra el video según lo elegido. **+** al final de una fila guarda lo puesto como botón nuevo; con clic derecho se crean filas con los controles de los nodos seleccionados y cada botón se renombra, colorea, actualiza o borra. |

## Funciones destacadas de la interfaz

- Controles rápidos para relación de aspecto, resolución, duración, FPS, escala y parámetros de muestreo.
- Información en vivo sobre resolución final, megapíxeles, coste relativo, duración real y rango recomendado de H3.
- Paneles estadísticos de progreso para ambos pases, con gráfico real por paso, tiempo del último paso, promedio, porcentaje y tiempo estimado restante.
- Hasta cuatro LoRAs encadenados, aplicados en orden.
- Pestañas adaptables para **MiniMax H3**, **LTX-2.5**, **Wan 2.2**, **Hunyuan 1.5**, **CogVideoX 1.5**, **Mochi 1** y **Libre**.
- Selector de plano, ángulo y movimiento con redacción automática en inglés.
- Historial de tomas guardado dentro del workflow para ayudar a variar la cobertura de cámara.
- Botones para copiar una guía basada en fuentes oficiales, pegar la respuesta de una IA y repartir automáticamente los campos propios de cada modelo.
- Compatibilidad con workflows guardados con nombres anteriores de los nodos.

## Compatibilidad de modelos y nombres

Consulta la [revisión técnica del workflow, cámaras y perfiles](docs/REVIEW_ES.md). El selector de carga aún no convierte toda la cadena H3 a otras familias. Usa **Ver prompt final** para comprobar la cámara antes de generar; una imagen guía en el fotograma 0 también condiciona la composición inicial.

Los nombres que aparecen en ComfyUI son genéricos: **Cargar modelo**, **Escena**, **Render**, **Escalar y Refinar** y **Salida**. Esto es intencional y permite incorporar otros modelos sin cambiar el vocabulario del workflow.

El flujo completo de generación está implementado actualmente para **MiniMax H3**. La preparación de prompts es independiente y también incluye **LTX-2.5**, **Wan 2.2**, **HunyuanVideo 1.5**, **CogVideoX 1.5**, **Mochi 1** y **Libre**. Estas pestañas adicionales producen los textos positivo y negativo para conectarlos al workflow correspondiente de ComfyUI; no sustituyen los nodos de carga, condicionamiento o muestreo de ese modelo.

Antes de incorporar un modelo con nombre propio se comprueba su compatibilidad actual con ComfyUI. ComfyUI enumera soporte nativo de video para Wan 2.2, LTX-Video, HunyuanVideo 1.5, CogVideoX, Mochi y MiniMax H3. Conviene mantener ComfyUI actualizado porque el soporte y las plantillas evolucionan.

Algunos identificadores internos todavía terminan en `H3`, como `CineCargarH3`, `CineEscenaH3` y `CineRenderH3`. El usuario no ve esos identificadores y se conservan exclusivamente por compatibilidad: cambiarlos rompería workflows guardados anteriormente.

## Requisitos

- Una instalación reciente de [ComfyUI](https://github.com/Comfy-Org/ComfyUI) con los nodos nativos de MiniMax H3.
- Los modelos y VAEs correspondientes al workflow de MiniMax H3.
- [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes), recomendado para el troceado de atención/FFN y la vista previa en vivo. Si no está instalado, el nodo continúa sin esas optimizaciones.
- [Comfyui Minimax H3 Latent Upscaler](https://github.com/LBH-123-AI/Comfyui_Minimax_h3_latent_Upscaler), necesario únicamente para **Escalar y Refinar**.
- Un cargador GGUF compatible con H3, como [ComfyUI-GGUF-Loader](https://github.com/ChrisColeTech/ComfyUI-GGUF-Loader), solo si usas modelos `.gguf` (workflow 049).
- Un modelo compatible de interpolación de fotogramas si se activa la interpolación en **Salida**.

Las dependencias Python de los nodos son las que ya proporciona ComfyUI; este paquete no instala bibliotecas adicionales.

## Instalación

### Con Git (recomendado)

Abre una terminal en `ComfyUI/custom_nodes` y ejecuta:

```bash
git clone https://github.com/chaLords/ComfyUI-Cine-con-IA.git
```

Reinicia ComfyUI y busca la categoría **Cine con IA**.

### Instalación manual

1. Descarga el ZIP de la [última versión](https://github.com/chaLords/ComfyUI-Cine-con-IA/releases/latest) (en *Assets*, **Source code (zip)**).
2. Descomprime la carpeta dentro de `ComfyUI/custom_nodes`.
3. Comprueba que el archivo `__init__.py` quede directamente dentro de esa carpeta, por ejemplo `ComfyUI/custom_nodes/ComfyUI-Cine-con-IA/__init__.py`.
4. Reinicia ComfyUI y busca la categoría **Cine con IA**.

### Actualizar

Si lo instalaste con Git, abre una terminal en `ComfyUI/custom_nodes/ComfyUI-Cine-con-IA` y ejecuta:

```bash
git pull
```

Si lo instalaste con el ZIP, borra la carpeta y descomprime la versión nueva. En los dos casos reinicia ComfyUI. Las novedades de cada versión están en [Releases](https://github.com/chaLords/ComfyUI-Cine-con-IA/releases) y en el [historial de cambios](CHANGELOG_ES.md).

### ComfyUI-Manager y Comfy Registry

El paquete está registrado en Comfy Registry con el id `cine-con-ia`, pero sus versiones siguen pendientes de revisión, así que puede que el Manager no lo muestre al buscar **Cine con IA**. Mientras tanto, instálalo con Git o con el ZIP. Cuando el registro lo apruebe también se podrá instalar con:

```bash
comfy node install cine-con-ia
```

## Flujo recomendado

```text
Proporción y Tamaño ─┐
Duración ────────────┼─> Escena ─> Render ─> Escalar y Refinar ─> Salida ─> Guardar Video
Prompt ──────────────┤      ▲          ▲              ▲
Cargar modelo ───────┘      └──────────┴──────────────┘
```

Conexiones importantes:

1. Conecta `positive` de **Escena** a **Render**.
2. Conecta `positive_escalar` de **Escena** a **Escalar y Refinar**. Esta salida no conserva el anclaje de la imagen guía del primer tamaño y evita incompatibilidades durante el segundo pase.
3. Conecta el `latent` del primer pase a **Escalar y Refinar**, o desactiva ese nodo para hacer pruebas rápidas.
4. Conecta `video` de **Salida** a un nodo **Guardar Video**.

## Uso del nodo Prompt

### MiniMax H3

Organiza el prompt en seis apartados:

1. `subject_definitions`
2. `summary`
3. `retention_analysis`
4. `detailed_description`
5. `overall_soundscape`
6. `non_diegetic_music`

El selector de cámara puede sustituir una toma ya escrita o insertar una nueva instrucción dentro de `detailed_description`. La pestaña H3 ofrece además las 14 tomas verificadas por [LoopForge](https://loopforge.cc/projects/h3-camera-shots/). Una receta escribe el encuadre de apertura de la toma, la acción que necesita el sujeto y la frase de cámara del prompt publicado por LoopForge, palabra por palabra; los pronombres siguen al `<Subject 1>` de `subject_definitions`. Cuando la frase de LoopForge nombra su propia escena, la receta usa la versión general de sus [recetas de tomas](https://github.com/loopforge0/minimaxh3-shots-skills/tree/main/.claude/skills/h3-camera-shots/shots) y deja `{HUECOS}` como `{THE_SPACE}` para que los rellenes; el prompt no se construye mientras quede uno vacío. Tanto la receta como la trayectoria pegada desde una IA se conservan completas en el prompt final. Los botones simples de plano, ángulo y movimiento siguen disponibles para una toma libre; **Cambiar la toma en el texto** sustituye deliberadamente la receta por esos controles. Comprueba **Ver prompt final** antes de renderizar.

**El camino corto: elige la receta y pulsa «Armar el prompt con la receta elegida».** Se abre una ventana que pregunta lo que la receta no sabe —quién sale, dónde está, qué hay detrás y qué le pasa por dentro— y al aceptar escribe las seis secciones completas con el formato de MiniMax: la definición del sujeto con su bloqueo de identidad, el resumen con `[reference generation]`, el análisis de retención, el estilo y el plano, el sonido y la música. La receta aporta la cámara, el encuadre de apertura y la acción con la que se verificó; tú solo pones tu escena. Si la receta necesita otro personaje o datos propios, los pide en la misma ventana, con un ejemplo dentro de cada campo.

Las recetas solo mueven la cámara en las condiciones de prueba de LoopForge, y varias son imprescindibles:

- **Una lámina de identidad por personaje y ninguna imagen del escenario.** Describe el lugar en texto. LoopForge midió que una placa de fondo reduce el movimiento de cámara aproximadamente a la mitad. `<Picture N>` es posicional: `referencia_1` es `<Picture 1>` diga lo que diga el texto.
- **`[reference generation]`**, nunca `[keyframe completion]`, y nunca llames a la lámina primer fotograma.
- **124 fotogramas** (5,17 s a 24 fps) para tomas de un movimiento; **192** (8 s) para yo-yo zoom y pantalla dividida.
- **20 pasos, `res_multistep` / `simple`, sin LoRA turbo.** Un render turbo de 4 pasos suprime casi todo el movimiento de cámara.
- **Sin segundos ni hitos.** H3 respeta el orden de los sucesos, no su momento.
- Un personaje que debe quedarse en su sitio se escribe *standing in place, breathing softly…*, nunca *completely still*: una pose imposible le quitó a la órbita cerca del 80% del recorrido.

Whip pan necesita una segunda lámina de personaje y rack focus una segunda y una tercera; cámara en mano, snorricam y grúa ascendente necesitan que el sujeto camine o corra. Todas las recetas se repitieron aquí con otro personaje y otros escenarios: los resultados, y qué duración y proporción necesita cada una, están en [las pruebas de las recetas](docs/CAMERA_TESTS_ES.md). Son recetas de prompting, no controles físicos garantizados. Una órbita se juzga en sus fotogramas: de frente → de espaldas → de frente. LoopForge advierte que el fondo final no coincide exactamente con el inicial.

Para tomas H3 guiadas por imagen, **Escena** ofrece dos modos de guía:

- `exacta · fija fotograma 0` conserva la guía conectada como fotograma latente exacto. Úsalo cuando el comienzo deba coincidir con precisión.
- `flexible · prioriza cámara` usa la imagen como referencia visual sin el anclaje latente exacto. Úsalo para probar órbitas amplias, laterales, grúas y otros cambios de punto de vista. La imagen entra entonces como una referencia más, detrás de las conectadas, y toma el siguiente `<Picture N>`; si muestra el escenario, actúa como placa de fondo y reduce el movimiento de cámara a la mitad.

Solo una imagen indicada expresamente como primer fotograma fija la composición en `0.00 s`; una lámina de referencia de personaje no la fija. Cuando se mueve la cámara, la identidad y la geometría de la escena permanecen, pero el punto de vista y el paralaje pueden cambiar. Una órbita completa de 360° o un yo-yo zoom pueden volver al encuadre inicial, mientras que un crash zoom puede empezar después de una pausa. `amplia y lenta` sigue siendo una opción propia porque un arco amplio lento no equivale a un movimiento marcado rápido.

### LTX-2.5

Produce un único párrafo continuo y adapta la terminología de cámara al vocabulario de LTX. El campo de audio se añade al final del mismo prompt.

### Workflow 049: MiniMax H3 con GGUF Q4

El [049](examples/049.REALminimax-H3-CineconIA-Selector-GGUF-Q4-v1.json) conserva el 048 y suma **GGUF Q4** al Selector, junto al modelo oficial y Singularity. Arranca en 8 pasos de borrador; mantiene las referencias, el refinado, la salida con audio y el Cronómetro.

Guarda `minimax_h3_ref2va_pruned-Q4_K.gguf` en `models/diffusion_models/minimax/`. **Cargar modelo** detecta `.gguf` y delega en los nodos GGUF registrados, también para un codificador de texto GGUF si se elige uno. El 049 conserva el codificador y los VAE del 048. Para H3 hace falta un cargador compatible, como [ComfyUI-GGUF-Loader](https://github.com/ChrisColeTech/ComfyUI-GGUF-Loader); la versión de city96 revisada no reconoce su arquitectura. Usa una sola implementación de los nodos `UnetLoaderGGUF` y `CLIPLoaderGGUF` para evitar colisiones, y reinicia ComfyUI tras instalarla.

GGUF Q4 reduce el peso del modelo, pero no garantiza menor tiempo de render: depende del coste de descompresión y de cuántas transferencias entre RAM y GPU evite. Compara con la misma escena, semilla y pasos; no hay tiempos medidos para este ejemplo.

### Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5 y Mochi 1

Cada modelo tiene su propia pestaña y una guía distinta para conversar con una IA. El flujo previsto es:

1. Copiar la instrucción de la pestaña elegida y pegarla en una IA.
2. Responder sus preguntas sobre el plano.
3. Pegar en el nodo el bloque etiquetado que devuelve.
4. Revisar los campos separados. El nodo los une en el orden adecuado y entrega `prompt` y `negative` como salidas independientes.

Los campos son una mesa de edición, no una sintaxis nueva impuesta al modelo. Wan prioriza movimiento y continuidad de cámara; Hunyuan sigue el orden documentado de sus componentes; CogVideoX usa una descripción temporal detallada dentro del límite de 224 tokens de su codificador; Mochi favorece movimiento concreto y fotorealista.

### Libre

Une dos campos con un separador configurable sin reescribir el contenido. Sirve para modelos actuales o futuros que utilicen otro formato.

## Fuentes oficiales de modelos y compatibilidad

Las guías de prompt se basan en la documentación de los autores, mientras que la compatibilidad con ComfyUI se comprueba por separado:

- [Ficha de MiniMax H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) y [paquete/workflows para ComfyUI](https://huggingface.co/Comfy-Org/MiniMax-H3)
- [Ficha de LTX-2.5](https://huggingface.co/Lightricks/LTX-2.5)
- [Wan 2.2 I2V](https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B), [Wan 2.2 T2V](https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B) y [ejemplos oficiales de ComfyUI](https://comfyanonymous.github.io/ComfyUI_examples/wan22/)
- [Ficha de HunyuanVideo 1.5](https://huggingface.co/tencent/HunyuanVideo-1.5)
- [CogVideoX 1.5 T2V](https://huggingface.co/zai-org/CogVideoX1.5-5B) y [CogVideoX 1.5 I2V](https://huggingface.co/zai-org/CogVideoX1.5-5B-I2V)
- [Ficha de Mochi 1](https://huggingface.co/genmo/mochi-1-preview) y [ejemplo oficial de ComfyUI](https://comfyanonymous.github.io/ComfyUI_examples/mochi/)
- [Repositorio de ComfyUI y lista de soporte nativo](https://github.com/Comfy-Org/ComfyUI)

## Modelos y archivos

Los desplegables leen directamente las carpetas configuradas por ComfyUI:

- `models/diffusion_models`: modelo de difusión.
- `models/text_encoders`: codificador de texto.
- `models/vae`: VAE de video y VAE de audio.
- `models/loras`: LoRAs opcionales.
- `models/vae_approx`: VAE pequeño para vista previa.
- `models/latent_upscale_models`: escalador latente 3D.
- `models/frame_interpolation`: modelo de interpolación.

Los nombres concretos dependen de los modelos instalados en tu equipo y aparecerán automáticamente en cada selector.

Para MiniMax H3, el nodo **Modelos** ofrece también el checkpoint opcional
`Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors`. Es un checkpoint
Ref2VA completo (aproximadamente 21 GB), no un LoRA, y se descarga desde el
[repositorio de Singularity](https://huggingface.co/WarmBloodAban/Minimax-h3_Singularity)
en `models/diffusion_models`. Sigue siendo opcional y nunca se descarga por sí
solo. Después de descargarlo, actualiza las listas de modelos o reinicia ComfyUI
y selecciónalo en **Cargar modelo** manteniendo el perfil MiniMax H3.

## Memoria y rendimiento

La generación de video consume mucha VRAM. El nodo de carga puede dividir atención y FFN en grupos para reducir el pico de memoria a cambio de velocidad. El refinado aumenta el coste aproximadamente con el cuadrado de la escala: por ejemplo, `x2` procesa cerca de cuatro veces el área del primer pase.

Si el refinado no cabe en memoria, prueba en este orden:

1. Reducir la escala, por ejemplo de `1.7` a `1.5`.
2. Reducir los megapíxeles del primer pase.
3. Aumentar el troceado de atención o FFN.
4. Desactivar temporalmente el escalado para conservar el primer pase.

## Privacidad

Los nodos no incluyen telemetría ni seguimiento. El único acceso a la red es el del nodo **Modelos**: cuando pulsas su botón de descarga, baja los archivos que elegiste desde sus repositorios públicos de Hugging Face a `models/`. Nada se descarga solo, y todo lo demás ocurre dentro de tu instalación local de ComfyUI.

## Desarrollo

Para comprobar la sintaxis y las funciones independientes de ComfyUI:

```bash
python -m compileall -q .
python -m unittest discover -s tests -v
```

Los identificadores internos de los nodos (`CineCargarH3`, `CineEscenaH3`, etc.) deben mantenerse estables para no romper workflows guardados; no son los nombres que se muestran en ComfyUI.

## Estado del proyecto

Proyecto en desarrollo activo. Se recomienda conservar una copia de los workflows importantes antes de actualizar.

## Licencia

Publicado bajo la [licencia MIT](LICENSE). Puedes usar, modificar y redistribuir el código conservando el aviso de copyright y la licencia.

Las catorce recetas de cámara para MiniMax H3 reproducen palabra por palabra las frases publicadas por Loop Forge. Ese trabajo tiene licencia MIT, Copyright (c) 2026 Loop Forge, y su aviso y el texto de la licencia se conservan en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), junto con las guías de MiniMax que sigue el formato de prompt de este nodo.

## Laboratorio H3 modular

Prompt simple de una caja, director visual de cámara y optimizador de VRAM: [cambios y uso](docs/H3_MODULAR_V2_ES.md). Workflow de prueba: [039 H3 Modular v2](examples/039.REALminimax-H3-Modular-v2.json). Los perfiles requieren calibración con renders.
