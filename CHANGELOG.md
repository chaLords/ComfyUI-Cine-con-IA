<p align="center">
  <strong>English</strong> · <a href="CHANGELOG_ES.md">Español</a>
</p>

# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.4.0] - 2026-09-19

### Added

- The fourteen recipes re-run on a different character, with what each one needs, in [docs/CAMERA_TESTS.md](docs/CAMERA_TESTS.md). The 360° orbit completes at 124 frames and fails at 192, and the dutch angle came out correct only on a second seed.
- GitHub Releases. Every earlier version from 1.0.0 to 1.3.9 is tagged on its own commit, and pushing a `vX.Y.Z` tag now publishes its Release automatically with that version's entry from both changelogs. The workflow refuses a tag that does not match `pyproject.toml` or a version with no changelog entry.

### Changed

- The 14 MiniMax H3 camera recipes now carry LoopForge's published camera clauses word for word, each with the opening framing and the subject action that shot was verified with. Earlier recipes were paraphrases: the eyes-in stopped at "most of the final frame" instead of the eye filling it edge to edge, the whip pan asked for motion blur (LoopForge found that requesting blur does nothing), and the crane rise opened wide and from above instead of on a waist-up runner.
- Where LoopForge's clause names its own scene, the recipe uses the generalised version from its shot recipes and leaves `{SLOTS}` for the user's scene. The snorricam follows the straight-walk recipe that LoopForge measured as holding the face best, not the party showcase on its page.
- Recipe pronouns follow `<Subject 1>` in `subject_definitions` (he, she, or they).
- The copied AI instruction now lists the 14 recipes word for word, includes the recipe selected in the node, and states LoopForge's measured conditions: one identity plate and no background plate, `[reference generation]`, 124 or 192 frames, 20 steps without turbo, and no timestamps.

### Fixed

- The 360° orbit reverted from front → right → rear back along the same side. Its recipe had replaced LoopForge's verified clause with clockwise waypoints timed to the second; H3 does not place events in time. The recipe is again LoopForge's: *arc shot … with large amplitude at fast speed, sweeping a complete circle … and coming back to the front*.
- The AI instruction no longer asks for timed camera waypoints, and explains that `<Picture N>` follows the wiring order of **Scene**.
- A prompt with an unfilled `{SLOT}` is refused with a message naming it, instead of sending the placeholder to a half-hour render. The prompt preview shows that message.
- The node shows a warning when a recipe's verified frame count differs from the **Duration** node.

## [1.3.9] - 2026-09-19

### Fixed

- The 360° orbit recipe and AI-writing guide now specify one continuous direction through front, right profile, rear, opposite left profile, and front. A return through the same side no longer counts as a completed circle in the guidance.
- The recipe remains an experiment: text prompting cannot guarantee a geometrically exact camera trajectory.

## [1.3.8] - 2026-09-19

### Added

- Fourteen editable MiniMax H3 camera-shot recipe buttons, aligned with [LoopForge's published H3 experiments](https://loopforge.cc/projects/h3-camera-shots/): crash zoom, yo-yo zoom, dolly zoom, Snorricam, rack focus, split screen, whip pan, Dutch angle, super dolly in, eyes in, aerial pullback, handheld, 360° orbit, and crane rise.
- A 20-step Render shortcut for comparison tests; existing workflow step values are unchanged.

### Fixed

- AI-generated and named-shot camera routes now retain their timing, compound moves, and final viewpoint instead of being flattened by the simple camera controls.
- The AI instruction no longer forces every move to start immediately or finish on a different composition; a full 360° orbit and a yo-yo zoom can return to their starting view.
- A character reference plate is no longer treated as an exact first-frame guide merely because it is labelled `<Picture 1>`.

These recipes are starting points, not guaranteed model controls. Some require two subjects, multiple depth planes, or a moving subject. LoopForge's test conditions are documented in its [shot index](https://github.com/loopforge0/minimaxh3-shots-skills/blob/main/.claude/skills/h3-camera-shots/shots/INDEX.md).

## [1.3.7] - 2026-09-18

### Added

- Scene guide modes: exact frame-0 anchoring or a flexible visual reference that prioritizes camera freedom.
- A dedicated `wide and slow` H3 camera intensity for large controlled arcs.

### Fixed

- Moving-camera prompts now scope the opening composition to `0.00 s` and require a continuously changing viewpoint and an observable final composition.
- Orbit intensity is no longer discarded by its parallax clause.
- The AI-assistant recipe now prevents reference-retention text from freezing the initial viewpoint and follows Singularity's published camera-chain guidance.

## [1.3.6] - 2026-09-18

### Changed

- Render and Upscale & Refine statistics keep the first step as a horizontal progress line, then connect the initial, completed, and live step points with one continuous orange curve and a subtle filled area. Later transitions are no longer shown as detached points.

## [1.3.5] - 2026-09-18

### Added

- The Models node now offers the 21 GB Singularity Ref2VA v1.3 int8 checkpoint as an optional MiniMax H3 download. It is stored in `models/diffusion_models` and is never downloaded automatically.

### Changed

- Model-catalog entries can safely point to a different Hugging Face repository while preserving the existing family and destination-folder controls.

## [1.3.4] - 2026-09-18

### Fixed

- **Cambiar la toma en el texto** now writes the selected shot directly into the Camera field and keeps it visible for confirmation before prompt construction.

## [1.3.3] - 2026-09-18

### Fixed

- Camera controls fill missing instructions in handwritten camera text, including LTX angles.
- Starting-frame edits preserve movement destinations. Movement replacement requires an explicit camera subject, preserves semicolon-separated actions and retains selected intensity.
- Continuity rules respect requested framing. Applying a shot no longer cycles to another selection.

### Added

- Final prompt preview using the execution-time Python builder without generating video; connected inputs are marked as pending.
- Frame-zero guide warning and a bilingual review of the workflow, profiles and AcademiaSD example.

## [1.3.2] - 2026-09-18

### Fixed

- When a camera block names two shot sizes — where the shot starts and where the move ends, such as "framed as a medium shot ... tightening to a close-up" — the framing is now the one read and replaced. The tables were scanned in their own order, so "close-up" won simply by sitting higher in the list, and the chips ended up on the wrong shot size.

## [1.3.1] - 2026-09-18

### Fixed

- The hand-written camera box no longer overrides the shot-size, angle and movement lists. They are now substituted inside whatever is in the box, and the rest of what was written there is kept. A leftover box from an earlier shot used to silently cancel the chips, so a take selected as three-quarter with a zoom in rendered frontal and static.
- Angles written into the text can now be replaced in place; before, only shot size and movement could.
- A movement clause no longer stops at the decimal point of "8.00 seconds" and leaves ".00 seconds." dangling.

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
