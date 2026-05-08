# Estrutura do Projeto

```
/opt/forge/
  agent/
    forge-agent.sh             <- entrypoint, orquestrador principal
    lib/
      network.sh               <- aguarda rede, detecta IFACE/MAC
      inventory.sh             <- orquestrador de inventario
      inventory/
        hardware.sh            <- CPU, RAM, GPU, slots de RAM
        drives.sh              <- discos, SMART, drive letters, usuarios Windows
      maintenance.sh           <- acoes pos-inventario (spindown HDDs, etc)
      websocket.sh             <- loop WebSocket, FIFO, watchdog, comandos
      json.sh                  <- escape JSON
      forge-ls.sh              <- listagem de diretorios para o config-deploy

  server/
    .env                       <- configuracao local (nao commitado)
    .env.example               <- template de configuracao
    run.sh                     <- uvicorn launcher
    requirements.txt
    alembic/                   <- migrations PostgreSQL
      env.py
      versions/
    app/
      main.py                  <- entrypoint FastAPI
      config.py                <- carrega .env (paths, IPs, portas)
      state.py                 <- estado em memoria (Client, State)
      db/
        base.py                <- engine asyncpg, AsyncSessionLocal
        models/
          client.py            <- Client, Machine
          deploy.py            <- Deploy (DeployStatus), Snapshot
        services/
          machine.py           <- get_or_create_machine, set_machine_alias
      routes/
        pages.py               <- rotas HTML
        ws.py                  <- endpoints WebSocket
        api/
          __init__.py          <- agrega routers
          clients.py           <- /api/clients/* (tags: clients)
          server/
            __init__.py
            status.py          <- /api/server/status
            cpu.py             <- /api/server/cpu
            ram.py             <- /api/server/ram
            storage.py         <- /api/server/storage (tags: server)
      templates/
        base.html
        dashboard.html
        client.html
        partials/
          client/
            header.html        <- alias + botoes deploy/executar
            meta.html          <- MAC, IP, Status
            hardware.html      <- barra CPU/RAM/GPU + modal RAM
            disks.html         <- tabela de discos + templates
            users.html         <- tabela de usuarios + templates
            command.html       <- form de comando shell
            log.html           <- log + limpar
          modals/
            smart.html         <- modal SMART com templates
            config-deploy/
              index.html       <- modal shell (overlay, header, footer)
              tabs/
                disco.html
                backup.html
                so.html
                pos.html
      static/
        css/
          style.css            <- entry point (imports)
          base.css             <- variaveis, reset, layout
          components.css       <- agregador de componentes
          modals.css           <- agregador de modais
          components/
            button.css
            badge.css
            form.css
            modal.css
            progress.css
            loading.css
            tabs.css
            tables/
              base.css         <- estilos base compartilhados entre tabelas
              disks.css        <- estilos especificos da tabela de discos
              users.css        <- estilos especificos da tabela de usuarios
          pages/
            dashboard.css
            dashboard-server-status.css
            client.css
          modals/
            smart.css
            config-deploy/
              base.css         <- estilos compartilhados entre abas
              backup.css
              disco.css
              so.css
              pos.css
        js/
          dashboard.js         <- entrypoint dashboard
          client.js            <- entrypoint client
          lib/
            format.js          <- formatBytes
            clipboard.js       <- botao copiar
            ws.js              <- wrapper WebSocket com reconexao automatica
            modal.js           <- utilitarios de modal reutilizaveis
            tabs.js            <- componente de abas reutilizavel
          components/
            disks-table.js     <- renderDisks, initSmartModal
            users-table.js     <- renderUsers
            hardware-card.js   <- renderHardware, modal RAM
          pages/
            dashboard/
              client-grid.js   <- grid de cards via WebSocket
              server-status.js <- polling status + abertura de modais
              modals/
                server-cpu.js
                server-ram.js
                server-storage.js
            client/
              alias.js
              command.js
              log.js
              deploy.js        <- botao executar + initDeploy
              modals/
                config-deploy/
                  index.js     <- orquestrador (modal, abas, navegacao)
                  tabs/
                    disco.js
                    backup.js
                    so.js
                    pos.js

  scripts/
    build-initramfs.sh         <- orquestrador do build
    initramfs/
      env.sh                   <- variaveis compartilhadas
      01-check.sh              <- verifica dependencias
      02-prepare.sh            <- limpa e prepara workdir
      03-extract.sh            <- extrai initramfs base
      04-drivers.sh            <- monta modloop, copia drivers
      05-packages.sh           <- extrai apks, copia binarios e libs
      06-agent.sh              <- copia websocat, forge-agent e libs
      07-patch-init.sh         <- patcha o /init
      08-repack.sh             <- reempacota e gera initramfs final
    client-shell.sh            <- shell remota netcat (debug)

  build/                       <- .gitignored
    websocat                   <- binario estatico musl
    *.apk                      <- pacotes Alpine baixados
    initramfs-work/            <- workdir do build

  docs/
    README.md                  <- indice
    01-visao-geral.md
    02-hardware.md
    03-storage.md
    04-software.md
    05-estrutura.md            <- este arquivo
    06-configuracao.md
    07-initramfs.md
    08-dashboard.md
    09-roadmap.md
    10-problemas.md
    11-convencoes.md
```