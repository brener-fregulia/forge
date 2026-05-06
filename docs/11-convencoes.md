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

### JavaScript
- ES Modules (import/export) em todos os arquivos
- Entrypoints: dashboard.js e client.js
- Sem frameworks — vanilla JS + DOM API
- HTML dinamico via template tags (<template>) quando possivel
- Injecao de HTML via JS apenas para listas de tamanho variavel
- Reconexao automatica do WebSocket em ws.js (2s)

### Shell (agent)
- POSIX sh — sem bashismos
- Variaveis exportadas entre funcoes via export
- Arquivos temporarios em /tmp/forge-*.tmp
- JSON gerado via printf (nunca via echo com aspas aninhadas)
- Offsets SMBIOS via od para leitura de DMI (independente de fabricante)

### CSS
- Variaveis CSS em base.css (--accent, --bg, --border, etc)
- Sem frameworks — CSS puro
- Organizacao: components/ pages/ modals/ tables/
- Cada responsabilidade em arquivo proprio

## Estrutura de arquivos — regras

- Novo endpoint REST -> arquivo proprio em routes/api/server/ ou routes/api/clients.py
- Novo modal JS -> arquivo proprio em pages/dashboard/modals/ ou pages/client/
- Novo CSS de modal -> arquivo proprio em static/css/modals/
- Novo CSS de tabela -> arquivo proprio em static/css/tables/
- Novo partial HTML -> arquivo proprio em templates/partials/

## Banco de dados

- Migrations sempre via Alembic (nunca alterar tabelas manualmente)
- Modelos em db/models/, servicos em db/services/
- Nunca acessar banco diretamente nas rotas — sempre via servicos

## Variaveis de ambiente

Todas as configuracoes em server/.env (nao commitado).
Template em server/.env.example (commitado).
Nunca hardcodar IPs, portas ou caminhos no codigo.