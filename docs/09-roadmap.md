# Roadmap

## Proximos passos - pipeline de deploy (em ordem)

01. [ ] Integrar backup ao botao Executar (raw, minimal, avancado)
02. [ ] Compactacao zstd + replicacao para cold storage
03. [ ] Formatacao e particionamento do disco alvo (sgdisk + mkfs)
04. [ ] Instalacao Windows via wimlib-imagex
05. [ ] Injecao de drivers SDIO
06. [ ] Debloat
07. [ ] Restauracao do backup
08. [ ] Ciclo de vida automatizado (30 dias -> delecao)

## Proximos passos - infraestrutura

1. [ ] Servico systemd para FORGE iniciar no boot (adiado para pos-estabilizacao)
       Arquivos prontos em server/forge.service e scripts/setup-user.sh
       Instrucoes de ativacao em docs/11-convencoes.md
2. [ ] Pagina de configuracao do servidor (/server/config)
       Inclui configuracao dinamica dos discos monitorados pelo I/O
3. [ ] safe-reboot no agent (sync antes de reiniciar)
4. [ ] NUT (Network UPS Tools) para shutdown gracioso automatico via USB do nobreak

## Arquitetura - refatoracao planejada

1. [ ] Inventario e SMART via REST (descarregar WebSocket)
2. [ ] Actions tipadas no agent (substituir sh -c livre)
3. [ ] Autenticacao (antes de ir para campo)

## Dashboard - polimento

- [x] Aba Backup no modal config-deploy (visual completo)
- [x] Anvil fase 2 - migracao de todos os arquivos JS para dom.js
- [x] Anvil fase 2+ - reorganizacao lib/ (anvil/, ui/, utilitarios puros)
- [x] Anvil fase 2+ - element.js e builders.js (buildSummary, buildTable)
- [x] Botao SMART nos modais de Hot Cache e Cold Storage
- [x] Tabela de discos com rows filhas colapsadas e toggle por clique
- [x] Monitor de I/O em tempo real (MB/s, barra de uso por disco, dinamico)
- [x] Pagina do cliente com abas Informacoes e Terminal
- [x] Terminal PTY interativo via socat + xterm.js + WebSocket dedicado
- [x] Sub-abas de terminal dinamicas por sessao
- [x] Comandos REST sincronos direto no agent (porta 8765)
- [x] SNMP no CRS326 - MAC table via snmpwalk, endpoint /api/switch/ports
- [x] DevicePresence - card offline no dashboard para dispositivos detectados via SNMP
- [x] switch_monitor - polling SNMP a cada 5s, switch_port no estado do cliente
- [x] forge_log - logger centralizado por categoria (switch, disk_io, agent, system, error)
- [x] Pagina de logs (/logs) - consoles por categoria com polling a cada 2s
- [x] Botoes de navegacao no header (logs, config)
- [x] Backup Raw Image - ntfsclone -s stream TCP direto ao servidor
- [x] Backup Minimo - tar Users + programs.txt stream TCP
- [x] Backup Avancado - arvore de arquivos interativa via HTTP REST
- [x] TCP receiver no servidor (portas 9100-9199) com manifest.json por job
- [x] Mini-bootstrap no initramfs - atualizacoes sem rebuild
- [ ] Throughput de rede no card do cliente durante backup
- [ ] Indicador de progresso por etapa do deploy
- [ ] Aviso visual para disco com sinais de degradacao (SMART)
- [ ] Wake-on-LAN via FORGE dashboard
- [ ] Refactor server-storage.js para templates HTML

## Hardware pendente

- [ ] Segundo SSD SATA (RAID1 hot cache)
- [ ] HDDs Seagate Ironwolf PRO NAS 4TB (cold storage futuro)
- [ ] Upgrade CPU (Ryzen 7 PRO 5750G)
- [x] Intel X520-DA2 + cabos DAC SFP+ - instalado e funcional (10GbE nas duas portas)
- [x] MikroTik CRS326-24G-2S+RM - instalado e configurado

## Testes automatizados

Aguardar estabilizacao da API (pos-deploy completo).

- [ ] Testes de integracao: endpoints REST criticos com pytest + httpx
- [ ] Validacao de JSON do agent: script shell dry-run
- Nao implementar testes unitarios de JS agora - muito acoplado ao DOM

## Deploy customizado (feature futura)

Permitir cadastrar "receitas" de deploy pre-configuradas ao inves de configurar
manualmente maquina a maquina. Util para operacoes em campo com perfis padrao
(ex: "escola basica", "escritorio", "gaming").

## Integracao futura

- [ ] ERP para lojas de informatica (alias por cliente, historico por MAC)
- [ ] API REST para integracao com ERP externo (autenticacao, webhooks)
- [ ] Multi-switch (operacao em campo, 20-30 maquinas simultaneas)