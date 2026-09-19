<p align="center">
  <strong>English</strong> · <a href="README_ES.md">Español</a>
</p>

<p align="center">
  <img src="docs/assets/logo.png" alt="Cine con IA" width="190">
</p>

<h1 align="center">ComfyUI · Cine con IA</h1>

<p align="center">
  <strong>Nine nodes for shooting AI video locally, without turning the workflow into a tangle.</strong><br>
  Ratio &amp; Size • Duration • Prompt • Load Model • Scene • Render • Upscale &amp; Refine • Output • Models
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"></a>
  <img alt="ComfyUI 0.34.2 or newer" src="https://img.shields.io/badge/ComfyUI-%E2%89%A5%200.34.2-6b46c1?style=flat-square">
  <img alt="Nine nodes" src="https://img.shields.io/badge/nodes-9-e08a3c?style=flat-square">
  <img alt="Spanish interface" src="https://img.shields.io/badge/interface-Spanish-2ea043?style=flat-square">
  <a href="https://www.youtube.com/@cineconia.oficial"><img alt="YouTube channel" src="https://img.shields.io/badge/youtube-Cine%20con%20IA-red?style=flat-square&logo=youtube&logoColor=white"></a>
</p>

<p align="center">
  <a href="#installation">📥 Install</a> ·
  <a href="#included-nodes">🎬 The nodes</a> ·
  <a href="#recommended-workflow">▶️ How it is used</a> ·
  <a href="#using-the-prompt-node">✍️ The Prompt node</a> ·
  <a href="CHANGELOG.md">🛠 Changelog</a> ·
  <a href="https://www.youtube.com/@cineconia.oficial">📺 Tutorials</a>
</p>

---

Custom nodes that simplify cinematic AI video workflows in ComfyUI. The display names are deliberately generic so the pack can grow and work with several models. Its first complete flow integrates MiniMax H3 — preparation, prompt, loading, generation, refinement and output — while the Prompt node offers dedicated tabs for MiniMax H3, LTX-2.5, Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, Mochi 1 and a model-agnostic Free mode.

The interface is in Spanish and adds visual controls, memory warnings, render progress, contextual help and camera planning tools, without turning the workflow into a tangle of technical nodes.

> [!IMPORTANT]
> This repository contains the nodes and their interface. It does not include ComfyUI, models, LoRAs, VAEs or interpolation and upscaling weights. The **Models** node downloads them into the right folder with one button.

## Included nodes

| Node | Purpose |
| --- | --- |
| **Cine con IA · Proporción y Tamaño** | Calculates width and height from cinema, social-media, or photography aspect ratios. Supports megapixels or a fixed longest side and aligns the result to the multiple required by the model. |
| **Cine con IA · Duración** | Converts seconds and FPS into a valid frame count. Includes the MiniMax H3 frame grid and advanced settings for other models. |
| **Cine con IA · Prompt** | Builds and parses model-specific prompts for MiniMax H3, LTX-2.5, Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, Mochi 1, or any model through Free mode. |
| **Cine con IA · Cargar modelo** | Loads the model, text encoder, and video/audio VAEs. Chains up to four LoRAs and applies VRAM optimizations, sigma shift, and live preview when available. |
| **Cine con IA · Escena** | Creates H3 conditioning and the audiovisual latent. Accepts up to three reference images and a guide image anchored to a selected frame. |
| **Cine con IA · Render** | Runs the first sampling pass with direct controls for steps, sampler, scheduler, seed, and denoise. |
| **Cine con IA · Escalar y Refinar** | Upscales the video latent with a 3D upscaler and performs a second refinement pass. Includes 3-, 4-, and 5-step profiles and clear out-of-VRAM messages. |
| **Cine con IA · Salida** | Decodes video and audio, optionally interpolates frames, and returns a `VIDEO` object, frames, audio, FPS, and result information. |
| **Cine con IA · Modelos** (Models) | Shows which files each model family needs, marks the ones already on disk, and downloads the rest straight into the right folder under `models/`, with progress and resume. |

## Interface highlights

- Quick controls for aspect ratio, resolution, duration, FPS, scale, and sampling parameters.
- Live information about final resolution, megapixels, relative cost, real duration, and the recommended H3 range.
- Statistical progress panels for both passes, with a real step-time chart, last/average step time, percentage, and ETA.
- Up to four LoRAs applied as an ordered chain.
- Responsive prompt tabs for **MiniMax H3**, **LTX-2.5**, **Wan 2.2**, **Hunyuan 1.5**, **CogVideoX 1.5**, **Mochi 1**, and **Free**.
- Shot size, angle, and movement selectors with automatic English phrasing.
- Shot history saved inside the workflow to help vary camera coverage.
- Buttons to copy a source-based recipe for an AI assistant, paste its response, and automatically distribute each model's fields.
- Compatibility with workflows saved under earlier node display names.

## Model support and naming

The names shown in ComfyUI are generic: **Load Model**, **Scene**, **Render**, **Upscale & Refine**, and **Output**. This is intentional and leaves room for additional model backends without changing the workflow vocabulary.

The current full generation pipeline is implemented for **MiniMax H3**. Prompt preparation is model-independent and also includes **LTX-2.5**, **Wan 2.2**, **HunyuanVideo 1.5**, **CogVideoX 1.5**, **Mochi 1**, and **Free** modes. These additional tabs create positive and negative text that can be connected to the corresponding ComfyUI workflow; they do not replace that model's loader, conditioning, or sampler nodes.

Compatibility is checked against current ComfyUI support before a named model is added. ComfyUI lists native video support for Wan 2.2, LTX-Video, HunyuanVideo 1.5, CogVideoX, Mochi, and MiniMax H3. Keep ComfyUI updated because model support and workflow templates evolve over time.

Some internal identifiers still end in `H3`, such as `CineCargarH3`, `CineEscenaH3`, and `CineRenderH3`. These identifiers are hidden from normal use and are preserved exclusively for backward compatibility: changing them would break existing saved workflows.

## Requirements

- A recent [ComfyUI](https://github.com/Comfy-Org/ComfyUI) installation with the native MiniMax H3 nodes.
- The models and VAEs required by the MiniMax H3 workflow.
- [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes), recommended for attention/FFN chunking and live preview. The loader continues without these optimizations when KJNodes is unavailable.
- [Comfyui Minimax H3 Latent Upscaler](https://github.com/LBH-123-AI/Comfyui_Minimax_h3_latent_Upscaler), required only by **Escalar y Refinar**.
- A compatible frame-interpolation model when interpolation is enabled in **Salida**.

The nodes only use Python dependencies already supplied by ComfyUI; this package installs no additional Python libraries.

## Installation

### ComfyUI-Manager

After the first version is published to the Comfy Registry:

1. Open **Manager** in ComfyUI.
2. Open **Custom Nodes Manager**.
3. Search for **Cine con IA**.
4. Select **Install**, then restart ComfyUI.

It will also be installable through Comfy CLI:

```bash
comfy node install cine-con-ia
```

### Git

Open a terminal in `ComfyUI/custom_nodes` and run:

```bash
git clone https://github.com/chaLords/ComfyUI-Cine-con-IA.git
```

### Manual installation

1. Download the repository as a ZIP archive.
2. Extract it inside `ComfyUI/custom_nodes`.
3. Confirm that the final path is `ComfyUI/custom_nodes/ComfyUI-Cine-con-IA/__init__.py`.
4. Restart ComfyUI and look for the **Cine con IA** category.

## Recommended workflow

```text
Aspect Ratio & Size ─┐
Duration ────────────┼─> Scene ─> Render ─> Upscale & Refine ─> Output ─> Save Video
Prompt ──────────────┤      ▲         ▲              ▲
Load Model ──────────┘      └─────────┴──────────────┘
```

Important connections:

1. Connect `positive` from **Escena** to **Render**.
2. Connect `positive_escalar` from **Escena** to **Escalar y Refinar**. This output omits the first-resolution guide-image anchor and prevents shape incompatibilities during the second pass.
3. Connect the first-pass `latent` to **Escalar y Refinar**, or disable that node for quick tests.
4. Connect `video` from **Salida** to a **Save Video** node.

## Using the Prompt node

### MiniMax H3

The prompt is organized into six sections:

1. `subject_definitions`
2. `summary`
3. `retention_analysis`
4. `detailed_description`
5. `overall_soundscape`
6. `non_diegetic_music`

The camera selector can replace an existing shot instruction or insert a new one into `detailed_description`. Optional craft rules help preserve hands, held objects, framing, and subject identity throughout the shot.

For image-guided H3 shots, **Scene** provides two guide modes:

- `exact · locks frame 0` preserves the connected guide as an exact latent keyframe. Use it when the opening frame must match precisely.
- `flexible · prioritizes camera` uses the image as a visual reference without the exact latent anchor. Use it to test large arcs, trucks, pedestals, and other viewpoint changes.

The prompt builder treats an opening reference as the composition for `0.00 s` only. With a moving camera, identity and scene geometry remain consistent while viewpoint, screen position, visible surfaces, and parallax are expected to change. Camera motion is written with type, direction, amplitude, speed, followed subject, and an observable final composition. `wide and slow` is available separately because a large slow arc is not equivalent to a fast marked move.

### LTX-2.5

Produces a single continuous paragraph and adapts camera terminology to LTX vocabulary. The audio field is appended to the same prompt.

### Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, and Mochi 1

Each model has its own tab and its own AI-assistant recipe. The intended workflow is:

1. Copy the instruction from the selected tab and paste it into an AI assistant.
2. Answer its questions about the shot.
3. Paste the returned labeled block into the node.
4. Review the separated fields. The node joins them in model-specific order and emits `prompt` and `negative` as independent outputs.

The fields are an editing surface, not a new syntax imposed on the model. Wan emphasizes motion and camera continuity; Hunyuan follows its documented component order; CogVideoX uses a detailed temporal caption within its 224-token encoder limit; Mochi favors concrete photorealistic motion.

### Free

Joins two fields using a configurable separator without rewriting their contents. This mode supports current or future models that use a different prompt format.

## Official model and ComfyUI references

Prompt recipes are based on the model authors' documentation, with ComfyUI compatibility checked separately:

- [MiniMax H3 model card](https://huggingface.co/MiniMaxAI/MiniMax-H3) and [ComfyUI package/workflows](https://huggingface.co/Comfy-Org/MiniMax-H3)
- [LTX-2.5 model card](https://huggingface.co/Lightricks/LTX-2.5)
- [Wan 2.2 I2V](https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B), [Wan 2.2 T2V](https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B), and [official ComfyUI examples](https://comfyanonymous.github.io/ComfyUI_examples/wan22/)
- [HunyuanVideo 1.5 model card](https://huggingface.co/tencent/HunyuanVideo-1.5)
- [CogVideoX 1.5 T2V](https://huggingface.co/zai-org/CogVideoX1.5-5B) and [CogVideoX 1.5 I2V](https://huggingface.co/zai-org/CogVideoX1.5-5B-I2V)
- [Mochi 1 model card](https://huggingface.co/genmo/mochi-1-preview) and [official ComfyUI example](https://comfyanonymous.github.io/ComfyUI_examples/mochi/)
- [ComfyUI repository and native model support list](https://github.com/Comfy-Org/ComfyUI)

## Models and files

The selectors read directly from the folders configured by ComfyUI:

- `models/diffusion_models`: diffusion model.
- `models/text_encoders`: text encoder.
- `models/vae`: video VAE and audio VAE.
- `models/loras`: optional LoRAs.
- `models/vae_approx`: small VAE for live preview.
- `models/latent_upscale_models`: 3D latent upscaler.
- `models/frame_interpolation`: frame-interpolation model.

Exact filenames depend on the models installed on your system and appear automatically in each selector.

For MiniMax H3, the **Models** node also offers the optional
`Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors` checkpoint. It is
a complete Ref2VA checkpoint (about 21 GB), not a LoRA, and is downloaded from
the [Singularity repository](https://huggingface.co/WarmBloodAban/Minimax-h3_Singularity)
into `models/diffusion_models`. It remains optional and is never downloaded
automatically. After downloading it, refresh the model lists or restart ComfyUI,
then select it in **Load Model** while keeping the MiniMax H3 profile.

## Memory and performance

Video generation uses a significant amount of VRAM. The loader can split attention and FFN processing into chunks, reducing peak memory usage at the cost of speed. Refinement cost grows approximately with the square of the scale: for example, `x2` processes close to four times the first-pass area.

If refinement does not fit in memory, try the following in order:

1. Reduce the scale, for example from `1.7` to `1.5`.
2. Reduce the first-pass megapixel setting.
3. Increase attention or FFN chunking.
4. Temporarily disable upscaling and keep the first pass.

## Privacy

The nodes contain no telemetry, tracking, or network requests. All package processing stays inside the local ComfyUI installation.

## Development

Run the syntax and standalone-function checks with:

```bash
python -m compileall -q .
python -m unittest discover -s tests -v
```

Internal node identifiers (`CineCargarH3`, `CineEscenaH3`, and the others) must remain stable to preserve compatibility with saved workflows; they are not the names displayed in ComfyUI.

## Project status

This project is under active development. Keep a backup of important workflows before updating.

## License

Released under the [MIT License](LICENSE). You may use, modify, and redistribute the code as long as the copyright notice and license are retained.
