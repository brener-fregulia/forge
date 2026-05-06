# Roadmap

## Proximos passos — pipeline de deploy (em ordem)

1. [ ] Backup seletivo via ntfsclone -> hot cache
2. [ ] Compactacao zstd + replicacao para cold storage
3. [ ] Formatacao e particionamento do disco alvo (sgdisk + mkfs)
4. [ ] Instalacao Windows via wimlib-imagex
5. [ ] Injecao de drivers SDIO
6. [ ] Debloat
7. [ ] Restauracao do backup
8. [ ] Ciclo de vida automatizado (30 dias -> delecao)

## Proximos passos — infraestrutura

1. [ ] Servico systemd para FORGE iniciar no boot
2. [ ] Pagina de configuracao do servidor (/server/config)
3. [ ] safe-reboot no agent (sync antes de reiniciar)
4. [ ] NUT (Network UPS Tools) para shutdown gracioso automatico via USB do nobreak

## Dashboard — polimento

- [ ] Aba Backup no modal config-deploy
- [ ] Console de comandos estilo terminal (prompt + historico)
- [ ] Terminal interativo real (xterm.js) — pos-MVP
- [ ] Indicador de progresso por etapa do deploy
- [ ] Aviso visual para disco com sinais de degradacao (SMART)
- [ ] Deteccao de portas do switch via SNMP (CRS326 + IF-MIB)
- [ ] Wake-on-LAN via FORGE dashboard
- [ ] ARP scan + leases dnsmasq para detectar dispositivos ligados nao-Alpine

## Hardware pendente

- [ ] Segundo SSD SATA (RAID1 hot cache)
- [ ] HDDs Seagate Ironwolf PRO NAS 4TB (cold storage futuro)
- [ ] Upgrade CPU (Ryzen 7 PRO 5750G)
- [ ] Intel X520-DA2 + cabos DAC SFP+ (ja comprado, aguardando chegada)
- [ ] MikroTik CRS326-24G-2S+RM (ja comprado, aguardando chegada)

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
- [ ] Terminal interativo SSH no dashboard (xterm.js) — pos-MVP