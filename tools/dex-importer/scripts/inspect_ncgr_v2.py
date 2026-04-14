"""Re-inspect NCGR using correct NitroPaint field mapping."""
import struct, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_bw_battle_sprite_preview import decompress_lz11

FILES_DIR = Path(__file__).resolve().parents[1] / "output" / "rom-narc" / "a_0_0_4-a635e75b" / "files"

def inspect_ncgr(index: int, label: str):
    path = next(p for p in FILES_DIR.iterdir() if p.stem == f"{index:05d}")
    raw = path.read_bytes()
    if raw and raw[0] == 0x11:
        data = decompress_lz11(raw)
    else:
        data = raw

    print(f"\n=== {label} (index {index}) ===")
    print(f"Magic: {data[:4]}")
    
    # File header: 16 bytes
    # CHAR section starts at 0x10, has its own 8-byte header (magic + size)
    # CHAR content starts at 0x18
    char_base = 0x18  # content of CHAR section (after magic+size at 0x10-0x17)
    
    tilesY = struct.unpack_from("<H", data, char_base + 0)[0]
    tilesX = struct.unpack_from("<H", data, char_base + 2)[0]
    depth_raw = struct.unpack_from("<I", data, char_base + 4)[0]
    mapping = struct.unpack_from("<I", data, char_base + 8)[0]
    type_field = struct.unpack_from("<I", data, char_base + 0xC)[0]
    tile_data_size = struct.unpack_from("<I", data, char_base + 0x10)[0]
    gfx_offset = struct.unpack_from("<I", data, char_base + 0x14)[0]
    
    depth = 1 << (depth_raw - 1)
    
    print(f"  tilesY={tilesY}, tilesX={tilesX}")
    print(f"  depth_raw={depth_raw} => depth={depth}bpp")
    print(f"  mapping=0x{mapping:08X} (0=2D, else=1D boundary)")
    print(f"  type={type_field} (0=tiled, 1=bitmap)")
    print(f"  tile_data_size={tile_data_size}")
    print(f"  gfx_offset=0x{gfx_offset:04X}")
    
    # Calculate actual tiles present
    bytes_per_tile = 32 if depth == 4 else 64
    present_tiles = tile_data_size // bytes_per_tile
    declared_tiles = tilesX * tilesY
    print(f"  declared_tiles={declared_tiles}, present_tiles={present_tiles}")
    
    # NitroPaint's logic:
    is_1d = (mapping != 0)  # NCGR_1D
    if is_1d or declared_tiles != present_tiles:
        print(f"  => Recalculating: 1D={is_1d}, mismatch={declared_tiles != present_tiles}")
        # Use ChrGuessWidth logic
        n = present_tiles
        width = 1
        if n % 32 == 0:
            width = 32
        else:
            import math
            for i in range(1, int(math.sqrt(n)) + 1):
                if n % i == 0:
                    width = i
            height_g = n // width
            if width > height_g:
                width = width
            else:
                width = height_g
        height = n // width
        print(f"  => guessed: {width}x{height} tiles")
    
    is_bitmap = (type_field == 1)
    print(f"  is_bitmap={is_bitmap}")
    
    return type_field, mapping, depth


# Charizard = Dex #6, base = 120
for idx, label in [
    (120, "Front Static Male"),
    (121, "Front Static Female"),
    (122, "Front Parts Male"),
    (123, "Front Parts Female"),
    (129, "Back Static Male"),
    (131, "Back Parts Male"),
]:
    try:
        inspect_ncgr(idx, label)
    except Exception as e:
        print(f"\n=== {label} (index {idx}) === ERROR: {e}")
