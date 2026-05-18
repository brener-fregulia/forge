#!/bin/sh
# Backup mínimo — Users selecionados + programs.txt -> tar stream -> servidor TCP

SERVER_IP="${SERVER_IP:-192.168.100.1}"
LIB="${LIB:-/usr/lib/forge}"

# Pastas a copiar dentro de cada usuario
USER_DIRS="Desktop Documents Downloads Pictures Videos Music Favorites AppData/Roaming Meus Documentos"

# Usuarios a ignorar
SKIP_USERS="Public Default 'Default User' 'All Users' 'Todos os Usuários' 'Usuário Padrão' 'Usuário Padrão' desktop.ini"

backup_minimal() {
    DEVICE="$1"   # ex: sda3
    PORT="$2"     # porta TCP no servidor
    MAC="$3"      # MAC do cliente

    MNT="/tmp/mnt_${DEVICE}"
    USERS_DIR="$MNT/Users"
    PROG_FILES="$MNT/Program Files"
    PROG_FILES_X86="$MNT/Program Files (x86)"
    STAGING="/tmp/forge-minimal-$$"

    mkdir -p "$STAGING/C/Users"

    # Copia pastas de cada usuario
    for user_dir in "$USERS_DIR"/*/; do
        USERNAME=$(basename "$user_dir")

        # Pula usuarios do sistema
        case "$USERNAME" in
            "Public"|"Default"|"Default User"|"All Users"|\
            "Todos os Usuários"|"Usuário Padrão"|"desktop.ini") continue ;;
        esac

        mkdir -p "$STAGING/C/Users/$USERNAME"

        for dir in $USER_DIRS; do
            SRC="$user_dir$dir"
            [ -d "$SRC" ] || continue
            # Pula junction points (tamanho 0 com conteudo suspeito)
            [ "$(du -sk "$SRC" 2>/dev/null | awk '{print $1}')" = "0" ] && continue
            cp -r "$SRC" "$STAGING/C/Users/$USERNAME/" 2>/dev/null || true
        done
    done

    # Gera programs.txt
    PROG_TMP="$STAGING/programs.txt"
    echo "=== Program Files ===" > "$PROG_TMP"
    [ -d "$PROG_FILES" ] && ls "$PROG_FILES" >> "$PROG_TMP" 2>/dev/null
    echo "" >> "$PROG_TMP"
    echo "=== Program Files (x86) ===" >> "$PROG_TMP"
    [ -d "$PROG_FILES_X86" ] && ls "$PROG_FILES_X86" >> "$PROG_TMP" 2>/dev/null

    # Stream tar -> TCP
    echo "[FORGE] Enviando backup mínimo para $SERVER_IP:$PORT"
    tar -C "$STAGING" -cf - . | \
        "$LIB/../bin/socat" - "TCP:$SERVER_IP:$PORT"

    # Limpeza
    rm -rf "$STAGING"
    echo "[FORGE] Backup mínimo concluído"
}