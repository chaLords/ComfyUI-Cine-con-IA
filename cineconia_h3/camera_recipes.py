"""Registro local y versionado de recetas de cámara.

El JSON contiguo es la única fuente de vocabulario. Python lo usa para
compilar prompts y ComfyUI sirve las listas de widgets desde estas mismas
estructuras; el frontend no mantiene una segunda tabla de traducciones.
"""

from copy import deepcopy
from functools import lru_cache
import json
from pathlib import Path
import re


REGISTRY_PATH = Path(__file__).with_name("camera_recipes.json")
PROFILE_SCHEMA = "cineconia.model-profile/v1"
RECIPE_SCHEMA = "cineconia.camera-recipes/v1"
MODEL_NAMES = ("MiniMax H3", "LTX-2.5", "Wan 2.2", "Hunyuan 1.5")
TASKS = ("automática", "text-to-video", "image-to-video", "reference-to-video")


@lru_cache(maxsize=1)
def load_registry():
    data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if data.get("schema") != RECIPE_SCHEMA:
        raise RuntimeError("El registro de recetas de cámara tiene un schema desconocido")
    recipes = data.get("recipes")
    if not isinstance(recipes, dict) or data.get("default_recipe") not in recipes:
        raise RuntimeError("El registro de recetas de cámara está incompleto")
    return data


def _token(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").casefold())


def recipe_keys():
    return tuple(load_registry()["recipes"])


def _aliases():
    result = {}
    for key, recipe in load_registry()["recipes"].items():
        for alias in [key, recipe.get("display_name"), *recipe.get("aliases", ())]:
            result[_token(alias)] = key
    return result


def model_profile(model="MiniMax H3", task="automática", version=""):
    key = _aliases().get(_token(model))
    if key is None:
        raise ValueError("Perfil de modelo desconocido: {}".format(model))
    recipe = load_registry()["recipes"][key]
    if task not in TASKS:
        raise ValueError("Tarea de video desconocida: {}".format(task))
    return {
        "schema": PROFILE_SCHEMA,
        "family": key,
        "display_name": recipe["display_name"],
        "version": str(version or "").strip(),
        "task": task,
    }


def _profile_value(profile):
    if profile is None or profile == "":
        return None
    if isinstance(profile, str):
        return profile
    if not isinstance(profile, dict):
        raise ValueError("El perfil de modelo debe venir de Cine con IA · Perfil de modelo")
    schema = profile.get("schema")
    if schema and schema != PROFILE_SCHEMA:
        raise ValueError("Schema de perfil de modelo desconocido: {}".format(schema))
    return (profile.get("family") or profile.get("display_name") or
            profile.get("modelo") or profile.get("model"))


def _merge_recipe(key):
    recipes = load_registry()["recipes"]
    raw = recipes[key]
    parent_key = raw.get("inherits")
    if not parent_key:
        result = deepcopy(raw)
    else:
        result = _merge_recipe(parent_key)
        inherited_director = result.get("director", {})
        identity = {k: deepcopy(v) for k, v in raw.items()
                    if k not in {"inherits", "director_overrides"}}
        result.update(identity)
        result["director"] = inherited_director
        for name, values in raw.get("director_overrides", {}).items():
            if isinstance(values, dict) and isinstance(result["director"].get(name), dict):
                result["director"][name].update(deepcopy(values))
            else:
                result["director"][name] = deepcopy(values)
    return result


def _reference(path):
    recipe_key, section, field = path.split(".")
    return deepcopy(load_registry()["recipes"][recipe_key][section][field])


def _expand_director(recipe):
    director = recipe.get("director", {})
    prompt6 = recipe.get("prompt6", {})
    for name in ("shots", "angles"):
        source = director.pop(name + "_from", None)
        if source:
            director[name] = deepcopy(prompt6[source.split(".")[-1]])
    for name in ("intensities", "lenses", "depth"):
        source = director.pop(name + "_from", None)
        if source:
            director[name] = _reference(source)
    return recipe


def resolve_recipe(profile=None):
    """Devuelve (clave, receta expandida, aviso).

    Sin perfil conserva MiniMax H3. Un perfil desconocido nunca se sustituye
    silenciosamente: se usa la receta predeterminada y se devuelve un aviso.
    """
    registry = load_registry()
    default = registry["default_recipe"]
    value = _profile_value(profile)
    if value is None:
        return default, _expand_director(_merge_recipe(default)), ""
    key = _aliases().get(_token(value))
    if key is None:
        warning = "perfil '{}' sin receta; se usó MiniMax H3 como fallback".format(value)
        return default, _expand_director(_merge_recipe(default)), warning
    recipe = _expand_director(_merge_recipe(key))
    return key, recipe, recipe.get("warning", "")


def prompt_recipe(key):
    if key not in load_registry()["recipes"]:
        raise KeyError(key)
    return deepcopy(load_registry()["recipes"][key].get("prompt6", {}))


def public_registry():
    """Copia serializable para vistas previas/frontend, sin estado mutable."""
    return deepcopy(load_registry())
