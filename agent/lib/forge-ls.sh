#!/bin/sh
# Lista conteudo de uma pasta para o config-deploy
# Uso: forge-ls.sh /tmp/mnt_sda3/Users
DIR="$1"
[ -z "$DIR" ] && exit 1

# Permite apenas paths dentro de /tmp/mnt_*
case "$DIR" in
    /tmp/mnt_*/*)  ;;
    /tmp/mnt_*/)   ;;
    /tmp/mnt_*)    ;;
    *) echo '{"error":"path nao permitido"}' && exit 1 ;;
esac

timeout 5 find "$DIR" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | awk -F'/' '{print "d\t"$NF}'
timeout 5 find "$DIR" -maxdepth 1 -mindepth 1 -type f 2>/dev/null | awk -F'/' '{print "f\t"$NF}'