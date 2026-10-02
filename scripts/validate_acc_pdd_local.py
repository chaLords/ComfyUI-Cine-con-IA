"""Validación CPU con ComfyUI real y Acc oficial; no carga el tronco ni renderiza.

Ejecutar con el Python de ComfyUI. --model es el safetensors Ref2VA pruned
instalado, --acc la LoRA original y --comfy-root la raíz del core de ComfyUI.
La arquitectura completa usa tensores meta. Solo el FinalLayer pruned se
materializa para comprobar las proyecciones y restauración de parches.
"""

import argparse
import gc
import json
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comfy-root", required=True, type=Path)
    parser.add_argument("--acc", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    args = parser.parse_args()
    sys.path.insert(0, str(args.comfy_root.resolve()))
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    # Este proceso aislado valida CPU incluso cuando el runtime tiene CUDA.
    sys.argv = [sys.argv[0], "--cpu"]
    import comfy.options
    comfy.options.enable_args_parsing()
    import torch
    import torch.nn.functional as F
    import comfy.ops
    from comfy.ldm.minimax.model import MiniMaxH3Model
    from comfy.model_patcher import ModelPatcher
    from comfy.model_sampling import ModelSamplingAV, CONST
    from comfy.samplers import calculate_sigmas, sampler_object
    from comfy.patcher_extension import WrapperExecutor
    from safetensors import safe_open
    from cineconia_h3.acc_pdd import MARKER, apply_acc_pdd, validate_checkpoint

    torch.set_num_threads(4)
    torch.set_grad_enabled(False)
    torch.manual_seed(833)
    report = {"status": "CPU; no render GPU", "torch": torch.__version__, "cases": []}
    with safe_open(str(args.acc), framework="pt", device="cpu") as reader:
        specs = validate_checkpoint(reader)
        report["tensors"] = len(reader.keys())
        report["adapters"] = len(specs)
    class Sampling(ModelSamplingAV, CONST):
        pass

    for pruned in (False, True):
        with torch.device("meta"):
            diffusion = MiniMaxH3Model(
                adaln_curve_grid=1025 if pruned else None,
                time_embed_dim=8 if pruned else 2688,
                device=torch.device("meta"), dtype=torch.bfloat16,
                operations=comfy.ops.manual_cast)
        if pruned:
            with safe_open(str(args.model), framework="pt", device="cpu") as reader:
                diffusion.adaln_t_table = reader.get_tensor("adaln_t_table")
                final_state = {k.removeprefix("final_layer."): reader.get_tensor(k)
                               for k in reader.keys() if k.startswith("final_layer.")}
                # Comprobar también las formas reales INT8 de cada destino.
                for spec in specs:
                    key = spec.target.removeprefix("diffusion_model.")
                    expected = tuple(diffusion.state_dict()[key].shape)
                    actual = tuple(reader.get_slice(key).get_shape())
                    assert actual == expected, (key, actual, expected)
            diffusion.final_layer.load_state_dict(final_state, strict=True, assign=True)
        base = torch.nn.Module()
        base.diffusion_model = diffusion
        base.model_sampling = Sampling()
        base.model_sampling.set_parameters(shift=6, audio_shift=3)
        original = ModelPatcher(base, torch.device("cpu"), torch.device("cpu"))
        patched, note = apply_acc_pdd(original, str(args.acc), args.model.name)
        assert not original.patches and not original.object_patches
        assert original.get_model_object("model_sampling").shift == 6
        sampling = patched.get_model_object("model_sampling")
        sigmas = calculate_sigmas(sampling, "simple", 8)
        runtime = patched.get_wrappers("diffusion_model", MARKER)[0].__self__
        runtime.validate_schedule(sigmas)
        assert sampling.audio_shift == 3 and sampling.shift == 12
        assert len([p for ps in patched.patches.values() for p in ps]) == (412 if pruned else 362)
        case = dict(patched.model_options["transformer_options"][MARKER])
        case["layout"] = "pruned/INT8 header + native FinalLayer" if pruned else "full native meta architecture"
        case["registered_patches"] = sum(map(len, patched.patches.values()))
        # Comprobar la API de wrappers con el sampler Euler real antes de inferir.
        executor = WrapperExecutor.new_class_executor(
            lambda *a, **k: "validated", type("Guider", (), {"cfg": 1.0})(),
            patched.get_wrappers("outer_sample", MARKER))
        assert executor.execute(None, None, sampler_object("euler"), sigmas) == "validated"
        if pruned:
            final = diffusion.final_layer
            old_forward = final.video_out.forward
            patched.patch_model(load_weights=False)
            try:
                options = dict(patched.model_options["transformer_options"], sample_sigmas=sigmas)
                x = torch.randn(3, 5376, dtype=torch.bfloat16)
                t_emb = diffusion.adaln_t_table[[0, 900]]
                shift, scale = final.adaln_proj(t_emb)
                video_h = (final.norm(x[:2]) * (1 + scale[0]) + shift[0]).float()
                audio_h = (final.norm(x[2:]) * (1 + scale[1]) + shift[1]).float()
                def run_final(*a, **k):
                    return final(x, t_emb, (0, 2, 0), (2, 3, 1), sigmas[step], sigmas, (12.0, 3.0))
                max_error = 0.0
                with safe_open(str(args.acc), framework="pt", device="cpu") as reader:
                    for step in (7, 0, 3, 1, 6, 2, 5, 4):
                        runner = WrapperExecutor.new_executor(run_final, patched.get_wrappers("diffusion_model", MARKER))
                        v, a = runner.execute(None, sigmas[step:step+1] * 1000, None, options)
                        for output, h, prefix, flow_shift in ((v, video_h, "proj_out", 12),
                                                               (a, audio_h, "audio_proj_out", 3)):
                            weight = reader.get_tensor(prefix + ".weight")
                            bias = reader.get_tensor(prefix + ".bias")
                            total, duration = torch.zeros_like(output), 0.0
                            for index in range(4 * step, 4 * step + 4):
                                s0, s1 = 1 - index / 32, 1 - (index + 1) / 32
                                dt = flow_shift * s0 / (1 + (flow_shift - 1) * s0) - flow_shift * s1 / (1 + (flow_shift - 1) * s1)
                                total += dt * F.linear(h, weight[index].float(), bias[index].float())
                                duration += dt
                            expected = total / duration
                            max_error = max(max_error, float((output - expected).abs().max()))
                            torch.testing.assert_close(output, expected, atol=5e-5, rtol=5e-5)
                case["max_projection_abs_error"] = max_error
            finally:
                patched.unpatch_model(unpatch_weights=False)
            assert final.video_out.forward == old_forward
            assert original.get_model_object("model_sampling").shift == 6
            case["object_patches_restored"] = True
        report["cases"].append(case)
        print(note, flush=True)
        del patched, original, base, diffusion, runtime
        gc.collect()
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
