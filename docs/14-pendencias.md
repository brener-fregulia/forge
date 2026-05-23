# Pendencias e Bugs Conhecidos

Documento de rastreamento de bugs abertos, melhorias tecnicas e limitacoes conhecidas.
Diferente do roadmap (orientado a features), este documento e orientado a problemas.

---

## Em andamento

### Boot dinâmico por MAC via grub

Objetivo: FORGE controla o proximo boot do cliente sem intervencao humana.

Fluxo planejado:
1. grub.cfg principal sempre serve Alpine (fallback estatico)
2. Durante deploy, servidor gera /srv/tftp/grub/boot/{mac}/grub.cfg com WinPE
3. grub le o MAC via ${net_default_mac}, remove dois pontos via regexp e faz configfile
4. Apos boot WinPE + instalacao Windows, servidor remove o arquivo e proximo boot volta Alpine

Estado atual:
- grub le MAC corretamente (net_default_mac funcionando)
- regexp extrai octetos e monta mac_clean corretamente
- configfile com URL HTTP absoluta nao funciona no grub
- configfile com ($root) nao resolve corretamente em boot HTTP
- Pendente: encontrar sintaxe correta para configfile com path HTTP dinamico no grub

Arquivos envolvidos:
- /srv/tftp/grub/grub.cfg
- /srv/tftp/grub/boot/{mac}/grub.cfg (gerado pelo servidor)
- server/app/routes/api/clients/deploys.py (endpoints /boot/winpe)
- server/app/routes/pages.py (endpoint GET /boot/{mac}/grub.cfg)

---

## Bugs de Funcionalidade

| # | Descricao | Contexto | Prioridade |
|---|---|---|---|
| F01 | Botao Limpar na pagina de logs limpa apenas o HTML — apos o polling os logs voltam a aparecer | /logs | Media |

---

## Bugs Visuais

| # | Descricao | Contexto | Prioridade |
|---|---|---|---|
| V01 | Terminal PTY nao ocupa 100% da div container | /client/{mac} aba Terminal | Media |
| V02 | Tamanho dos terminais nao e dinamico — nao redimensiona ao mudar tamanho da janela | /client/{mac} aba Terminal | Baixa |

---

## Melhorias Tecnicas

| # | Descricao | Contexto | Prioridade |
|---|---|---|---|
| T01 | Testar ntfsclone com blocos maiores (ex: --output-transaction-size) para verificar se velocidade media melhora | backup raw | Media |

---

## Limitacoes Conhecidas

| # | Descricao | Impacto |
|---|---|---|
| L01 | Backup Raw Image nao suporta retomada — se cair, recomeça do zero | Perda de tempo em backups grandes |
| L02 | ntfsclone em modo stream nao e 100% sequencial — faz seeks no disco, limitando throughput a 8-50 MB/s mesmo em SSDs rapidos | Backup raw mais lento que o esperado |
| L03 | Pagina de logs tem buffer de apenas 200 linhas por categoria — logs antigos sao descartados | Perda de historico em sessoes longas |