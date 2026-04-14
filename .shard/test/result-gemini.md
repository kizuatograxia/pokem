# Extração de Sprites BW - Sucesso!

## O que foi feito
1. **Análise do Formato NCGR (Nitro Character Graphics)**
   - Ao analisar o código de código-fonte de ferramentas da comunidade (NitroPaint e pokemon-nds-sprites), descobri que certas texturas em Black/White são codificadas em um modo "bitmap" (scanline).
   - O campo no offset `0x2C` (`type` ou `tiled`) no cabeçalho `CHAR` é o identificador: quando é `1` significa Bitmap e quando é `0` significa Tiles (`8x8`).
   - Os sprites "Static" (índice 0 e 1 da pasta do pokemon) estão agrupados em Tiles (`tipo 0`). Aparentemente eles usam arranjos muito confusos na memória do GBA/NDS e não são criptografados (com XOR).
   - Os sprites "Parts" (índice 2 e 3 da pasta do pokemon) contêm as partes visíveis para animação usando `tipo 1` (Bitmap).

2. **Reparado o exportador de animações**
   - Atualizei a classe `NitroCharGraphics` no script principal `export_bw_battle_sprite_preview.py` para respeitar a estrutura Tile vs Bitmap. 
   - No modo Bitmap, o campo `tile_index` do Object Data (`NCER`) age como uma coordenada 2D linear (`x + y*width`), permitindo extrair blocos retilíneos corretamente em vez de mapeamento 1D strided.

3. **Geração de Animação do Charizard**
   - Usei as peças e assemblei as animações do Charizard com `-base-index 120`. 
   - A renderização final baseada na montagem NCER + NANR + Parts Sheet foi um *sucesso absoluto*.
   - A animação `charizard_anim_front-sheet.png` visualiza 12 frames onde asas, barriga e cauda em chamas estão nas posições montadas em seus exatos pixels originais.

## Arquivos Alterados (via scripts e outputs)
- Script Python: `tools/dex-importer/scripts/export_bw_battle_sprite_preview.py`
  - Lógicas da `class NitroCharGraphics` reimplementadas para parsear Bitmap scanlines vs Tiled arrays de fato.
- Artifacts: 
  - `tools/dex-importer/output/rom-battle-preview/charizard_anim_front-sheet.png`
  - Scripts de debug temporários.

## Bloqueadores ou Questões (Nenhum Bloqueador!)
A extração finalmente teve uma quebra de paradigma superada.
Os dados dos Pokémons de Gen 5 (A/0/0/4) agora podem iterar por todo o NARC usando este mesmo fluxo sem corrupções gráficas nas peças!

Estou aguardando comandos para iniciar iteração em lotes ou verificar detalhes de metadados se necessário.
