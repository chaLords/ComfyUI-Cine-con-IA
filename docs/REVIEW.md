# Workflow and node review — September 18, 2026

[Español](REVIEW_ES.md)

## Verified state

The review started at `19ea9b3`. Installed code matched the repository. Six local commits were awaiting push: prompt tabs/statistics, loader profiles, family settings, the Models node and two camera fixes. Decorative-widget serialization repair and empty LoRA slots with zero strength are still present.

The inspected Cine con IA workflow connects Prompt → Scene → Render → Upscale and Refine → Output, with a guide image anchored at frame 0. Its saved prompt fields are empty, so it does not contain the last generation's text. ComfyUI was not listening on port 8188; execution history and video generation could not be checked.

## Camera changes

Selected camera dimensions are now added when a handwritten box lacks recognizable camera vocabulary. LTX angle replacement and starting-frame replacement were corrected. Movement replacement requires an explicit `The camera` subject, preserves actions following semicolons and retains the selected intensity. Arbitrary prose cannot be resolved reliably by matching phrases: review any remaining contradictions.

Continuity rules no longer force hands into a close-up or stop a push-in. **Ver prompt final** previews text using the actual Python prompt builder without loading models. Connected inputs are marked as missing from this partial preview. **Cambiar la toma en el texto** uses the same builder and no longer cycles to another shot on repeated clicks.

A guide image anchors the composition at a particular frame. Starting at a three-quarter view needs a matching guide; alternatively, describe a later camera transition from the original view. Identity references and anchored guide images serve different purposes. Prompt correctness does not guarantee visual adherence.

## Remaining work for a universal workflow

The loader selector is implemented, but the full graph is not yet adaptive. Scene calls `MiniMaxH3ReferenceToVideo`, refinement expects H3 latents and Output separates video/audio. Family-specific conditioning, sampling, refinement and output adapters, plus graph synchronization, remain necessary.

The loader exposes one encoder and one diffusion model. Hunyuan 1.5 templates use two text encoders and CLIP Vision; Wan 2.2 14B uses high- and low-noise models. Selecting their files does not complete these pipelines. Explicit saving of personal presets with LoRA chains is also pending.

## AcademiaSD example and proposed models

The AcademiaSD v18 JSON selects Singularity ref2va v1.3 int8 through a switch. It contains a v4 step600 `MiniMaxH3TurboLoRA` at 0.8, a six-step simple schedule, heunpp2 sampling and shifts 12/6. Its refinement branch uses a 3D latent upscaler and four manual-sigma steps. These are saved example values, not locally verified recommendations; switches and bypass modes determine which branches execute.

The [Singularity model card](https://huggingface.co/WarmBloodAban/Minimax-h3_Singularity) recommends a different accelerator, `minimax_h3_ref2v_turbo_4step_v0.1`. Treat it and the example's v4 separately. The author's image-quality claims need local comparison.

The [LBH upscaler](https://huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler) targets H3's 24-channel latents and belongs in `models/latent_upscale_models/`; it is not a universal upscaler. No weights or dependencies were downloaded. The YouTube video could not be retrieved; this review relies on the JSON and model cards.

## Validation

45 Python tests passed and JavaScript syntax was checked. Live UI validation and an A/B video comparison with identical seed, model, references and settings remain pending.
