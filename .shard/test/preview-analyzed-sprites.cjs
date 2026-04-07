const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = process.cwd();
const targetBase = process.argv[2] || "http://127.0.0.1:4317";
const outputJson = path.join(repoRoot, ".shard", "test", "preview-analyzed-sprites.json");
const outputPng = path.join(repoRoot, ".shard", "test", "preview-analyzed-sprites.png");
const species = [
  { label: "PIKACHU front", url: `${targetBase}/assets/sprites/pokemon/animated/front/PIKACHU.png` },
  { label: "PIKACHU back", url: `${targetBase}/assets/sprites/pokemon/animated/back/PIKACHU.png` },
  { label: "VENUSAUR front", url: `${targetBase}/assets/sprites/pokemon/animated/front/VENUSAUR.png` },
  { label: "VENUSAUR back", url: `${targetBase}/assets/sprites/pokemon/animated/back/VENUSAUR.png` },
];

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } });
  await page.goto(targetBase, { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(async (entries) => {
    function colorAt(data, width, x, y) {
      const index = (y * width + x) * 4;
      return {
        r: data[index] ?? 0,
        g: data[index + 1] ?? 0,
        b: data[index + 2] ?? 0,
        a: data[index + 3] ?? 0,
      };
    }

    function colorsClose(left, right, tolerance) {
      return (
        Math.abs(left.r - right.r) <= tolerance &&
        Math.abs(left.g - right.g) <= tolerance &&
        Math.abs(left.b - right.b) <= tolerance &&
        Math.abs(left.a - right.a) <= tolerance
      );
    }

    function detectBackgroundColor(data, width, height) {
      const samples = [
        colorAt(data, width, 0, 0),
        colorAt(data, width, width - 1, 0),
        colorAt(data, width, 0, height - 1),
        colorAt(data, width, width - 1, height - 1),
      ];
      const base = samples[0];
      if (!base || base.a === 0) return null;
      return samples.every((sample) => colorsClose(sample, base, 16)) ? base : null;
    }

    function stripLeadingGuideColumns(data, width, height) {
      let trim = 0;
      const maxColumns = Math.min(4, width);

      for (let x = 0; x < maxColumns; x += 1) {
        let opaque = 0;
        let reddish = 0;

        for (let y = 0; y < height; y += 1) {
          const index = (y * width + x) * 4;
          const alpha = data[index + 3] ?? 0;
          if (alpha <= 16) continue;
          opaque += 1;
          if ((data[index] ?? 0) >= 180 && (data[index + 1] ?? 0) <= 96 && (data[index + 2] ?? 0) <= 96) {
            reddish += 1;
          }
        }

        if (opaque / height >= 0.8 && reddish / Math.max(1, opaque) >= 0.55) {
          trim += 1;
          continue;
        }
        break;
      }

      const sparseThreshold = Math.max(1, Math.floor(height * 0.08));
      while (trim < Math.min(width, 6)) {
        let opaque = 0;
        for (let y = 0; y < height; y += 1) {
          const alpha = data[(y * width + trim) * 4 + 3] ?? 0;
          if (alpha > 16) opaque += 1;
        }
        if (opaque > 0 && opaque <= sparseThreshold) {
          trim += 1;
          continue;
        }
        break;
      }

      return trim;
    }

    function stripTrailingGuideColumns(data, width, height) {
      let trim = 0;
      const sparseThreshold = Math.max(1, Math.floor(height * 0.08));

      while (trim < Math.min(width, 6)) {
        const x = width - 1 - trim;
        let opaque = 0;
        for (let y = 0; y < height; y += 1) {
          const alpha = data[(y * width + x) * 4 + 3] ?? 0;
          if (alpha > 16) opaque += 1;
        }
        if (opaque > 0 && opaque <= sparseThreshold) {
          trim += 1;
          continue;
        }
        break;
      }

      return trim;
    }

    function buildOccupancyRuns(data, width, height, axis, startOffset = 0) {
      const size = axis === "x" ? width - startOffset : height;
      const orthogonal = axis === "x" ? height : width;
      const threshold = Math.max(1, Math.floor(orthogonal * 0.04));
      const occupancy = Array.from({ length: size }, (_, index) => {
        let count = 0;
        const coordinate = index + startOffset;
        for (let other = 0; other < orthogonal; other += 1) {
          const x = axis === "x" ? coordinate : other;
          const y = axis === "x" ? other : coordinate;
          const alpha = data[(y * width + x) * 4 + 3] ?? 0;
          if (alpha > 16) count += 1;
        }
        return count;
      });

      const runs = [];
      let currentStart = null;
      let currentWeight = 0;

      occupancy.forEach((value, index) => {
        const occupied = value >= threshold;
        if (occupied && currentStart === null) {
          currentStart = index + startOffset;
          currentWeight = value;
          return;
        }
        if (occupied && currentStart !== null) {
          currentWeight += value;
          return;
        }
        if (!occupied && currentStart !== null) {
          runs.push({ start: currentStart, end: index + startOffset - 1, weight: currentWeight });
          currentStart = null;
          currentWeight = 0;
        }
      });

      if (currentStart !== null) {
        runs.push({ start: currentStart, end: startOffset + occupancy.length - 1, weight: currentWeight });
      }

      return runs.filter((run) => run.end - run.start >= 2);
    }

    function significantRuns(runs) {
      if (runs.length <= 1) return runs;
      const maxWeight = Math.max(...runs.map((run) => run.weight));
      const filtered = runs.filter((run) => run.weight >= maxWeight * 0.12);
      return filtered.length > 0 ? filtered : runs;
    }

    function dominantRun(runs) {
      if (runs.length === 0) return null;
      return runs.reduce((best, run) => (run.weight > best.weight ? run : best), runs[0]);
    }

    function median(values) {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((left, right) => left - right);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    }

    function repeatedFrameRuns(runs) {
      if (runs.length < 3) return [];
      const widths = runs.map((run) => run.end - run.start + 1);
      const weights = runs.map((run) => run.weight);
      const medianWidth = median(widths);
      const medianWeight = median(weights);

      const filtered = runs.filter((run) => {
        const width = run.end - run.start + 1;
        return (
          width >= medianWidth * 0.45 &&
          width <= medianWidth * 1.8 &&
          run.weight >= medianWeight * 0.45 &&
          run.weight <= medianWeight * 1.8
        );
      });

      return filtered.length >= 3 ? filtered : [];
    }

    function buildCellsFromRuns(runs, limitStart, limitEnd) {
      if (runs.length === 0) return [];
      if (runs.length === 1) {
        return [{ start: limitStart, end: limitEnd }];
      }

      const cells = [];

      for (let index = 0; index < runs.length; index += 1) {
        const run = runs[index];
        const previous = runs[index - 1];
        const next = runs[index + 1];

        let start = limitStart;
        if (previous) {
          start = Math.max(limitStart, Math.floor((previous.end + run.start) / 2) + 1);
        } else if (next) {
          const gap = Math.max(0, next.start - run.end - 1);
          start = Math.max(limitStart, run.start - Math.floor(gap / 2));
        }

        let end = limitEnd;
        if (next) {
          end = Math.min(limitEnd, Math.floor((run.end + next.start) / 2));
        } else if (previous) {
          const gap = Math.max(0, run.start - previous.end - 1);
          end = Math.min(limitEnd, run.end + Math.floor(gap / 2));
        }

        cells.push({
          start,
          end: Math.max(start, end),
        });
      }

      return cells;
    }

    function buildHorizontalStripFrames(xStart, xEnd, yStart, yEnd) {
      const usableWidth = Math.max(1, xEnd - xStart + 1);
      const usableHeight = Math.max(1, yEnd - yStart + 1);
      const frameCount = Math.max(1, Math.round(usableWidth / usableHeight));
      const frameWidth = Math.max(1, Math.floor(usableWidth / frameCount));

      return Array.from({ length: frameCount }, (_, index) => {
        const x = xStart + index * frameWidth;
        const nextX = index === frameCount - 1 ? xEnd + 1 : Math.min(xEnd + 1, xStart + (index + 1) * frameWidth);
        return {
          x,
          y: yStart,
          width: Math.max(1, nextX - x),
          height: usableHeight,
        };
      });
    }

    function boundsNearby(left, right, padding) {
      return !(
        left.right + padding < right.left ||
        right.right + padding < left.left ||
        left.bottom + padding < right.top ||
        right.bottom + padding < left.top
      );
    }

    function refineFrameRect(data, imageWidth, frame) {
      const width = frame.width;
      const height = frame.height;
      const visited = new Uint8Array(width * height);
      const components = [];

      for (let localY = 0; localY < height; localY += 1) {
        for (let localX = 0; localX < width; localX += 1) {
          const localIndex = localY * width + localX;
          if (visited[localIndex]) continue;
          visited[localIndex] = 1;

          const globalX = frame.x + localX;
          const globalY = frame.y + localY;
          const alpha = data[(globalY * imageWidth + globalX) * 4 + 3] ?? 0;
          if (alpha <= 16) continue;

          const queue = [[localX, localY]];
          let queueIndex = 0;
          const component = {
            left: globalX,
            right: globalX,
            top: globalY,
            bottom: globalY,
            pixels: 0,
          };

          while (queueIndex < queue.length) {
            const [x, y] = queue[queueIndex];
            queueIndex += 1;
            const gx = frame.x + x;
            const gy = frame.y + y;
            const pixelAlpha = data[(gy * imageWidth + gx) * 4 + 3] ?? 0;
            if (pixelAlpha <= 16) continue;

            component.left = Math.min(component.left, gx);
            component.right = Math.max(component.right, gx);
            component.top = Math.min(component.top, gy);
            component.bottom = Math.max(component.bottom, gy);
            component.pixels += 1;

            for (let dy = -1; dy <= 1; dy += 1) {
              for (let dx = -1; dx <= 1; dx += 1) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                const nextIndex = ny * width + nx;
                if (visited[nextIndex]) continue;
                visited[nextIndex] = 1;
                queue.push([nx, ny]);
              }
            }
          }

          if (component.pixels > 0) {
            components.push(component);
          }
        }
      }

      const filteredComponents = components.filter((component) => {
        const componentWidth = component.right - component.left + 1;
        const componentHeight = component.bottom - component.top + 1;
        if (componentWidth <= 2 && componentHeight >= Math.floor(frame.height * 0.6)) {
          return false;
        }
        if (componentWidth <= 3 && componentHeight <= 3) {
          return false;
        }
        return true;
      });

      const usableComponents = filteredComponents.length > 0 ? filteredComponents : components;
      if (usableComponents.length === 1) {
        const component = usableComponents[0];
        return {
          x: component.left,
          y: component.top,
          width: component.right - component.left + 1,
          height: component.bottom - component.top + 1,
        };
      }

      const dominant = usableComponents.reduce(
        (best, component) => (component.pixels > best.pixels ? component : best),
        usableComponents[0],
      );

      const kept = usableComponents.filter((component) =>
        component.pixels >= dominant.pixels * 0.12 || boundsNearby(component, dominant, 1),
      );

      const left = Math.max(frame.x, Math.min(...kept.map((component) => component.left)));
      const right = Math.min(frame.x + frame.width - 1, Math.max(...kept.map((component) => component.right)));
      const top = Math.max(frame.y, Math.min(...kept.map((component) => component.top)));
      const bottom = Math.min(frame.y + frame.height - 1, Math.max(...kept.map((component) => component.bottom)));

      const refined = {
        x: left,
        y: top,
        width: Math.max(1, right - left + 1),
        height: Math.max(1, bottom - top + 1),
      };

      const sparseColumnThreshold = Math.max(1, Math.floor(refined.height * 0.08));
      const sparseRowThreshold = Math.max(1, Math.floor(refined.width * 0.08));

      const countColumn = (x) => {
        let count = 0;
        for (let y = refined.y; y < refined.y + refined.height; y += 1) {
          const alpha = data[(y * imageWidth + x) * 4 + 3] ?? 0;
          if (alpha > 16) count += 1;
        }
        return count;
      };

      const countRow = (y) => {
        let count = 0;
        for (let x = refined.x; x < refined.x + refined.width; x += 1) {
          const alpha = data[(y * imageWidth + x) * 4 + 3] ?? 0;
          if (alpha > 16) count += 1;
        }
        return count;
      };

      while (refined.width > 1 && countColumn(refined.x) <= sparseColumnThreshold) {
        refined.x += 1;
        refined.width -= 1;
      }
      while (refined.width > 1 && countColumn(refined.x + refined.width - 1) <= sparseColumnThreshold) {
        refined.width -= 1;
      }
      while (refined.height > 1 && countRow(refined.y) <= sparseRowThreshold) {
        refined.y += 1;
        refined.height -= 1;
      }
      while (refined.height > 1 && countRow(refined.y + refined.height - 1) <= sparseRowThreshold) {
        refined.height -= 1;
      }

      return refined;
    }

    function expandFrameRect(frame, maxWidth, maxHeight, padding = 1) {
      const left = Math.max(0, frame.x - padding);
      const top = Math.max(0, frame.y - padding);
      const right = Math.min(maxWidth - 1, frame.x + frame.width - 1 + padding);
      const bottom = Math.min(maxHeight - 1, frame.y + frame.height - 1 + padding);

      return {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      };
    }

    async function loadImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
      });
    }

    function analyzeSpriteSheet(img) {
      const source = document.createElement("canvas");
      source.width = img.naturalWidth;
      source.height = img.naturalHeight;
      const context = source.getContext("2d");
      context.drawImage(img, 0, 0);

      let imageData = context.getImageData(0, 0, source.width, source.height);
      const backgroundColor = detectBackgroundColor(imageData.data, source.width, source.height);

      if (backgroundColor) {
        const next = imageData.data;
        for (let index = 0; index < next.length; index += 4) {
          const pixel = {
            r: next[index] ?? 0,
            g: next[index + 1] ?? 0,
            b: next[index + 2] ?? 0,
            a: next[index + 3] ?? 0,
          };
          if (pixel.a > 0 && colorsClose(pixel, backgroundColor, 20)) {
            next[index + 3] = 0;
          }
        }
        context.putImageData(imageData, 0, 0);
        imageData = context.getImageData(0, 0, source.width, source.height);
      }

      const trimLeft = stripLeadingGuideColumns(imageData.data, source.width, source.height);
      const trimRight = stripTrailingGuideColumns(imageData.data, source.width, source.height);
      const columnRuns = significantRuns(buildOccupancyRuns(imageData.data, source.width, source.height, "x", trimLeft))
        .map((run) => ({
          ...run,
          end: Math.min(run.end, source.width - 1 - trimRight),
        }))
        .filter((run) => run.end > run.start);
      const rowRuns = significantRuns(buildOccupancyRuns(imageData.data, source.width, source.height, "y"));
      const columnCells = buildCellsFromRuns(columnRuns, trimLeft, source.width - 1 - trimRight);
      const rowCells = buildCellsFromRuns(rowRuns, 0, source.height - 1);

      let frames = [];

      if (columnCells.length > 1 && rowCells.length > 1) {
        frames = rowCells.flatMap((row) =>
          columnCells.map((column) => ({
            x: column.start,
            y: row.start,
            width: column.end - column.start + 1,
            height: row.end - row.start + 1,
          })),
        );
      } else if (rowCells.length <= 1 && columnRuns.length > 1) {
        const mainRun = dominantRun(columnRuns);
        const row = rowCells[0] ?? { start: 0, end: source.height - 1 };
        const repeatedRuns = repeatedFrameRuns(columnRuns);
        if (repeatedRuns.length > 0) {
          const repeatedCells = buildCellsFromRuns(repeatedRuns, trimLeft, source.width - 1 - trimRight);
          frames = repeatedCells.map((column) => ({
            x: column.start,
            y: row.start,
            width: column.end - column.start + 1,
            height: row.end - row.start + 1,
          }));
        } else if (mainRun) {
          frames = buildHorizontalStripFrames(mainRun.start, mainRun.end, row.start, row.end);
        }
      } else if (rowCells.length > 1 && columnCells.length <= 1) {
        const column = columnCells[0] ?? { start: trimLeft, end: source.width - 1 - trimRight };
        frames = rowCells.flatMap((row) => buildHorizontalStripFrames(column.start, column.end, row.start, row.end));
      } else {
        const column = columnCells[0] ?? { start: trimLeft, end: source.width - 1 - trimRight };
        const row = rowCells[0] ?? { start: 0, end: source.height - 1 };
        frames = buildHorizontalStripFrames(column.start, column.end, row.start, row.end);
      }

      frames = frames.map((frame) =>
        expandFrameRect(
          refineFrameRect(imageData.data, source.width, frame),
          source.width,
          source.height,
        ),
      );

      return {
        source,
        frames,
        maxFrameWidth: frames.reduce((max, frame) => Math.max(max, frame.width), 0),
        maxFrameHeight: frames.reduce((max, frame) => Math.max(max, frame.height), 0),
      };
    }

    const body = document.body;
    body.innerHTML = "";
    body.style.margin = "0";
    body.style.padding = "24px";
    body.style.background = "#111";
    body.style.color = "#fff";
    body.style.fontFamily = "monospace";

    const report = [];

    for (const entry of entries) {
      const image = await loadImage(entry.url);
      const info = analyzeSpriteSheet(image);

      const block = document.createElement("div");
      block.style.marginBottom = "24px";

      const title = document.createElement("div");
      title.textContent = `${entry.label} | frames=${info.frames.length} | max=${info.maxFrameWidth}x${info.maxFrameHeight}`;
      title.style.marginBottom = "8px";
      block.appendChild(title);

      const canvas = document.createElement("canvas");
      canvas.width = 8 * 96;
      canvas.height = 96;
      canvas.style.imageRendering = "pixelated";
      canvas.style.border = "1px solid #333";
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);

      info.frames.slice(0, 8).forEach((frame, index) => {
        const scale = Math.min(
          96 / Math.max(1, info.maxFrameWidth),
          96 / Math.max(1, info.maxFrameHeight),
        );
        const drawWidth = Math.max(1, Math.round(frame.width * scale));
        const drawHeight = Math.max(1, Math.round(frame.height * scale));
        const dx = index * 96 + Math.floor((96 - drawWidth) / 2);
        const dy = 96 - drawHeight;
        context.drawImage(info.source, frame.x, frame.y, frame.width, frame.height, dx, dy, drawWidth, drawHeight);
      });

      block.appendChild(canvas);
      body.appendChild(block);

      report.push({
        label: entry.label,
        frameCount: info.frames.length,
        maxFrameWidth: info.maxFrameWidth,
        maxFrameHeight: info.maxFrameHeight,
      });
    }

    return report;
  }, species);

  await page.screenshot({ path: outputPng, fullPage: true });
  fs.writeFileSync(outputJson, JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
