"""Acc/PDD oficial de Alibaba, integrado en el cargador existente de CineConIA.

Mapeo y rebase AdaLN informados por ComfyUI-MiniMax-H3-PDD (MIT).
Procedencia y licencia: assets/NOTICE.md. No importa nodos de terceros.
Torch/ComfyUI se importan al ejecutar, no al descubrir los nodos del paquete.
"""

from contextvars import ContextVar
from copy import deepcopy
from dataclasses import dataclass
import hashlib
import math
from pathlib import Path
import re


MARKER = "cineconia_acc_pdd"
TARGETS = frozenset("to_q,to_k,to_v,to_out.0,ff.net.0.proj,ff.net.2,adaln_proj.linear".split(","))
HEAD_SHAPES = {
    "proj_out.weight": (32, 96, 5376), "proj_out.bias": (32, 96),
    "audio_proj_out.weight": (32, 32, 5376), "audio_proj_out.bias": (32, 32),
}
GRID_HASHES = {
    "ref2va": "9152682b8f08ab23e98f129fac2aad36585c0f8a1f0af123fecaf99d96884bc9",
    "fl2va": "6e7208e7c78c8fa21a4e7c0d92dfbf4edb05239e4951aac5e4b2988056649562",
}
CURVE_MAX_RESIDUAL = 5e-4


@dataclass(frozen=True)
class AdapterSpec:
    source: str
    target: str
    inputs: int
    outputs: int
    offset: tuple | None = None
    swiglu: bool = False
    adaln: bool = False

    @property
    def patch_key(self):
        return (self.target, self.offset) if self.offset else self.target


def adapter_specs():
    """Contrato de los 362 adaptadores del archivo original, no convertido."""
    groups = [("transformer_blocks", "blocks", 50),
              ("token_refiner.refiner_blocks", "token_refiner.blocks", 2)]
    for source, target, count in groups:
        for block in range(count):
            src, dst = f"{source}.{block}", f"diffusion_model.{target}.{block}"
            for index, component in enumerate(("q", "k", "v")):
                yield AdapterSpec(f"{src}.attn.to_{component}", f"{dst}.attn.qkv_proj.weight",
                                  5376, 7168, (0, index * 7168, 7168))
            yield AdapterSpec(f"{src}.attn.to_out.0", f"{dst}.attn.out_proj.weight", 7168, 5376)
            yield AdapterSpec(f"{src}.ff.net.0.proj", f"{dst}.mlp.fc1.weight", 5376, 28672,
                              swiglu=True)
            yield AdapterSpec(f"{src}.ff.net.2", f"{dst}.mlp.fc2.weight", 14336, 5376)
            if source == "transformer_blocks":
                yield AdapterSpec(f"{src}.adaln_proj.linear", f"{dst}.adaln_proj.linear.weight",
                                  2688, 96768, adaln=True)


def validate_checkpoint(reader):
    """Valida metadatos, claves y formas sin materializar el archivo de 1,37 GB."""
    metadata = reader.metadata() or {}
    try:
        config = (int(metadata["pdd_num_steps"]), int(metadata["pdd_block_size"]),
                  int(metadata["lora_rank"]), float(metadata["lora_alpha"]))
        targets = frozenset(p.strip() for p in metadata["lora_targets"].split(","))
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Acc/PDD: faltan metadatos oficiales o son inválidos") from exc
    if config != (32, 4, 64, 64.0) or targets != TARGETS:
        raise ValueError("Acc/PDD: esta entrega admite el formato oficial 32/4, rank/alpha 64")
    specs = tuple(adapter_specs())
    expected = dict(HEAD_SHAPES)
    for spec in specs:
        expected[spec.source + ".lora_down"] = (64, spec.inputs)
        expected[spec.source + ".lora_up"] = (spec.outputs, 64)
    keys = set(reader.keys())
    missing, unknown = set(expected) - keys, keys - set(expected)
    if missing or unknown:
        raise ValueError("Acc/PDD: checkpoint incompleto o convertido; faltan {}, sobran {}. "
                         "Usa MiniMax-H3-Ref2VA-Acc-8Step.safetensors o su variante FL2VA."
                         .format(sorted(missing)[:3], sorted(unknown)[:3]))
    for key, shape in expected.items():
        view = reader.get_slice(key)
        if tuple(view.get_shape()) != shape or view.get_dtype() not in ("F32", "F16", "BF16"):
            raise ValueError(f"Acc/PDD: forma o tipo incompatible en {key}; se esperaba {shape}")
    return specs


def _finite(tensor, label):
    import torch
    if not bool(torch.isfinite(tensor).all()):
        raise ValueError(f"Acc/PDD: valores no finitos en {label}")
    return tensor


def fit_curve(table, grid, max_residual=CURVE_MAX_RESIDUAL):
    """grid(t) ~= c + table(t) @ V.T; error medido, nunca ajuste silencioso."""
    import torch
    if table.ndim != 2 or grid.ndim != 2 or table.shape[0] != grid.shape[0]:
        raise ValueError("Acc/PDD: la tabla pruned y la grilla AdaLN tienen formas incompatibles")
    table = _finite(table.detach().to(device="cpu", dtype=torch.float64), "tabla AdaLN")
    grid = _finite(grid.detach().to(device="cpu", dtype=torch.float64), "grilla AdaLN")
    design = torch.cat((torch.ones(table.shape[0], 1, dtype=torch.float64), table), dim=1)
    solution = torch.linalg.lstsq(design, grid, driver="gelsd")
    if int(solution.rank) != design.shape[1] or float(grid.norm()) == 0:
        raise ValueError("Acc/PDD: base AdaLN degenerada")
    # Medir también el redondeo de la base que realmente aplicaremos en FP32.
    fit = solution.solution.float()
    residual = float((design @ fit.double() - grid).norm() / grid.norm())
    if not math.isfinite(residual) or residual > max_residual:
        raise ValueError(f"Acc/PDD: base AdaLN incompatible (residuo {residual:.3g}, "
                         f"máximo {max_residual:g}); no se omitieron adaptadores")
    return fit[0].contiguous(), fit[1:].T.contiguous(), residual


def load_curve_basis(table, variant):
    from safetensors import safe_open
    if tuple(table.shape) != (1025, 8):
        raise ValueError("Acc/PDD: el pruned soportado debe tener adaln_t_table 1025×8")
    path = Path(__file__).with_name("assets") / f"h3_silu_temb_grid_{variant}.safetensors"
    if not path.is_file():
        raise RuntimeError(f"Falta la base AdaLN incluida en CineConIA: {path.name}. Reinstala el paquete completo.")
    if hashlib.sha256(path.read_bytes()).hexdigest() != GRID_HASHES[variant]:
        raise ValueError(f"Acc/PDD: la base AdaLN {path.name} no coincide con su SHA256")
    with safe_open(str(path), framework="pt", device="cpu") as reader:
        grid = reader.get_tensor("silu_t_emb_grid")
    if tuple(grid.shape) != (1025, 2688):
        raise ValueError("Acc/PDD: grilla AdaLN inválida")
    return fit_curve(table, grid)


def rebase_adaln(up, down, constant, basis, alpha=64.0):
    """Mantiene el término constante de la LoRA como delta del bias pruned."""
    scale = alpha / down.shape[0]
    a, b = down.float(), up.float()
    return (b @ (a @ basis) * scale).contiguous(), (b @ (a @ constant) * scale).contiguous()


def build_patches(reader, specs, model_shapes, curve_basis=None):
    import torch
    from comfy.weight_adapter import LoRAAdapter
    patches = {}
    rebased = 0
    for spec in specs:
        actual = tuple(model_shapes.get(spec.target, ()))
        expected = (spec.outputs * (3 if spec.offset else 1), spec.inputs)
        curve = spec.adaln and actual == (spec.outputs, 8)
        if actual != expected and not curve:
            raise ValueError(f"Acc/PDD: {spec.target} tiene forma {actual}; se esperaba {expected}")
        down = _finite(reader.get_tensor(spec.source + ".lora_down"), spec.source)
        up = _finite(reader.get_tensor(spec.source + ".lora_up"), spec.source)
        if curve:
            if curve_basis is None:
                raise ValueError("Acc/PDD: falta una base AdaLN para este modelo pruned")
            bias_key = spec.target.removesuffix("weight") + "bias"
            if tuple(model_shapes.get(bias_key, ())) != (spec.outputs,):
                raise ValueError(f"Acc/PDD: falta el bias pruned {bias_key}")
            delta_w, delta_b = rebase_adaln(up, down, *curve_basis[:2])
            patches[spec.target] = ("diff", (_finite(delta_w, spec.source),))
            patches[bias_key] = ("diff", (_finite(delta_b, bias_key),))
            rebased += 1
        else:
            if spec.swiglu:
                # Diffusers: [value, gate]; ComfyUI: [gate, value].
                value, gate = up.chunk(2, dim=0)
                up = torch.cat((gate, value), dim=0)
            patches[spec.patch_key] = LoRAAdapter(set(), (up, down, 64.0, None, None, None))
    return patches, rebased


def pdd_sigmas():
    import torch
    base = torch.linspace(1.0, 0.0, 9, dtype=torch.float64)
    return (12.0 * base / (1.0 + 11.0 * base)).float()


def fuse_heads(weight, bias, shift, block_size=4):
    """Integra velocidades completas oficiales; no son offsets de la cabeza base."""
    import torch
    if (weight.ndim != 3 or tuple(bias.shape) != tuple(weight.shape[:2])
            or block_size < 1 or weight.shape[0] % block_size):
        raise ValueError("Acc/PDD: banco de cabezas o tamaño de bloque inválido")
    _finite(weight, "cabezas")
    _finite(bias, "bias de cabezas")
    base = torch.linspace(1.0, 0.0, weight.shape[0] + 1, dtype=torch.float64)
    dt = (1.0 - shift * base / (1.0 + (shift - 1.0) * base)).diff()
    weights, biases = [], []
    for start in range(0, weight.shape[0], block_size):
        span = slice(start, start + block_size)
        plan = (dt[span] / dt[span].sum()).float()
        weights.append(torch.einsum("n,noi->oi", plan, weight[span].float()))
        biases.append(torch.einsum("n,no->o", plan, bias[span].float()))
    return torch.stack(weights).contiguous(), torch.stack(biases).contiguous()


class PDDRuntime:
    """Una cabeza por sigma real; ContextVar evita estado de contador compartido."""

    def __init__(self, video, audio):
        self.video, self.audio = video, audio
        self.sigmas = pdd_sigmas()
        self.active_head = ContextVar("cineconia_pdd_head", default=None)

    def validate_schedule(self, schedule):
        import torch
        if schedule is None:
            raise ValueError("Acc/PDD necesita las sigmas reales del sampler; actualiza ComfyUI")
        actual = torch.as_tensor(schedule).detach().to(device="cpu", dtype=torch.float32)
        if actual.shape != self.sigmas.shape or not torch.allclose(actual, self.sigmas, rtol=0, atol=2e-5):
            raise ValueError("Acc/PDD requiere 8 pasos, simple, denoise 1 y shift 12/3. "
                             "Esta entrega valida la trayectoria completa a resolución fija; "
                             "el refinado y los tramos 7+1 se prueban después.")

    def outer_sample(self, executor, noise, latent_image, sampler, sigmas, *args, **kwargs):
        from comfy.k_diffusion.sampling import sample_euler
        if getattr(sampler, "sampler_function", None) is not sample_euler:
            raise ValueError("Acc/PDD de CineConIA requiere el sampler euler")
        if float(getattr(sampler, "extra_options", {}).get("s_churn", 0.0)) != 0.0:
            raise ValueError("Acc/PDD requiere euler sin churn")
        if float(getattr(executor.class_obj, "cfg", 1.0)) != 1.0:
            raise ValueError("Acc/PDD requiere CFG 1 o BasicGuider")
        self.validate_schedule(sigmas)
        return executor(noise, latent_image, sampler, sigmas, *args, **kwargs)

    def diffusion(self, executor, x, timestep, context, transformer_options=None, **kwargs):
        import torch
        options = transformer_options or {}
        for key, expected in (("minimax_h3_sigma_shift_video", 12.0), ("minimax_h3_sigma_shift_audio", 3.0)):
            if not math.isclose(float(options.get(key, float("nan"))), expected, rel_tol=0, abs_tol=1e-6):
                raise ValueError("Acc/PDD: cambió el shift después de cargar el acelerador; usa 12/3")
        self.validate_schedule(options.get("sample_sigmas"))
        sigmas = torch.as_tensor(timestep).detach().to(device="cpu", dtype=torch.float32).flatten() / 1000.0
        if not sigmas.numel() or not torch.allclose(sigmas, sigmas[:1].expand_as(sigmas), rtol=0, atol=2e-5):
            raise ValueError("Acc/PDD: el batch mezcla timesteps incompatibles")
        distance = (self.sigmas[:-1] - sigmas[0]).abs()
        index = int(distance.argmin())
        if not math.isfinite(float(distance[index])) or float(distance[index]) > 2e-5:
            raise ValueError("Acc/PDD: sigma fuera de los ocho puntos destilados")
        token = self.active_head.set(index)
        try:
            return executor(x, timestep, context, options, **kwargs)
        finally:
            self.active_head.reset(token)

    def _project(self, x, heads):
        import torch.nn.functional as F
        index = self.active_head.get()
        if index is None:
            raise RuntimeError("Acc/PDD: proyección ejecutada sin el wrapper de sigma de ComfyUI")
        weight, bias = heads
        # Solo la cabeza fusionada actual viaja a la GPU; no se retiene allí.
        return F.linear(x, weight[index].to(x), bias[index].to(x))

    def video_forward(self, x):
        return self._project(x, self.video)

    def audio_forward(self, x):
        return self._project(x, self.audio)


def _variant(name):
    matches = re.findall(r"ref2va|fl2va", str(name).casefold())
    if len(set(matches)) != 1:
        raise ValueError("Acc/PDD: conserva Ref2VA o FL2VA en los nombres del modelo y de la LoRA")
    return matches[0]


def apply_acc_pdd(model, acc_path, model_name, shift_video=12.0, shift_audio=3.0):
    """Valida todo y entrega un clon; el modelo de entrada conserva sus parches."""
    try:
        from safetensors import safe_open
        from comfy.ldm.minimax.model import MiniMaxH3Model
        from comfy.model_sampling import ModelSamplingAV
    except ImportError as exc:
        raise RuntimeError("Acc/PDD requiere ComfyUI con MiniMax H3, ModelSamplingAV y safetensors. "
                           "Actualiza ComfyUI y sus dependencias.") from exc

    if (not math.isclose(float(shift_video), 12.0, rel_tol=0, abs_tol=1e-6)
            or not math.isclose(float(shift_audio), 3.0, rel_tol=0, abs_tol=1e-6)):
        raise ValueError("Acc/PDD requiere shift 12/3")
    variant = _variant(Path(acc_path).name)
    if variant != _variant(model_name):
        raise ValueError("Acc/PDD: modelo y LoRA deben coincidir en Ref2VA/FL2VA")
    diffusion = model.get_model_object("diffusion_model")
    sampling = model.get_model_object("model_sampling")
    if not isinstance(diffusion, MiniMaxH3Model) or not isinstance(sampling, ModelSamplingAV):
        raise TypeError("Acc/PDD requiere MiniMax H3 nativo de ComfyUI (safetensors full o pruned/INT8)")
    if not callable(getattr(model, "add_wrapper_with_key", None)):
        raise RuntimeError("Actualiza ComfyUI: falta la API de wrappers requerida por Acc/PDD")
    options = model.model_options.get("transformer_options", {})
    if MARKER in options or any(k.startswith("diffusion_model.final_layer.video_out") or
                               k.startswith("diffusion_model.final_layer.audio_out")
                               for k in model.object_patches):
        raise ValueError("Acc/PDD ya está aplicado o hay otro parche sobre sus proyecciones finales")
    shapes = {key: tuple(value.shape) for key, value in model.model.state_dict().items()}
    for stream, dims in (("video", (96, 5376)), ("audio", (32, 5376))):
        if shapes.get(f"diffusion_model.final_layer.{stream}_out.weight") != dims:
            raise ValueError("Acc/PDD: el H3 ya tiene un banco PDD o una proyección incompatible")
    curve_basis = None
    if diffusion.use_adaln_curves:
        curve_basis = load_curve_basis(model.get_model_object("diffusion_model.adaln_t_table"), variant)
    with safe_open(str(acc_path), framework="pt", device="cpu") as reader:
        specs = validate_checkpoint(reader)
        patches, rebased = build_patches(reader, specs, shapes, curve_basis)
        video = fuse_heads(reader.get_tensor("proj_out.weight"), reader.get_tensor("proj_out.bias"), 12.0)
        audio = fuse_heads(reader.get_tensor("audio_proj_out.weight"), reader.get_tensor("audio_proj_out.bias"), 3.0)
    if rebased != (50 if diffusion.use_adaln_curves else 0):
        raise ValueError("Acc/PDD: la conversión AdaLN quedó incompleta")
    runtime = PDDRuntime(video, audio)
    clone = model.clone()
    accepted = set(clone.add_patches(patches, strength_patch=1.0, strength_model=1.0))
    if accepted != set(patches):
        raise RuntimeError(f"ComfyUI rechazó {len(set(patches) - accepted)} parches Acc/PDD")
    # Conservar noise_scale y el resto del sampler AV, cambiando solo los shifts.
    sampling = deepcopy(sampling)
    sampling.set_parameters(shift=12.0, audio_shift=3.0)
    clone.add_object_patch("model_sampling", sampling)
    clone.add_object_patch("diffusion_model.final_layer.video_out.forward", runtime.video_forward)
    clone.add_object_patch("diffusion_model.final_layer.audio_out.forward", runtime.audio_forward)
    clone.add_wrapper_with_key("diffusion_model", MARKER, runtime.diffusion)
    clone.add_wrapper_with_key("outer_sample", MARKER, runtime.outer_sample)
    report = {"variant": variant, "file": Path(acc_path).name, "adapters": len(specs),
              "adaln_rebased": rebased, "curve_residual": curve_basis[2] if curve_basis else None,
              "status": "experimental; render GPU pendiente"}
    options = clone.model_options["transformer_options"] = options.copy()
    options.update({MARKER: report, "minimax_h3_sigma_shift_video": 12.0, "minimax_h3_sigma_shift_audio": 3.0})
    detail = f" · AdaLN pruned residuo {curve_basis[2]:.3g}" if curve_basis else " · AdaLN full"
    return clone, f"Acc/PDD CineConIA · {variant} · 362 adaptadores · 8 pasos Simple/Euler{detail} · experimental"
