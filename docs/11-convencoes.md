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
- Endpoints REST agrupados por tag (clients, server, pages)
- Nunca acessar banco diretamente nas rotas — sempre via servicos em db/services/
- Migrations sempre via Alembic, nunca alterar tabelas manualmente

### JavaScript

#### Separacao de responsabilidades por sufixo
- `*.model.js` — logica pura sem DOM, testavel (ex: calcular saude, montar plano de deploy)
- `*.view.js` — manipulacao DOM e renderizacao, nao testavel unitariamente
- `*.service.js` — chamadas HTTP/WS, retorna dados, sem DOM
- Arquivos sem sufixo (ex: `tabs.js`, `modal.js`) sao utilitarios genericos

#### Regras gerais
- ES Modules (import/export) em todos os arquivos
- Entrypoints: dashboard.js e client.js
- Sem frameworks — vanilla JS + DOM API
- HTML dinamico via template tags (<template>) quando possivel
- Injecao de HTML via JS apenas quando inevitavel (listas dinamicas)
- Eventos DOM via addEventListener, nunca via atributos onclick no HTML
- Constantes em UPPER_CASE no topo do arquivo (ex: const CRITICAL_IDS = new Set(...))
- Funcoes privadas prefixadas com _ (ex: _renderTable, _calcHealth)
- Funcoes publicas exportadas com nome descritivo (ex: renderDiskTable, openSmartModal)

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

### CSS
- Variaveis CSS em base.css (--accent, --bg, --border, etc)
- Sem frameworks — CSS puro
- Organizacao: components/ (inclui tables/), pages/, modals/
- Cada responsabilidade em arquivo proprio
- Agregadores: components.css, modals.css — importados por style.css
- CSS de tabela em components/tables/ com base.css compartilhado
- CSS de modal em modals/ com subpasta propria se tiver multiplos arquivos

## Estrutura de arquivos — regras

### Python
- Novo endpoint REST -> arquivo proprio em routes/api/server/ ou routes/api/clients.py
- Novo partial HTML -> arquivo proprio em templates/partials/

### JavaScript
- Novo modal da pagina client -> pages/client/modals/
- Novo modal do dashboard -> pages/dashboard/modals/
- Componente reutilizavel entre paginas -> components/
- Utilitario puro sem DOM -> lib/

### CSS
- Novo CSS de componente -> components/
- Novo CSS de tabela -> components/tables/
- Novo CSS de modal com um arquivo -> modals/nome.css
- Novo CSS de modal com multiplos arquivos -> modals/nome/

## Banco de dados

- Migrations sempre via Alembic (nunca alterar tabelas manualmente)
- Modelos em db/models/, servicos em db/services/
- Nunca acessar banco diretamente nas rotas — sempre via servicos

## Variaveis de ambiente

Todas as configuracoes em server/.env (nao commitado).
Template em server/.env.example (commitado).
Nunca hardcodar IPs, portas ou caminhos no codigo.
STORAGE_MODE define o perfil de storage: simple | hot_cold | hot_cold_raid

## Testes

- Logica pura em *.model.js e funcoes Python sem side effects sao candidatos a teste
- Aguardar estabilizacao do pipeline de deploy antes de implementar
- Python: pytest + httpx para endpoints REST criticos
- JS: testar apenas *.model.js — arquivos com DOM sao dificeis de testar unitariamente
- Shell: script dry-run para validar JSON do agent