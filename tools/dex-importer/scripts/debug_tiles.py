"""Quick debug: dump raw tiles as-is in a grid, with and without untile."""
import struct, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".pydeps"))
from PIL import Image

FILES_DIR = Path(__file__).resolve().parents[1] / "output" / "rom-narc" / "a_0_0_4-a635e75b" / "files"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output" / "rom-charizard"

def decompress_lz11(buffer):
    declared = int.from_bytes(buffer[1:4], "little")
    hs = 4
    if declared == 0:
        declared = struct.unpack_from("<I", buffer, 4)[0]; hs = 8
    output = bytearray(declared)
    inp, out = hs, 0
    while out < declared and inp < len(buffer):
        flags = buffer[inp]; inp += 1
        for mask in (0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01):
            if out >= declared or inp >= len(buffer): break
            if (flags & mask) == 0:
                output[out] = buffer[inp]; out += 1; inp += 1; continue
            first = buffer[inp]; inp += 1
            high = first >> 4
            if high == 0:
                s, t = buffer[inp], buffer[inp+1]; inp += 2
                length = (((first&0xF)<<4)|(s>>4))+0x11
                disp = (((s&0xF)<<8)|t)+1
            elif high == 1:
                s, t, u = buffer[inp], buffer[inp+1], buffer[inp+2]; inp += 3
                length = (((first&0xF)<<12)|(s<<4)|(t>>4))+0x111
                disp = (((t&0xF)<<8)|u)+1
            else:
                s = buffer[inp]; inp += 1
                length = (first>>4)+1; disp = (((first&0xF)<<8)|s)+1
            for _ in range(length):
                if out >= declared: break
                output[out] = output[out-disp]; out += 1
    return bytes(output)

def load_file(idx):
    p = next(p for p in FILES_DIR.iterdir() if p.stem == f"{idx:05d}")
    d = p.read_bytes()
    return decompress_lz11(d) if d and d[0] == 0x11 else d

def rgb555(v):
    return ((v&0x1F)*8, ((v>>5)&0x1F)*8, ((v>>10)&0x1F)*8, 255)

base = 6 * 20
pal_data = load_file(base + 18)
pal_size = struct.unpack_from("<I", pal_data, 0x20)[0]
palette = [rgb555(struct.unpack_from("<H", pal_data, o)[0]) for o in range(0x28, 0x28+pal_size, 2)]
palette[0] = (0,0,0,0)

# Load front static
data = load_file(base + 0)
cb = 0x18
tiles_y = struct.unpack_from("<H", data, cb+0)[0]
tiles_x = struct.unpack_from("<H", data, cb+2)[0]
data_size = struct.unpack_from("<I", data, cb+0x10)[0]
gfx_off = struct.unpack_from("<I", data, cb+0x14)[0]
raw = data[cb+gfx_off : cb+gfx_off+data_size]

# Unpack 4bpp
pixels = []
for b in raw:
    pixels.append(b & 0x0F)
    pixels.append((b >> 4) & 0x0F)

print(f"Static: {tiles_x}x{tiles_y} tiles, {len(pixels)} pixels")
print(f"First 64 pixels (tile 0): {pixels[:64]}")
print(f"Pixels 64-128 (tile 1): {pixels[64:128]}")

# Method 1: Render as raw tiles in grid (tiled order, no untile)
w = tiles_x * 8
h = tiles_y * 8
img_tiled = Image.new("RGBA", (w, h), (30, 30, 30, 255))
n_tiles = tiles_x * tiles_y
for ti in range(n_tiles):
    gx = ti % tiles_x
    gy = ti // tiles_x
    for py in range(8):
        for px in range(8):
            si = ti * 64 + py * 8 + px
            if si >= len(pixels): continue
            pi = pixels[si]
            if pi == 0: continue
            if pi < len(palette):
                img_tiled.putpixel((gx*8+px, gy*8+py), palette[pi])
img_tiled.save(OUTPUT_DIR / "debug-front-tiled.png")
print("Saved debug-front-tiled.png")

# Method 2: Render with untile (scanline order)
img_scanline = Image.new("RGBA", (w, h), (30, 30, 30, 255))
# untile: each tile block goes to its grid position
out_pixels = [0] * (w * h)
i = 0
for ty in range(tiles_y):
    for tx in range(tiles_x):
        for py in range(8):
            for px in range(8):
                cy = ty * 8 + py
                cx = tx * 8 + px
                if i < len(pixels):
                    out_pixels[cy * w + cx] = pixels[i]
                i += 1
for y in range(h):
    for x in range(w):
        pi = out_pixels[y * w + x]
        if pi == 0: continue
        if pi < len(palette):
            img_scanline.putpixel((x, y), palette[pi])
img_scanline.save(OUTPUT_DIR / "debug-front-untiled.png")
print("Saved debug-front-untiled.png")

# Method 3: Render as bitmap (scanline, ignoring tiles completely)
img_bitmap = Image.new("RGBA", (w, h), (30, 30, 30, 255))
for y in range(h):
    for x in range(w):
        si = y * w + x
        if si >= len(pixels): continue
        pi = pixels[si]
        if pi == 0: continue
        if pi < len(palette):
            img_bitmap.putpixel((x, y), palette[pi])
img_bitmap.save(OUTPUT_DIR / "debug-front-bitmap.png")
print("Saved debug-front-bitmap.png")

# Dump first few tile contents
print("\nFirst 4 tiles pixel dump (non-zero only):")
for ti in range(min(4, n_tiles)):
    nonzero = [(j, pixels[ti*64+j]) for j in range(64) if pixels[ti*64+j] != 0]
    print(f"  Tile {ti}: {len(nonzero)} non-zero pixels")
