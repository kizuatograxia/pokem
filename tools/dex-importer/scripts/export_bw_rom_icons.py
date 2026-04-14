from __future__ import annotations

import json
import hashlib
import shutil
import struct
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional


LOCAL_PYDEPS = Path(__file__).resolve().parents[1] / ".pydeps"
if LOCAL_PYDEPS.exists():
    sys.path.insert(0, str(LOCAL_PYDEPS))

try:
    from PIL import Image, ImageDraw
except ImportError as exc:  # pragma: no cover - startup guard
    raise SystemExit(
        "Pillow is required. Install it with `python -m pip install --target tools/dex-importer/.pydeps pillow`."
    ) from exc


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_INPUT_DIR = BASE_DIR / "output" / "rom-narc" / "a_0_0_7-a635e75b" / "files"
DEFAULT_OUTPUT_DIR = BASE_DIR / "output" / "rom-icons" / "a_0_0_7-a635e75b-decoded"
SPECIES_DATASET_PATH = BASE_DIR / "output" / "datasets" / "species.json"

FEMALE_SLOT_STEMS = {
    521: "UNFEZANT_female",
    592: "FRILLISH_female",
    593: "JELLICENT_female",
}

TAIL_FORM_STEMS = [
    *(f"UNOWN_{index}" for index in range(1, 28)),
    "CASTFORM_1",
    "CASTFORM_2",
    "CASTFORM_3",
    "DEOXYS_1",
    "DEOXYS_2",
    "DEOXYS_3",
    "BURMY_1",
    "BURMY_2",
    "WORMADAM_1",
    "WORMADAM_2",
    "CHERRIM_1",
    "SHELLOS_1",
    "GASTRODON_1",
    "ROTOM_1",
    "ROTOM_2",
    "ROTOM_3",
    "ROTOM_4",
    "ROTOM_5",
    "GIRATINA_1",
    "SHAYMIN_1",
    "BASCULIN_1",
    "DARMANITAN_1",
    "DEERLING_2",
    "DEERLING_1",
    "DEERLING_3",
    "SAWSBUCK_2",
    "SAWSBUCK_1",
    "SAWSBUCK_3",
    "MELOETTA_1",
    "GENESECT_1",
    "GENESECT_2",
    "GENESECT_3",
    "GENESECT_4",
]


@dataclass
class IconRecord:
    icon_index: int
    source_file: str
    source_number: int
    source_slot: int
    is_female_variant: bool
    width: int
    height: int
    tile_count: int
    palette_index: int
    canonical_stem: Optional[str]
    mapping_kind: str
    preferred: bool
    notes: list[str]
    image_hash: str


@dataclass
class NamedIconRecord:
    canonical_stem: str
    icon_index: int
    source_file: str
    source_slot: int
    output_file: str
    mapping_kind: str
    image_hash: str


def rgb555_to_rgba(value: int) -> tuple[int, int, int, int]:
    r = (value & 0x1F) * 8
    g = ((value >> 5) & 0x1F) * 8
    b = ((value >> 10) & 0x1F) * 8
    return (r, g, b, 0 if value == 0 else 255)


def parse_rlcn(path: Path) -> list[list[tuple[int, int, int, int]]]:
    data = path.read_bytes()
    if data[:4] != b"RLCN":
        raise ValueError(f"{path} is not an RLCN palette file")

    color_bytes = struct.unpack("<I", data[0x20:0x24])[0]
    colors = [
        rgb555_to_rgba(struct.unpack("<H", data[offset : offset + 2])[0])
        for offset in range(0x28, 0x28 + color_bytes, 2)
    ]
    return [colors[index : index + 16] for index in range(0, len(colors), 16)]


def parse_rgcn(path: Path) -> tuple[int, int, int, bytes]:
    data = path.read_bytes()
    if data[:4] != b"RGCN":
        raise ValueError(f"{path} is not an RGCN graphics file")

    section_size, height, width, bpp, _mapping, _mode, tile_data_size, _unk = struct.unpack(
        "<IHHIIIII", data[0x14:0x30]
    )
    if section_size <= 0 or tile_data_size <= 0:
        raise ValueError(f"{path} does not contain tile data")

    bytes_per_tile = 32 if bpp == 3 else 64
    tile_count = tile_data_size // bytes_per_tile
    if width in (0, 0xFFFF) or height in (0, 0xFFFF):
        width = 4
        height = max(1, tile_count // width)

    return width, height, bpp, data[0x30 : 0x30 + tile_data_size]


def decode_4bpp_icon(tile_data: bytes, width_tiles: int, height_tiles: int, palette: list[tuple[int, int, int, int]]) -> Image.Image:
    image = Image.new("RGBA", (width_tiles * 8, height_tiles * 8))
    pixels = image.load()
    tile_count = len(tile_data) // 32

    for tile_index in range(tile_count):
        tile_x = (tile_index % width_tiles) * 8
        tile_y = (tile_index // width_tiles) * 8
        tile = tile_data[tile_index * 32 : (tile_index + 1) * 32]

        for byte_index, value in enumerate(tile):
            left = value & 0x0F
            right = (value >> 4) & 0x0F
            x = (byte_index % 4) * 2
            y = byte_index // 4
            pixels[tile_x + x, tile_y + y] = palette[left]
            pixels[tile_x + x + 1, tile_y + y] = palette[right]

    return image


def build_contact_sheet(icon_paths: list[Path], output_path: Path, columns: int = 6, limit: int = 36) -> None:
    selected = icon_paths[:limit]
    if not selected:
        return

    cell_w = 72
    cell_h = 96
    rows = (len(selected) + columns - 1) // columns
    canvas = Image.new("RGBA", (columns * cell_w + 16, rows * cell_h + 16), (18, 20, 24, 255))
    draw = ImageDraw.Draw(canvas)

    for idx, path in enumerate(selected):
        row = idx // columns
        col = idx % columns
        x = 8 + col * cell_w
        y = 8 + row * cell_h

        icon = Image.open(path).convert("RGBA").resize((64, 128), Image.Resampling.NEAREST)
        canvas.paste(icon, (x + 4, y - 12), icon)
        draw.text((x + 8, y + 70), path.stem, fill=(235, 235, 235, 255))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path)


def load_species_stems(path: Path) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(
            f"Species dataset not found at {path}. Run `npm run import` in tools/dex-importer first."
        )

    species = json.loads(path.read_text(encoding="utf-8"))
    stems = list(species.keys())
    if len(stems) < 649:
        raise ValueError(f"Expected at least 649 species entries, got {len(stems)}")
    return stems


def resolve_mapping(source_number: int, species_stems: list[str]) -> tuple[Optional[str], str, bool, list[str]]:
    source_slot = (source_number - 7) // 2
    is_female_variant = source_number % 2 == 0

    if is_female_variant:
        stem = FEMALE_SLOT_STEMS.get(source_slot)
        if stem:
            return stem, "female-variant", True, []
        return None, "unknown-even-slot", False, [f"Unexpected non-empty even icon slot {source_slot}."]

    if source_slot == 0:
        return "000", "placeholder", True, []

    if 1 <= source_slot <= 386:
        return species_stems[source_slot - 1], "species", True, []

    if 387 <= source_slot <= 389:
        return (
            f"DEOXYS_{source_slot - 386}",
            "inline-duplicate-form",
            False,
            [
                "This ROM icon archive repeats the three Deoxys alternate-form icons inline at slots 387-389.",
                "The expected Turtwig/Grotle/Torterra party icons are absent from this archive.",
            ],
        )

    if 390 <= source_slot <= 649:
        return species_stems[source_slot - 1], "species", True, []

    if source_slot == 650:
        return "EGG", "egg", True, []

    if source_slot == 651:
        return "MANAPHY_EGG", "egg", True, []

    if 652 <= source_slot <= 711:
        return TAIL_FORM_STEMS[source_slot - 652], "tail-form", True, []

    return None, "unknown-slot", False, [f"Unexpected icon slot {source_slot}."]


def export_icons(input_dir: Path, output_dir: Path) -> None:
    palette_file = input_dir / "00000.rlcn"
    palettes = parse_rlcn(palette_file)
    palette = palettes[0]
    species_stems = load_species_stems(SPECIES_DATASET_PATH)

    icon_files = sorted(path for path in input_dir.glob("*.rgcn"))
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_icons_dir = output_dir / "icons"
    resolved_icons_dir = output_dir / "resolved-icons"
    output_icons_dir.mkdir(parents=True, exist_ok=True)
    resolved_icons_dir.mkdir(parents=True, exist_ok=True)

    manifest: list[IconRecord] = []
    resolved_icons: list[NamedIconRecord] = []
    output_paths: list[Path] = []
    used_stems: set[str] = set()

    for icon_index, icon_file in enumerate(icon_files):
        width, height, bpp, tile_data = parse_rgcn(icon_file)
        if bpp != 3:
            continue

        image = decode_4bpp_icon(tile_data, width, height, palette)
        output_path = output_icons_dir / f"{icon_index:04d}.png"
        image.save(output_path)
        output_paths.append(output_path)
        source_number = int(icon_file.stem)
        source_slot = (source_number - 7) // 2
        canonical_stem, mapping_kind, preferred, notes = resolve_mapping(source_number, species_stems)
        image_hash = hashlib.sha256(image.tobytes()).hexdigest()

        manifest.append(
            IconRecord(
                icon_index=icon_index,
                source_file=icon_file.name,
                source_number=source_number,
                source_slot=source_slot,
                is_female_variant=source_number % 2 == 0,
                width=image.width,
                height=image.height,
                tile_count=len(tile_data) // 32,
                palette_index=0,
                canonical_stem=canonical_stem,
                mapping_kind=mapping_kind,
                preferred=preferred,
                notes=notes,
                image_hash=image_hash,
            )
        )

        if canonical_stem and preferred and canonical_stem not in used_stems:
            resolved_output_path = resolved_icons_dir / f"{canonical_stem}.png"
            shutil.copy2(output_path, resolved_output_path)
            used_stems.add(canonical_stem)
            resolved_icons.append(
                NamedIconRecord(
                    canonical_stem=canonical_stem,
                    icon_index=icon_index,
                    source_file=icon_file.name,
                    source_slot=source_slot,
                    output_file=resolved_output_path.name,
                    mapping_kind=mapping_kind,
                    image_hash=image_hash,
                )
            )

    missing_base_species = ["TURTWIG", "GROTLE", "TORTERRA"]
    duplicate_stems = {}
    for record in manifest:
        if not record.canonical_stem:
            continue
        duplicate_stems.setdefault(record.canonical_stem, []).append(record.icon_index)
    duplicate_stems = {
        stem: indices
        for stem, indices in duplicate_stems.items()
        if len(indices) > 1
    }

    shared_hash_groups: dict[str, list[str]] = {}
    for record in resolved_icons:
        shared_hash_groups.setdefault(record.image_hash, []).append(record.canonical_stem)
    shared_hash_groups = {
        image_hash: stems
        for image_hash, stems in shared_hash_groups.items()
        if len(stems) > 1
    }

    (output_dir / "manifest.json").write_text(
        json.dumps(
            {
                "source_dir": str(input_dir),
                "palette_file": palette_file.name,
                "palette_count": len(palettes),
                "icon_count": len(manifest),
                "resolved_icon_count": len(resolved_icons),
                "icons": [asdict(record) for record in manifest],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    (output_dir / "resolved-manifest.json").write_text(
        json.dumps(
            {
                "source_dir": str(input_dir),
                "resolved_icons_dir": str(resolved_icons_dir),
                "resolved_icon_count": len(resolved_icons),
                "missing_base_species": missing_base_species,
                "duplicate_stems": duplicate_stems,
                "shared_image_groups": shared_hash_groups,
                "resolved_icons": [asdict(record) for record in resolved_icons],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    (output_dir / "summary.md").write_text(
        "\n".join(
            [
                "# BW ROM Icon Export",
                "",
                f"- Source dir: {input_dir}",
                f"- Palette file: {palette_file.name}",
                f"- Palette count: {len(palettes)}",
                f"- Exported icons: {len(manifest)}",
                f"- Output dir: {output_icons_dir}",
                f"- Resolved icons dir: {resolved_icons_dir}",
                f"- Resolved named icons: {len(resolved_icons)}",
                "- Non-empty female variants found: 3 (`UNFEZANT_female`, `FRILLISH_female`, `JELLICENT_female`)",
                "- Missing national-dex base icons in this ROM archive: `TURTWIG`, `GROTLE`, `TORTERRA`",
                "- Inline duplicate slots detected: `DEOXYS_1`, `DEOXYS_2`, `DEOXYS_3` also appear again in the tail-form block",
                "- Shared-image groups include `GENESECT` + `GENESECT_1..4`, which are pixel-identical in this BW1-based archive",
                "",
            ]
        ),
        encoding="utf-8",
    )

    build_contact_sheet(output_paths, output_dir / "contact-sheet.png")


def main() -> None:
    input_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT_DIR
    output_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT_DIR
    export_icons(input_dir, output_dir)
    print(output_dir)


if __name__ == "__main__":
    main()
