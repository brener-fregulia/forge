# Paginas do FORGE

Cada pagina tem responsabilidade clara e JS modular proprio.

## / — Dashboard

Visao geral da frota. Mostra todos os dispositivos na rede — online e offline.

- Entrypoint JS: `static/js/dashboard.js`
- Template: `templates/dashboard.html`
- Dados: WebSocket /ws/dashboard (snapshot + eventos em tempo real)
- Componentes: grid de clientes, barra de status do servidor, modais de detalhes

## /client/{mac} — Cliente

Detalhes completos de um cliente PXE conectado.

- Entrypoint JS: `static/js/client.js`
- Template: `templates/client.html` + partials em `partials/client/`
- Dados: REST /api/clients/{mac} (carga inicial) + WebSocket /ws/dashboard (atualizacoes)
- Abas: Informacoes (hardware, discos, SMART, usuarios, log) e Terminal (PTY via xterm.js)
- Acoes: configurar e executar deploy, editar alias, abrir terminal, enviar comandos

## /logs — Logs do servidor

Monitoramento em tempo real dos logs internos do FORGE por categoria.

- Entrypoint JS: `static/js/pages/logs.js`
- Template: `templates/logs.html`
- Dados: polling REST GET /api/server/logs a cada 2s
- Categorias: switch, disk_io, agent, system, error
- Buffer de 200 linhas por categoria no servidor (forge_log.py)

## /server/config — Configuracao do servidor (pendente)

Pagina para configurar parametros do servidor sem editar .env manualmente.
Inclui: discos monitorados pelo I/O, intervalos de polling, configuracoes de storage.

## Navegacao

Todas as paginas herdam `base.html` com header fixo contendo:
- Logo FORGE (link para /)
- Subtitulo
- Botao Logs (🖥️) — link para /logs, marcado como active na pagina de logs
- Botao Config (⚙️) — link para /server/config (pendente)