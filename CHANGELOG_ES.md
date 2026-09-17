<p align="center">
  <a href="CHANGELOG.md">English</a> · <strong>Español</strong>
</p>

# Changelog

Todos los cambios relevantes del proyecto se documentarán en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [Semantic Versioning](https://semver.org/lang/es/).

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
