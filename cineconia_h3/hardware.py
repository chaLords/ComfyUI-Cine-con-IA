"""Deteccion tolerante de GPU para AUTO.

No importa torch al cargar el custom node. Esto permite que ComfyUI enumere
los nodos incluso si la instalacion CUDA esta incompleta.
"""

from .profiles import closest_profile, previous_profile


def detect_hardware():
    result = {
        "available": False,
        "name": "GPU no detectada",
        "total_gb": None,
        "free_gb": None,
        "source": "fallback",
    }
    try:
        import torch

        if not torch.cuda.is_available():
            return result
        device = torch.cuda.current_device()
        props = torch.cuda.get_device_properties(device)
        total = float(props.total_memory) / (1024 ** 3)
        try:
            free_bytes, total_bytes = torch.cuda.mem_get_info(device)
            free = float(free_bytes) / (1024 ** 3)
            total = float(total_bytes) / (1024 ** 3)
        except Exception:
            free = total
        return {
            "available": True,
            "name": props.name,
            "total_gb": round(total, 2),
            "free_gb": round(free, 2),
            "source": "torch.cuda",
        }
    except Exception:
        return result


def select_auto_profile(hardware):
    """Elige por VRAM total y baja un nivel si queda menos del 60 % libre."""
    total = hardware.get("total_gb")
    free = hardware.get("free_gb")
    if not total:
        return "16 GB", "AUTO sin CUDA: fallback conservador a 16 GB"
    selected = closest_profile(total)
    if free is not None and free / total < 0.60:
        lowered = previous_profile(selected)
        if lowered != selected:
            return lowered, (
                "AUTO bajo de {} a {} porque solo hay {:.1f}/{:.1f} GB libres"
                .format(selected, lowered, free, total)
            )
    return selected, "AUTO segun {:.1f} GB de VRAM total".format(total)
