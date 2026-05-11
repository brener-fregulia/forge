# Roadmap

## Proximos passos — pipeline de deploy (em ordem)

01. [ ] Solucao HTTP para comandos pontuais ao agent (substituir race condition do Future)
02. [ ] Aba Backup — modo Avancado funcional (depende do item acima)
03. [ ] Aba Backup — modo Minimo (lista programas instalados via manifesto)
04. [ ] Aba Backup — Raw Image
05. [ ] Backup seletivo via ntfsclone -> hot cache
06. [ ] Compactacao zstd + replicacao para cold storage
07. [ ] Formatacao e particionamento do disco alvo (sgdisk + mkfs)
08. [ ] Instalacao Windows via wimlib-imagex
09. [ ] Injecao de drivers SDIO
10. [ ] Debloat
11. [ ] Restauracao do backup
12. [ ] Ciclo de vida automatizado (30 dias -> delecao)

## Proximos passos — infraestrutura

1. [ ] Servico systemd para FORGE iniciar no boot (adiado para pos-estabilizacao)
       Arquivos prontos em server/forge.service e scripts/setup-user.sh
       Instrucoes de ativacao em docs/11-convencoes.md
2. [ ] Pagina de configuracao do servidor (/server/config)
3. [ ] safe-reboot no agent (sync antes de reiniciar)
4. [ ] NUT (Network UPS Tools) para shutdown gracioso automatico via USB do nobreak

## Dashboard — polimento

- [x] Aba Backup no modal config-deploy (visual completo)
- [x] Anvil fase 2 — migracao de todos os arquivos JS para dom.js
- [ ] Aba Backup — modo Avancado funcional (race condition command/exec pendente)
- [ ] Aba Backup — modo Minimo (lista programas instalados via manifesto)
- [ ] Aba Backup — Raw Image
- [ ] Refactor server-storage.js para templates HTML
- [ ] Botao SMART no dashboard (hot cache e cold storage)
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
- [x] Intel X520-DA2 + cabos DAC SFP+ — instalado e funcional (10GbE nas duas portas)
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