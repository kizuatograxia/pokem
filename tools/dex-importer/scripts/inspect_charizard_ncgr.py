"""Inspect NCGR/NCER headers for Charizard to diagnose tile scrambling."""
from __future__ import annotations

import struct
import sys
from pathlib import Path

LOCAL_PYDEPS = Path(__file__).resolve().parents[1] / ".pydeps"
if LOCAL_PYDEPS.exists():
    sys.path.insert(0, str(LOCAL_PYDEPS))

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_bw_battle_sprite_preview import decompress_lz11

OBJ_SIZES = {
    0: [(8, 8), (16, 16), (32, 32), (64, 64)],
    1: [(16, 8), (32, 8), (32, 16), (64, 32)],
    2: [(8, 16), (8, 32), (16, 32), (32, 64)],
}

files_dir = Path(__file__).resolve().parents[1] / "output" / "rom-narc" / "a_0_0_4-a635e75b" / "files"

# Charizard front NCGR is at index 122 (base 120 + 2)
ncgr_path = next(p for p in files_dir.iterdir() if p.stem == "00122")
raw = ncgr_path.read_bytes()

if raw[0] == 0x11:
    data = decompress_lz11(raw)
else:
    data = raw

print(f"Magic: {data[:4]}")
print(f"Total size: {len(data)} bytes")

print(f"\nFile header:")
print(f"  BOM: 0x{struct.unpack_from('<H', data, 4)[0]:04X}")
print(f"  Version: 0x{struct.unpack_from('<H', data, 6)[0]:04X}")
print(f"  File size: {struct.unpack_from('<I', data, 8)[0]}")
print(f"  Header size: {struct.unpack_from('<H', data, 12)[0]}")
print(f"  Sections: {struct.unpack_from('<H', data, 14)[0]}")

print(f"\nCHAR section:")
print(f"  Magic: {data[0x10:0x14]}")
print(f"  Section size: {struct.unpack_from('<I', data, 0x14)[0]}")
tile_h = struct.unpack_from("<H", data, 0x18)[0]
tile_w = struct.unpack_from("<H", data, 0x1A)[0]
pixel_fmt = struct.unpack_from("<I", data, 0x1C)[0]
mapping = struct.unpack_from("<I", data, 0x20)[0]
tile_count = struct.unpack_from("<I", data, 0x24)[0]
tile_data_size = struct.unpack_from("<I", data, 0x28)[0]
offset = struct.unpack_from("<I", data, 0x2C)[0]
print(f"  Tile height (raw): {tile_h}")
print(f"  Tile width (raw): {tile_w}")
print(f"  Pixel format: {pixel_fmt}  (3=4bpp, 4=8bpp)")
print(f"  Mapping type: {mapping}  (0=2D, non-zero=1D boundary)")
print(f"  Tile count: {tile_count}")
print(f"  Tile data size: {tile_data_size}")
print(f"  Data offset: {offset}")

# Check if there's a SOPC section (which BW uses for partitioned character data)
sopc_offset = 0x30 + tile_data_size
if sopc_offset + 4 <= len(data):
    sopc_magic = data[sopc_offset:sopc_offset + 4]
    print(f"\nAfter CHAR data (offset 0x{sopc_offset:X}): {sopc_magic}")
    if sopc_magic == b"SOPC":
        sopc_size = struct.unpack_from("<I", data, sopc_offset + 4)[0]
        print(f"  SOPC section size: {sopc_size}")
        # SOPC typically has character_size and character_count
        if sopc_offset + 12 <= len(data):
            sopc_char_size = struct.unpack_from("<I", data, sopc_offset + 8)[0]
            sopc_char_count = struct.unpack_from("<H", data, sopc_offset + 12)[0]
            print(f"  SOPC char size: {sopc_char_size}")
            print(f"  SOPC char count: {sopc_char_count}")

# Now check the NCER at index 124 (base 120 + 4)
print("\n" + "=" * 60)
ncer_path = next(p for p in files_dir.iterdir() if p.stem == "00124")
ncer_data = ncer_path.read_bytes()
print(f"\nNCER Magic: {ncer_data[:4]}")
print(f"  Sections: {struct.unpack_from('<H', ncer_data, 14)[0]}")

cell_count = struct.unpack_from("<H", ncer_data, 0x18)[0]
entry_type = struct.unpack_from("<H", ncer_data, 0x1A)[0]
mapping_mode = struct.unpack_from("<I", ncer_data, 0x20)[0]
print(f"  Cell count: {cell_count}")
print(f"  Entry type: {entry_type} (1=extended, 0=basic)")
print(f"  Mapping mode: 0x{mapping_mode:08X}")

# Check VRAM transfer
vram_max_size = struct.unpack_from("<I", ncer_data, 0x24)[0]
boundary_size = struct.unpack_from("<I", ncer_data, 0x28)[0]
print(f"  VRAM max size: {vram_max_size}")
print(f"  Boundary size: {boundary_size}")

# Entries
entry_size = 16 if entry_type == 1 else 8
entry_base = 0x30
print(f"\nFirst cells:")
for i in range(min(5, cell_count)):
    if entry_type == 1:
        obj_count, unused, obj_offset = struct.unpack_from("<HHI", ncer_data, entry_base + i * 16)
        x_max, y_max, x_min, y_min = struct.unpack_from("<hhhh", ncer_data, entry_base + i * 16 + 8)
        print(f"  Cell {i}: objs={obj_count} obj_off={obj_offset} bounds=({x_min},{y_min})-({x_max},{y_max})")
    else:
        obj_count, unused, obj_offset = struct.unpack_from("<HHI", ncer_data, entry_base + i * 8)
        print(f"  Cell {i}: objs={obj_count} obj_off={obj_offset}")

# Dump OBJs for first cell
obj_base = entry_base + cell_count * entry_size
first_cell_objs = struct.unpack_from("<HHI", ncer_data, entry_base)[0]
print(f"\nFirst cell OBJs (count={first_cell_objs}):")
for i in range(min(20, first_cell_objs)):
    attr0, attr1, attr2 = struct.unpack_from("<HHH", ncer_data, obj_base + i * 6)
    shape = (attr0 >> 14) & 3
    size_idx = (attr1 >> 14) & 3
    tile_idx = attr2 & 0x3FF
    palette_idx = (attr2 >> 12) & 0xF
    x = attr1 & 0x1FF
    if x & 0x100:
        x -= 0x200
    y = attr0 & 0xFF
    if y & 0x80:
        y -= 0x100

    dims = OBJ_SIZES.get(shape, [(0, 0)] * 4)
    w, h = dims[size_idx] if shape < 3 else (0, 0)
    tiles_needed = (w // 8) * (h // 8)

    print(
        f"  OBJ {i:2d}: x={x:4d} y={y:4d} tile={tile_idx:3d} "
        f"shape={shape} size={size_idx} dims={w:2d}x{h:2d} "
        f"tiles={tiles_needed:2d} pal={palette_idx}"
    )

# Total pixel data
total_pixels_4bpp = tile_data_size * 2  # 4bpp = 2 pixels per byte
total_tiles = total_pixels_4bpp // 64   # 64 pixels per 8x8 tile
print(f"\nTotal tile data: {tile_data_size} bytes = {total_tiles} tiles (at 4bpp)")
print(f"Mapping type value: {mapping}")
print(f"\nIf mapping=non-zero, tile indices in OBJ.attr2 should be")
print(f"  multiplied by (boundary_size / tile_bytes) to get the")
print(f"  correct offset into the char data.")
print(f"  For 4bpp: tile_bytes = 32 bytes per 8x8 tile")
print(f"  boundary_size = {mapping}")
if mapping > 0:
    scale = mapping // 32
    print(f"  => tile index scale factor = {scale}")
    print(f"  This means: real_tile_offset = tile_index * {scale}")
