import sys
from pathlib import Path

# Adiciona repo root ao path
root_dir = Path(__file__).resolve().parents[3]
importer_dir = root_dir / "tools" / "dex-importer"
sys.path.insert(0, str(importer_dir))

from scripts.export_bw_battle_sprite_preview import render_preview, DEFAULT_INPUT_DIR

# Define outputs no client public folder
CLIENT_OUT_FRONT = root_dir / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "bw" / "front"
CLIENT_OUT_BACK = root_dir / "client" / "web" / "public" / "assets" / "sprites" / "pokemon" / "bw" / "back"
CLIENT_OUT_FRONT.mkdir(parents=True, exist_ok=True)
CLIENT_OUT_BACK.mkdir(parents=True, exist_ok=True)

def export_pokemon(dex_id: int):
    # BW Files are blocked in groups of 20 per pokemon.
    base_index = dex_id * 20
    
    print(f"[{dex_id}] Exporting front...")
    output_front = CLIENT_OUT_FRONT / f"{dex_id}.png"
    render_preview(
        files_dir=DEFAULT_INPUT_DIR,
        base_index=base_index,         
        ncgr_index=None,
        palette_index=None,
        output_path=output_front,
        frame_count=30  # Allow up to 30 frames for a full cycle just in case
    )
    
    print(f"[{dex_id}] Exporting back...")
    base_index_back = base_index + 9
    output_back = CLIENT_OUT_BACK / f"{dex_id}.png"
    render_preview(
        files_dir=DEFAULT_INPUT_DIR,
        base_index=base_index_back,         
        ncgr_index=base_index_back + 2, # explicit ncgr for back
        palette_index=None,
        output_path=output_back,
        frame_count=30
    )


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Run only for N first pokemons")
    parser.add_argument("--mons", type=int, nargs='+', help="Run for specific IDs")
    args = parser.parse_args()

    targets = args.mons if args.mons else range(1, (args.limit + 1) if args.limit > 0 else 650)
    
    for dex_id in targets:
        try:
            export_pokemon(dex_id)
            print(f"Successfully exported {dex_id}")
        except Exception as e:
            print(f"Failed exporting {dex_id}: {e}")
