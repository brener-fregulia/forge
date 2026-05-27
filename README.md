# FORGE - Fleet Orchestration & Recovery Global Engine
**Referência Técnica do Projeto**

> Sistema de deploy automatizado em rede local: PXE boot -> backup seletivo -> formatação -> instalação Windows -> restauração.
> Futuro: integração com ERP para lojas de informática.

---

## Índice da documentação

| Arquivo | Conteúdo |
|---|---|
| [01-visao-geral.md](docs/01-visao-geral.md) | Pipeline completo, topologia de rede, escala prevista, mensagens WebSocket |
| [02-hardware.md](docs/02-hardware.md) | Servidor atual, cliente PXE de teste, drivers customizados, roadmap de hardware |
| [03-storage.md](docs/03-storage.md) | Filosofia hot/cold, fluxo de dados, estrutura de diretórios, ciclo de vida do backup |
| [04-software.md](docs/04-software.md) | Stack, endpoints REST e WebSocket, separação de responsabilidades, agent modular |
| [05-estrutura.md](docs/05-estrutura.md) | Árvore completa de arquivos e pastas do projeto com anotações |
| [06-configuracao.md](docs/06-configuracao.md) | Rede, bond0, NAT, dnsmasq, MikroTik CRS326, nginx, iPXE, variáveis de ambiente |
| [07-initramfs.md](docs/07-initramfs.md) | Build do initramfs, mini-bootstrap, binários embutidos, patches no /init |
| [08-dashboard.md](docs/08-dashboard.md) | Páginas do dashboard, sistema de status, backup, endpoints relevantes, status atual |
| [09-roadmap.md](docs/09-roadmap.md) | Próximos passos do pipeline, infraestrutura, dashboard e integrações futuras |
| [10-problemas.md](docs/10-problemas.md) | Histórico de problemas resolvidos com causa e solução |
| [11-convencoes.md](docs/11-convencoes.md) | Prefixos de commit, padrões Python/JS/Shell/CSS, banco de dados, systemd |
| [12-anvil.md](docs/12-anvil.md) | Framework UI próprio - princípios, estrutura, convenções, roadmap |
| [13-paginas.md](docs/13-paginas.md) | Páginas do FORGE - responsabilidade, entrypoints JS, dados e navegação |
| [14-pendencias.md](docs/14-pendencias.md) | Bugs abertos, melhorias técnicas e limitações conhecidas por categoria |

---

## Resumo rápido

**Servidor:** Debian 13, FastAPI + PostgreSQL, bond0 10GbE, hot cache SSD + cold storage RAID1.

**Agent:** Alpine Linux em RAM via PXE, shell script modular, WebSocket para controle, HTTP REST (porta 8765) para comandos síncronos, TCP raw (portas 9100-9199) para stream de backup.

**Comunicação:**
| Canal | Uso |
|---|---|
| WebSocket | presença, heartbeat, inventário, comandos de controle |
| HTTP REST agent:8765 | execução síncrona (forge-ls, etc) |
| TCP raw 9100-9199 | stream de backup (raw image, minimal) |

**Backup:**
| Modo | Mecanismo |
|---|---|
| Raw Image | ntfsclone -s stream TCP |
| Mínimo | tar Users + programs.txt stream TCP |
| Avançado | seleção manual via árvore NTFS + tar stream TCP |

**Convenções de commit:** `init` / `feat` / `fix` / `refactor` / `agent` / `server` / `infra` / `docs`