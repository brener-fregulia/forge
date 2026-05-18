#!/bin/sh
# Formata disco alvo conforme SO escolhido
# Uso: format_disk <disk> <os_type>
# os_type: windows | linux | blank

format_disk() {
    DISK="$1"
    OS_TYPE="$2"
    DEV="/dev/$DISK"

    echo "[FORGE] Desmontando partições de $DEV..."
    for mnt in $(mount | grep "^${DEV}" | awk '{print $3}'); do
        umount -l "$mnt" 2>/dev/null || true
    done
    sleep 1

    echo "[FORGE] Formatando $DEV para $OS_TYPE..."

    # Apaga tabela de partições
    sgdisk --zap-all "$DEV"

    case "$OS_TYPE" in
        windows)
            sgdisk -n 1:0:+200M -t 1:EF00 -c 1:"EFI"      "$DEV"
            sgdisk -n 2:0:+16M  -t 2:0C01 -c 2:"MSR"      "$DEV"
            sgdisk -n 3:0:-745M -t 3:0700 -c 3:"Windows"  "$DEV"
            sgdisk -n 4:0:0     -t 4:2700 -c 4:"Recovery" "$DEV"

            sleep 2
            partprobe "$DEV" 2>/dev/null || true
            sleep 1

            mkfs.fat -F32 -n EFI      "${DEV}1"
            mkntfs -f -L Windows      "${DEV}3"
            mkntfs -f -L Recovery     "${DEV}4"
            ;;

        linux)
            sgdisk -n 1:0:+512M -t 1:EF00 -c 1:"EFI"  "$DEV"
            sgdisk -n 2:0:0     -t 2:8300 -c 2:"Root" "$DEV"

            sleep 2
            partprobe "$DEV" 2>/dev/null || true
            sleep 1

            mkfs.fat -F32 -n EFI "${DEV}1"
            mkfs.ext4 -L Root    "${DEV}2"
            ;;

        blank)
            sgdisk -n 1:0:+200M -t 1:EF00 -c 1:"EFI"  "$DEV"
            sgdisk -n 2:0:0     -t 2:0700 -c 2:"Data" "$DEV"

            sleep 2
            partprobe "$DEV" 2>/dev/null || true
            sleep 1

            mkfs.fat -F32 -n EFI  "${DEV}1"
            mkntfs -f -L Data     "${DEV}2"
            ;;

        *)
            echo "[FORGE] ERRO: os_type invalido: $OS_TYPE"
            return 1
            ;;
    esac

    echo "[FORGE] Formatacao concluida: $DEV ($OS_TYPE)"
}

detect_os_type() {
    ISO="$1"
    case "$ISO" in
        *[Ww]in*|*[Ww]indows*) echo "windows" ;;
        *[Ll]inux*|*[Uu]buntu*|*[Dd]ebian*|*[Ff]edora*) echo "linux" ;;
        "") echo "blank" ;;
        *) echo "windows" ;;  # default para ISO desconhecida
    esac
}