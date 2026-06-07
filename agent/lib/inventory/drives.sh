#!/bin/sh

inventory_disks() {
    DISKS_TMP=/tmp/forge-disks.tmp
    > $DISKS_TMP

    lsblk -b -n -P -o NAME,SIZE,TYPE,FSTYPE,MODEL,VENDOR 2>/dev/null | while IFS= read -r LINE; do
        NAME=$(echo "$LINE"   | sed -n 's/.*\(^\| \)NAME="\([^"]*\)".*/\2/p')
        SIZE=$(echo "$LINE"   | sed -n 's/.*\(^\| \)SIZE="\([^"]*\)".*/\2/p')
        TYPE=$(echo "$LINE"   | sed -n 's/.*\(^\| \)TYPE="\([^"]*\)".*/\2/p')
        FSTYPE=$(echo "$LINE" | sed -n 's/.*\(^\| \)FSTYPE="\([^"]*\)".*/\2/p')
        MODEL=$(echo "$LINE"  | sed -n 's/.*\(^\| \)MODEL="\([^"]*\)".*/\2/p')
        VENDOR=$(echo "$LINE" | sed -n 's/.*\(^\| \)VENDOR="\([^"]*\)".*/\2/p')
        [ -z "$NAME" ] && continue

        SERIAL=""
        for path in "/sys/class/block/$NAME/device/serial" "/sys/class/block/$NAME/device/wwid"; do
            if [ -r "$path" ]; then
                RAW=$(cat "$path" 2>/dev/null | tr -d '\n')
                if echo "$RAW" | grep -q "^t10\."; then
                    SERIAL=$(echo "$RAW" | awk '{print $NF}')
                else
                    SERIAL="$RAW"
                fi
                [ -n "$SERIAL" ] && break
            fi
        done

        MODEL=$(echo "$MODEL"   | sed 's/^ *//;s/ *$//;s/"/\\"/g')
        VENDOR=$(echo "$VENDOR" | sed 's/^ *//;s/ *$//;s/"/\\"/g')
        SERIAL=$(echo "$SERIAL" | sed 's/^ *//;s/ *$//;s/"/\\"/g')
        [ -z "$SIZE" ] && SIZE=0

        printf '{"name":"%s","size":%s,"type":"%s","fstype":"%s","model":"%s","serial":"%s","vendor":"%s"},' \
            "$NAME" "$SIZE" "$TYPE" "$FSTYPE" "$MODEL" "$SERIAL" "$VENDOR" >> $DISKS_TMP
    done

    DISKS_INNER=$(sed 's/,$//' $DISKS_TMP)
    export DISKS="[$DISKS_INNER]"
}

inventory_smart() {
    SMART_TMP=/tmp/forge-smart.json
    printf '{' > $SMART_TMP
    FIRST=1

    for disk in $(lsblk -b -n -d -o NAME 2>/dev/null); do
        DATA=$(smartctl -H -i -A -j "/dev/$disk" 2>/dev/null)
        [ -z "$DATA" ] && continue
        ESC=$(echo "$DATA" | tr -d '\n' | sed 's/"/\\"/g')
        [ "$FIRST" = "1" ] && FIRST=0 || printf ',' >> $SMART_TMP
        printf '"%s":"%s"' "$disk" "$ESC" >> $SMART_TMP
    done

    printf '}' >> $SMART_TMP
    export SMART_JSON=$(cat $SMART_TMP | tr -d '\n')
}

inventory_users() {
    USERS_JSON="[]"
    USERS_TMP=/tmp/forge-users.tmp
    > $USERS_TMP

    for dev in $(lsblk -b -n -o NAME,FSTYPE | awk '$2=="ntfs"{print $1}' | sed 's/[├└│─ ]//g'); do
        MNT="/tmp/mnt_$dev"
        mkdir -p "$MNT"
        ntfs-3g -o ro,noatime "/dev/$dev" "$MNT" 2>/dev/null || true

        if [ -d "$MNT/Users" ]; then
            for user_dir in "$MNT/Users"/*/; do
                [ -d "$user_dir" ] || continue
                USERNAME=$(basename "$user_dir")
                case "$USERNAME" in
                    "Public"|"Default"|"Default User"|"All Users"|"desktop.ini"|\
                    "Todos os Usuários"|"Usuário Padrão"|"Usuários") continue ;;
                esac
                SIZE_KB=$(du -sk "$user_dir" 2>/dev/null | awk '{print $1}')
                SIZE_BYTES=$((${SIZE_KB:-0} * 1024))
                USERNAME_ESC=$(echo "$USERNAME" | sed 's/"/\\"/g')
                printf '{"device":"%s","username":"%s","size":%s},' \
                    "$dev" "$USERNAME_ESC" "$SIZE_BYTES" >> $USERS_TMP
            done
        fi
    done

    USERS_INNER=$(sed 's/,$//' $USERS_TMP)
    export USERS_JSON="[$USERS_INNER]"
}

inventory_drive_letters() {
    LETTERS_TMP=/tmp/forge-letters.tmp
    > $LETTERS_TMP

    NEXT_LETTER=68

    for dev in $(lsblk -b -n -o NAME,FSTYPE | awk '$2=="ntfs"{print $1}' | sed 's/[├└│─ ]//g'); do
        SIZE=$(lsblk -b -n -o SIZE /dev/$dev 2>/dev/null | tr -d ' ')
        [ "${SIZE:-0}" -lt 2147483648 ] && continue

        LABEL=$(ntfslabel /dev/$dev 2>/dev/null | tr -d '\n' | sed 's/"/\\"/g')

        MNT="/tmp/mnt_$dev"
        mkdir -p "$MNT"
        ntfs-3g -o ro,noatime "/dev/$dev" "$MNT" 2>/dev/null || true

        # Espaço livre em bytes via df (aproveita montagem já feita)
        FREE_KB=$(df -k "$MNT" 2>/dev/null | awk 'NR==2{print $4}')
        FREE_BYTES=$((${FREE_KB:-0} * 1024))

        if [ -f "$MNT/Windows/System32/winload.efi" ] || [ -f "$MNT/Windows/System32/winload.exe" ]; then
            LETTER="C"
        else
            LETTER=$(printf "\\$(printf '%03o' $NEXT_LETTER)")
            NEXT_LETTER=$((NEXT_LETTER + 1))
        fi

        printf '{"device":"%s","letter":"%s","label":"%s","free_bytes":%s},' \
            "$dev" "$LETTER" "$LABEL" "$FREE_BYTES" >> $LETTERS_TMP
    done

    LETTERS_INNER=$(sed 's/,$//' $LETTERS_TMP)
    export DRIVE_LETTERS="[$LETTERS_INNER]"
}