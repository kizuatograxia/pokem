from __future__ import annotations

import argparse
import json
import math
import re
import shutil
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


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

REGION_OVERRIDES: dict[str, dict[str, tuple[float, float, float, float] | str]] = {
    "PIKACHU": {
        "front_box": (0.0, 0.0, 1.0, 0.48),
        "back_box": (0.0, 0.49, 1.0, 0.90),
        "mode": "single_row",
    },
    "PIKACHU_female": {
        "front_box": (0.0, 0.0, 1.0, 0.48),
        "back_box": (0.0, 0.49, 1.0, 0.90),
        "mode": "single_row",
    },
    "BLASTOISE": {
        "front_box": (0.0, 0.0, 0.82, 0.48),
        "back_box": (0.0, 0.49, 0.82, 0.86),
        "mode": "single_row",
    },
    "VENUSAUR": {
        "front_box": (0.0, 0.0, 0.47, 0.72),
        "back_box": (0.46, 0.0, 1.0, 1.0),
        "mode": "all_rows",
    },
    "VENUSAUR_female": {
        "front_box": (0.0, 0.0, 0.47, 0.72),
        "back_box": (0.46, 0.0, 1.0, 1.0),
        "mode": "all_rows",
    },
}


@dataclass(frozen=True)
class Rect:
    left: int
    top: int
    right: int
    bottom: int

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.bottom - self.top

    @property
    def area(self) -> int:
        return self.width * self.height

    def padded(self, amount: int, max_width: int, max_height: int) -> "Rect":
        return Rect(
            max(0, self.left - amount),
            max(0, self.top - amount),
            min(max_width, self.right + amount),
            min(max_height, self.bottom + amount),
        )

    def as_box(self) -> tuple[int, int, int, int]:
        return self.left, self.top, self.right, self.bottom


@dataclass
class Component:
    rect: Rect
    count: int
    pixels: list[tuple[int, int]] | None = None


def comparable_key(value: str) -> str:
    normalized = value.upper()
    normalized = normalized.replace("♀", "FE").replace("♂", "MA")
    normalized = normalized.replace("É", "E")
    return re.sub(r"[^A-Z0-9]", "", normalized)


def rect_from_fractions(size: tuple[int, int], fractions: tuple[float, float, float, float]) -> Rect:
    width, height = size
    left = max(0, min(width - 1, int(width * fractions[0])))
    top = max(0, min(height - 1, int(height * fractions[1])))
    right = max(left + 1, min(width, int(width * fractions[2])))
    bottom = max(top + 1, min(height, int(height * fractions[3])))
    return Rect(left, top, right, bottom)


def get_canonical_maps(front_dir: Path) -> tuple[dict[str, str], dict[str, str]]:
    base_by_comparable: dict[str, str] = {}
    female_by_base: dict[str, str] = {}

    for file in front_dir.iterdir():
        if not file.is_file():
            continue
        stem = file.stem
        if re.search(r"_\d+$", stem) or stem.endswith("_female"):
            match = re.match(r"^(.*)_female$", stem)
            if match:
                female_by_base[match.group(1)] = stem
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
    if display_species == "Nidoran♀":
        return "NIDORANfE"
    if display_species == "Nidoran♂":
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

    species_variants = VARIANT_SUFFIX_MAPS[base_stem]
    if variant_key not in species_variants:
        raise ValueError(f"Unknown variant '{variant}' for '{display_species}'")

    suffix = species_variants[variant_key]
    if suffix == 0:
        return base_stem
    return f"{base_stem}_{suffix}"


def image_to_mask(image: Image.Image, bg_rgba: tuple[int, int, int, int]) -> list[bytearray]:
    width, height = image.size
    pixels = image.load()
    mask = [bytearray(width) for _ in range(height)]
    for y in range(height):
        row = mask[y]
        for x in range(width):
            if pixels[x, y] != bg_rgba:
                row[x] = 1
    return mask


def find_components(mask: list[bytearray], store_pixels: bool = False) -> list[Component]:
    if not mask:
        return []
    height = len(mask)
    width = len(mask[0])
    visited = [bytearray(width) for _ in range(height)]
    components: list[Component] = []

    for y in range(height):
        row = mask[y]
        visit_row = visited[y]
        for x in range(width):
            if not row[x] or visit_row[x]:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            visit_row[x] = 1
            min_x = max_x = x
            min_y = max_y = y
            count = 0
            pixels: list[tuple[int, int]] | None = [] if store_pixels else None

            while queue:
                cx, cy = queue.popleft()
                count += 1
                if pixels is not None:
                    pixels.append((cx, cy))
                if cx < min_x:
                    min_x = cx
                if cx > max_x:
                    max_x = cx
                if cy < min_y:
                    min_y = cy
                if cy > max_y:
                    max_y = cy

                for ny in range(max(0, cy - 1), min(height, cy + 2)):
                    nvisit = visited[ny]
                    nrow = mask[ny]
                    for nx in range(max(0, cx - 1), min(width, cx + 2)):
                        if nrow[nx] and not nvisit[nx]:
                            nvisit[nx] = 1
                            queue.append((nx, ny))

            components.append(
                Component(
                    rect=Rect(min_x, min_y, max_x + 1, max_y + 1),
                    count=count,
                    pixels=pixels,
                )
            )

    return components


def build_tile_mask(mask: list[bytearray], tile_size: int = 8) -> list[bytearray]:
    height = len(mask)
    width = len(mask[0]) if height else 0
    tile_width = math.ceil(width / tile_size)
    tile_height = math.ceil(height / tile_size)
    tile_mask = [bytearray(tile_width) for _ in range(tile_height)]

    for tile_y in range(tile_height):
        y0 = tile_y * tile_size
        y1 = min(height, y0 + tile_size)
        for tile_x in range(tile_width):
            x0 = tile_x * tile_size
            x1 = min(width, x0 + tile_size)
            active = 0
            for y in range(y0, y1):
                row = mask[y]
                for x in range(x0, x1):
                    active += row[x]
            threshold = max(4, ((x1 - x0) * (y1 - y0)) // 14)
            if active >= threshold:
                tile_mask[tile_y][tile_x] = 1

    return tile_mask


def dilate_mask(mask: list[bytearray], radius: int = 1) -> list[bytearray]:
    height = len(mask)
    width = len(mask[0]) if height else 0
    out = [bytearray(width) for _ in range(height)]
    for y in range(height):
        row = mask[y]
        for x in range(width):
            if not row[x]:
                continue
            for ny in range(max(0, y - radius), min(height, y + radius + 1)):
                out_row = out[ny]
                for nx in range(max(0, x - radius), min(width, x + radius + 1)):
                    out_row[nx] = 1
    return out


def count_active(mask: list[bytearray], rect: Rect) -> int:
    total = 0
    for y in range(rect.top, rect.bottom):
        row = mask[y]
        for x in range(rect.left, rect.right):
            total += row[x]
    return total


def projection_counts(mask: list[bytearray], rect: Rect) -> tuple[list[int], list[int]]:
    row_counts = [0] * rect.height
    col_counts = [0] * rect.width

    for y in range(rect.top, rect.bottom):
        row = mask[y]
        row_total = 0
        for x in range(rect.left, rect.right):
            value = row[x]
            row_total += value
            col_counts[x - rect.left] += value
        row_counts[y - rect.top] = row_total

    return row_counts, col_counts


def split_region_by_valley(mask: list[bytearray], rect: Rect) -> list[Rect]:
    row_counts, col_counts = projection_counts(mask, rect)
    candidates: list[tuple[float, Rect, Rect]] = []

    row_threshold = max(2, rect.width // 140)
    for start, end in find_runs([1 if count <= row_threshold else 0 for count in row_counts], 1, 1):
        if end - start + 1 < 4:
            continue
        split_y = rect.top + (start + end + 1) // 2
        upper = Rect(rect.left, rect.top, rect.right, split_y)
        lower = Rect(rect.left, split_y, rect.right, rect.bottom)
        if upper.height < 36 or lower.height < 36:
            continue
        upper_active = count_active(mask, upper)
        lower_active = count_active(mask, lower)
        if upper_active < 350 or lower_active < 350:
            continue
        score = (end - start + 1) * min(upper_active, lower_active)
        candidates.append((score, upper, lower))

    col_threshold = max(2, rect.height // 140)
    for start, end in find_runs([1 if count <= col_threshold else 0 for count in col_counts], 1, 1):
        if end - start + 1 < 4:
            continue
        split_x = rect.left + (start + end + 1) // 2
        left = Rect(rect.left, rect.top, split_x, rect.bottom)
        right = Rect(split_x, rect.top, rect.right, rect.bottom)
        if left.width < 36 or right.width < 36:
            continue
        left_active = count_active(mask, left)
        right_active = count_active(mask, right)
        if left_active < 350 or right_active < 350:
            continue
        score = (end - start + 1) * min(left_active, right_active)
        candidates.append((score, left, right))

    if not candidates:
        return []

    _, first, second = max(candidates, key=lambda item: item[0])
    regions = [first, second]
    regions.sort(key=lambda candidate: (candidate.top, candidate.left))
    return regions


def find_axis_regions(mask: list[bytearray], horizontal: bool) -> list[Rect]:
    if not mask:
        return []

    height = len(mask)
    width = len(mask[0])
    if horizontal:
        counts = [sum(row) for row in mask]
        threshold = max(12, int(max(counts, default=0) * 0.28))
        runs = find_runs(counts, threshold, max_gap=4)
    else:
        counts = [0] * width
        for row in mask:
            for x in range(width):
                counts[x] += row[x]
        threshold = max(12, int(max(counts, default=0) * 0.28))
        runs = find_runs(counts, threshold, max_gap=4)

    candidates: list[tuple[int, Rect]] = []
    for start, end in runs:
        if horizontal:
            rect = refine_rect(mask, Rect(0, start, width, end + 1), pad=2)
        else:
            rect = refine_rect(mask, Rect(start, 0, end + 1, height), pad=2)
        if not rect:
            continue
        active = count_active(mask, rect)
        min_span = height * 0.16 if horizontal else width * 0.16
        span = rect.height if horizontal else rect.width
        if rect.width < 48 or rect.height < 32 or active < 450 or span < min_span:
            continue
        candidates.append((active, rect))

    if len(candidates) < 2:
        return []

    candidates.sort(key=lambda item: item[0], reverse=True)
    if candidates[1][0] < candidates[0][0] * 0.45:
        return []

    regions = [rect for _, rect in candidates[:2]]
    regions.sort(key=lambda candidate: (candidate.top, candidate.left))
    return regions


def find_animation_regions(mask: list[bytearray], image_size: tuple[int, int]) -> list[Rect]:
    width, height = image_size
    tile_size = 8
    cleaned_mask = clean_region_mask(mask)
    horizontal_regions = find_axis_regions(cleaned_mask, horizontal=True)
    if len(horizontal_regions) == 2:
        return horizontal_regions

    vertical_regions = find_axis_regions(cleaned_mask, horizontal=False)
    if len(vertical_regions) == 2:
        return vertical_regions

    coarse_mask = dilate_mask(build_tile_mask(cleaned_mask, tile_size), radius=1)
    regions: list[tuple[float, int, Rect]] = []

    for component in find_components(coarse_mask, store_pixels=False):
        rect = Rect(
            component.rect.left * tile_size,
            component.rect.top * tile_size,
            min(width, component.rect.right * tile_size),
            min(height, component.rect.bottom * tile_size),
        )
        active = count_active(cleaned_mask, rect)
        if rect.width < 64 or rect.height < 40 or active < 450:
            continue
        density = active / max(1, rect.area)
        score = (active * 1.0) + (rect.area * density * 0.35)
        regions.append((score, active, rect))

    regions.sort(key=lambda item: item[0], reverse=True)
    if not regions:
        return []

    primary_rect = regions[0][2]
    split_primary = split_region_by_valley(cleaned_mask, primary_rect)
    if split_primary and (
        len(regions) == 1 or (len(regions) > 1 and regions[1][0] < regions[0][0] * 0.35)
    ):
        return split_primary

    top_two = [rect for _, _, rect in regions[:2]]
    top_two.sort(key=lambda rect: (rect.top, rect.left))
    return top_two


def clean_region_mask(mask: list[bytearray]) -> list[bytearray]:
    cleaned = [bytearray(row) for row in mask]
    for component in find_components(cleaned, store_pixels=True):
        rect = component.rect
        should_remove = False
        if component.count <= 2:
            should_remove = True
        elif rect.width <= 3 and rect.height >= 10:
            should_remove = True
        elif rect.height <= 3 and rect.width >= 20:
            should_remove = True
        elif rect.width <= 2 and rect.height >= 6:
            should_remove = True

        if should_remove and component.pixels:
            for x, y in component.pixels:
                cleaned[y][x] = 0
    return cleaned


def find_runs(counts: list[int], threshold: int, max_gap: int) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    start = -1
    last_active = -9999
    for index, count in enumerate(counts):
        if count >= threshold:
            if start < 0:
                start = index
            elif index - last_active > max_gap + 1:
                runs.append((start, last_active))
                start = index
            last_active = index
        elif start >= 0 and index - last_active > max_gap:
            runs.append((start, last_active))
            start = -1
            last_active = -9999

    if start >= 0:
        runs.append((start, last_active))
    return runs


def refine_rect(mask: list[bytearray], rect: Rect, pad: int = 1) -> Rect | None:
    min_x = rect.right
    min_y = rect.bottom
    max_x = rect.left - 1
    max_y = rect.top - 1
    active = 0

    for y in range(rect.top, rect.bottom):
        row = mask[y]
        for x in range(rect.left, rect.right):
            if not row[x]:
                continue
            active += 1
            if x < min_x:
                min_x = x
            if x > max_x:
                max_x = x
            if y < min_y:
                min_y = y
            if y > max_y:
                max_y = y

    if active < 16 or max_x < min_x or max_y < min_y:
        return None

    height = len(mask)
    width = len(mask[0]) if height else 0
    return Rect(min_x, min_y, max_x + 1, max_y + 1).padded(pad, width, height)


def trim_sparse_tail(rects: list[Rect], dominant_width: float) -> list[Rect]:
    if len(rects) < 4:
        return rects

    ordered = sorted(rects, key=lambda item: item.left)
    gaps = [ordered[index + 1].left - ordered[index].right for index in range(len(ordered) - 1)]
    positive_gaps = sorted(gap for gap in gaps if gap > 0)
    median_gap = positive_gaps[len(positive_gaps) // 2] if positive_gaps else 0
    large_gap = max(int(dominant_width * 1.25), median_gap * 3, 18)

    for index, gap in enumerate(gaps):
        if gap < large_gap:
            continue
        left_count = index + 1
        right_count = len(ordered) - left_count
        if left_count >= 3 and right_count <= max(2, math.ceil(left_count * 0.35)):
            return ordered[:left_count]
        if right_count >= 3 and left_count <= max(2, math.ceil(right_count * 0.35)):
            return ordered[left_count:]

    return ordered


def pick_single_row(frames: list[Rect]) -> list[Rect]:
    if len(frames) < 2:
        return frames
    average_height = sum(frame.height for frame in frames) / len(frames)
    tolerance = max(8.0, average_height * 0.55)
    rows: list[dict[str, object]] = []
    for frame in sorted(frames, key=lambda item: (item.top, item.left)):
        center_y = (frame.top + frame.bottom) / 2
        matched_row = None
        for row in rows:
            if abs(center_y - row["center_y"]) <= tolerance:
                matched_row = row
                break
        if matched_row is None:
            rows.append({"center_y": center_y, "rects": [frame]})
        else:
            rects = matched_row["rects"]
            rects.append(frame)
            matched_row["center_y"] = sum(
                (item.top + item.bottom) / 2 for item in rects
            ) / len(rects)

    best_row = max(rows, key=lambda row: (len(row["rects"]), -row["center_y"]))
    return sorted(best_row["rects"], key=lambda item: item.left)


def extract_component_frames(region_mask: list[bytearray]) -> list[Rect]:
    cleaned = clean_region_mask(region_mask)
    height = len(cleaned)
    width = len(cleaned[0]) if height else 0
    grown = dilate_mask(cleaned, radius=1)

    candidates: list[Rect] = []
    for component in find_components(grown, store_pixels=False):
        if component.rect.width < 6 or component.rect.height < 6:
            continue
        refined = refine_rect(cleaned, component.rect.padded(1, width, height))
        if not refined:
            continue
        if refined.width < 8 or refined.height < 8:
            continue
        if count_active(cleaned, refined) < 24:
            continue
        candidates.append(refined)

    if len(candidates) < 2:
        return []

    dominant_cluster: list[Rect] = []
    best_score = -1.0
    for seed in candidates:
        width_tolerance = max(4, int(seed.width * 0.35))
        height_tolerance = max(4, int(seed.height * 0.35))
        cluster = [
            rect
            for rect in candidates
            if abs(rect.width - seed.width) <= width_tolerance
            and abs(rect.height - seed.height) <= height_tolerance
        ]
        score = len(cluster) * math.sqrt(max(1, seed.area))
        if score > best_score:
            best_score = score
            dominant_cluster = cluster

    if len(dominant_cluster) < 2:
        return []

    dominant_width = sum(rect.width for rect in dominant_cluster) / len(dominant_cluster)
    dominant_height = sum(rect.height for rect in dominant_cluster) / len(dominant_cluster)
    row_tolerance = max(8.0, dominant_height * 0.55)
    rows: list[dict[str, object]] = []
    for rect in sorted(dominant_cluster, key=lambda item: (item.top, item.left)):
        center_y = (rect.top + rect.bottom) / 2
        matched_row = None
        for row in rows:
            if abs(center_y - row["center_y"]) <= row_tolerance:
                matched_row = row
                break
        if matched_row is None:
            rows.append(
                {
                    "center_y": center_y,
                    "top": rect.top,
                    "bottom": rect.bottom,
                    "rects": [rect],
                }
            )
        else:
            rects = matched_row["rects"]
            rects.append(rect)
            matched_row["center_y"] = sum(
                (item.top + item.bottom) / 2 for item in rects
            ) / len(rects)
            matched_row["top"] = min(item.top for item in rects)
            matched_row["bottom"] = max(item.bottom for item in rects)

    max_row_count = max(len(row["rects"]) for row in rows)
    minimum_row_count = 1 if len(rows) == 1 else max(3, math.ceil(max_row_count * 0.4))
    candidate_rows = [row for row in rows if len(row["rects"]) >= minimum_row_count]
    if not candidate_rows:
        return []

    candidate_rows.sort(key=lambda row: row["center_y"])
    block_gap = max(8.0, dominant_height * 0.45)
    row_blocks: list[list[dict[str, object]]] = []
    for row in candidate_rows:
        if not row_blocks:
            row_blocks.append([row])
            continue
        previous = row_blocks[-1][-1]
        if row["top"] - previous["bottom"] <= block_gap:
            row_blocks[-1].append(row)
        else:
            row_blocks.append([row])

    best_block = max(
        row_blocks,
        key=lambda block: sum(len(row["rects"]) for row in block),
    )

    kept_frames: list[Rect] = []
    for row in best_block:
        rects = row["rects"]
        kept_frames.extend(trim_sparse_tail(rects, dominant_width))

    return kept_frames


def extract_frames(region_mask: list[bytearray]) -> list[Rect]:
    component_frames = extract_component_frames(region_mask)
    if len(component_frames) >= 2:
        return component_frames

    cleaned = clean_region_mask(region_mask)
    height = len(cleaned)
    width = len(cleaned[0]) if height else 0
    components = [
        component.rect.padded(1, width, height)
        for component in find_components(cleaned, store_pixels=False)
        if component.count >= 24 and component.rect.width >= 8 and component.rect.height >= 8
    ]
    components.sort(key=lambda rect: (rect.top, rect.left))
    return components


def extract_frames_for_mode(region_mask: list[bytearray], mode: str) -> list[Rect]:
    frames = extract_frames(region_mask)
    if mode == "single_row":
        return pick_single_row(frames)
    return frames


def render_strip(
    source_image: Image.Image,
    bg_rgba: tuple[int, int, int, int],
    region_rect: Rect,
    frames: list[Rect],
) -> Image.Image:
    region = source_image.crop(region_rect.as_box()).convert("RGBA")
    region_mask = clean_region_mask(image_to_mask(region, bg_rgba))

    max_width = max(frame.width for frame in frames)
    max_height = max(frame.height for frame in frames)
    sheet = Image.new("RGBA", (max_width * len(frames), max_height), (0, 0, 0, 0))
    region_pixels = region.load()

    for index, frame in enumerate(frames):
        frame_image = Image.new("RGBA", (frame.width, frame.height), (0, 0, 0, 0))
        frame_pixels = frame_image.load()
        for y in range(frame.top, frame.bottom):
            mask_row = region_mask[y]
            for x in range(frame.left, frame.right):
                if mask_row[x]:
                    frame_pixels[x - frame.left, y - frame.top] = region_pixels[x, y]

        paste_x = index * max_width + (max_width - frame.width) // 2
        paste_y = max_height - frame.height
        sheet.alpha_composite(frame_image, (paste_x, paste_y))

    return sheet


def save_debug_overlay(
    source_image: Image.Image,
    target_path: Path,
    regions: list[Rect],
    frames_by_region: list[list[Rect]],
) -> None:
    debug = source_image.convert("RGBA")
    draw = ImageDraw.Draw(debug)
    palette = [
        (255, 80, 80, 255),
        (80, 180, 255, 255),
        (255, 210, 80, 255),
        (180, 255, 80, 255),
    ]
    for index, region in enumerate(regions):
        color = palette[index % len(palette)]
        draw.rectangle(region.as_box(), outline=color, width=3)
        for frame in frames_by_region[index]:
            absolute = Rect(
                region.left + frame.left,
                region.top + frame.top,
                region.left + frame.right,
                region.top + frame.bottom,
            )
            draw.rectangle(absolute.as_box(), outline=color, width=1)
    debug.save(target_path)


def export_battler_sheet(
    source_path: Path,
    canonical_stem: str,
    raw_dir: Path,
    front_dir: Path,
    back_dir: Path,
    debug_dir: Path | None = None,
) -> dict[str, int]:
    shutil.copy2(source_path, raw_dir / f"{canonical_stem}.png")

    with Image.open(source_path) as source_image:
        rgba = source_image.convert("RGBA")
        bg_rgba = rgba.getpixel((0, 0))
        full_mask = image_to_mask(rgba, bg_rgba)
        override = REGION_OVERRIDES.get(canonical_stem)
        mode = "all_rows"
        if override:
            regions = [
                rect_from_fractions(rgba.size, override["front_box"]),
                rect_from_fractions(rgba.size, override["back_box"]),
            ]
            mode = str(override["mode"])
        else:
            regions = find_animation_regions(full_mask, rgba.size)
        if len(regions) != 2:
            raise ValueError(f"Expected 2 animation regions, found {len(regions)}")

        outputs = []
        frames_by_region: list[list[Rect]] = []
        for region_rect, side_dir in zip(regions, (front_dir, back_dir), strict=True):
            region_image = rgba.crop(region_rect.as_box())
            region_mask = image_to_mask(region_image, bg_rgba)
            frames = extract_frames_for_mode(region_mask, mode)
            if len(frames) < 2:
                raise ValueError(
                    f"Expected at least 2 frames in region {region_rect}, found {len(frames)}"
                )
            strip = render_strip(rgba, bg_rgba, region_rect, frames)
            strip.save(side_dir / f"{canonical_stem}.png")
            outputs.append(len(frames))
            frames_by_region.append(frames)

        if debug_dir is not None:
            debug_dir.mkdir(parents=True, exist_ok=True)
            save_debug_overlay(
                rgba,
                debug_dir / f"{canonical_stem}.png",
                regions,
                frames_by_region,
            )

        return {"frontFrames": outputs[0], "backFrames": outputs[1]}


def should_process(
    source_name: str,
    canonical_stem: str,
    filters: list[str],
) -> bool:
    if not filters:
        return True
    haystacks = (
        source_name.upper(),
        canonical_stem.upper(),
    )
    return any(any(token in haystack for haystack in haystacks) for token in filters)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-dir",
        default=r"C:\Users\hedge\OneDrive\Desktop\pokém\sources\spriters-resource\pokemonblackwhite-full",
    )
    parser.add_argument(
        "--project-root",
        default=r"C:\Users\hedge\OneDrive\Desktop\pokém",
    )
    parser.add_argument(
        "--match",
        action="append",
        default=[],
        help="Only process sprites whose source or canonical name contains this token",
    )
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--debug-dir")
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    project_root = Path(args.project_root)
    filters = [token.upper() for token in args.match]
    debug_dir = Path(args.debug_dir) if args.debug_dir else None
    battler_index = 0

    front_dir = project_root / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "front"
    base_by_comparable, female_by_base = get_canonical_maps(front_dir)

    pokemon_root = project_root / "sources" / "spriters-resource" / "pokemonblackwhite-pokemon"
    battler_raw_dir = pokemon_root / "battlers-raw"
    atlas_dir = pokemon_root / "atlases"
    parts_dir = pokemon_root / "parts"
    animated_front_dir = (
        project_root / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "animated" / "front"
    )
    animated_back_dir = (
        project_root / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "animated" / "back"
    )
    manifest_path = pokemon_root / "manifest.json"
    readme_path = pokemon_root / "README.md"

    for directory in (
        pokemon_root,
        battler_raw_dir,
        atlas_dir,
        parts_dir,
        animated_front_dir,
        animated_back_dir,
    ):
        directory.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, object] = {
        "sourceDir": str(source_dir),
        "counts": {
            "totalFiles": 0,
            "battlerSheets": 0,
            "battleAtlases": 0,
            "battleParts": 0,
            "animatedFront": 0,
            "animatedBack": 0,
            "unresolved": 0,
        },
        "unresolved": [],
        "battlers": [],
        "atlases": [],
        "parts": [],
    }

    battler_pattern = re.compile(
        r"^\d+__\d+__#\d+\s+(?P<species>.+?)(?:\s+\((?P<variant>[^)]+)\))?$"
    )

    for source_file in sorted(source_dir.iterdir(), key=lambda path: path.name):
        if not source_file.is_file():
            continue
        manifest["counts"]["totalFiles"] += 1  # type: ignore[index]
        stem = source_file.stem

        battler_match = battler_pattern.match(stem)
        if battler_match:
            species = battler_match.group("species").strip()
            variant = battler_match.group("variant")
            try:
                canonical_stem = resolve_canonical_stem(
                    species,
                    variant,
                    base_by_comparable,
                    female_by_base,
                )
                if battler_index < args.offset:
                    battler_index += 1
                    continue
                if args.limit is not None and battler_index >= args.offset + args.limit:
                    break
                battler_index += 1
                if not should_process(source_file.name, canonical_stem, filters):
                    continue

                result = export_battler_sheet(
                    source_file,
                    canonical_stem,
                    battler_raw_dir,
                    animated_front_dir,
                    animated_back_dir,
                    debug_dir,
                )

                manifest["counts"]["battlerSheets"] += 1  # type: ignore[index]
                manifest["counts"]["animatedFront"] += 1  # type: ignore[index]
                manifest["counts"]["animatedBack"] += 1  # type: ignore[index]
                manifest["battlers"].append(  # type: ignore[union-attr]
                    {
                        "source": source_file.name,
                        "species": species,
                        "variant": variant,
                        "canonical": f"{canonical_stem}.png",
                        **result,
                    }
                )
            except Exception as exc:  # noqa: BLE001
                manifest["counts"]["unresolved"] += 1  # type: ignore[index]
                manifest["unresolved"].append(  # type: ignore[union-attr]
                    {"source": source_file.name, "reason": str(exc)}
                )
            continue

        if "Generation" in stem or "Parts" in stem:
            if "Parts" in stem:
                shutil.copy2(source_file, parts_dir / source_file.name)
                manifest["counts"]["battleParts"] += 1  # type: ignore[index]
                manifest["parts"].append(source_file.name)  # type: ignore[union-attr]
            else:
                shutil.copy2(source_file, atlas_dir / source_file.name)
                manifest["counts"]["battleAtlases"] += 1  # type: ignore[index]
                manifest["atlases"].append(source_file.name)  # type: ignore[union-attr]

    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    counts = manifest["counts"]  # type: ignore[assignment]
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
        f"- Raw battler sheets: {battler_raw_dir}",
        f"- Atlas sheets: {atlas_dir}",
        f"- Parts sheets: {parts_dir}",
        f"- Animated front sheets: {animated_front_dir}",
        f"- Animated back sheets: {animated_back_dir}",
        f"- Manifest: {manifest_path}",
    ]

    if manifest["unresolved"]:  # type: ignore[truthy-function]
        lines.append("")
        lines.append("Unresolved")
        for entry in manifest["unresolved"]:  # type: ignore[index]
            lines.append(f"- {entry['source']}: {entry['reason']}")

    readme_path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
