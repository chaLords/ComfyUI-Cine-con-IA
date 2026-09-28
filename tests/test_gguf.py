"""Carga mixta GGUF/safetensors y conservacion del workflow 048."""
import importlib.util
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cine_gguf_tests", ROOT / "nodes.py")
NODES = importlib.util.module_from_spec(spec)
spec.loader.exec_module(NODES)


class GgufTests(unittest.TestCase):
    def setUp(self):
        self.sd = SimpleNamespace(
            load_diffusion_model=Mock(return_value="native-model"),
            load_clip=Mock(return_value="native-clip"),
            CLIPType=SimpleNamespace(MINIMAX="minimax", STABLE_DIFFUSION="sd"),
            VAE=Mock(return_value="vae"))
        self.utils = SimpleNamespace(load_torch_file=Mock(return_value=({}, {})))
        self.folders = SimpleNamespace(
            get_full_path_or_raise=Mock(side_effect=lambda folder, name: f"/{folder}/{name}"),
            get_folder_paths=Mock(return_value=[]))
        self.unet = Mock(return_value=("quantized-model",))
        self.clip = Mock(return_value=("quantized-clip",))
        self.registry = {
            "UnetLoaderGGUF": type("Unet", (), {"FUNCTION": "load_unet", "load_unet": self.unet}),
            "CLIPLoaderGGUF": type("Clip", (), {"FUNCTION": "load_clip", "load_clip": self.clip}),
        }
        self.modules = patch.dict(sys.modules, {
            "comfy": SimpleNamespace(sd=self.sd, utils=self.utils),
            "comfy.sd": self.sd, "comfy.utils": self.utils,
            "folder_paths": self.folders,
            "nodes": SimpleNamespace(NODE_CLASS_MAPPINGS=self.registry),
        })
        self.modules.start()
        self.addCleanup(self.modules.stop)

    def cargar(self, model="h3.gguf", clip="qwen.safetensors"):
        with patch.object(NODES, "_aplicar_shift", side_effect=lambda model, *a: (model, "shift")):
            return NODES.CineCargarH3().cargar(
                model, clip, "video.safetensors", "audio.safetensors",
                1, 1, 6, 3, vista_previa=False)

    def test_gguf_model_keeps_existing_text_encoder_and_vaes(self):
        out = self.cargar()
        self.assertEqual(out[:4], ("quantized-model", "native-clip", "vae", "vae"))
        self.unet.assert_called_once_with(unet_name="h3.gguf")
        self.sd.load_diffusion_model.assert_not_called()
        self.sd.load_clip.assert_called_once()
        self.assertEqual(self.sd.VAE.call_count, 2)
        self.assertIn("modelo GGUF", out[4])

    def test_native_workflows_keep_native_loading(self):
        self.assertEqual(self.cargar(model="h3.safetensors")[:2], ("native-model", "native-clip"))
        self.sd.load_diffusion_model.assert_called_once_with("/diffusion_models/h3.safetensors", model_options={})
        self.unet.assert_not_called()
        self.clip.assert_not_called()

    def test_text_encoder_can_be_gguf_independently(self):
        out = self.cargar(model="h3.safetensors", clip="qwen.GGUF")
        self.assertEqual(out[:2], ("native-model", "quantized-clip"))
        self.clip.assert_called_once_with(clip_name="qwen.GGUF", type="minimax")
        self.sd.load_clip.assert_not_called()

    def test_missing_loader_explains_required_dependency(self):
        self.registry.clear()
        with self.assertRaisesRegex(RuntimeError, "ComfyUI-GGUF-Loader"):
            self.cargar()
        self.sd.load_diffusion_model.assert_not_called()

    def test_loader_failure_is_not_swallowed_or_retried_as_native(self):
        self.unet.side_effect = ValueError("Unexpected architecture")
        with self.assertRaisesRegex(ValueError, "Unexpected architecture"):
            self.cargar()
        self.sd.load_diffusion_model.assert_not_called()
        self.sd.load_clip.assert_not_called()

    def test_quantized_model_still_receives_lora_and_memory_patches(self):
        with patch.object(NODES, "_llamar_nodo", side_effect=lambda name, **kw: kw["model"]) as call:
            out = NODES.CineCargarH3().cargar(
                "h3.gguf", "qwen.safetensors", "v.safetensors", "a.safetensors",
                32, 32, 6, 3, lora="detail.safetensors", lora_fuerza=0.5, vista_previa=False)
        self.assertEqual(out[0], "quantized-model")
        names = [c.args[0] for c in call.call_args_list]
        for name in ("LoraLoaderModelOnly", "MiniMaxChunkFeedForward", "MiniMaxLowVRAMAttention"):
            self.assertIn(name, names)
        for c in call.call_args_list:
            self.assertEqual(c.kwargs["model"], "quantized-model")

    def test_model_dropdown_merges_gguf_folder_without_duplicates(self):
        self.folders.folder_names_and_paths = {"unet_gguf": ([], {".gguf"})}
        self.folders.get_filename_list = lambda key: {
            "diffusion_models": ["a.safetensors", "b.gguf"],
            "unet_gguf": ["b.gguf", "minimax/c.gguf"],
        }[key]
        self.assertEqual(NODES._lista("diffusion_models"), ["a.safetensors", "b.gguf", "minimax/c.gguf"])


class Workflow049Tests(unittest.TestCase):
    def test_previous_workflow_features_and_connections_are_preserved(self):
        old = json.loads(next((ROOT / "examples").glob("048.*.json")).read_text(encoding="utf-8"))
        new = json.loads(next((ROOT / "examples").glob("049.*.json")).read_text(encoding="utf-8"))
        before = {n["id"]: n for n in old["nodes"]}
        after = {n["id"]: n for n in new["nodes"]}
        self.assertEqual(before.keys(), after.keys())
        self.assertEqual(old["links"], new["links"])
        for node_id in before.keys() - {500, 510, 515, 540, 34003}:
            self.assertEqual(before[node_id], after[node_id], node_id)
        fields = after[500]["widgets_values_named"]
        self.assertEqual(fields["codificador_texto"], before[500]["widgets_values_named"]["codificador_texto"])
        self.assertTrue(fields["modelo"].endswith("minimax_h3_ref2va_pruned-Q4_K.gguf"))
        rows = after[540]["properties"]["filas"]
        self.assertEqual([o["clave"] for o in rows[0]["opciones"]], ["oficial", "singularity", "gguf_q4"])
        self.assertEqual(rows[1:], before[540]["properties"]["filas"][1:])
        self.assertEqual(after[515]["widgets_values_named"]["pasos_advanced"], 8)


if __name__ == "__main__":
    unittest.main()
