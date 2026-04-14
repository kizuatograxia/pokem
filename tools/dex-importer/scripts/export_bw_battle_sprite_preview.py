from __future__ import annotations

import argparse
import math
import struct
import sys
from dataclasses import dataclass
from pathlib import Path


LOCAL_PYDEPS = Path(__file__).resolve().parents[1] / ".pydeps"
if LOCAL_PYDEPS.exists():
    sys.path.insert(0, str(LOCAL_PYDEPS))

try:
    from PIL import Image, ImageDraw, ImageOps
except ImportError as exc:  # pragma: no cover - startup guard
    raise SystemExit(
        "Pillow is required. Install it with `python -m pip install --target tools/dex-importer/.pydeps pillow`."
    ) from exc


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_INPUT_DIR = BASE_DIR / "output" / "rom-narc" / "a_0_0_4-a635e75b" / "files"
DEFAULT_OUTPUT_DIR = BASE_DIR / "output" / "rom-battle-preview"
SPRITE_GROUP_SIZE = 20


def read_lz_size(buffer: bytes) -> tuple[int, int]:
    declared = int.from_bytes(buffer[1:4], "little")
    if declared != 0:
        return declared, 4
    return struct.unpack_from("<I", buffer, 4)[0], 8


def decompress_lz11(buffer: bytes) -> bytes:
    size, header_size = read_lz_size(buffer)
    output = bytearray(size)
    input_offset = header_size
    output_offset = 0

    while output_offset < size and input_offset < len(buffer):
        flags = buffer[input_offset]
        input_offset += 1

        for mask in (0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01):
            if output_offset >= size:
                break

            if (flags & mask) == 0:
                output[output_offset] = buffer[input_offset]
                output_offset += 1
                input_offset += 1
                continue

            first = buffer[input_offset]
            input_offset += 1
            high = first >> 4

            if high == 0:
                second = buffer[input_offset]
                third = buffer[input_offset + 1]
                input_offset += 2
                length = (((first & 0x0F) << 4) | (second >> 4)) + 0x11
                displacement = (((second & 0x0F) << 8) | third) + 1
            elif high == 1:
                second = buffer[input_offset]
                third = buffer[input_offset + 1]
                fourth = buffer[input_offset + 2]
                input_offset += 3
                length = (((first & 0x0F) << 12) | (second << 4) | (third >> 4)) + 0x111
                displacement = (((third & 0x0F) << 8) | fourth) + 1
            else:
                second = buffer[input_offset]
                input_offset += 1
                length = (first >> 4) + 1
                displacement = (((first & 0x0F) << 8) | second) + 1

            for _ in range(length):
                output[output_offset] = output[output_offset - displacement]
                output_offset += 1

    return bytes(output)


def signed_y(value: int) -> int:
    return struct.unpack("b", bytes([value & 0xFF]))[0]


def signed_x(value: int) -> int:
    value &= 0x1FF
    return value - 0x200 if value & 0x100 else value


def rgb555_to_rgba(value: int) -> tuple[int, int, int, int]:
    return ((value & 0x1F) * 8, ((value >> 5) & 0x1F) * 8, ((value >> 10) & 0x1F) * 8, 255)


def round_fixed(value: float) -> float:
    return math.trunc(value * 4096.0 + 0.5) / 4096.0


@dataclass(frozen=True)
class Point:
    x: int
    y: int

    def add(self, other: Point) -> Point:
        return Point(self.x + other.x, self.y + other.y)

    def sub(self, other: Point) -> Point:
        return Point(self.x - other.x, self.y - other.y)

    def mul(self, factor: int) -> Point:
        return Point(self.x * factor, self.y * factor)


@dataclass(frozen=True)
class Rect:
    min_x: int
    min_y: int
    max_x: int
    max_y: int

    @property
    def width(self) -> int:
        return max(0, self.max_x - self.min_x)

    @property
    def height(self) -> int:
        return max(0, self.max_y - self.min_y)

    @property
    def size(self) -> Point:
        return Point(self.width, self.height)

    @property
    def center(self) -> Point:
        return Point(self.min_x + self.width // 2, self.min_y + self.height // 2)

    def translate(self, delta: Point) -> Rect:
        return Rect(
            self.min_x + delta.x,
            self.min_y + delta.y,
            self.max_x + delta.x,
            self.max_y + delta.y,
        )

    def sub(self, point: Point) -> Rect:
        return Rect(
            self.min_x - point.x,
            self.min_y - point.y,
            self.max_x - point.x,
            self.max_y - point.y,
        )

    def union(self, other: Rect) -> Rect:
        return Rect(
            min(self.min_x, other.min_x),
            min(self.min_y, other.min_y),
            max(self.max_x, other.max_x),
            max(self.max_y, other.max_y),
        )

    def intersect(self, other: Rect) -> Rect:
        min_x = max(self.min_x, other.min_x)
        min_y = max(self.min_y, other.min_y)
        max_x = min(self.max_x, other.max_x)
        max_y = min(self.max_y, other.max_y)
        if min_x >= max_x or min_y >= max_y:
            return Rect(0, 0, 0, 0)
        return Rect(min_x, min_y, max_x, max_y)

    @property
    def empty(self) -> bool:
        return self.width <= 0 or self.height <= 0


@dataclass(frozen=True)
class Transform:
    rotate: float = 0.0
    scale_x: float = 1.0
    scale_y: float = 1.0


IDENTITY = Transform()


OBJ_SIZES = {
    0: [(8, 8), (16, 16), (32, 32), (64, 64)],
    1: [(16, 8), (32, 8), (32, 16), (64, 32)],
    2: [(8, 16), (8, 32), (16, 32), (32, 64)],
}


@dataclass
class Obj:
    attr0: int
    attr1: int
    attr2: int

    @property
    def x(self) -> int:
        return signed_x(self.attr1)

    @property
    def y(self) -> int:
        return signed_y(self.attr0)

    @property
    def shape(self) -> int:
        return (self.attr0 >> 14) & 0x3

    @property
    def size(self) -> int:
        return (self.attr1 >> 14) & 0x3

    @property
    def transform_mode(self) -> int:
        return (self.attr0 >> 8) & 0x3

    @property
    def double(self) -> bool:
        return self.transform_mode == 3

    @property
    def flip_x(self) -> bool:
        return (self.attr0 >> 8) & 0x1 == 0 and (self.attr1 >> 12) & 0x1 == 1

    @property
    def flip_y(self) -> bool:
        return (self.attr0 >> 8) & 0x1 == 0 and (self.attr1 >> 13) & 0x1 == 1

    @property
    def tile_index(self) -> int:
        return self.attr2 & 0x3FF

    @property
    def dimensions(self) -> tuple[int, int]:
        if self.shape == 3:
            return (0, 0)
        return OBJ_SIZES[self.shape][self.size]

    def draw_bounds(self) -> Rect:
        width, height = self.dimensions
        x = self.x
        y = self.y
        if self.double:
            x += width // 2
            y += height // 2
        return Rect(x, y, x + width, y + height)


@dataclass
class Frame:
    duration: int
    cell: int
    rotate: int = 0
    scale_x: int = 4096
    scale_y: int = 4096
    x: int = 0
    y: int = 0


@dataclass
class AnimatedCell:
    loop_start: int
    play_mode: int
    frames: list[Frame]

    def frame_at(self, t: int) -> tuple[Frame, int]:
        if self.play_mode != 2:
            return self.frames[0], 0

        loop_duration = 0
        for index, frame in enumerate(self.frames):
            if t < frame.duration:
                return frame, t
            t -= frame.duration
            if index >= self.loop_start:
                loop_duration += frame.duration

        if loop_duration <= 0:
            return self.frames[-1], 0

        t %= loop_duration
        while True:
            for frame in self.frames[self.loop_start :]:
                if t < frame.duration:
                    return frame, t
                t -= frame.duration


@dataclass
class CellSprite:
    image: Image.Image
    bounds: Rect


@dataclass
class AnimationState:
    frame: int = 0
    remain: int = 0

    def reset(self, animated_cell: AnimatedCell) -> None:
        self.frame = 0
        self.remain = animated_cell.frames[0].duration if animated_cell.frames else 0

    def advance(self, animated_cell: AnimatedCell, ticks: int) -> None:
        if not animated_cell.frames:
            return

        while ticks >= self.remain > 0:
            ticks -= self.remain
            self.frame += 1
            if self.frame == len(animated_cell.frames):
                self.frame = 0
            self.remain = animated_cell.frames[self.frame].duration

        self.remain -= ticks


class NitroCharGraphics:
    def __init__(self, data: bytes):
        cb = 0x18
        self.tile_y = struct.unpack_from("<H", data, cb + 0)[0]
        self.tile_x = struct.unpack_from("<H", data, cb + 2)[0]
        depth_raw = struct.unpack_from("<I", data, cb + 4)[0]
        self.mapping_type = struct.unpack_from("<I", data, cb + 8)[0]
        self.type_field = struct.unpack_from("<I", data, cb + 0xC)[0]
        self.data_size = struct.unpack_from("<I", data, cb + 0x10)[0]
        gfx_offset = struct.unpack_from("<I", data, cb + 0x14)[0]
        self.depth = 1 << (depth_raw - 1)
        self.is_bitmap = (self.type_field == 1)
        pixel_start = cb + gfx_offset
        self.raw = data[pixel_start : pixel_start + self.data_size]
        self._pixels: list[int] | None = None
        self._untiled_pixels: list[int] | None = None

    def pixels(self) -> list[int]:
        if self._pixels is None:
            if self.depth == 4:
                unpacked: list[int] = []
                for value in self.raw:
                    unpacked.append(value & 0x0F)
                    unpacked.append((value >> 4) & 0x0F)
                self._pixels = unpacked
            else:
                self._pixels = list(self.raw)
        return self._pixels

    def untiled_pixels(self) -> list[int]:
        """Convert from 8x8 tiled block order to scanline bitmap order, if not already bitmap."""
        if self.is_bitmap:
            return self.pixels()
        if self._untiled_pixels is None:
            px = self.pixels()
            w_px = self.tile_x * 8
            h_px = self.tile_y * 8
            out = [0] * (w_px * h_px)
            i = 0
            for ty in range(self.tile_y):
                for tx in range(self.tile_x):
                    for py in range(8):
                        for px_in in range(8):
                            cy = ty * 8 + py
                            cx = tx * 8 + px_in
                            if i < len(px) and cy < h_px and cx < w_px:
                                out[cy * w_px + cx] = px[i]
                            i += 1
            self._untiled_pixels = out
        return self._untiled_pixels

    def tile_image(
        self,
        tile_index: int,
        width: int,
        height: int,
        palette: list[tuple[int, int, int, int]],
    ) -> Image.Image:
        image = Image.new("RGBA", (width, height), (0, 0, 0, 0))

        if self.is_bitmap:
            # Type=1 (bitmap). The `tile_index` from NCER is treated as
            # a 2D coordinate inside the scanline bitmap image.
            # Start position in the scanline image:
            px = self.untiled_pixels()
            start_y_px = (tile_index // self.tile_x) * 8
            start_x_px = (tile_index % self.tile_x) * 8
            image_w_px = self.tile_x * 8

            for y in range(height):
                for x in range(width):
                    sy = start_y_px + y
                    sx = start_x_px + x
                    idx = sy * image_w_px + sx
                    if idx >= len(px):
                        continue
                    pal_idx = px[idx]
                    if pal_idx == 0:
                        continue
                    if pal_idx < len(palette):
                        image.putpixel((x, y), palette[pal_idx])
        else:
            # Type=0 (tiled). This logic is mostly needed if the tool decides to render
            # static sprites (which BW stores as tiled).
            # The static sprites are natively 2D mapped.
            pixels = self.pixels()
            obj_w_tiles = (width + 7) // 8
            obj_h_tiles = (height + 7) // 8
            
            base_tx = tile_index % self.tile_x
            base_ty = tile_index // self.tile_x

            for ty in range(obj_h_tiles):
                for tx in range(obj_w_tiles):
                    grid_tx = base_tx + tx
                    grid_ty = base_ty + ty
                    linear_tile = grid_ty * self.tile_x + grid_tx
                    tile_pixel_base = linear_tile * 64
                    px_base_x = tx * 8
                    px_base_y = ty * 8

                    for py in range(8):
                        for px_in in range(8):
                            si = tile_pixel_base + py * 8 + px_in
                            if si >= len(pixels):
                                continue
                            palette_index = pixels[si]
                            if palette_index == 0:
                                continue
                            fx = px_base_x + px_in
                            fy = px_base_y + py
                            if fx < width and fy < height:
                                image.putpixel((fx, fy), palette[palette_index])

        return image


class NitroPalette:
    def __init__(self, data: bytes):
        palette_data_size = struct.unpack_from("<I", data, 0x20)[0]
        self.colors = [
            rgb555_to_rgba(struct.unpack_from("<H", data, offset)[0])
            for offset in range(0x28, 0x28 + palette_data_size, 2)
        ]
        if self.colors:
            self.colors[0] = (0, 0, 0, 0)

    def palette(self, index: int = 0) -> list[tuple[int, int, int, int]]:
        start = index * 16
        return self.colors[start : start + 16]


class NitroCellBank:
    def __init__(self, data: bytes):
        self.cell_count = struct.unpack_from("<H", data, 0x18)[0]
        entry_size = 16 if struct.unpack_from("<H", data, 0x1A)[0] == 1 else 8
        entry_base = 0x30
        self.cells = [struct.unpack_from("<HHI", data, entry_base + index * entry_size) for index in range(self.cell_count)]
        obj_base = entry_base + self.cell_count * entry_size
        total_objs = sum(cell[0] for cell in self.cells)
        self.objects = [
            Obj(*struct.unpack_from("<HHH", data, obj_base + index * 6))
            for index in range(total_objs)
        ]

    def render_cell(
        self,
        index: int,
        ncgr: NitroCharGraphics,
        palette: list[tuple[int, int, int, int]],
    ) -> CellSprite:
        obj_count, _unused, obj_offset = self.cells[index]
        objects = self.objects[obj_offset // 6 : obj_offset // 6 + obj_count]

        bounds: Rect | None = None
        for obj in objects:
            obj_bounds = obj.draw_bounds()
            bounds = obj_bounds if bounds is None else bounds.union(obj_bounds)

        if bounds is None:
            bounds = Rect(0, 0, 1, 1)

        canvas = Image.new("RGBA", (bounds.width, bounds.height), (0, 0, 0, 0))
        for obj in objects:
            width, height = obj.dimensions
            part = ncgr.tile_image(obj.tile_index, width, height, palette)
            if obj.flip_x:
                part = ImageOps.mirror(part)
            if obj.flip_y:
                part = ImageOps.flip(part)
            draw_under(
                canvas,
                part,
                Point(obj.draw_bounds().min_x - bounds.min_x, obj.draw_bounds().min_y - bounds.min_y),
            )

        return CellSprite(canvas, bounds)


def parse_abnk(data: bytes) -> list[AnimatedCell]:
    cell_count, frame_count = struct.unpack_from("<HH", data, 0x18)
    cell_base = 0x30
    frame_base = 0x18 + struct.unpack_from("<I", data, 0x20)[0]
    frame_data_base = 0x18 + struct.unpack_from("<I", data, 0x24)[0]
    framedata = data[frame_data_base:]

    raw_cells = [struct.unpack_from("<HHHHII", data, cell_base + index * 16) for index in range(cell_count)]
    raw_frames = [struct.unpack_from("<IHH", data, frame_base + index * 8) for index in range(frame_count)]

    cells: list[AnimatedCell] = []
    for frame_count_for_cell, loop_start, frame_type, _cell_type, play_mode, frame_offset in raw_cells:
        start = frame_offset // 8
        frames: list[Frame] = []

        for data_offset, duration, _padding in raw_frames[start : start + frame_count_for_cell]:
            blob = framedata[data_offset:]
            if frame_type == 0:
                frames.append(Frame(duration=duration, cell=struct.unpack_from("<H", blob, 0)[0]))
            elif frame_type == 1:
                cell, theta, scale_x, scale_y, x, y = struct.unpack_from("<HHiihh", blob, 0)
                frames.append(
                    Frame(
                        duration=duration,
                        cell=cell,
                        rotate=theta,
                        scale_x=scale_x,
                        scale_y=scale_y,
                        x=x,
                        y=y,
                    )
                )
            elif frame_type == 2:
                cell, _padding, x, y = struct.unpack_from("<HHhh", blob, 0)
                frames.append(Frame(duration=duration, cell=cell, x=x, y=y))

        cells.append(AnimatedCell(loop_start=loop_start, play_mode=play_mode, frames=frames))

    return cells


class NitroMultiCellBank:
    def __init__(self, data: bytes):
        cell_count = struct.unpack_from("<H", data, 0x18)[0]
        cell_base = 0x18 + struct.unpack_from("<I", data, 0x1C)[0]
        obj_base = 0x18 + struct.unpack_from("<I", data, 0x20)[0]
        raw_cells = [struct.unpack_from("<HHI", data, cell_base + index * 8) for index in range(cell_count)]
        total_objs = sum(cell[0] for cell in raw_cells)
        raw_objs = [struct.unpack_from("<HhhH", data, obj_base + index * 8) for index in range(total_objs)]
        self.multi_cells = [
            raw_objs[obj_offset // 8 : obj_offset // 8 + obj_count]
            for obj_count, _animated_count, obj_offset in raw_cells
        ]


def draw_under(dst: Image.Image, src: Image.Image, offset: Point) -> None:
    dx, dy = offset.x, offset.y
    dst_pixels = dst.load()
    src_pixels = src.load()

    for y in range(src.height):
        target_y = dy + y
        if target_y < 0 or target_y >= dst.height:
            continue

        for x in range(src.width):
            target_x = dx + x
            if target_x < 0 or target_x >= dst.width:
                continue

            if dst_pixels[target_x, target_y][3] != 0:
                continue

            color = src_pixels[x, y]
            if color[3] == 0:
                continue

            dst_pixels[target_x, target_y] = color


def get_source_color(image: Image.Image, bounds: Rect, x: int, y: int) -> tuple[int, int, int, int] | None:
    if not (bounds.min_x <= x < bounds.max_x and bounds.min_y <= y < bounds.max_y):
        return None
    return image.getpixel((x - bounds.min_x, y - bounds.min_y))


def rotate_point(point: Point, transform: Transform) -> Point:
    if transform == IDENTITY:
        return point
    sin_value = math.sin(transform.rotate * (2 * math.pi))
    cos_value = math.cos(transform.rotate * (2 * math.pi))
    x0 = point.x * transform.scale_x
    y0 = point.y * transform.scale_y
    x1 = x0 * cos_value - y0 * sin_value
    y1 = y0 * cos_value + x0 * sin_value
    return Point(int(x1), int(y1))


def rotate_under(
    dst: Image.Image,
    dest_rect: Rect,
    dest_origin: Point,
    src: CellSprite,
    scale_x: float,
    scale_y: float,
    turns: float,
) -> None:
    clipped = dest_rect.intersect(Rect(0, 0, dst.width, dst.height))
    if clipped.empty:
        return

    dst_pixels = dst.load()
    sin_value = -round_fixed(math.sin(turns * (2 * math.pi)))
    cos_value = round_fixed(math.cos(turns * (2 * math.pi)))

    for y in range(clipped.min_y, clipped.max_y):
        for x in range(clipped.min_x, clipped.max_x):
            if dst_pixels[x, y][3] != 0:
                continue

            source_x = int(((x - dest_origin.x) * cos_value - (y - dest_origin.y) * sin_value) * scale_x)
            source_y = int(((x - dest_origin.x) * sin_value + (y - dest_origin.y) * cos_value) * scale_y)
            color = get_source_color(src.image, src.bounds, source_x, source_y)
            if color is None or color[3] == 0:
                continue

            dst_pixels[x, y] = color


def draw_cell(dst: Image.Image, cell: CellSprite, origin: Point, transform: Transform) -> None:
    rect = cell.bounds

    if transform == IDENTITY:
        draw_under(
            dst,
            cell.image,
            Point(origin.x + rect.min_x, origin.y + rect.min_y),
        )
        return

    center = rect.center
    rotated_rect = rect.sub(center).translate(rotate_point(center, transform))
    rotate_under(
        dst,
        rotated_rect.translate(origin),
        origin,
        cell,
        scale_x=1.0 / max(transform.scale_x, 0.01),
        scale_y=1.0 / max(transform.scale_y, 0.01),
        turns=transform.rotate,
    )


class AnimationRenderer:
    def __init__(
        self,
        ncgr: NitroCharGraphics,
        palette: list[tuple[int, int, int, int]],
        ncer: NitroCellBank,
        nanr: list[AnimatedCell],
        nmcr: NitroMultiCellBank,
        nmar: list[AnimatedCell],
    ):
        self.nanr = nanr
        self.nmcr = nmcr
        self.nmar = nmar
        self.cells = [ncer.render_cell(index, ncgr, palette) for index in range(ncer.cell_count)]
        self.previous_cell = -1
        self.state = [AnimationState() for _ in nanr]

    def reset_states(self) -> None:
        for index, animated_cell in enumerate(self.nanr):
            self.state[index].reset(animated_cell)

    def next_frame(self, t: int) -> int:
        top_frame, offset = self.nmar[0].frame_at(t)
        least = top_frame.duration - offset
        for state in self.state:
            if state.remain > 0 and state.remain < least:
                least = state.remain
        return t + max(least, 1)

    def render_frame(self, t: int) -> Image.Image:
        canvas = Image.new("RGBA", (144, 96), (0, 0, 0, 0))
        self.render_ma_cell(canvas, Point(144 // 2, 96), self.nmar[0], t)
        return canvas

    def render_ma_cell(self, dst: Image.Image, origin: Point, animated_cell: AnimatedCell, t: int) -> None:
        frame, _offset = animated_cell.frame_at(t)
        origin = origin.add(Point(frame.x, frame.y))
        transform = Transform(
            rotate=frame.rotate / 65536.0,
            scale_x=frame.scale_x / 4096.0,
            scale_y=frame.scale_y / 4096.0,
        )

        if frame.cell < len(self.nmcr.multi_cells):
            if frame.cell != self.previous_cell:
                self.reset_states()
            self.render_mcell(dst, origin, self.nmcr.multi_cells[frame.cell], transform)
            self.previous_cell = frame.cell

    def render_mcell(
        self,
        dst: Image.Image,
        origin: Point,
        objs: list[tuple[int, int, int, int]],
        transform: Transform,
    ) -> None:
        for animated_index, x, y, _flags in objs:
            if animated_index >= len(self.nanr):
                continue
            self.render_acell(dst, origin, Point(x, y), animated_index, transform)

    def render_acell(
        self,
        dst: Image.Image,
        origin: Point,
        point: Point,
        index: int,
        transform: Transform,
    ) -> None:
        state = self.state[index]
        frame = self.nanr[index].frames[state.frame]
        origin = origin.add(rotate_point(Point(frame.x + point.x, frame.y + point.y), transform))
        transform = Transform(
            rotate=transform.rotate + frame.rotate / 65536.0,
            scale_x=transform.scale_x * (frame.scale_x / 4096.0),
            scale_y=transform.scale_y * (frame.scale_y / 4096.0),
        )

        if 0 <= frame.cell < len(self.cells):
            draw_cell(dst, self.cells[frame.cell], origin, transform)


def trim_frames(frames: list[Image.Image]) -> list[Image.Image]:
    bbox: tuple[int, int, int, int] | None = None
    for frame in frames:
        frame_bbox = frame.getbbox()
        if not frame_bbox:
            continue
        if bbox is None:
            bbox = frame_bbox
            continue
        bbox = (
            min(bbox[0], frame_bbox[0]),
            min(bbox[1], frame_bbox[1]),
            max(bbox[2], frame_bbox[2]),
            max(bbox[3], frame_bbox[3]),
        )

    if bbox is None:
        bbox = (0, 0, 144, 96)

    cropped = [frame.crop(bbox) for frame in frames]
    frame_width = max(frame.width for frame in cropped)
    frame_height = max(frame.height for frame in cropped)

    normalized: list[Image.Image] = []
    for frame in cropped:
        canvas = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
        canvas.alpha_composite(frame, ((frame_width - frame.width) // 2, (frame_height - frame.height) // 2))
        normalized.append(canvas)

    return normalized


def load_indexed_file(files_dir: Path, index: int) -> bytes:
    path = next(path for path in files_dir.iterdir() if path.stem == f"{index:05d}")
    data = path.read_bytes()
    return decompress_lz11(data) if data and data[0] == 0x11 else data


def render_preview(
    files_dir: Path,
    base_index: int,
    ncgr_index: int | None,
    palette_index: int | None,
    output_path: Path,
    frame_count: int,
) -> Path:
    group_base = base_index - (base_index % SPRITE_GROUP_SIZE)
    ncgr_file = ncgr_index if ncgr_index is not None else base_index + 2
    palette_file = palette_index if palette_index is not None else group_base + 18

    renderer = AnimationRenderer(
        ncgr=NitroCharGraphics(load_indexed_file(files_dir, ncgr_file)),
        palette=NitroPalette(load_indexed_file(files_dir, palette_file)).palette(0),
        ncer=NitroCellBank(load_indexed_file(files_dir, base_index + 4)),
        nanr=parse_abnk(load_indexed_file(files_dir, base_index + 5)),
        nmcr=NitroMultiCellBank(load_indexed_file(files_dir, base_index + 6)),
        nmar=parse_abnk(load_indexed_file(files_dir, base_index + 7)),
    )

    total_duration = sum(frame.duration for frame in renderer.nmar[0].frames)
    frames: list[Image.Image] = []
    frame_delays: list[int] = []
    time = 0
    renderer.previous_cell = -1
    renderer.reset_states()

    while time < total_duration and len(frames) < frame_count:
        frames.append(renderer.render_frame(time))
        next_time = renderer.next_frame(time)
        delta = next_time - time
        frame_delays.append(delta)
        for index, animated_cell in enumerate(renderer.nanr):
            renderer.state[index].advance(animated_cell, delta)
        time = next_time

    if not frames:
        frames.append(Image.new("RGBA", (144, 96), (0, 0, 0, 0)))
        frame_delays.append(1)

    normalized_frames = trim_frames(frames)
    frame_width = normalized_frames[0].width
    frame_height = normalized_frames[0].height

    output_path.parent.mkdir(parents=True, exist_ok=True)
    strip = Image.new("RGBA", (frame_width * len(normalized_frames), frame_height), (0, 0, 0, 0))
    for index, frame in enumerate(normalized_frames):
        strip.alpha_composite(frame, (index * frame_width, 0))
    strip.save(output_path)

    columns = min(4, len(normalized_frames))
    rows = math.ceil(len(normalized_frames) / columns)
    sheet = Image.new(
        "RGBA",
        (columns * (frame_width + 12), rows * (frame_height + 24)),
        (18, 20, 24, 255),
    )
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(normalized_frames):
        x = (index % columns) * (frame_width + 12) + 6
        y = (index // columns) * (frame_height + 24)
        sheet.alpha_composite(frame, (x, y))
        draw.text((x + 4, y + frame_height + 4), str(index), fill=(255, 255, 255, 255))
    sheet.save(output_path.with_stem(f"{output_path.stem}-sheet"))

    # Export JSON metadata
    metadata = {
        "frame_width": frame_width,
        "frame_height": frame_height,
        "frames": [
            {"index": i, "delay": delay}
            for i, delay in enumerate(frame_delays)
        ]
    }
    json_path = output_path.with_suffix('.json')
    import json
    json_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a quick BW battle sprite preview strip from extracted NARC files.")
    parser.add_argument("--files-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--base-index", type=int, required=True, help="Animation base index for the pose (for example 120 for Charizard front or 129 for Charizard back).")
    parser.add_argument("--ncgr-index", type=int, default=None, help="Override the NCGR file index. Defaults to base+2, which matches BW battle sprite layout.")
    parser.add_argument("--palette-index", type=int, default=None, help="Override the palette file index. Defaults to the shared palette at group base + 18.")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--frame-count", type=int, default=12)
    args = parser.parse_args()

    output = args.output if args.output.is_absolute() else DEFAULT_OUTPUT_DIR / args.output
    result = render_preview(
        files_dir=args.files_dir,
        base_index=args.base_index,
        ncgr_index=args.ncgr_index,
        palette_index=args.palette_index,
        output_path=output,
        frame_count=args.frame_count,
    )
    print(result)


if __name__ == "__main__":
    main()
