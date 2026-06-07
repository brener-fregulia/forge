# Pendencias e Bugs Conhecidos

Documento de rastreamento de bugs abertos, melhorias tecnicas e limitacoes conhecidas.
Diferente do roadmap (orientado a features), este documento e orientado a problemas.

---

## Em andamento

### Boot WinPE via grub + wimboot

Objetivo: FORGE inicia WinPE automaticamente no cliente durante o deploy Windows,
sem intervencao humana.

Fluxo planejado:
1. grub.cfg principal sempre serve Alpine (fallback estatico)
2. Durante deploy, servidor gera /srv/tftp/grub/boot/{mac}/grub.cfg com entrada WinPE
3. grub le o MAC via ${net_default_mac}, faz configfile para o arquivo do MAC
4. Config do MAC carrega iPXE + wimboot para servir boot.wim via HTTP
5. Apos instalacao Windows, servidor remove o arquivo e proximo boot volta Alpine

Estado atual:
- grub le MAC corretamente e faz configfile por MAC - funcionando
- Tentativa de chainloader snponly.efi resulta em connection timeout no grub
- snponly.efi descartado para WinPE - mesmo problema de memoria que afetou o Alpine
- Proximo passo: carregar WinPE diretamente via grub (linux + initrd) ou via
  iPXE embutido no grub, usando wimboot para servir boot.wim

Arquivos envolvidos:
- /srv/tftp/grub/grub.cfg
- /srv/tftp/grub/boot/{mac}/grub.cfg (gerado pelo servidor)
- /srv/tftp/wimboot
- /srv/tftp/winpe/boot.wim (~577MB)
- /srv/win11pro/ (ISO Win11 Pro montada em /mnt/iso)
- server/app/routes/api/clients/deploys.py (endpoints /boot/winpe)

---

## Bugs de Funcionalidade

| # | Descricao | Contexto | Prioridade |
|---|---|---|---|
| F01 | Botao Limpar na pagina de logs limpa apenas o HTML - apos o polling os logs voltam a aparecer | /logs | Media |
| F02 | Watchdog de 10s mata o websocat antes do inventario de discos completar em maquinas com multiplas particoes NTFS - cliente reconecta sem inventario de discos/usuarios/drive_letters | agent/lib/websocket.sh | Alta |

---

## Bugs Visuais

| # | Descricao | Contexto | Prioridade |
|---|---|---|---|
| V01 | Terminal PTY nao ocupa 100% da div container | /client/{mac} aba Terminal | Media |
| V02 | Tamanho dos terminais nao e dinamico - nao redimensiona ao mudar tamanho da janela | /client/{mac} aba Terminal | Baixa |

---

## Melhorias Tecnicas

| # | Descricao | Contexto | Prioridade |
|---|---|---|---|
| T01 | Testar ntfsclone com blocos maiores (ex: --output-transaction-size) para verificar se velocidade media melhora | backup raw | Media |
| T02 | Disponibilizar compactacao manual de backup pelo painel do servidor | backup | Baixa |

---

## Limitacoes Conhecidas

| # | Descricao | Impacto |
|---|---|---|
| L01 | Backup Raw Image nao suporta retomada - se cair, recomeça do zero | Perda de tempo em backups grandes |
| L02 | ntfsclone em modo stream nao e 100% sequencial - faz seeks no disco, limitando throughput a 8-50 MB/s mesmo em SSDs rapidos | Backup raw mais lento que o esperado |
| L03 | Pagina de logs tem buffer de apenas 200 linhas por categoria - logs antigos sao descartados | Perda de historico em sessoes longas |
| L04 | Backup Raw Image nao tem suporte a destino cold storage direto - receiver sempre grava em HOT_CACHE_PATH | Workaround manual via nc + sudo bash -c para gravar no cold |