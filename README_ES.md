<p align="center">
  <a href="README.md">English</a> · <strong>Español</strong>
</p>

<p align="center">
  <img src="docs/assets/logo.png" alt="Cine con IA" width="190">
</p>

<h1 align="center">ComfyUI · Cine con IA</h1>

<p align="center">
  <strong>Nueve nodos para rodar vídeo con IA en local, sin convertir el workflow en una maraña.</strong><br>
  Proporción y Tamaño • Duración • Prompt • Cargar modelo • Escena • Render • Escalar y Refinar • Salida • Modelos
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-blue?style=flat-square"></a>
  <img alt="ComfyUI 0.34.2 o superior" src="https://img.shields.io/badge/ComfyUI-%E2%89%A5%200.34.2-6b46c1?style=flat-square">
  <img alt="Nueve nodos" src="https://img.shields.io/badge/nodos-9-e08a3c?style=flat-square">
  <img alt="Interfaz en español" src="https://img.shields.io/badge/interfaz-espa%C3%B1ol-2ea043?style=flat-square">
  <a href="https://www.youtube.com/@cineconia.oficial"><img alt="Canal de YouTube" src="https://img.shields.io/badge/youtube-Cine%20con%20IA-red?style=flat-square&logo=youtube&logoColor=white"></a>
</p>

<p align="center">
  <a href="#instalación">📥 Instalar</a> ·
  <a href="#qué-incluye">🎬 Los nodos</a> ·
  <a href="#flujo-recomendado">▶️ Cómo se usa</a> ·
  <a href="#uso-del-nodo-prompt">✍️ El nodo Prompt</a> ·
  <a href="CHANGELOG_ES.md">🛠 Novedades</a> ·
  <a href="https://www.youtube.com/@cineconia.oficial">📺 Tutoriales</a>
</p>

---

Nodos personalizados para simplificar los flujos cinematográficos de vídeo con IA en ComfyUI. Los nombres visibles son deliberadamente genéricos para que el paquete pueda crecer y trabajar con varios modelos. Su primer flujo completo integra MiniMax H3 —preparación, prompt, carga, generación, refinado y salida— mientras que el nodo Prompt ofrece pestañas específicas para MiniMax H3, LTX-2.5, Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, Mochi 1 y un modo Libre independiente del modelo.

La interfaz está en español y añade controles visuales, avisos de memoria, progreso de render, ayudas contextuales y herramientas para planificar la cámara sin convertir el workflow en una maraña de nodos técnicos.

> [!IMPORTANT]
> Este repositorio contiene los nodos y su interfaz. No incluye ComfyUI, modelos, LoRAs, VAEs ni pesos de interpolación o escalado. El nodo **Modelos** te los descarga a su carpeta con un botón.

## Qué incluye

| Nodo | Función |
| --- | --- |
| **Cine con IA · Proporción y Tamaño** | Calcula ancho y alto desde proporciones de cine, redes sociales o fotografía. Permite trabajar por megapíxeles o lado principal y ajusta el resultado al múltiplo requerido por el modelo. |
| **Cine con IA · Duración** | Convierte segundos y FPS en una cantidad válida de fotogramas. Incluye la rejilla de MiniMax H3 y ajustes avanzados para otros modelos. |
| **Cine con IA · Prompt** | Construye y separa prompts específicos para MiniMax H3, LTX-2.5, Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, Mochi 1 o cualquier modelo mediante el modo Libre. |
| **Cine con IA · Cargar modelo** | Carga el modelo, codificador de texto y VAEs de video/audio. Encadena hasta cuatro LoRAs y aplica optimizaciones de VRAM, sigma shift y vista previa cuando están disponibles. |
| **Cine con IA · Escena** | Crea el condicionamiento y el latente audiovisual de H3. Acepta hasta tres imágenes de referencia y una imagen guía anclada a un fotograma. |
| **Cine con IA · Render** | Ejecuta el primer pase de muestreo con controles directos de pasos, sampler, scheduler, semilla y denoise. |
| **Cine con IA · Escalar y Refinar** | Escala el latente de video con un upscaler 3D y realiza un segundo pase de refinado. Incluye perfiles de 3, 4 y 5 pasos y mensajes claros ante falta de VRAM. |
| **Cine con IA · Salida** | Decodifica video y audio, interpola fotogramas opcionalmente y entrega un objeto `VIDEO`, fotogramas, audio, FPS e información del resultado. |
| **Cine con IA · Modelos** | Enseña qué archivos necesita cada familia de modelos, marca los que ya tienes en disco y descarga los que falten directamente a su carpeta dentro de `models/`, con progreso y reanudación. |

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
- Un modelo compatible de interpolación de fotogramas si se activa la interpolación en **Salida**.

Las dependencias Python de los nodos son las que ya proporciona ComfyUI; este paquete no instala bibliotecas adicionales.

## Instalación

### ComfyUI-Manager

Una vez publicada la primera versión en Comfy Registry:

1. Abre **Manager** en ComfyUI.
2. Entra en **Custom Nodes Manager**.
3. Busca **Cine con IA**.
4. Pulsa **Install** y reinicia ComfyUI.

También se podrá instalar con Comfy CLI:

```bash
comfy node install cine-con-ia
```

### Con Git

Abre una terminal en `ComfyUI/custom_nodes` y ejecuta:

```bash
git clone https://github.com/chaLords/ComfyUI-Cine-con-IA.git
```

### Instalación manual

1. Descarga el repositorio como archivo ZIP.
2. Descomprime la carpeta dentro de `ComfyUI/custom_nodes`.
3. Comprueba que la ruta final sea `ComfyUI/custom_nodes/ComfyUI-Cine-con-IA/__init__.py`.
4. Reinicia ComfyUI y busca la categoría **Cine con IA**.

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

El selector de cámara puede sustituir una toma ya escrita o insertar una nueva instrucción dentro de `detailed_description`. Las reglas de oficio opcionales ayudan a conservar manos, objetos, encuadre e identidad durante el plano.

### LTX-2.5

Produce un único párrafo continuo y adapta la terminología de cámara al vocabulario de LTX. El campo de audio se añade al final del mismo prompt.

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

Los nodos no incluyen telemetría, seguimiento ni llamadas de red. Todo el procesamiento del paquete se realiza dentro de la instalación local de ComfyUI.

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
