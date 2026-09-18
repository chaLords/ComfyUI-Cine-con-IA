<p align="center">
  <a href="CHANGELOG.md">English</a> · <strong>Español</strong>
</p>

# Changelog

Todos los cambios relevantes del proyecto se documentarán en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [Semantic Versioning](https://semver.org/lang/es/).

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
