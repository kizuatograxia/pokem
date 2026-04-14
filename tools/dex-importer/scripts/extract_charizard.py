"""Extract Charizard sprites from BW ROM — with PRNG decryption.

Based on magical/pokemon-nds-sprites ncgr.c (GPLv3):
  - Static NCGR has XOR encryption using a simple PRNG
  - BW likely uses the 'pt' variant (forward from first word)
  - MULT = 0x41C64E6D (pokemon PRNG), ADD = 0x6073
  - Operations are on u16 words

BW pokegra layout: 20 files/pokemon (see pokegra.rst).
"""
from __future__ import annotations

import struct
import sys
from pathlib import Path

LOCAL_PYDEPS = Path(__file__).resolve().parents[1] / ".pydeps"
if LOCAL_PYDEPS.exists():
    sys.path.insert(0, str(LOCAL_PYDEPS))

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow required") from exc


FILES_DIR = Path(__file__).resolve().parents[1] / "output" / "rom-narc" / "a_0_0_4-a635e75b" / "files"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output" / "rom-charizard"

MULT = 0x41C64E6D
ADD  = 0x6073


# ── LZ11 decompression ──────────────────────────────────────────────

def decompress_lz11(buffer: bytes) -> bytes:
    declared = int.from_bytes(buffer[1:4], "little")
    header_size = 4
    if declared == 0:
        declared = struct.unpack_from("<I", buffer, 4)[0]
        header_size = 8
    size = declared
    output = bytearray(size)
    inp = header_size
    out = 0

    while out < size and inp < len(buffer):
        flags = buffer[inp]; inp += 1
        for mask in (0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01):
            if out >= size or inp >= len(buffer):
                break
            if (flags & mask) == 0:
                output[out] = buffer[inp]; out += 1; inp += 1
                continue
            first = buffer[inp]; inp += 1
            high = first >> 4
            if high == 0:
                second = buffer[inp]; third = buffer[inp + 1]; inp += 2
                length = (((first & 0x0F) << 4) | (second >> 4)) + 0x11
                displacement = (((second & 0x0F) << 8) | third) + 1
            elif high == 1:
                second = buffer[inp]; third = buffer[inp + 1]; fourth = buffer[inp + 2]; inp += 3
                length = (((first & 0x0F) << 12) | (second << 4) | (third >> 4)) + 0x111
                displacement = (((third & 0x0F) << 8) | fourth) + 1
            else:
                second = buffer[inp]; inp += 1
                length = (first >> 4) + 1
                displacement = (((first & 0x0F) << 8) | second) + 1
            for _ in range(length):
                if out >= size: break
                output[out] = output[out - displacement]; out += 1
    return bytes(output)


# ── File I/O ─────────────────────────────────────────────────────────

def load_file(index: int) -> bytes:
    path = next(p for p in FILES_DIR.iterdir() if p.stem == f"{index:05d}")
    data = path.read_bytes()
    if data and data[0] == 0x11:
        return decompress_lz11(data)
    return data


# ── PRNG Decryption ──────────────────────────────────────────────────

def decrypt_dp(raw: bytearray) -> bytearray:
    """DP-style: seed = last u16, iterate backwards."""
    data = bytearray(raw)
    n = len(data) // 2
    seed = struct.unpack_from("<H", data, (n - 1) * 2)[0]
    for i in range(n - 1, -1, -1):
        val = struct.unpack_from("<H", data, i * 2)[0]
        val ^= (seed & 0xFFFF)
        struct.pack_into("<H", data, i * 2, val)
        seed = ((seed * MULT) + ADD) & 0xFFFF
    return data


def decrypt_pt(raw: bytearray) -> bytearray:
    """Pt/HGSS/BW-style: seed = first u16, iterate forwards."""
    data = bytearray(raw)
    n = len(data) // 2
    seed = struct.unpack_from("<H", data, 0)[0]
    for i in range(n):
        val = struct.unpack_from("<H", data, i * 2)[0]
        val ^= (seed & 0xFFFF)
        struct.pack_into("<H", data, i * 2, val)
        seed = ((seed * MULT) + ADD) & 0xFFFF
    return data


# ── Palette ──────────────────────────────────────────────────────────

def rgb555_to_rgba(v: int) -> tuple[int, int, int, int]:
    return ((v & 0x1F) * 8, ((v >> 5) & 0x1F) * 8, ((v >> 10) & 0x1F) * 8, 255)


def parse_nclr(data: bytes) -> list[tuple[int, int, int, int]]:
    pal_data_size = struct.unpack_from("<I", data, 0x20)[0]
    colors: list[tuple[int, int, int, int]] = []
    for off in range(0x28, 0x28 + pal_data_size, 2):
        colors.append(rgb555_to_rgba(struct.unpack_from("<H", data, off)[0]))
    if colors:
        colors[0] = (0, 0, 0, 0)
    return colors


# ── NCGR Rendering ───────────────────────────────────────────────────

def parse_ncgr_header(data: bytes):
    """Parse NCGR CHAR section header. Returns dict with fields."""
    cb = 0x18  # CHAR content base (after file header + CHAR magic+size)
    tiles_y = struct.unpack_from("<H", data, cb + 0)[0]
    tiles_x = struct.unpack_from("<H", data, cb + 2)[0]
    depth_raw = struct.unpack_from("<I", data, cb + 4)[0]
    vram_mode = struct.unpack_from("<I", data, cb + 8)[0]
    tiled = struct.unpack_from("<I", data, cb + 0xC)[0]
    data_size = struct.unpack_from("<I", data, cb + 0x10)[0]
    gfx_offset = struct.unpack_from("<I", data, cb + 0x14)[0]
    depth = 1 << (depth_raw - 1)
    return {
        "tiles_x": tiles_x, "tiles_y": tiles_y,
        "depth": depth, "vram_mode": vram_mode,
        "tiled": tiled, "data_size": data_size,
        "gfx_offset": gfx_offset,
        "pixel_start": cb + gfx_offset,
    }


def unpack_4bpp(raw: bytes) -> list[int]:
    pixels: list[int] = []
    for b in raw:
        pixels.append(b & 0x0F)
        pixels.append((b >> 4) & 0x0F)
    return pixels


def untile(pixels: list[int], w_tiles: int, h_tiles: int) -> list[int]:
    """Convert from tiled 8x8 block order to scanline order."""
    w = w_tiles * 8
    h = h_tiles * 8
    out = [0] * (w * h)
    i = 0
    for ty in range(h_tiles):
        for tx in range(w_tiles):
            for py in range(8):
                for px in range(8):
                    cy = ty * 8 + py
                    cx = tx * 8 + px
                    if i < len(pixels):
                        out[cy * w + cx] = pixels[i]
                    i += 1
    return out


def render_ncgr(data: bytes, palette: list[tuple[int, int, int, int]],
                decrypt: str | None = None) -> Image.Image:
    """Render a full NCGR as an image, handling decryption and tiling."""
    hdr = parse_ncgr_header(data)
    raw = bytearray(data[hdr["pixel_start"]: hdr["pixel_start"] + hdr["data_size"]])

    # Apply decryption if needed
    if decrypt == "dp":
        raw = decrypt_dp(raw)
    elif decrypt == "pt":
        raw = decrypt_pt(raw)

    # Unpack pixels
    if hdr["depth"] == 4:
        pixels = unpack_4bpp(raw)
    else:
        pixels = list(raw)

    w_tiles = hdr["tiles_x"]
    h_tiles = hdr["tiles_y"]

    # Handle 0xFFFF (unknown dimensions)
    if w_tiles == 0xFFFF:
        total_pixels = hdr["data_size"] * 2 if hdr["depth"] == 4 else hdr["data_size"]
        w_tiles = 8  # guess 64px wide
        h_tiles = (total_pixels + w_tiles * 8 * 8 - 1) // (w_tiles * 64)

    w = w_tiles * 8
    h = h_tiles * 8

    # Untile if needed (tiled field & 0xFF == 0 means data is tiled)
    if (hdr["tiled"] & 0xFF) == 0:
        pixels = untile(pixels, w_tiles, h_tiles)

    # Render
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if idx >= len(pixels):
                continue
            pal_idx = pixels[idx]
            if pal_idx == 0:
                continue
            if pal_idx < len(palette):
                img.putpixel((x, y), palette[pal_idx])
    return img


# ── Main ─────────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    DEX = 6  # Charizard
    base = DEX * 20

    # Load palettes
    print("Loading palettes...")
    normal_pal = parse_nclr(load_file(base + 18))
    shiny_pal = parse_nclr(load_file(base + 19))
    pal16 = normal_pal[:16]
    shiny16 = shiny_pal[:16]

    # Try all decryption modes for static front to find which works
    print("\n--- Testing decryption modes on front static ---")
    static_data = load_file(base + 0)
    hdr = parse_ncgr_header(static_data)
    print(f"  Header: {hdr['tiles_x']}x{hdr['tiles_y']} tiles, "
          f"tiled={hdr['tiled']}, vram=0x{hdr['vram_mode']:08X}")

    for mode_name, mode in [("none", None), ("dp", "dp"), ("pt", "pt")]:
        img = render_ncgr(static_data, pal16, decrypt=mode)
        fname = f"charizard-front-static-{mode_name}.png"
        img.save(OUTPUT_DIR / fname)
        print(f"  Saved: {fname}")

    # Also render parts (bitmap, no encryption expected)
    print("\n--- Parts sheets (bitmap, no decrypt) ---")
    for offset, label in [(0, "front"), (9, "back")]:
        parts_data = load_file(base + offset + 2)
        parts_hdr = parse_ncgr_header(parts_data)
        print(f"  {label} parts: {parts_hdr['tiles_x']}x{parts_hdr['tiles_y']} tiles, "
              f"tiled={parts_hdr['tiled']}")
        img = render_ncgr(parts_data, pal16)
        img.save(OUTPUT_DIR / f"charizard-{label}-parts.png")
        print(f"  Saved: charizard-{label}-parts.png")

    # Render back static with all modes too
    print("\n--- Testing back static ---")
    back_data = load_file(base + 9)
    for mode_name, mode in [("none", None), ("dp", "dp"), ("pt", "pt")]:
        img = render_ncgr(back_data, pal16, decrypt=mode)
        fname = f"charizard-back-static-{mode_name}.png"
        img.save(OUTPUT_DIR / fname)
        print(f"  Saved: {fname}")

    # Shiny versions with best mode (we'll see from the images)
    for mode_name, mode in [("dp", "dp"), ("pt", "pt")]:
        img = render_ncgr(static_data, shiny16, decrypt=mode)
        img.save(OUTPUT_DIR / f"charizard-front-shiny-{mode_name}.png")
        img = render_ncgr(back_data, shiny16, decrypt=mode)
        img.save(OUTPUT_DIR / f"charizard-back-shiny-{mode_name}.png")

    print(f"\nAll outputs in: {OUTPUT_DIR}")
    print("Done! Check the *-none, *-dp, *-pt variants to see which decryption works.")


if __name__ == "__main__":
    main()
