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

## Padroes de codigo

### Python

- FastAPI com async/await em todos os endpoints
- SQLAlchemy async (asyncpg) para banco
- Variaveis de ambiente via python-dotenv + config.py centralizado
- Funcoes auxiliares privadas com prefixo _ (ex: _disk_smart, _cpu_temp)
- Nunca acessar banco diretamente nas rotas — sempre via servicos em db/services/
- Migrations sempre via Alembic, nunca alterar tabelas manualmente

#### Organizacao de rotas

Cada dominio tem seu proprio arquivo em routes/api/:

- `machines.py` — identidade e metadados da maquina (GET /clients, alias)
- `commands.py` — execucao de comandos e log
- `deploy.py` — plano de deploy
- `terminal.py` — abertura de sessao PTY
- `server/` — metricas e status do servidor FORGE

WebSockets separados por contexto em routes/ws/:

- `agent.py` — /ws/agent/{mac}
- `dashboard.py` — /ws/dashboard
- `terminal.py` — /ws/terminal/{mac}/{session}/{port}

Novo endpoint REST -> arquivo proprio no dominio correto em routes/api/
Novo WebSocket -> arquivo proprio em routes/ws/

#### to_dict() vs to_summary()

- `to_summary()` — broadcasts do dashboard e list_clients. Campos minimos para o card.
- `to_dict()` — get_client e broadcasts de inventario. Todos os campos.
- Nunca usar to_dict() em broadcasts que so atualizam o grid do dashboard.

### JavaScript

#### Anvil — framework UI proprio

- Todos os arquivos JS devem usar os helpers de dom.js (qs, qsa, on, show, hide, etc)
- Nunca usar document.querySelector, addEventListener ou classList diretamente nas features
- Helpers DOM centralizados em lib/anvil/dom.js
- Estado reativo via createStore em lib/anvil/state.js
- Criacao de elementos via lib/anvil/element.js (el, append)
- Componentes UI do FORGE via lib/ui/builders.js (buildSummary, buildTable)

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
        index.js (ou client-grid.js, server-status.js)
        modals/
      client/
        alias.js, command.js, log.js
        terminal/
          index.js
        deploy/
          index.js
          modal/
            index.js, disco.js, backup.js, so.js, pos.js

Regras:
- Feature com um arquivo -> arquivo direto em pages/client/
- Feature com multiplos arquivos -> subpasta propria
- Modal com multiplos arquivos -> subpasta modal/ dentro da feature
- Componente reutilizavel entre paginas -> components/
- Utilitario puro sem DOM -> lib/

#### Separacao de responsabilidades por sufixo

- `*.model.js` — logica pura sem DOM, testavel
- `*.view.js` — manipulacao DOM e renderizacao
- `*.service.js` — chamadas HTTP/WS, retorna dados, sem DOM
- sem sufixo — utilitarios genericos ou entrypoints

#### Regras gerais

- ES Modules (import/export) em todos os arquivos
- Entrypoints: dashboard.js e client.js
- Sem frameworks — vanilla JS + DOM API
- HTML dinamico via template tags (<template>) quando possivel
- innerHTML permitido apenas para strings simples de loading/erro
- Eventos DOM via addEventListener, nunca via atributos onclick no HTML
- Constantes em UPPER_CASE no topo do arquivo
- Funcoes privadas prefixadas com _ (ex: _renderTable, _calcHealth)
- Funcoes publicas exportadas com nome descritivo

#### Estado

- Um objeto de estado por feature em vez de variaveis soltas no modulo
- Funcoes de logica nao devem ter efeitos colaterais — recebem dados, retornam dados
- Reconexao automatica do WebSocket em ws.js (2s)

### Shell (agent)

- POSIX sh — sem bashismos
- Variaveis exportadas entre funcoes via export
- Arquivos temporarios em /tmp/forge-*.tmp
- JSON gerado via printf (nunca via echo com aspas aninhadas)
- Offsets SMBIOS via od para leitura de DMI (independente de fabricante)
- Separacao por responsabilidade: inventory/, maintenance.sh, forge-ls.sh
- Scripts de build separados em scripts/initramfs/ com env.sh compartilhado
- Binarios extras em agent/bin/ — nunca commitados, instalados via setup-agent-bins.sh

### CSS

- Variaveis CSS em base.css (--accent, --bg, --border, etc)
- Sem frameworks — CSS puro
- Organizacao: components/ (inclui tables/), pages/, modals/
- Cada responsabilidade em arquivo proprio
- Agregadores: components.css, modals.css — importados por style.css
- CSS de tabela em components/tables/ com base.css compartilhado
- CSS de modal em modals/ com subpasta propria se tiver multiplos arquivos

## Banco de dados

- Migrations sempre via Alembic (nunca alterar tabelas manualmente)
- Modelos em db/models/, servicos em db/services/
- Nunca acessar banco diretamente nas rotas — sempre via servicos

## Variaveis de ambiente

Todas as configuracoes em server/.env (nao commitado).
Template em server/.env.example (commitado).
Nunca hardcodar IPs, portas ou caminhos no codigo.
STORAGE_MODE define o perfil de storage: simple | hot_cold | hot_cold_raid

## Servico systemd (producao)

Arquivos prontos mas nao ativados durante desenvolvimento:
- `server/forge.service` — unit file do systemd
- `scripts/setup-user.sh` — cria usuario forge, ajusta permissoes e sudoers

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

## Testes

- Logica pura em *.model.js e funcoes Python sem side effects sao candidatos a teste
- Aguardar estabilizacao do pipeline de deploy antes de implementar
- Python: pytest + httpx para endpoints REST criticos
- JS: testar apenas *.model.js — arquivos com DOM sao dificeis de testar unitariamente
- Shell: script dry-run para validar JSON do agent