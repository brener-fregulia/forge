# Storage

## Filosofia

- CPU-heavy no servidor — compressao e processamento pesado no servidor, nao nos clientes
- Hot Cache -> Cold Storage — dois niveis com ciclo de vida automatizado
- Hot cache exclusivo para backups — ISOs e tftp ficam no NVMe

## Fluxo de dados do backup
Cliente (ntfsclone stream via rede)
|
Hot Cache: /mnt/hot  <- backup raw (.img), rapido
|  (zstd -T0 no servidor, em background)
Hot Cache: /mnt/hot  <- backup compactado (.img.zst)
|  (copia para cold)
Cold Storage: /mnt/cold  <- backup compactado de longo prazo
|  (confirmou no cold)
Deleta raw do hot cache (mantem so o .img.zst no hot)
|  (restauracao no cliente confirmada)
Deleta compactado do hot cache
|  (30 dias no cold)
Delecao automatica do cold storage

Restauracao: por padrao descompacta no servidor e envia raw para o cliente.
Para clientes mais rapidos, pode enviar compactado e descompactar localmente (a testar).

## Estrutura de diretorios
/mnt/hot/forge/
hot-cache/<alias>/<MAC>/
backup_<timestamp>.img      <- raw (deletado apos compactacao)
backup_<timestamp>.img.zst  <- compactado (deletado apos restauracao)
/mnt/cold/forge/
cold-storage/<alias>/<MAC>/
backup_<timestamp>.img.zst  <- arquivo de longo prazo
manifest.json               <- inventario, data, hash, status
/srv/                           <- NVMe
isos/ -> /home/isos/          <- symlink (ISOs no /home para economizar raiz)
tftp/                         <- boot PXE
scripts/                      <- scripts de deploy

Identificacao de clientes: raiz por alias (ERP futuro), subpastas por MAC. Standalone usa alias local.

## Ciclo de vida do backup

| Fase | Gatilho | Acao |
|---|---|---|
| Criacao | Inicio do deploy | ntfsclone stream -> /mnt/hot raw |
| Compactacao | Backup raw concluido | zstd -T0 no servidor -> .img.zst no hot |
| Replicacao | Compactacao concluida | Copia .img.zst -> cold storage |
| Limpeza parcial | Confirmou no cold | Deleta raw do hot; mantem .img.zst no hot |
| Limpeza total | Restauracao confirmada | Deleta compactado do hot |
| Expiracao | 30 dias apos restauracao | Deleta do cold storage |

## Configuracao RAID1 cold storage

```bash
# Criado com mdadm — nome pode variar entre boots (md0, md127, etc)
# Identificar sempre pelo label: /dev/disk/by-label/forge-cold
sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sda /dev/sdc

# UUID no fstab
UUID=aac9b533-e808-4b69-b81a-6765824a82fb  /mnt/cold  ext4  defaults,nofail  0  2
UUID=18e473ee-a15e-4815-ae78-34c3fafa1170  /mnt/hot   ext4  defaults,nofail  0  2
```