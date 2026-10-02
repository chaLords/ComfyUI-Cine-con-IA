"""Contrato de archivo, equivalencia algebraica y aislamiento del runtime PDD."""

import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from cineconia_h3 import acc_pdd as acc

try:
    import torch
    import torch.nn.functional as F
except ImportError:
    torch = None


class HeaderReader:
    def __init__(self):
        self.meta = dict(pdd_num_steps="32", pdd_block_size="4", lora_rank="64",
                         lora_alpha="64", lora_targets=",".join(acc.TARGETS))
        self.shapes = dict(acc.HEAD_SHAPES)
        for spec in acc.adapter_specs():
            self.shapes[spec.source + ".lora_down"] = (64, spec.inputs)
            self.shapes[spec.source + ".lora_up"] = (spec.outputs, 64)

    def metadata(self):
        return self.meta

    def keys(self):
        return self.shapes.keys()

    def get_slice(self, key):
        return SimpleNamespace(get_shape=lambda: self.shapes[key], get_dtype=lambda: "BF16")


class CheckpointTests(unittest.TestCase):
    def test_complete_official_header(self):
        reader = HeaderReader()
        self.assertEqual(len(acc.validate_checkpoint(reader)), 362)
        self.assertEqual(len(reader.keys()), 728)

    def test_each_missing_tensor_is_rejected(self):
        reader = HeaderReader()
        for key in list(reader.shapes):
            value = reader.shapes.pop(key)
            with self.assertRaisesRegex(ValueError, "incompleto"):
                acc.validate_checkpoint(reader)
            reader.shapes[key] = value

    def test_unknown_or_wrong_shape_tensor(self):
        reader = HeaderReader()
        reader.shapes["mystery.weight"] = (1,)
        with self.assertRaisesRegex(ValueError, "convertido"):
            acc.validate_checkpoint(reader)
        del reader.shapes["mystery.weight"]
        reader.shapes["proj_out.weight"] = (8, 96, 5376)
        with self.assertRaisesRegex(ValueError, "forma"):
            acc.validate_checkpoint(reader)

    def test_invalid_metadata(self):
        for key, value in [("lora_alpha", "nan"), ("lora_rank", "0"),
                           ("pdd_num_steps", "16"), ("pdd_block_size", "8"),
                           ("lora_targets", "to_q"), ("pdd_num_steps", "oops")]:
            reader = HeaderReader()
            reader.meta[key] = value
            with self.assertRaises(ValueError):
                acc.validate_checkpoint(reader)

    def test_variant_must_be_identifiable(self):
        self.assertEqual(acc._variant("MiniMax-H3-Ref2VA-Acc-8Step.safetensors"), "ref2va")
        for name in ("unknown", "fl2va_ref2va_hybrid"):
            with self.assertRaises(ValueError):
                acc._variant(name)


@unittest.skipIf(torch is None, "Torch es provisto por ComfyUI; instalarlo para las pruebas numéricas")
class NumericalTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(32)

    def test_fused_head_equals_integral_of_individual_outputs(self):
        x = torch.randn(3, 5)
        weights, biases = torch.randn(32, 4, 5), torch.randn(32, 4)
        for shift in (12.0, 3.0):
            fused_w, fused_b = acc.fuse_heads(weights, biases, shift)
            for step in range(8):
                # Referencia escalar independiente: suma de desplazamientos / dt total.
                total, dt_sum = torch.zeros(3, 4), 0.0
                for index in range(step * 4, step * 4 + 4):
                    s0, s1 = 1 - index / 32, 1 - (index + 1) / 32
                    dt = shift * s0 / (1 + (shift - 1) * s0) - shift * s1 / (1 + (shift - 1) * s1)
                    total += dt * F.linear(x, weights[index], biases[index])
                    dt_sum += dt
                torch.testing.assert_close(F.linear(x, fused_w[step], fused_b[step]), total / dt_sum)

    def test_curve_rebase_preserves_dense_lora_including_bias(self):
        table, constant, basis = torch.randn(40, 8), torch.randn(11), torch.randn(11, 8)
        grid = constant + table @ basis.T
        c, v, error = acc.fit_curve(table, grid)
        self.assertLess(error, 1e-6)
        down, up = torch.randn(2, 11), torch.randn(7, 2)
        dw, db = acc.rebase_adaln(up, down, c, v, alpha=2)
        expected = F.linear(F.linear(grid, down), up)
        torch.testing.assert_close(F.linear(table, dw, db), expected, atol=2e-5, rtol=2e-5)
        self.assertGreater(float((F.linear(table, dw) - expected).norm()), 1.0)

    def test_curve_mismatch_degenerate_or_nonfinite_fails(self):
        for table, grid in [(torch.randn(40, 8), torch.randn(40, 11)),
                            (torch.zeros(40, 8), torch.randn(40, 11)),
                            (torch.randn(40, 8), torch.full((40, 11), float("nan")))]:
            with self.assertRaises(ValueError):
                acc.fit_curve(table, grid)

    def _patches(self, specs, state, shapes, basis=None):
        reader = SimpleNamespace(get_tensor=lambda key: state[key])
        adapter = SimpleNamespace(LoRAAdapter=lambda keys, weights: SimpleNamespace(weights=weights))
        with patch.dict(sys.modules, {"comfy.weight_adapter": adapter}):
            return acc.build_patches(reader, specs, shapes, basis)

    def test_swiglu_conversion_preserves_the_gate_with_lora(self):
        spec = acc.AdapterSpec("ff", "mlp.fc1.weight", 5, 8, swiglu=True)
        down, up, base, x = torch.randn(2, 5), torch.randn(8, 2), torch.randn(8, 5), torch.randn(3, 5)
        patches, _ = self._patches([spec], {"ff.lora_down": down, "ff.lora_up": up}, {spec.target: (8, 5)})
        translated_up = patches[spec.target].weights[0]
        native_base = torch.cat(base.chunk(2)[::-1], 0)
        original = F.linear(x, base + 32 * up @ down)
        native = F.linear(x, native_base + 32 * translated_up @ down)
        value, gate = original.chunk(2, dim=-1)
        native_gate, native_value = native.chunk(2, dim=-1)
        torch.testing.assert_close(value * F.silu(gate), F.silu(native_gate) * native_value)

    def test_qkv_offsets_keep_three_projections_separate(self):
        specs = [acc.AdapterSpec(name, "qkv.weight", 5, 4, (0, i * 4, 4))
                 for i, name in enumerate(("q", "k", "v"))]
        state = {s.source + suffix: torch.randn(shape) for s in specs
                 for suffix, shape in ((".lora_down", (2, 5)), (".lora_up", (4, 2)))}
        patches, _ = self._patches(specs, state, {"qkv.weight": (12, 5)})
        combined = torch.zeros(12, 5)
        for (_, (_, offset, size)), adapter in patches.items():
            up, down, alpha, *_ = adapter.weights
            combined[offset:offset + size] += alpha / down.shape[0] * up @ down
        expected = torch.cat([32 * state[s.source + ".lora_up"] @ state[s.source + ".lora_down"] for s in specs])
        torch.testing.assert_close(combined, expected)

    def test_pruned_produces_both_weight_and_bias_patches(self):
        spec = acc.AdapterSpec("adaln", "adaln.weight", 11, 7, adaln=True)
        state = {"adaln.lora_down": torch.randn(2, 11), "adaln.lora_up": torch.randn(7, 2)}
        basis = (torch.randn(11), torch.randn(11, 8), 0.0)
        patches, count = self._patches([spec], state, {"adaln.weight": (7, 8), "adaln.bias": (7,)}, basis)
        self.assertEqual(count, 1)
        self.assertEqual(set(patches), {"adaln.weight", "adaln.bias"})
        with self.assertRaisesRegex(ValueError, "bias"):
            self._patches([spec], state, {"adaln.weight": (7, 8)}, basis)

    def runtime(self):
        return acc.PDDRuntime((torch.randn(8, 4, 5), torch.randn(8, 4)),
                              (torch.randn(8, 2, 5), torch.randn(8, 2)))

    def options(self):
        return dict(sample_sigmas=acc.pdd_sigmas(), minimax_h3_sigma_shift_video=12,
                    minimax_h3_sigma_shift_audio=3)

    def test_sigma_selects_heads_out_of_order_and_resets_after_calls(self):
        runtime = self.runtime()
        x = torch.randn(2, 5)
        for step in (7, 0, 3, 3, 1):
            result = runtime.diffusion(lambda *a, **k: runtime.video_forward(x), None,
                                       runtime.sigmas[step:step+1] * 1000, None, self.options())
            torch.testing.assert_close(result, F.linear(x, runtime.video[0][step], runtime.video[1][step]))
            self.assertIsNone(runtime.active_head.get())

    def test_context_is_restored_after_exception_and_nested_call(self):
        runtime = self.runtime()
        def nested(*args, **kwargs):
            self.assertEqual(runtime.active_head.get(), 1)
            runtime.diffusion(lambda *a, **k: self.assertEqual(runtime.active_head.get(), 5), None,
                              runtime.sigmas[5:6] * 1000, None, self.options())
            self.assertEqual(runtime.active_head.get(), 1)
            raise RuntimeError("cancelled")
        with self.assertRaisesRegex(RuntimeError, "cancelled"):
            runtime.diffusion(nested, None, runtime.sigmas[1:2] * 1000, None, self.options())
        self.assertIsNone(runtime.active_head.get())

    def test_wrong_schedule_shift_or_timestep_fails_before_inference(self):
        runtime = self.runtime()
        for schedule in (None, torch.linspace(1, 0, 9), runtime.sigmas[:-1], runtime.sigmas[-2:],
                         runtime.sigmas.repeat(2), torch.full((9,), float("nan"))):
            with self.assertRaises(ValueError):
                runtime.validate_schedule(schedule)
        for timestep in (torch.tensor([0.0]), torch.tensor([1000.0, 500.0]), torch.tensor([float("nan")])):
            with self.assertRaises(ValueError):
                runtime.diffusion(None, None, timestep, None, self.options())
        options = self.options(); options["minimax_h3_sigma_shift_video"] = 6
        with self.assertRaisesRegex(ValueError, "shift"):
            runtime.diffusion(None, None, torch.tensor([1000.0]), None, options)

    def test_projection_without_wrapper_is_explicit_error(self):
        with self.assertRaisesRegex(RuntimeError, "wrapper"):
            self.runtime().video_forward(torch.randn(2, 5))

    def test_outer_sample_rejects_solver_cfg_and_churn(self):
        euler = lambda: None
        module = SimpleNamespace(sample_euler=euler)
        class Executor:
            class_obj = SimpleNamespace(cfg=1)
            def __call__(self, *args, **kwargs):
                return "ok"
        runtime, executor = self.runtime(), Executor()
        with patch.dict(sys.modules, {"comfy.k_diffusion.sampling": module}):
            sampler = SimpleNamespace(sampler_function=euler, extra_options={})
            self.assertEqual(runtime.outer_sample(executor, None, None, sampler, runtime.sigmas), "ok")
            for function, cfg, options in [(None, 1, {}), (euler, 3, {}), (euler, 1, {"s_churn": 1})]:
                sampler.sampler_function, sampler.extra_options = function, options
                executor.class_obj.cfg = cfg
                with self.assertRaises(ValueError):
                    runtime.outer_sample(executor, None, None, sampler, runtime.sigmas)


if __name__ == "__main__":
    unittest.main()
