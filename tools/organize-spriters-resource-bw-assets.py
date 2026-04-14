from __future__ import annotations

import argparse
import json
import math
import re
import shutil
from datetime import datetime
from pathlib import Path
from statistics import median

import numpy as np
from PIL import Image
from scipy import ndimage


VARIANT_SUFFIX_MAPS: dict[str, dict[str, int]] = {
    "BASCULIN": {"RED": 0, "BLUE": 1},
    "BURMY": {"PLANT": 0, "SANDY": 1, "TRASH": 2},
    "CASTFORM": {"SUNNY": 1, "RAINY": 2, "SNOWY": 3},
    "CHERRIM": {"OVERCAST": 0, "SUNSHINE": 1},
    "DARMANITAN": {"ZENMODE": 1},
    "DEERLING": {"SPRING": 0, "SUMMER": 1, "AUTUMN": 2, "WINTER": 3},
    "DEOXYS": {"ATTACK": 1, "DEFENSE": 2, "SPEED": 3},
    "GASTRODON": {"WEST": 0, "EAST": 1},
    "GIRATINA": {"ALTERED": 0, "ORIGIN": 1},
    "MELOETTA": {"ARIAFORME": 0, "PIROUETTEFORME": 1},
    "ROTOM": {"HEAT": 1, "WASH": 2, "FROST": 3, "FAN": 4, "MOW": 5},
    "SAWSBUCK": {"SPRING": 0, "SUMMER": 1, "AUTUMN": 2, "WINTER": 3},
    "SHAYMIN": {"LAND": 0, "SKY": 1},
    "SHELLOS": {"WEST": 0, "EAST": 1},
    "WORMADAM": {"PLANT": 0, "SANDY": 1, "TRASH": 2},
}

DOWNLOAD_STEM_OVERRIDES: dict[str, str] = {
    "basculinblue": "BASCULIN_1",
    "basculinred": "BASCULIN",
    "burmyplant": "BURMY",
    "burmysandy": "BURMY_1",
    "burmytrash": "BURMY_2",
    "castformrainy": "CASTFORM_2",
    "castformsnowy": "CASTFORM_3",
    "castformsunny": "CASTFORM_1",
    "cherrimovercast": "CHERRIM",
    "cherrimsunshine": "CHERRIM_1",
    "darmanitanzenmode": "DARMANITAN_1",
    "deerlingautumn": "DEERLING_2",
    "deerlingspring": "DEERLING",
    "deerlingsummer": "DEERLING_1",
    "deerlingwinter": "DEERLING_3",
    "deoxysattack": "DEOXYS_1",
    "deoxysdefense": "DEOXYS_2",
    "deoxysspeed": "DEOXYS_3",
    "gastrodoneast": "GASTRODON_1",
    "gastrodonwest": "GASTRODON",
    "giratinaaltered": "GIRATINA",
    "giratinaorigin": "GIRATINA_1",
    "meloettaariaforme": "MELOETTA",
    "meloettapirouetteforme": "MELOETTA_1",
    "nidoranf": "NIDORANfE",
    "nidoranm": "NIDORANmA",
    "rotomfan": "ROTOM_4",
    "rotomfrost": "ROTOM_3",
    "rotomheat": "ROTOM_1",
    "rotommow": "ROTOM_5",
    "rotomwash": "ROTOM_2",
    "sawsbuckautumn": "SAWSBUCK_2",
    "sawsbuckspring": "SAWSBUCK",
    "sawsbucksummer": "SAWSBUCK_1",
    "sawsbuckwinter": "SAWSBUCK_3",
    "shayminland": "SHAYMIN",
    "shayminsky": "SHAYMIN_1",
    "shelloseast": "SHELLOS_1",
    "shelloswest": "SHELLOS",
    "wormadamplant": "WORMADAM",
    "wormadamsandy": "WORMADAM_1",
    "wormadamtrash": "WORMADAM_2",
}

FEMALE_TOKEN = "\u2640"
MALE_TOKEN = "\u2642"
BATTLE_SHEET_RE = re.compile(r"^\d+__\d+__#\d+\s+(?P<species>.+?)(?:\s+\((?P<variant>[^)]+)\))?$")


def comparable_key(value: str) -> str:
    normalized = value.upper()
    normalized = normalized.replace(FEMALE_TOKEN, "FE").replace(MALE_TOKEN, "MA")
    normalized = normalized.replace("É", "E")
    return re.sub(r"[^A-Z0-9]", "", normalized)


def get_canonical_maps(front_dir: Path) -> tuple[dict[str, str], dict[str, str]]:
    base_by_comparable: dict[str, str] = {}
    female_by_base: dict[str, str] = {}

    for file in sorted(front_dir.glob("*.png")):
        stem = file.stem
        if re.search(r"_\d+$", stem):
            continue
        if stem.endswith("_female"):
            female_by_base[stem[: -len("_female")]] = stem
            continue
        base_by_comparable[comparable_key(stem)] = stem

    base_by_comparable["NIDORANFE"] = "NIDORANfE"
    base_by_comparable["NIDORANMA"] = "NIDORANmA"
    base_by_comparable["PRIMAPE"] = "PRIMEAPE"
    return base_by_comparable, female_by_base


def resolve_canonical_stem(
    display_species: str,
    variant: str | None,
    base_by_comparable: dict[str, str],
    female_by_base: dict[str, str],
) -> str:
    if display_species == f"Nidoran{FEMALE_TOKEN}":
        return "NIDORANfE"
    if display_species == f"Nidoran{MALE_TOKEN}":
        return "NIDORANmA"

    base_key = comparable_key(display_species)
    if base_key not in base_by_comparable:
        raise ValueError(f"No canonical base sprite stem for species '{display_species}'")

    base_stem = base_by_comparable[base_key]
    if not variant:
        return base_stem

    variant_key = comparable_key(variant)
    if variant_key == "MALE":
        return base_stem
    if variant_key == "FEMALE":
        return female_by_base.get(base_stem, base_stem)

    if base_stem not in VARIANT_SUFFIX_MAPS:
        raise ValueError(f"No variant suffix map for '{display_species}' variant '{variant}'")

    suffix_map = VARIANT_SUFFIX_MAPS[base_stem]
    if variant_key not in suffix_map:
        raise ValueError(f"Unknown variant '{variant}' for '{display_species}'")

    suffix = suffix_map[variant_key]
    return base_stem if suffix == 0 else f"{base_stem}_{suffix}"


def resolve_redownload_stem(
    stem: str,
    base_by_comparable: dict[str, str],
    female_by_base: dict[str, str],
) -> tuple[str, str, str | None] | None:
    if not stem.startswith("_"):
        return None

    parts = [part for part in stem.split("_") if part]
    if len(parts) < 2 or not parts[0].isdigit():
        return None

    dex_number = int(parts[0])
    name_tokens = parts[1:]
    gender: str | None = None
    if name_tokens and name_tokens[-1].lower() in {"female", "male"}:
        gender = name_tokens.pop().lower()

    if not name_tokens:
        return None

    normalized = re.sub(r"[^a-z0-9]", "", "".join(name_tokens).lower())
    if dex_number == 29:
        normalized = "nidoranf"
    elif dex_number == 32:
        normalized = "nidoranm"

    canonical_stem = DOWNLOAD_STEM_OVERRIDES.get(normalized)
    if canonical_stem is None:
        base_key = comparable_key("".join(name_tokens))
        canonical_stem = base_by_comparable.get(base_key)
        if canonical_stem is None:
            return None

    if gender == "female":
        canonical_stem = female_by_base.get(canonical_stem, canonical_stem)

    species = " ".join(name_tokens)
    variant = gender.capitalize() if gender else None
    return canonical_stem, species, variant


def remove_border_backgrounds(image: np.ndarray) -> np.ndarray:
    cleaned = image.copy()
    border = np.concatenate(
        [
            cleaned[0, :, :],
            cleaned[-1, :, :],
            cleaned[1:-1, 0, :],
            cleaned[1:-1, -1, :],
        ],
        axis=0,
    )
    colors, counts = np.unique(border.reshape(-1, 4), axis=0, return_counts=True)
    threshold = max(8, math.floor(len(border) * 0.02))

    for color, count in zip(colors, counts, strict=True):
        if int(count) < threshold:
            continue
        cleaned[np.all(cleaned == color, axis=2), 3] = 0

    return cleaned


def extract_components(image: np.ndarray) -> list[dict[str, float | int]]:
    mask = image[:, :, 3] > 0
    labeled, _ = ndimage.label(mask)
    components: list[dict[str, float | int]] = []

    for label, slices in enumerate(ndimage.find_objects(labeled), start=1):
        if slices is None:
            continue
        y0, y1 = slices[0].start, slices[0].stop
        x0, x1 = slices[1].start, slices[1].stop
        width = x1 - x0
        height = y1 - y0
        pixels = int((labeled[slices] == label).sum())
        aspect = width / max(1, height)
        if width < 10 or height < 10 or pixels < 20 or aspect < 0.2 or aspect > 4.5:
            continue

        components.append(
            {
                "pixels": pixels,
                "width": width,
                "height": height,
                "x0": x0,
                "y0": y0,
                "x1": x1,
                "y1": y1,
                "cx": (x0 + x1) / 2,
                "cy": (y0 + y1) / 2,
            }
        )

    return components


def split_components(items: list[dict[str, float | int]], key: str) -> list[list[dict[str, float | int]]] | None:
    values = np.array([float(item[key]) for item in items], dtype=np.float32)
    c1 = float(values.min())
    c2 = float(values.max())
    if abs(c2 - c1) < 1e-3:
        return None

    for _ in range(20):
        labels = (np.abs(values - c2) < np.abs(values - c1)).astype(np.int32)
        if labels.min() == labels.max():
            return None
        next_c1 = float(values[labels == 0].mean())
        next_c2 = float(values[labels == 1].mean())
        if abs(next_c1 - c1) < 1e-3 and abs(next_c2 - c2) < 1e-3:
            break
        c1 = next_c1
        c2 = next_c2

    groups = [
        [item for item, label in zip(items, labels, strict=True) if label == 0],
        [item for item, label in zip(items, labels, strict=True) if label == 1],
    ]
    groups.sort(key=lambda group: float(np.mean([item[key] for item in group])))
    return groups


def group_rows(items: list[dict[str, float | int]]) -> list[dict[str, object]]:
    if not items:
        return []

    sorted_items = sorted(items, key=lambda item: float(item["cy"]))
    tolerance = max(10, math.floor(median(float(item["height"]) for item in sorted_items) * 0.55))
    rows: list[dict[str, object]] = []

    for item in sorted_items:
        if not rows or abs(float(item["cy"]) - float(rows[-1]["cy"])) > tolerance:
            rows.append({"items": [item], "cy": float(item["cy"])})
            continue
        row_items: list[dict[str, float | int]] = rows[-1]["items"]  # type: ignore[assignment]
        row_items.append(item)
        rows[-1]["cy"] = float(np.mean([float(entry["cy"]) for entry in row_items]))

    for row in rows:
        row["items"] = sorted(row["items"], key=lambda item: float(item["cx"]))  # type: ignore[assignment]

    return rows


def normalize_rows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    normalized: list[dict[str, object]] = []

    for row in rows:
        items: list[dict[str, float | int]] = row["items"]  # type: ignore[assignment]
        widths = [float(item["width"]) for item in items]
        heights = [float(item["height"]) for item in items]
        width_median = max(1.0, median(widths))
        height_median = max(1.0, median(heights))

        kept = [
            item
            for item in items
            if width_median * 0.45 <= float(item["width"]) <= width_median * 1.8
            and height_median * 0.45 <= float(item["height"]) <= height_median * 1.8
        ]
        if len(kept) < 3:
            continue

        centers = [float(item["cx"]) for item in kept]
        gaps = [centers[index + 1] - centers[index] for index in range(len(centers) - 1)]
        if not gaps:
            continue

        gap_median = max(1.0, median(gaps))
        if max(gaps) > gap_median * 1.55:
            continue

        normalized.append({"items": kept, "cy": float(row["cy"])})

    while len(normalized) >= 2:
        counts = [len(row["items"]) for row in normalized]  # type: ignore[index]
        count_median = median(counts)
        last_count = counts[-1]
        has_similar_earlier = any(abs(count - last_count) <= 1.5 for count in counts[:-1])

        if not has_similar_earlier and abs(last_count - count_median) >= 2:
            normalized.pop()
            continue

        row_gaps = [
            float(normalized[index + 1]["cy"]) - float(normalized[index]["cy"])
            for index in range(len(normalized) - 1)
        ]
        if row_gaps and row_gaps[-1] > median(row_gaps) * 1.6:
            normalized.pop()
            continue
        break

    return normalized


def choose_groups(items: list[dict[str, float | int]]) -> tuple[str, list[dict[str, object]], list[dict[str, object]]]:
    candidates: list[tuple[float, str, list[dict[str, object]], list[dict[str, object]]]] = []

    for axis, start_key, end_key, center_key, size_key in (
        ("x", "x0", "x1", "cx", "width"),
        ("y", "y0", "y1", "cy", "height"),
    ):
        groups = split_components(items, center_key)
        if not groups:
            continue

        normalized_groups = [normalize_rows(group_rows(group)) for group in groups]
        row_counts = [len(group) for group in normalized_groups]
        if min(row_counts) == 0:
            continue

        median_component_sum = sum(
            median(len(row["items"]) for row in group)  # type: ignore[index]
            for group in normalized_groups
        )
        balance = min(row_counts) / max(row_counts)
        gap = min(int(item[start_key]) for item in groups[1]) - max(int(item[end_key]) for item in groups[0])
        size_median = max(1.0, median(float(item[size_key]) for item in items))
        gap_bonus = max(0.0, gap / size_median)
        score = median_component_sum * balance * (1 + gap_bonus)
        candidates.append((score, axis, normalized_groups[0], normalized_groups[1]))

    if not candidates:
        raise ValueError("Unable to separate front and back sprite groups")

    candidates.sort(key=lambda entry: entry[0], reverse=True)
    _, axis, front_rows, back_rows = candidates[0]
    return axis, front_rows, back_rows


def trim_transparent(crop: np.ndarray) -> np.ndarray:
    ys, xs = np.nonzero(crop[:, :, 3])
    if len(xs) == 0:
        return np.zeros((1, 1, 4), dtype=np.uint8)
    return crop[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1].copy()


def alpha_composite(base: np.ndarray, overlay: np.ndarray, top: int, left: int) -> None:
    height, width, _ = overlay.shape
    region = base[top : top + height, left : left + width]
    alpha = overlay[:, :, 3:4].astype(np.float32) / 255.0
    blended = overlay.astype(np.float32) * alpha + region.astype(np.float32) * (1 - alpha)
    base[top : top + height, left : left + width] = blended.astype(np.uint8)


def build_sheet(image: np.ndarray, rows: list[dict[str, object]]) -> np.ndarray:
    row_gap = 4
    column_gap = 2
    rendered_rows: list[np.ndarray] = []
    total_height = 0
    max_width = 1

    for row in rows:
        row_items: list[dict[str, float | int]] = row["items"]  # type: ignore[assignment]
        sprite_crops = [
            trim_transparent(
                image[int(item["y0"]) : int(item["y1"]), int(item["x0"]) : int(item["x1"])]
            )
            for item in row_items
        ]
        row_height = max(crop.shape[0] for crop in sprite_crops)
        row_width = sum(crop.shape[1] for crop in sprite_crops) + column_gap * max(0, len(sprite_crops) - 1)
        row_canvas = np.zeros((row_height, row_width, 4), dtype=np.uint8)

        left = 0
        for crop in sprite_crops:
            top = row_height - crop.shape[0]
            alpha_composite(row_canvas, crop, top, left)
            left += crop.shape[1] + column_gap

        rendered_rows.append(row_canvas)
        max_width = max(max_width, row_width)
        total_height += row_height

    total_height += row_gap * max(0, len(rendered_rows) - 1)
    sheet = np.zeros((total_height, max_width, 4), dtype=np.uint8)
    top = 0
    for row_canvas in rendered_rows:
        left = (max_width - row_canvas.shape[1]) // 2
        alpha_composite(sheet, row_canvas, top, left)
        top += row_canvas.shape[0] + row_gap

    return sheet


def export_battler_sheets(source_path: Path, canonical_stem: str, raw_dir: Path, front_dir: Path, back_dir: Path) -> None:
    shutil.copy2(source_path, raw_dir / f"{canonical_stem}.png")

    with Image.open(source_path) as source_image:
        rgba = np.array(source_image.convert("RGBA"))

    cleaned = remove_border_backgrounds(rgba)
    components = extract_components(cleaned)
    if not components:
        raise ValueError("No sprite components detected")

    _, front_rows, back_rows = choose_groups(components)
    if not front_rows or not back_rows:
        raise ValueError("Missing front or back rows after separation")

    Image.fromarray(build_sheet(cleaned, front_rows), mode="RGBA").save(front_dir / f"{canonical_stem}.png")
    Image.fromarray(build_sheet(cleaned, back_rows), mode="RGBA").save(back_dir / f"{canonical_stem}.png")


def write_reports(report_json: Path, report_md: Path, manifest: dict[str, object]) -> None:
    report_json.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    counts = manifest["counts"]  # type: ignore[index]
    lines = [
        "# Spriters Resource Pokemon Black/White Import",
        "",
        "Counts",
        f"- Total files scanned: {counts['totalFiles']}",
        f"- Battler sheets copied: {counts['battlerSheets']}",
        f"- Battle atlases copied: {counts['battleAtlases']}",
        f"- Battle parts sheets copied: {counts['battleParts']}",
        f"- Animated front sheets exported: {counts['animatedFront']}",
        f"- Animated back sheets exported: {counts['animatedBack']}",
        f"- Unresolved battlers: {counts['unresolved']}",
        "",
        "Folders",
        f"- Raw battler sheets: {manifest['folders']['rawDir']}",
        f"- Atlas sheets: {manifest['folders']['atlasDir']}",
        f"- Parts sheets: {manifest['folders']['partsDir']}",
        f"- Animated front sheets: {manifest['folders']['frontDir']}",
        f"- Animated back sheets: {manifest['folders']['backDir']}",
        f"- Manifest: {report_json}",
    ]

    unresolved = manifest["unresolved"]  # type: ignore[index]
    if unresolved:
        lines.extend(["", "Unresolved"])
        lines.extend(f"- {entry['source']}: {entry['reason']}" for entry in unresolved)

    report_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-dir",
        default=r"C:\users\hedge\onedrive\desktop\pokem\sources\spriters-resource\pokemonblackwhite-redownload",
    )
    parser.add_argument(
        "--project-root",
        default=r"C:\users\hedge\onedrive\desktop\pokem",
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    project_root = Path(args.project_root)

    front_sprite_dir = project_root / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "front"
    base_by_comparable, female_by_base = get_canonical_maps(front_sprite_dir)

    pokemon_root = project_root / "sources" / "spriters-resource" / "pokemonblackwhite-pokemon"
    raw_dir = pokemon_root / "battlers-raw"
    atlas_dir = pokemon_root / "atlases"
    parts_dir = pokemon_root / "parts"
    animated_front_dir = project_root / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "animated" / "front"
    animated_back_dir = project_root / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "animated" / "back"
    report_json = pokemon_root / "manifest.json"
    report_md = pokemon_root / "README.md"

    for directory in (pokemon_root, raw_dir, atlas_dir, parts_dir, animated_front_dir, animated_back_dir):
        directory.mkdir(parents=True, exist_ok=True)
        for png_file in directory.glob("*.png"):
            png_file.unlink()

    manifest: dict[str, object] = {
        "sourceDir": str(source_dir),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "counts": {
            "totalFiles": 0,
            "battlerSheets": 0,
            "battleAtlases": 0,
            "battleParts": 0,
            "animatedFront": 0,
            "animatedBack": 0,
            "unresolved": 0,
        },
        "folders": {
            "rawDir": str(raw_dir),
            "atlasDir": str(atlas_dir),
            "partsDir": str(parts_dir),
            "frontDir": str(animated_front_dir),
            "backDir": str(animated_back_dir),
        },
        "unresolved": [],
        "battlers": [],
        "atlases": [],
        "parts": [],
    }

    for file in sorted(source_dir.iterdir(), key=lambda path: path.name):
        if not file.is_file():
            continue

        counts = manifest["counts"]  # type: ignore[index]
        counts["totalFiles"] += 1  # type: ignore[index]
        match = BATTLE_SHEET_RE.match(file.stem)
        resolved_download = None if match else resolve_redownload_stem(file.stem, base_by_comparable, female_by_base)

        if match or resolved_download:
            try:
                if match:
                    species = match.group("species").strip()
                    variant = match.group("variant")
                    canonical_stem = resolve_canonical_stem(species, variant, base_by_comparable, female_by_base)
                else:
                    canonical_stem, species, variant = resolved_download  # type: ignore[misc]

                export_battler_sheets(file, canonical_stem, raw_dir, animated_front_dir, animated_back_dir)
                counts["battlerSheets"] += 1  # type: ignore[index]
                counts["animatedFront"] += 1  # type: ignore[index]
                counts["animatedBack"] += 1  # type: ignore[index]
                manifest["battlers"].append(  # type: ignore[index]
                    {
                        "source": file.name,
                        "species": species,
                        "variant": variant,
                        "canonical": f"{canonical_stem}.png",
                    }
                )
            except Exception as exc:  # noqa: BLE001
                counts["unresolved"] += 1  # type: ignore[index]
                manifest["unresolved"].append({"source": file.name, "reason": str(exc)})  # type: ignore[index]
            continue

        if "Generation" in file.stem or "Parts" in file.stem:
            if "Parts" in file.stem:
                shutil.copy2(file, parts_dir / file.name)
                counts["battleParts"] += 1  # type: ignore[index]
                manifest["parts"].append(file.name)  # type: ignore[index]
            else:
                shutil.copy2(file, atlas_dir / file.name)
                counts["battleAtlases"] += 1  # type: ignore[index]
                manifest["atlases"].append(file.name)  # type: ignore[index]

    write_reports(report_json, report_md, manifest)
    print(f"Done. Report: {report_md}")


if __name__ == "__main__":
    main()
