import urllib.request, json, zipfile, subprocess
from pathlib import Path

ROOT = Path(r"C:\Users\hedge\OneDrive\Desktop\pokém")
TOOLS = ROOT / "tools" / "_portable"
SF2 = ROOT / "sources" / "pokemon-essentials-21.1" / "soundfont.sf2"
BGM_DIR = ROOT / "client" / "web" / "public" / "assets" / "hub" / "bgm"

MIDIS = [
    "Lappet Town.mid",
    "Cedolan City.mid",
    "Poke Center.mid",
]

TOOLS.mkdir(parents=True, exist_ok=True)


def github_asset(repo, patterns):
    """Find first asset matching any pattern, checking latest then recent releases."""
    if isinstance(patterns, str):
        patterns = [patterns]

    def match(assets):
        for asset in assets:
            name = asset["name"]
            lname = name.lower()
            if any(p.lower() in lname for p in patterns):
                return asset["browser_download_url"], name
        return None

    latest_url = f"https://api.github.com/repos/{repo}/releases/latest"
    with urllib.request.urlopen(latest_url) as r:
        latest = json.load(r)
    m = match(latest.get("assets", []))
    if m:
        return m

    releases_url = f"https://api.github.com/repos/{repo}/releases?per_page=30"
    with urllib.request.urlopen(releases_url) as r:
        releases = json.load(r)
    for rel in releases:
        m = match(rel.get("assets", []))
        if m:
            return m

    raise RuntimeError(f"No matching asset for {repo}: {patterns}")


# 1) FluidSynth portable
fluid_dir = TOOLS / "fluidsynth"
fluid_exe = None
if not fluid_dir.exists():
    print("Baixando FluidSynth...")
    url, name = github_asset("FluidSynth/fluidsynth", ["win10-x64-cpp11.zip", "win10-x64.zip"])
    zip_path = TOOLS / name
    urllib.request.urlretrieve(url, zip_path)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(fluid_dir)
    zip_path.unlink()
    print(f"FluidSynth extraído em {fluid_dir}")

for candidate in fluid_dir.rglob("fluidsynth.exe"):
    fluid_exe = candidate
    break
if not fluid_exe:
    raise RuntimeError("fluidsynth.exe não encontrado após extração")
print(f"FluidSynth: {fluid_exe}")

# 2) ffmpeg portable
ffmpeg_dir = TOOLS / "ffmpeg"
ffmpeg_exe = None
if not ffmpeg_dir.exists():
    print("Baixando ffmpeg...")
    url, name = github_asset("BtbN/ffmpeg-builds", "ffmpeg-master-latest-win64-gpl.zip")
    zip_path = TOOLS / name
    urllib.request.urlretrieve(url, zip_path)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(ffmpeg_dir)
    zip_path.unlink()
    print(f"ffmpeg extraído em {ffmpeg_dir}")

for candidate in ffmpeg_dir.rglob("ffmpeg.exe"):
    ffmpeg_exe = candidate
    break
if not ffmpeg_exe:
    raise RuntimeError("ffmpeg.exe não encontrado após extração")
print(f"ffmpeg: {ffmpeg_exe}")

# 3) Convert MIDI -> WAV -> OGG
for midi_name in MIDIS:
    midi = BGM_DIR / midi_name
    wav = BGM_DIR / midi_name.replace(".mid", ".wav")
    ogg = BGM_DIR / midi_name.replace(".mid", ".ogg")

    if ogg.exists():
        print(f"Já existe: {ogg.name} — pulando")
        continue

    print(f"\nConvertendo {midi_name}...")

    r = subprocess.run(
        [str(fluid_exe), "-ni", "-F", str(wav), str(SF2), str(midi)],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print(f"  ERRO FluidSynth: {r.stderr}")
        continue
    print(f"  WAV gerado: {wav.name}")

    r = subprocess.run(
        [str(ffmpeg_exe), "-y", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "4", str(ogg)],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print(f"  ERRO ffmpeg: {r.stderr}")
        continue
    print(f"  OGG gerado: {ogg.name}")
    wav.unlink()

print("\nConcluído.")
