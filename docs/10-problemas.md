# Problemas Resolvidos

| Problema | Causa | Solucao |
|---|---|---|
| Dell UEFI nao bootava pxelinux | pxelinux e BIOS-only | Migrar para iPXE com ipxe.efi |
| Alpine nao carregava modulos nvme/ahci | modloop nao monta via rede | Embutir modulos no initramfs |
| switch_root falha (recovery shell) | Sysroot vazio em modo netboot | Iniciar agent antes via setsid |
| lsblk nao retornava discos | Sem sd_mod no initramfs | Embutir drivers scsi/ e block/ |
| lsblk nao existia no busybox | Limitacao do busybox | Extrair lsblk Alpine + libs musl |
| smartctl falhava por libs | C++ runtime ausente | Adicionar libstdc++ e libgcc Alpine |
| JSON invalido com aspas em comandos | Regex sed nao trata escape | Parser awk com state machine |
| disks chegava vazio no servidor | Variavel em subshell perdida | Escrever em arquivo temp /tmp/forge-disks.tmp |
| Cliente alive mesmo desligado | TCP sem heartbeat | uvicorn --ws-ping-interval 3 --ws-ping-timeout 2 |
| Modelo do disco misturado com fstype | awk separando por espaco | Usar lsblk -P com parser chave=valor |
| Serial do disco vazio via lsblk | SSD barato nao expoe serial | Ler /sys/class/block/*/device/wwid |
| Raiz NVMe em 82% | ISOs de 12GB na raiz | Mover ISOs para /home/isos com symlink |
| ntfs-3g nao disponivel no initramfs | Nao incluido no build | Extrair pacote Alpine + libs e embutir |
| Usuarios nao detectados | lsblk retornava caracteres de arvore no nome | sed para remover caracteres especiais |
| Discos trocam de nome entre boots | Kernel detecta em ordem variavel | Identificar por label /dev/disk/by-label/forge-* |
| RAID muda de nome entre boots | Mesmo motivo | Mesma solucao por label |
| smartctl retorna exit code != 0 com dados validos | Flags SMART no exit code | Usar subprocess.run ao inves de check_output |
| Card do cliente some periodicamente | Watchdog do agent muito agressivo | Watchdog 60s + ping-interval 3s no websocat |
| inventory_base chegava antes do WS estar pronto | Race condition na conexao | sleep 1 antes de enviar inventario base |
| Hardware nao aparecia apos reload do servidor | Segunda mensagem sobrescrevia hardware com None | Checar hw antes de sobrescrever no _handle_message |
| Reconexao do agent levava ~50s | timeout externo interferindo com ping/pong | Remover timeout externo, confiar no ping-interval/ping-timeout |
| Switch LS1008G adicionava 20-30s de delay no boot | STP (Spanning Tree) habilitado por padrao | Aguardar CRS326 com suporte a PortFast |
| inventory_base perdido no snapshot apos reload | browser reconectava antes do agent | Nao limpar grid no snapshot vazio |
| Log limpava ao reconectar | snapshot sobrescrevia log_tail inteiro | Comparar conteudo antes de sobrescrever |
| Watchdog matava websocat sem razao | Servidor nao respondia apos inventario | Servidor envia ack apos inventory_base, inventory_disks e status |
| drive_letters vazio no frontend | Cliente conectava antes do fix do state.py | Reiniciar servidor e cliente apos adicionar campo |
| Particoes NTFS montadas duas vezes | inventory_users rodava antes de inventory_drive_letters | Inverter ordem: drive_letters primeiro, users reutiliza mount |
| find travava em arquivos especiais Windows | hiberfil.sys e pagefile.sys bloqueavam | Adicionar timeout 5 no forge-ls.sh |
| command/exec sempre retornava vazio | command_output chegava antes do Future ser aguardado | Migrar resultado de comandos para HTTP POST /command/result |
| Log nao atualizava apos comando | Comparacao de textContent impedia update do DOM | Remover comparacao em updateLog |
| PXE boot falhava no MikroTik CRS326 com dnsmasq TFTP | Chip 98DX3236 descartava pacotes com blksize negociado | tftpd-hpa com -r blksize resolve blksize, mas nao o problema todo |
| Cliente UEFI nao ACKava OACK do servidor TFTP | MAC do cliente marcado como External no bridge do CRS326 com hw=yes | Setar hw=no em todas as portas do bridge |
| TFTP com checksum invalido | Intel X520 com tx-checksumming ativo no bond | ethtool -K bond0 tx-checksumming off via forge-offload.service |
| tftpd-hpa parava apos 1 bloco de dados | Cliente pedia windowsize 4 e servidor nao implementa RFC 7440 | Usar dnsmasq TFTP nativo |
| iPXE carregava mas vmlinuz dava Connection Reset | dhcp no boot.ipxe causava loop | Compilar iPXE com script embutido (EMBED=) |
| Alpine bootava mas /sbin/init not found | initramfs sem modloop montado | Embutir modulos de kernel no initramfs |
| forge-agent nao subia automaticamente | OpenRC em netboot tem ordering quirks | Injetar agent no /init do Alpine via patch Python |
| PXE-E99 Unexpected network error com ipxe.efi | ipxe.efi usa drivers proprios incompativeis com chip 98DX3236 | Usar snponly.efi (SNP — driver do firmware UEFI) |
| allow-fast-path=no no CRS326 nao resolvia descarte de pacotes | hw=yes nas portas ainda causava problema | hw=no em todas as portas e bridge e obrigatorio |
| bond 802.3ad causava delay no PXE boot | LACP precisava negociar antes do link subir | Usar active-backup no bond (sem LACP) |
| snponly.efi travava intermitentemente ao carregar vmlinuz+initramfs | snponly.efi compartilha memoria com firmware UEFI, sem imgmem disponivel | Migrar de iPXE para grub (grubx64.efi via grub-mkimage) |
| bootstrap.sh retornava bad port vazio | SERVER_PORT nao exportado para o ambiente do Alpine | Hardcodar SERVER_IP e SERVER_PORT no bootstrap.sh |
| bootstrap retornava 403 ao baixar scripts | nginx rodando como www-data sem permissao em /opt/forge/agent | chmod o+rx nos diretorios e o+r nos .sh do agent |
| forge-agent.sh ignorava LIB exportado pelo bootstrap | inventory.sh tinha LIB_INV hardcoded em /usr/lib/forge | Substituir por LIB_INV="${LIB:-/usr/lib/forge}/inventory" |