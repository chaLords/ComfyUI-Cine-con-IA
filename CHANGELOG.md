<p align="center">
  <strong>English</strong> · <a href="CHANGELOG_ES.md">Español</a>
</p>

# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.3.0] - 2026-09-18

### Added

- New **Models** node: lists what each family needs, marks what is already on disk, and downloads the rest straight into the right folder under `models/`.
- Downloads resume where they left off if the connection drops, and report progress per file inside the node.
- The catalogue lives in the package, not in the workflow: the browser only ever sends a family name and an index, so a workflow cannot redirect a download or choose where it lands.
- Footer with the project links.

### Notes

- LTX-2.5 is served from a repository with terms to accept. The node says so and points at the licence page; set `HF_TOKEN` or run `huggingface-cli login` once.

## [1.2.0] - 2026-09-18

### Added

- Model profile selector in the Load Model node: MiniMax H3, LTX-2.5, Wan 2.2, Hunyuan 1.5, and Custom.
- Picking a profile proposes the matching diffusion model, text encoder, and VAE files, and sets its own shift and VRAM values.
- Custom makes no changes and infers the family from the chosen file names.

### Changed

- The loader is no longer MiniMax-only: the text encoder mode, the sigma shift node, the audio VAE, and the MiniMax VRAM patches now follow the selected profile.
- Families without audio no longer load a second VAE, and the audio VAE output mirrors the video one.
- The sigma shift tries the nodes its family uses and, if none is installed, leaves the model untouched instead of failing.

### Fixed

- File matching now resolves collisions between families (`hunyuan_video_vae` contains `video_vae`; `umt5_xxl` contains `t5`) by preferring the most specific hint.

### Fixed

- Hunyuan 1.5 now loads its text encoder in `HUNYUAN_VIDEO_15` mode with Qwen2.5-VL; it was using the 1.0 mode and llava/llama hints, which belong to HunyuanVideo 1.0.
- LTX-2.5 now looks for its Gemma encoder instead of T5, and loads its audio VAE — it does generate audio.
- MiniMax H3 now proposes the `ref2va` model and the int8 video VAE instead of `fl2va` and the fp16 one.
- `.gguf` files are proposed last, since this loader uses `load_diffusion_model` and cannot open them.

## [1.1.0] - 2026-09-17

### Added

- Dedicated Prompt tabs and AI-assistant recipes for Wan 2.2, HunyuanVideo 1.5, CogVideoX 1.5, and Mochi 1.
- Automatic parsing into model-specific editable fields, with separate positive and negative outputs.
- Official Hugging Face and ComfyUI compatibility references in both READMEs.
- Real per-step timing charts, average step time, and ETA panels for Render and Upscale & Refine.

### Changed

- Prompt tabs wrap responsively on narrower nodes.
- CogVideoX 1.5 guidance now follows its documented 224-token encoder limit.
- Existing workflow values and the first Prompt output remain in their original positions for backward compatibility.

## [1.0.0] - 2026-09-17

### Added

- Initial release of the eight Cine con IA nodes.
- Complete MiniMax H3 workflow: loading, scene setup, rendering, refinement, and output.
- Prompt modes for MiniMax H3, LTX-2.5, and free-form text.
- Visual controls, integrated progress, shot history, and VRAM guidance.
- Metadata and automation for Comfy Registry and ComfyUI-Manager.
