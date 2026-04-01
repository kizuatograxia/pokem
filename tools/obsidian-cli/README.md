# Obsidian CLI

Wrappers locais para usar o CLI oficial do Obsidian com o vault do projeto.

## Arquivos

- `open-project-vault.bat`
  - abre `C:\Users\hedge\OneDrive\Desktop\pokém\obsidian-vault` no app desktop do Obsidian
- `obsidian-cli.bat`
  - encaminha argumentos para `Obsidian.com`, o wrapper oficial do CLI no Windows

## Uso

1. Abra o vault do projeto com `open-project-vault.bat`.
2. No Obsidian, habilite `Settings > General > Advanced > Command line interface`.
3. Rode comandos com `obsidian-cli.bat`.

Exemplo:

```bat
tools\obsidian-cli\obsidian-cli.bat --help
```
