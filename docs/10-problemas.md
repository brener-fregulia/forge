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