# Estrutura do Projeto

```
/opt/forge/
  agent/
    bootstrap.sh               <- bootstrap minimo embutido no initramfs
    forge-agent.sh             <- entrypoint, orquestrador principal (baixado em runtime)
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
    bin/                       <- .gitignored — binarios baixados pelo setup-agent-bins.sh
      socat
      libreadline.so.8
      libreadline.so.8.3

  server/
    .env                       <- configuracao local (nao commitado)
    .env.example               <- template de configuracao
    forge.service              <- unit file systemd (producao)
    run.sh                     <- uvicorn launcher (desenvolvimento)
    requirements.txt
    alembic/                   <- migrations PostgreSQL
      env.py
      versions/
    app/
      main.py                  <- entrypoint FastAPI + lifespan (disk_io)
      config.py                <- carrega .env (paths, IPs, portas)
      state.py                 <- estado em memoria (Client.to_dict, to_summary, State)
      disk_io.py               <- monitor de I/O em tempo real (/proc/diskstats)
      db/
        base.py                <- engine asyncpg, AsyncSessionLocal
        models/
          client.py            <- Client, Machine
          deploy.py            <- Deploy (DeployStatus), Snapshot
        services/
          machine.py           <- get_or_create_machine, set_machine_alias
      routes/
        pages.py               <- rotas HTML
        api/
          __init__.py          <- agrega routers
          machines.py          <- GET/POST /api/clients (identidade, alias)
          commands.py          <- POST /api/clients/{mac}/command* e log
          deploy.py            <- POST /api/clients/{mac}/deploy/plan
          terminal.py          <- POST /api/clients/{mac}/terminal/open
          server/
            __init__.py
            status.py          <- /api/server/status
            cpu.py             <- /api/server/cpu
            ram.py             <- /api/server/ram
            storage.py         <- /api/server/storage, disk-io, isos
        ws/
          __init__.py          <- agrega routers WS
          agent.py             <- /ws/agent/{mac} — inventario, heartbeat, comandos
          dashboard.py         <- /ws/dashboard — snapshot e updates para o browser
          terminal.py          <- /ws/terminal/{mac}/{session}/{port} — bridge PTY
      templates/
        base.html
        dashboard.html
        client.html
        partials/
          client/
            header.html        <- alias, MAC, IP, Status + botoes deploy/executar
            hardware.html      <- barra CPU/RAM/GPU + modal RAM
            disks.html         <- tabela de discos + templates
            users.html         <- tabela de usuarios + templates
            log.html           <- log + limpar
            terminal.html      <- container de terminal PTY
          modals/
            smart.html         <- modal SMART (em base.html, disponivel em todas as paginas)
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
            summary.css
            tables/
              base.css
              disks.css
              users.css
          pages/
            dashboard.css
            dashboard-server-status.css
            client.css
          modals/
            smart.css
            config-deploy/
              base.css
              backup.css
              disco.css
              so.css
              pos.css
        js/
          dashboard.js         <- entrypoint dashboard
          client.js            <- entrypoint client
          lib/
            anvil/
              dom.js           <- helpers DOM (qs, qsa, on, show, hide, cloneTemplate, etc)
              state.js         <- estado reativo (createStore)
              element.js       <- helpers de criacao de elementos (el, append)
            ui/
              builders.js      <- componentes UI FORGE (buildSummary, buildTable)
              modal.js         <- utilitarios de modal reutilizaveis
              tabs.js          <- componente de abas reutilizavel
              clipboard.js     <- botao copiar
            format.js          <- formatBytes — utilitario puro sem DOM
            ws.js              <- wrapper WebSocket com reconexao automatica
          vendor/
            xterm/
              xterm.js         <- terminal emulator (servido localmente, offline-safe)
              xterm.css
              xterm-addon-fit.js
          components/
            disks-table.js     <- renderDisks + toggle de particoes
            users-table.js     <- renderUsers
            hardware-card.js   <- renderHardware + modal RAM
            smart-modal.js     <- initSmartModal + openSmartModal
          pages/
            dashboard/
              client-grid.js   <- grid de cards via WebSocket
              server-status.js <- polling status + modais + I/O de discos
              modals/
                server-cpu.js
                server-ram.js
                server-storage.js
            client/
              alias.js         <- editar alias da maquina
              command.js       <- form de comando shell
              log.js           <- limpar log
              terminal/
                index.js       <- inicializacao e sub-abas de terminal PTY
              deploy/
                index.js       <- botao executar + initDeploy
                modal/
                  index.js     <- orquestrador (modal, abas, navegacao)
                  disco.js     <- aba disco alvo
                  backup.js    <- aba backup (arvore de volumes)
                  so.js        <- aba instalacao SO
                  pos.js       <- aba pos-instalacao

  scripts/
    build-initramfs.sh         <- orquestrador do build
    setup-agent-bins.sh        <- baixa e extrai binarios do agent (socat, readline)
    setup-user.sh              <- cria usuario forge, permissoes e sudoers (producao)
    initramfs/
      env.sh                   <- variaveis compartilhadas
      01-check.sh              <- verifica dependencias
      02-prepare.sh            <- limpa e prepara workdir
      03-extract.sh            <- extrai initramfs base
      04-drivers.sh            <- monta modloop, copia drivers
      05-packages.sh           <- extrai apks, copia binarios e libs
      06-agent.sh              <- copia websocat e bootstrap
      07-patch-init.sh         <- patcha o /init
      08-repack.sh             <- reempacota e gera initramfs final

  build/                       <- .gitignored
    websocat                   <- binario estatico musl
    *.apk                      <- pacotes Alpine baixados
    initramfs-work/            <- workdir do build

  docs/
    README.md
    01-visao-geral.md
    02-hardware.md
    03-storage.md
    04-software.md
    05-estrutura.md
    06-configuracao.md
    07-initramfs.md
    08-dashboard.md
    09-roadmap.md
    10-problemas.md
    11-convencoes.md
    12-anvil.md
```