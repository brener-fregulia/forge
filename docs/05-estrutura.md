# Estrutura do Projeto

```text
.
├── agent/
│   ├── bootstrap.sh               <- bootstrap mínimo embutido no initramfs
│   ├── forge-agent.sh             <- entrypoint/orquestrador principal
│   └── lib/
│       ├── backup_minimal.sh      <- backup mínimo do cliente
│       ├── forge-ls.sh            <- listagem de diretórios
│       ├── format.sh              <- helpers de formatação
│       ├── http_handler.sh        <- handler HTTP interno
│       ├── http_server.sh         <- servidor HTTP leve
│       ├── inventory.sh           <- orquestrador de inventário
│       ├── json.sh                <- escape/manipulação JSON
│       ├── maintenance.sh         <- ações pós-inventário
│       ├── network.sh             <- detecção/rede
│       ├── websocket.sh           <- loop WebSocket/FIFO/watchdog
│       └── inventory/
│           ├── drives.sh          <- discos, SMART e usuários
│           └── hardware.sh        <- CPU, RAM, GPU e slots

├── build/
│   ├── .gitkeep
│   └── .gitkeep-marker

├── docs/
│   ├── 01-visao-geral.md
│   ├── 02-hardware.md
│   ├── 03-storage.md
│   ├── 04-software.md
│   ├── 05-estrutura.md
│   ├── 06-configuracao.md
│   ├── 07-initramfs.md
│   ├── 08-dashboard.md
│   ├── 09-roadmap.md
│   ├── 10-problemas.md
│   ├── 11-convencoes.md
│   ├── 12-anvil.md
│   ├── 13-paginas.md
│   └── 14-pendencias.md

├── scripts/
│   ├── build-initramfs.sh         <- build do initramfs
│   ├── client-shell.sh            <- shell remoto do cliente
│   ├── dump-context.sh            <- dump/debug de contexto
│   ├── reload-agent.sh            <- reload do agent
│   ├── setup-agent-bins.sh        <- setup de binários auxiliares
│   ├── setup-user.sh              <- setup inicial de usuário
│   └── initramfs/
│       ├── 01-check.sh
│       ├── 02-prepare.sh
│       ├── 03-extract.sh
│       ├── 04-drivers.sh
│       ├── 05-packages.sh
│       ├── 06-agent.sh
│       ├── 07-patch-init.sh
│       ├── 08-repack.sh
│       └── env.sh

├── server/
│   ├── .env.example
│   ├── alembic.ini
│   ├── forge.service
│   ├── requirements.txt
│   ├── run.sh
│   ├── alembic/
│   │   ├── env.py
│   │   ├── README
│   │   ├── script.py.mako
│   │   └── versions/
│   │       ├── 006a9e094af1_add_deploy_snapshot.py
│   │       └── 05390c87a0be_init_client_machine_deploy_snapshot.py
│   └── app/
│       ├── __init__.py
│       ├── config.py              <- configuração/env
│       ├── main.py                <- entrypoint FastAPI
│       ├── state.py               <- estado global do servidor
│       ├── db/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── models/
│       │   │   ├── __init__.py
│       │   │   ├── client.py
│       │   │   └── deploy.py
│       │   └── services/
│       │       ├── __init__.py
│       │       └── machine.py
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── pages.py
│       │   ├── api/
│       │   │   ├── __init__.py
│       │   │   ├── clients/
│       │   │   │   ├── backups.py
│       │   │   │   ├── commands.py
│       │   │   │   ├── deploys.py
│       │   │   │   ├── execs.py
│       │   │   │   ├── machines.py
│       │   │   │   └── terminals.py
│       │   │   └── server/
│       │   │       ├── __init__.py
│       │   │       ├── backups.py
│       │   │       ├── cpu.py
│       │   │       ├── logs.py
│       │   │       ├── ram.py
│       │   │       ├── status.py
│       │   │       ├── storage.py
│       │   │       └── switch.py
│       │   └── ws/
│       │       ├── __init__.py
│       │       ├── agent.py
│       │       ├── dashboard.py
│       │       └── terminal.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── backup_receiver.py
│       │   ├── disk_io.py
│       │   ├── forge_log.py
│       │   └── switch_monitor.py
│       ├── static/
│       │   ├── css/
│       │   └── js/
│       └── templates/
│           ├── backups.html
│           ├── base.html
│           ├── client.html
│           ├── dashboard.html
│           ├── logs.html
│           └── partials/
│               ├── client/
│               └── modals/

├── .gitignore
└── README.md
```
