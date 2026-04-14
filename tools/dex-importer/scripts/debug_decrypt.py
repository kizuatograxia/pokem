"""Test multiple Pokémon and PRNG variants to find the correct decryption."""
import struct, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".pydeps"))
from PIL import Image

FILES_DIR = Path(__file__).resolve().parents[1] / "output" / "rom-narc" / "a_0_0_4-a635e75b" / "files"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output" / "rom-debug"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MULT16 = 0x41C64E6D
ADD16  = 0x6073

def decompress_lz11(buf):
    declared = int.from_bytes(buf[1:4], "little")
    hs = 4
    if declared == 0:
        declared = struct.unpack_from("<I", buf, 4)[0]; hs = 8
    out_buf = bytearray(declared)
    inp, out = hs, 0
    while out < declared and inp < len(buf):
        flags = buf[inp]; inp += 1
        for mask in (0x80,0x40,0x20,0x10,0x08,0x04,0x02,0x01):
            if out >= declared or inp >= len(buf): break
            if (flags & mask) == 0:
                out_buf[out] = buf[inp]; out += 1; inp += 1; continue
            first = buf[inp]; inp += 1; high = first >> 4
            if high == 0:
                s,t = buf[inp],buf[inp+1]; inp += 2
                ln = (((first&0xF)<<4)|(s>>4))+0x11; dp = (((s&0xF)<<8)|t)+1
            elif high == 1:
                s,t,u = buf[inp],buf[inp+1],buf[inp+2]; inp += 3
                ln = (((first&0xF)<<12)|(s<<4)|(t>>4))+0x111; dp = (((t&0xF)<<8)|u)+1
            else:
                s = buf[inp]; inp += 1
                ln = (first>>4)+1; dp = (((first&0xF)<<8)|s)+1
            for _ in range(ln):
                if out >= declared: break
                out_buf[out] = out_buf[out-dp]; out += 1
    return bytes(out_buf)

def load_file(idx):
    p = next(pp for pp in FILES_DIR.iterdir() if pp.stem == f"{idx:05d}")
    d = p.read_bytes()
    return decompress_lz11(d) if d and d[0] == 0x11 else d

def rgb555(v):
    return ((v&0x1F)*8, ((v>>5)&0x1F)*8, ((v>>10)&0x1F)*8, 255)

def parse_pal(data):
    ps = struct.unpack_from("<I", data, 0x20)[0]
    c = [rgb555(struct.unpack_from("<H", data, o)[0]) for o in range(0x28, 0x28+ps, 2)]
    if c: c[0] = (0,0,0,0)
    return c

def decrypt_dp_16(raw):
    d = bytearray(raw); n = len(d) // 2
    seed = struct.unpack_from("<H", d, (n-1)*2)[0]
    for i in range(n-1, -1, -1):
        v = struct.unpack_from("<H", d, i*2)[0]
        struct.pack_into("<H", d, i*2, v ^ (seed & 0xFFFF))
        seed = (seed * MULT16 + ADD16) & 0xFFFF
    return d

def decrypt_pt_16(raw):
    d = bytearray(raw); n = len(d) // 2
    seed = struct.unpack_from("<H", d, 0)[0]
    for i in range(n):
        v = struct.unpack_from("<H", d, i*2)[0]
        struct.pack_into("<H", d, i*2, v ^ (seed & 0xFFFF))
        seed = (seed * MULT16 + ADD16) & 0xFFFF
    return d

# 32-bit PRNG variant (full pokemon PRNG)
def decrypt_dp_32(raw):
    d = bytearray(raw); n = len(d) // 2
    seed = struct.unpack_from("<H", d, (n-1)*2)[0]
    state = seed
    for i in range(n-1, -1, -1):
        v = struct.unpack_from("<H", d, i*2)[0]
        struct.pack_into("<H", d, i*2, v ^ ((state >> 16) & 0xFFFF))
        state = (state * MULT16 + ADD16) & 0xFFFFFFFF
    return d

def decrypt_pt_32(raw):
    d = bytearray(raw); n = len(d) // 2
    seed = struct.unpack_from("<H", d, 0)[0]
    state = seed
    for i in range(n):
        v = struct.unpack_from("<H", d, i*2)[0]
        struct.pack_into("<H", d, i*2, v ^ ((state >> 16) & 0xFFFF))
        state = (state * MULT16 + ADD16) & 0xFFFFFFFF
    return d

def render(raw_pixels_4bpp, tiles_x, tiles_y, palette):
    pixels = []
    for b in raw_pixels_4bpp:
        pixels.append(b & 0x0F)
        pixels.append((b >> 4) & 0x0F)
    w, h = tiles_x * 8, tiles_y * 8
    # Untile
    out = [0] * (w * h)
    i = 0
    for ty in range(tiles_y):
        for tx in range(tiles_x):
            for py in range(8):
                for px in range(8):
                    if i < len(pixels):
                        out[(ty*8+py)*w + tx*8+px] = pixels[i]
                    i += 1
    img = Image.new("RGBA", (w, h), (0,0,0,0))
    for y in range(h):
        for x in range(w):
            pi = out[y*w+x]
            if pi and pi < len(palette):
                img.putpixel((x, y), palette[pi])
    return img


# Test multiple pokemon
for dex, name in [(1, "bulbasaur"), (6, "charizard"), (25, "pikachu")]:
    base = dex * 20
    try:
        pal = parse_pal(load_file(base + 18))[:16]
    except Exception as e:
        print(f"SKIP {name}: {e}")
        continue

    static_data = load_file(base + 0)
    if len(static_data) < 0x30:
        print(f"SKIP {name}: too small ({len(static_data)} bytes)")
        continue

    cb = 0x18
    ty_n = struct.unpack_from("<H", static_data, cb+0)[0]
    tx_n = struct.unpack_from("<H", static_data, cb+2)[0]
    tiled = struct.unpack_from("<I", static_data, cb+0xC)[0]
    ds = struct.unpack_from("<I", static_data, cb+0x10)[0]
    gfx_off = struct.unpack_from("<I", static_data, cb+0x14)[0]
    raw = static_data[cb+gfx_off : cb+gfx_off+ds]

    print(f"\n=== {name} (dex {dex}) ===")
    print(f"  {tx_n}x{ty_n} tiles, tiled={tiled}, data={ds} bytes")

    modes = [
        ("none", raw),
        ("dp16", decrypt_dp_16(raw)),
        ("pt16", decrypt_pt_16(raw)),
        ("dp32", decrypt_dp_32(raw)),
        ("pt32", decrypt_pt_32(raw)),
    ]

    for mode_name, mode_raw in modes:
        img = render(mode_raw, tx_n, ty_n, pal)
        fname = f"{name}-{mode_name}.png"
        img.save(OUTPUT_DIR / fname)

    print(f"  Saved 5 variants to {OUTPUT_DIR}")
