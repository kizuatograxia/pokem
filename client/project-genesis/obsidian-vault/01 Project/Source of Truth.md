---
tags:
  - project
  - source-of-truth
  - rules
status: active
---

# Source of Truth

## Objetivo desta nota

Definir com total clareza quais caminhos, arquivos e processos sao oficiais para cada tipo de trabalho. O foco aqui e evitar o erro classico de editar uma copia errada, testar um runtime obsoleto ou perder uma mudanca porque ela foi aplicada num artefato derivado.

## Regra mestre

Como padrao:

- edite nas fontes
- gere o runtime
- teste no runtime oficial

Nao trabalhe ao contrario.

## Fonte de desenvolvimento

### Essentials repo-style overlay

`C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1`

Use esta pasta quando a mudanca pertencer a:

- scripts Ruby do Essentials usados como overlay
- dados auxiliares presentes nessa fonte
- ajustes que o rebuild deve reaplicar sempre

### Pack Gen 9

`C:\Users\hedge\OneDrive\Desktop\pokém\sources\generation-9-pack-v3.3.4`

Use esta pasta quando a mudanca pertencer a:

- PBS do pacote
- assets do pacote
- scripts e plugins da Gen 9

## Runtime oficial de execucao

`C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

Use esta pasta para:

- abrir o jogo
- validar boot
- fazer smoke test
- inspecionar artefato final gerado

Nao use esta pasta como local principal de autoria, a menos que o objetivo seja diagnostico temporario e a mudanca seja depois portada para a fonte correta.

## Script oficial de rebuild

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\rebuild-complete-gen9-runtime.bat`

Toda pessoa que for reconstruir a build deve partir daqui, a menos que uma automacao mais nova e explicitamente oficial a substitua.

## Launcher oficial

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\launch-complete-gen9-runtime.bat`

Atalho adicional:

`C:\Users\hedge\OneDrive\Desktop\pokém\launch-gen9-game.bat`

## Artefatos obsoletos ou nao oficiais para execucao principal

### Pasta obsoleta 1

`C:\Users\hedge\OneDrive\Desktop\pokém\pokemon-essentials-v21.1-gen9`

Motivo:

- foi usada em fases intermediarias
- reside em caminho com acento
- nao e mais a build oficial consolidada

### Runtime intermediario obsoleto

`C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-gen9`

Motivo:

- antecede a consolidacao com base completa + hotfix + Gen 9

## Regras de edicao por categoria

### Regras de codigo Ruby da base

- editar no overlay em `sources\pokemon-essentials-21.1`
- rebuildar
- validar no runtime oficial

### Regras de dados PBS da Gen 9

- editar no pacote em `sources\generation-9-pack-v3.3.4`
- rebuildar ou recopiar conforme o fluxo oficial
- validar comportamento no runtime oficial

### Documentacao do workspace

- documentacao tecnica previa em `docs`
- documentacao organizacional e estrategica no `obsidian-vault`

## Sinais de que voce esta no lugar errado

- esta fazendo alteracao diretamente em `pokem-runtime`
- esta testando numa pasta com nome parecido, mas nao oficial
- esta alterando um arquivo gerado sem registrar como ele sera reproduzido
- esta usando uma copia que nao passa pelo script de rebuild

## Checklist antes de qualquer mudanca

1. Sei se a mudanca e fonte, runtime ou documentacao?
2. Estou mexendo no caminho oficial para esse tipo de mudanca?
3. Sei como reproduzir essa mudanca do zero?
4. Preciso registrar essa decisao em um ADR ou numa nota operacional?

## Politica de excecao

Mudancas diretas no runtime sao aceitaveis apenas quando:

- estamos diagnosticando falha especifica de boot
- precisamos comparar rapidamente um comportamento
- a alteracao sera portada para a fonte correta logo em seguida

Se a mudanca ficar so no runtime, ela deve ser considerada temporaria e fragil.
