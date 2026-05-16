# Roadmap

## Proximos passos — pipeline de deploy (em ordem)

01. [ ] Aba Backup — modo Avancado funcional (forge-ls.sh pendente de fix)
02. [ ] Aba Backup — modo Minimo (lista programas instalados via manifesto)
03. [ ] Aba Backup — Raw Image
04. [ ] Backup seletivo via ntfsclone -> hot cache
05. [ ] Compactacao zstd + replicacao para cold storage
06. [ ] Formatacao e particionamento do disco alvo (sgdisk + mkfs)
07. [ ] Instalacao Windows via wimlib-imagex
08. [ ] Injecao de drivers SDIO
09. [ ] Debloat
10. [ ] Restauracao do backup
11. [ ] Ciclo de vida automatizado (30 dias -> delecao)

## Proximos passos — infraestrutura

1. [ ] Servico systemd para FORGE iniciar no boot (adiado para pos-estabilizacao)
       Arquivos prontos em server/forge.service e scripts/setup-user.sh
       Instrucoes de ativacao em docs/11-convencoes.md
2. [ ] Pagina de configuracao do servidor (/server/config)
       Inclui configuracao dinamica dos discos monitorados pelo I/O
3. [ ] safe-reboot no agent (sync antes de reiniciar)
4. [ ] NUT (Network UPS Tools) para shutdown gracioso automatico via USB do nobreak

## Arquitetura — refatoracao planejada

1. [ ] Inventario e SMART via REST (descarregar WebSocket)
2. [ ] Actions tipadas no agent (substituir sh -c livre)
3. [ ] Autenticacao (antes de ir para campo)

## Dashboard — polimento

- [x] Aba Backup no modal config-deploy (visual completo)
- [x] Anvil fase 2 — migracao de todos os arquivos JS para dom.js
- [x] Anvil fase 2+ — reorganizacao lib/ (anvil/, ui/, utilitarios puros)
- [x] Anvil fase 2+ — element.js e builders.js (buildSummary, buildTable)
- [x] Botao SMART nos modais de Hot Cache e Cold Storage
- [x] Tabela de discos com rows filhas colapsadas e toggle por clique
- [x] Monitor de I/O em tempo real (MB/s, barra de uso por disco)
- [x] Pagina do cliente com abas Informacoes e Terminal
- [x] Terminal PTY interativo via socat + xterm.js + WebSocket dedicado
- [x] Sub-abas de terminal dinamicas por sessao
- [x] Comandos pontuais via HTTP POST (sem race condition do Future)
- [ ] Aba Backup — modo Avancado funcional
- [ ] Aba Backup — modo Minimo
- [ ] Aba Backup — Raw Image
- [ ] Refactor server-storage.js para templates HTML
- [ ] Indicador de progresso por etapa do deploy
- [ ] Aviso visual para disco com sinais de degradacao (SMART)
- [ ] Deteccao de portas do switch via SNMP (CRS326 + IF-MIB)
- [ ] Wake-on-LAN via FORGE dashboard
- [ ] ARP scan + leases dnsmasq para detectar dispositivos ligados nao-Alpine
- [ ] Configuracao dinamica dos discos monitorados pelo I/O (pos /server/config)

## Hardware pendente

- [ ] Segundo SSD SATA (RAID1 hot cache)
- [ ] HDDs Seagate Ironwolf PRO NAS 4TB (cold storage futuro)
- [ ] Upgrade CPU (Ryzen 7 PRO 5750G)
- [x] Intel X520-DA2 + cabos DAC SFP+ — instalado e funcional (10GbE nas duas portas)
- [x] MikroTik CRS326-24G-2S+RM — instalado e configurado

## Testes automatizados

Aguardar estabilizacao da API (pos-deploy completo).

- [ ] Testes de integracao: endpoints REST criticos com pytest + httpx
- [ ] Validacao de JSON do agent: script shell dry-run
- Nao implementar testes unitarios de JS agora — muito acoplado ao DOM

## Deploy customizado (feature futura)

Permitir cadastrar "receitas" de deploy pre-configuradas ao inves de configurar
manualmente maquina a maquina. Util para operacoes em campo com perfis padrao
(ex: "escola basica", "escritorio", "gaming").

## Integracao futura

- [ ] ERP para lojas de informatica (alias por cliente, historico por MAC)
- [ ] API REST para integracao com ERP externo (autenticacao, webhooks)
- [ ] Multi-switch (operacao em campo, 20-30 maquinas simultaneas)