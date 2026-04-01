---
tags:
  - operations
  - obsidian
  - vault
  - tooling
status: active
---

# Obsidian Vault Workflow

## Objetivo

Descrever o fluxo oficial para abrir, operar e automatizar o vault do projeto com o app desktop do Obsidian e com o CLI oficial.

## Caminhos oficiais do workspace

### Vault do projeto

`C:\Users\hedge\OneDrive\Desktop\pokém\obsidian-vault`

### Wrapper para abrir o vault

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\obsidian-cli\open-project-vault.bat`

### Wrapper para o CLI oficial

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\obsidian-cli\obsidian-cli.bat`

## Regra geral

Para trabalho documental e operacional:

1. abra o vault do projeto
2. confirme que esta no vault correto
3. use o CLI oficial apenas quando ele simplificar captura, consulta ou automacao
4. registre mudancas estruturais no proprio vault

## Fluxo rapido recomendado

### Abrir o vault

Use:

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\obsidian-cli\open-project-vault.bat`

Isso abre o vault oficial do projeto no app desktop do Obsidian.

### Habilitar o CLI oficial

No Obsidian:

1. abra `Settings`
2. entre em `General`
3. entre em `Advanced`
4. habilite `Command line interface`

Sem isso, o wrapper local do CLI nao consegue conversar com o app.

### Rodar comandos

Use:

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\obsidian-cli\obsidian-cli.bat help`

Ou, a partir da raiz do workspace:

`tools\obsidian-cli\obsidian-cli.bat help`

## Regras praticas de uso

### Quando usar o vault

Use o vault para:

- documentacao operacional
- memoria de sessoes
- backlog e execucao
- notas de arquitetura, produto e dados
- referencias de caminhos e fontes de verdade

### Quando usar `docs`

Use `docs` quando fizer sentido manter uma camada documental simples, legivel fora do Obsidian ou aproveitavel por ferramentas que nao dependem do vault.

### Quando usar o CLI

Use o CLI quando precisar:

- abrir rapidamente o vault certo
- consultar ou manipular o vault a partir do terminal
- apoiar automacoes futuras
- integrar fluxos locais com o app do Obsidian

## Sinais de erro operacional

- o comando responde que a interface de linha de comando nao esta habilitada
- o app do Obsidian nao esta em execucao
- o terminal esta fora do vault esperado e um comando atua no vault ativo errado
- a mudanca foi feita em `docs`, mas deveria estar numa nota estruturada do vault

## Troubleshooting rapido

### `Command line interface is not enabled`

Habilite:

`Settings > General > Advanced > Command line interface`

### CLI nao encontrado

Confirme que o instalador do Obsidian adicionou:

`C:\Users\hedge\AppData\Local\Programs\Obsidian\Obsidian.com`

### Vault errado aberto

Reabra o vault pelo wrapper oficial do workspace em `tools\obsidian-cli\open-project-vault.bat`.

## Resultado esperado

Qualquer pessoa que abrir este vault deve conseguir:

- abrir o cofre correto sem procurar caminho manualmente
- entender como o CLI oficial entra no fluxo local
- saber quando registrar informacao no vault em vez de espalhar contexto em conversas ou notas soltas

## Referencia externa

- [Obsidian CLI](https://obsidian.md/help/cli)
