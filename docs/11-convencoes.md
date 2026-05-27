# Convencoes

## Prefixos de commit

| Prefixo | Uso |
|---|---|
| init: | estrutura inicial |
| feat: | nova funcionalidade |
| fix: | correcao de bug |
| refactor: | refatoracao sem mudanca de comportamento |
| agent: | mudancas no agente Alpine |
| server: | mudancas no FORGE Server |
| infra: | configuracoes do servidor/rede |
| docs: | documentacao |

Separador nos commits: hifen simples `-` (nunca `-`)

## Padroes de codigo

### Python

- FastAPI com async/await em todos os endpoints
- SQLAlchemy async (asyncpg) para banco
- Variaveis de ambiente via python-dotenv + config.py centralizado
- Funcoes auxiliares privadas com prefixo _ (ex: _disk_smart, _cpu_temp)
- Nunca acessar banco diretamente nas rotas - sempre via servicos em db/services/
- Migrations sempre via Alembic, nunca alterar tabelas manualmente

#### Organizacao de rotas

Estrutura de dominios em routes/api/:
routes/api/
  clients/         <- tudo sobre o cliente PXE
    init.py    <- agrega routers do dominio
    machines.py    <- identidade e metadados
    commands.py    <- execucao de comandos e log
    deploys.py     <- plano de deploy
    terminals.py   <- sessao PTY
    execs.py       <- execucao REST direta no agent
    backups.py     <- operacoes de backup no cliente
  server/          <- tudo sobre o servidor FORGE
    init.py    <- agrega routers do dominio
    status.py      <- /api/server/status
    cpu.py         <- /api/server/cpu
    ram.py         <- /api/server/ram
    storage.py     <- /api/server/storage, disk-io, isos
    logs.py        <- /api/server/logs
    backups.py     <- /api/server/backups (visualizacao)
    switch.py      <- /api/server/switch (SNMP)

Regra de nomenclatura: nome do arquivo = recurso que gerencia, no plural.
Contexto pelo diretorio (clients/ vs server/), recurso pelo nome do arquivo.

WebSockets separados por contexto em routes/ws/:
routes/ws/
agent.py      <- /ws/agent/{mac}
dashboard.py  <- /ws/dashboard
terminal.py   <- /ws/terminal/{mac}/{session}/{port}

Novo endpoint REST -> arquivo proprio no dominio correto (clients/ ou server/)
Novo WebSocket -> arquivo proprio em routes/ws/

#### Services

Logica de negocio, monitores e I/O em app/services/:
services/
disk_io.py          <- monitor de I/O (/proc/diskstats)
switch_monitor.py   <- polling SNMP do switch
backup_receiver.py  <- TCP receiver para stream de backup
forge_log.py        <- logger centralizado por categoria

Regra: se nao e rota HTTP e nao e banco, e um service.

#### to_dict() vs to_summary()

- `to_summary()` - broadcasts do dashboard e list_clients. Campos minimos para o card.
- `to_dict()` - get_client e broadcasts de inventario. Todos os campos.
- Nunca usar to_dict() em broadcasts que so atualizam o grid do dashboard.

### JavaScript

#### Anvil - framework UI proprio

- Todos os arquivos JS devem usar os helpers de dom.js (qs, qsa, on, show, hide, etc)
- Nunca usar document.querySelector, addEventListener ou classList diretamente nas features
- Helpers DOM centralizados em lib/anvil/dom.js
- Estado reativo via createStore em lib/anvil/state.js
- Criacao de elementos via lib/anvil/element.js (el, append)
- Componentes UI do FORGE via lib/ui/builders.js (buildSummary, buildTable)

#### Icones SVG

- Icones em static/vendor/icons/ (Tabler Icons, MIT)
- Usar sempre via tag `<img>` com classe `forge-icon`, `btn-icon`, `tree-icon` ou `info-icon`
- Nunca usar emojis de UI - apenas SVGs offline
- Logo do FORGE e favicon: excecao permitida (🔥 enquanto SVG customizado nao existir)
- Filtros CSS para colorir: `brightness(0) invert(0.4)` para dimmed, accent via hue-rotate

#### Organizacao de lib/

| Pasta | Conteudo |
|---|---|
| lib/anvil/ | Primitivos genericos sem opiniao sobre CSS do projeto |
| lib/ui/ | Componentes UI especificos do FORGE (classes forge-table, info-summary, etc) |
| lib/ (raiz) | Utilitarios puros sem DOM (format.js, ws.js) |

#### Orientacao a paginas

JS organizado por pagina, depois por feature dentro da pagina:
pages/
  dashboard/
    client-grid.js
    server-status.js
  modals/
  client/
    alias.js, command.js, log.js
    terminal/
    deploy/
    modal/
    logs.js
    backups.js

Regras:
- Feature com um arquivo -> arquivo direto em pages/client/
- Feature com multiplos arquivos -> subpasta propria
- Modal com multiplos arquivos -> subpasta modal/ dentro da feature
- Componente reutilizavel entre paginas -> components/
- Utilitario puro sem DOM -> lib/

#### Separacao de responsabilidades por sufixo

- `*.model.js` - logica pura sem DOM, testavel
- `*.view.js` - manipulacao DOM e renderizacao
- `*.service.js` - chamadas HTTP/WS, retorna dados, sem DOM
- sem sufixo - utilitarios genericos ou entrypoints

#### Regras gerais

- ES Modules (import/export) em todos os arquivos
- Entrypoints: dashboard.js e client.js
- Sem frameworks - vanilla JS + DOM API
- HTML dinamico via template tags (<template>) quando possivel
- innerHTML permitido apenas para strings simples de loading/erro
- Eventos DOM via addEventListener, nunca via atributos onclick no HTML
- Constantes em UPPER_CASE no topo do arquivo
- Funcoes privadas prefixadas com _ (ex: _renderTable, _calcHealth)
- Funcoes publicas exportadas com nome descritivo
- Nomes de arquivo em kebab-case (ex: backup-storage.js, server-status.js)

#### Estado

- Um objeto de estado por feature em vez de variaveis soltas no modulo
- Funcoes de logica nao devem ter efeitos colaterais - recebem dados, retornam dados
- Reconexao automatica do WebSocket em ws.js (2s)

### Shell (agent)

- POSIX sh - sem bashismos
- Variaveis exportadas entre funcoes via export
- Arquivos temporarios em /tmp/forge-*.tmp
- JSON gerado via printf (nunca via echo com aspas aninhadas)
- Offsets SMBIOS via od para leitura de DMI (independente de fabricante)
- Separacao por responsabilidade: inventory/, maintenance.sh, forge-ls.sh
- Scripts de build separados em scripts/initramfs/ com env.sh compartilhado
- Binarios extras em agent/bin/ - nunca commitados, instalados via setup-agent-bins.sh

### CSS

- Variaveis CSS em base.css (--accent, --bg, --border, etc)
- Sem frameworks - CSS puro
- Organizacao: components/ (inclui tables/), pages/, modals/
- Cada responsabilidade em arquivo proprio
- Agregadores: components.css, modals.css - importados por style.css
- CSS de tabela em components/tables/ com base.css compartilhado
- CSS de modal em modals/ com subpasta propria se tiver multiplos arquivos
- Nomes de arquivo em kebab-case

## Comunicacao agent - servidor

| Canal | Quando usar |
|---|---|
| WebSocket | presenca, heartbeat, inventario, comandos de controle |
| HTTP REST agent:8765 | execucao sincrona de comandos no agent |
| TCP raw 9100-9199 | stream de dados grandes (backup, futuro) |

Regra: se e dado grande ou sincrono, nao vai pelo WebSocket.

## Banco de dados

- Migrations sempre via Alembic (nunca alterar tabelas manualmente)
- Modelos em db/models/, servicos em db/services/
- Nunca acessar banco diretamente nas rotas - sempre via servicos

## Variaveis de ambiente

Todas as configuracoes em server/.env (nao commitado).
Template em server/.env.example (commitado).
Nunca hardcodar IPs, portas ou caminhos no codigo.
STORAGE_MODE define o perfil de storage: simple | hot_cold | hot_cold_raid

## Servico systemd (producao)

Arquivos prontos mas nao ativados durante desenvolvimento:
- `server/forge.service` - unit file do systemd
- `scripts/setup-user.sh` - cria usuario forge, ajusta permissoes e sudoers

Ativar apenas quando o projeto estiver estavel para producao:

    sudo bash /opt/forge/scripts/setup-user.sh
    sudo cp /opt/forge/server/forge.service /etc/systemd/system/forge.service
    sudo systemctl daemon-reload
    sudo systemctl enable forge
    sudo systemctl start forge

Durante desenvolvimento, usar run.sh diretamente (suporta --reload para html/css/js):

    cd /opt/forge/server && bash run.sh

O usuario forge (sistema) tem sudo restrito para: smartctl, mdadm, dmidecode.
O usuario brener pertence ao grupo forge para manter acesso de edicao via VSCode.

## Checklist para nova feature

Antes de implementar:
- [ ] Qual dominio? clients/ ou server/ ou services/?
- [ ] Nome do arquivo segue o recurso no plural?
- [ ] Endpoint REST segue o padrao /api/{dominio}/{recurso}?
- [ ] Canal de comunicacao correto? (WS vs REST vs TCP)

Durante implementacao:
- [ ] Logs via forge_log com categoria correta
- [ ] Erros tratados e logados em categoria "error"
- [ ] JS usa helpers do Anvil (qs, on, cloneTemplate)
- [ ] Icones via SVG offline, nao emojis

Ao finalizar:
- [ ] Commit com prefixo correto e hifen simples
- [ ] Documentar em 08-dashboard.md ou 09-roadmap.md se for feature
- [ ] Documentar bug resolvido em 10-problemas.md
- [ ] Pendencia aberta em 14-pendencias.md

## Testes

- Logica pura em *.model.js e funcoes Python sem side effects sao candidatos a teste
- Aguardar estabilizacao do pipeline de deploy antes de implementar
- Python: pytest + httpx para endpoints REST criticos
- JS: testar apenas *.model.js - arquivos com DOM sao dificeis de testar unitariamente
- Shell: script dry-run para validar JSON do agent