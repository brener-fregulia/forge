# Estrutura do Projeto

```
/opt/forge/
  agent/
    forge-agent.sh             <- entrypoint (~20 linhas)
    lib/
      network.sh               <- aguarda rede, detecta IFACE/MAC
      inventory.sh             <- hardware, discos, SMART, usuarios, GPU, RAM slots
      websocket.sh             <- loop WebSocket, FIFO, watchdog, comandos
      json.sh                  <- escape JSON

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
          clients.py           <- /api/clients/*
          server/
            __init__.py
            status.py          <- /api/server/status
            cpu.py             <- /api/server/cpu
            ram.py             <- /api/server/ram
            storage.py         <- /api/server/storage
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
            smart.html
            deploy.html              <- modal antigo (backup temporario)
            config-deploy/
              index.html             <- modal shell (overlay, header, footer)
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
          components/
            button.css
            badge.css
            form.css
            modal.css
            progress.css
            loading.css
            tabs.css                 <- componente de abas reutilizavel
          pages/
            dashboard.css
            server-status.css
            client.css
          modals/
            smart.css
            deploy.css
            config-deploy.css
          tables/
            disks.css
            users.css
        js/
          dashboard.js         <- entrypoint dashboard
          client.js            <- entrypoint client
          lib/
            format.js          <- formatBytes
            clipboard.js       <- botao copiar
            ws.js              <- wrapper WebSocket com reconexao automatica
            modal.js           <- utilitarios de modal reutilizaveis
          components/
            disks-table.js     <- renderDisks, initSmartModal
            users-table.js     <- renderUsers
            hardware-card.js   <- renderHardware, modal RAM
            deploy-modal.js          <- modal antigo (backup temporario)
            config-deploy/
              index.js               <- orquestrador (modal, abas, navegacao)
              tabs/
                disco.js
                backup.js
                so.js
                pos.js
          pages/
            dashboard/
              client-grid.js   <- grid de cards via WebSocket
              server-status.js <- polling status + abertura de modais
              modals/
                server-cpu.js  <- renderCpuModal
                server-ram.js  <- renderRamModal
                server-storage.js <- renderStorageModal
            client/
              alias.js         <- edicao de alias
              command.js       <- envio de comandos shell
              log.js           <- log + limpar
              deploy.js        <- botao executar + initDeploy

  scripts/
    build-initramfs.sh         <- reconstroi initramfs Alpine completo
    client-shell.sh            <- shell remota netcat (debug)

  drivers/
    rtl8821au/                 <- driver WiFi USB (DKMS)

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