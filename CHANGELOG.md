<p align="center">
  <strong>English</strong> · <a href="CHANGELOG_ES.md">Español</a>
</p>

# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

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
