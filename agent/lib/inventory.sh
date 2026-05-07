#!/bin/sh
# Coleta inventário de hardware, discos e SMART
# Depende de: json.sh (json_escape)

inventory_hardware() {
    CPU=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | sed 's/^ *//')
    RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    RAM_MB=$((RAM_KB / 1024))
    export CPU RAM_MB
}

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

inventory_drive_letters() {
    LETTERS_TMP=/tmp/forge-letters.tmp
    > $LETTERS_TMP

    NEXT_LETTER=68 # D em ASCII

    for dev in $(lsblk -b -n -o NAME,FSTYPE | awk '$2=="ntfs"{print $1}' | sed 's/[├└│─ ]//g'); do
        SIZE=$(lsblk -b -n -o SIZE /dev/$dev 2>/dev/null | tr -d ' ')
        [ "${SIZE:-0}" -lt 2147483648 ] && continue # ignora partições < 2GB (recovery)

        LABEL=$(ntfslabel /dev/$dev 2>/dev/null | tr -d '\n' | sed 's/"/\\"/g')

        MNT="/tmp/mnt_$dev"
        mkdir -p "$MNT"
        ntfs-3g -o ro,noatime "/dev/$dev" "$MNT" 2>/dev/null || continue

        if [ -f "$MNT/Windows/System32/winload.efi" ] || [ -f "$MNT/Windows/System32/winload.exe" ]; then
            LETTER="C"
        else
            LETTER=$(printf "\\$(printf '%03o' $NEXT_LETTER)")
            NEXT_LETTER=$((NEXT_LETTER + 1))
        fi

        umount "$MNT" 2>/dev/null
        rmdir "$MNT" 2>/dev/null

        printf '{"device":"%s","letter":"%s","label":"%s"},' \
            "$dev" "$LETTER" "$LABEL" >> $LETTERS_TMP
    done

    LETTERS_INNER=$(sed 's/,$//' $LETTERS_TMP)
    export DRIVE_LETTERS="[$LETTERS_INNER]"
}

inventory_spindown_hdds() {
    for dev in $(lsblk -b -n -d -o NAME,ROTA | awk '$2=="1"{print $1}'); do
        hdparm -y /dev/$dev > /dev/null 2>&1
    done
}

inventory_smart() {
    SMART_TMP=/tmp/forge-smart.json
    printf '{' > $SMART_TMP
    FIRST=1

    for disk in $(lsblk -b -n -d -o NAME 2>/dev/null); do
        DATA=$(smartctl -H -A -j "/dev/$disk" 2>/dev/null)
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

    # Para cada partição NTFS detectada
    for dev in $(lsblk -b -n -o NAME,FSTYPE | awk '$2=="ntfs"{print $1}' | sed 's/[├└│─ ]//g'); do
        MNT="/tmp/mnt_$dev"
        mkdir -p "$MNT"

        # Monta a partição NTFS
        ntfs-3g -o ro,noatime "/dev/$dev" "$MNT" 2>/dev/null || continue

        # Verifica se tem pasta Users (Windows)
        if [ -d "$MNT/Users" ]; then
            for user_dir in "$MNT/Users"/*/; do
                [ -d "$user_dir" ] || continue
                USERNAME=$(basename "$user_dir")

                # Ignora pastas de sistema
                case "$USERNAME" in
                    "Public"|"Default"|"Default User"|"All Users"|"desktop.ini"|\
                    "Todos os Usuários"|"Usuário Padrão"|"Usuários") continue ;;
                esac

                # Calcula tamanho da pasta
                SIZE_KB=$(du -sk "$user_dir" 2>/dev/null | awk '{print $1}')
                SIZE_BYTES=$((${SIZE_KB:-0} * 1024))

                USERNAME_ESC=$(echo "$USERNAME" | sed 's/"/\\"/g')
                printf '{"device":"%s","username":"%s","size":%s},' \
                    "$dev" "$USERNAME_ESC" "$SIZE_BYTES" >> $USERS_TMP
            done
        fi

        # Desmonta
        umount "$MNT" 2>/dev/null
        rmdir "$MNT" 2>/dev/null
    done

    USERS_INNER=$(sed 's/,$//' $USERS_TMP)
    export USERS_JSON="[$USERS_INNER]"
}

inventory_gpu() {
    GPU_JSON="[]"
    GPU_TMP=/tmp/forge-gpu.tmp
    > $GPU_TMP

    for dev_path in /sys/bus/pci/devices/*/; do
        CLASS=$(cat "$dev_path/class" 2>/dev/null)
        # Classe 0x03xxxx = display controller
        echo "$CLASS" | grep -qE "^0x03" || continue

        VENDOR_ID=$(cat "$dev_path/vendor" 2>/dev/null | tr -d '\n')
        DEVICE_ID=$(cat "$dev_path/device" 2>/dev/null | tr -d '\n')
        LABEL=$(cat "$dev_path/label" 2>/dev/null | tr -d '\n' | sed 's/"/\\"/g')

        # Resolve vendor name
        case "$VENDOR_ID" in
            0x8086) VENDOR_NAME="Intel" ;;
            0x10de) VENDOR_NAME="NVIDIA" ;;
            0x1002) VENDOR_NAME="AMD" ;;
            *)      VENDOR_NAME="$VENDOR_ID" ;;
        esac

        printf '{"vendor":"%s","vendor_id":"%s","device_id":"%s","label":"%s"},' \
            "$VENDOR_NAME" "$VENDOR_ID" "$DEVICE_ID" "$LABEL" >> $GPU_TMP
    done

    INNER=$(sed 's/,$//' $GPU_TMP)
    export GPU_JSON="[$INNER]"
}

inventory_ram_slots() {
    RAM_SLOTS_JSON="[]"
    RAM_TMP=/tmp/forge-ram.tmp
    > $RAM_TMP

    # Mapeamento de tipo de memória SMBIOS
    mem_type() {
        case "$1" in
            2)  echo "" ;;
            20) echo "DDR" ;;
            21) echo "DDR2" ;;
            24) echo "DDR3" ;;
            26) echo "DDR4" ;;
            27) echo "LPDDR" ;;
            28) echo "LPDDR2" ;;
            29) echo "LPDDR3" ;;
            30) echo "LPDDR4" ;;
            34) echo "DDR5" ;;
            35) echo "LPDDR5" ;;
            *)  echo "Unknown($1)" ;;
        esac
    }

    for entry in /sys/firmware/dmi/entries/17-*/raw; do
        [ -r "$entry" ] || continue
        STRINGS=$(strings "$entry" 2>/dev/null)

        LOCATOR=$(echo "$STRINGS" | sed -n '1p' | sed 's/"/\\"/g')
        BANK=$(echo "$STRINGS"    | sed -n '2p' | sed 's/"/\\"/g')

        # Campos via offset SMBIOS (independente de fabricante)
        SIZE_MB=$(od -An -j12 -N2 -tu2 "$entry" 2>/dev/null | tr -d ' \n')
        TYPE_ID=$(od -An -j18 -N1 -tu1 "$entry" 2>/dev/null | tr -d ' \n')
        SPEED=$(od -An -j21 -N2 -tu2   "$entry" 2>/dev/null | tr -d ' \n')
        WIDTH=$(od -An -j8  -N2 -tu2   "$entry" 2>/dev/null | tr -d ' \n')

        [ -z "$SIZE_MB" ] && SIZE_MB=0
        TYPE=$(mem_type "${TYPE_ID:-0}")
        [ -z "$SPEED" ] && SPEED=0
        [ -z "$WIDTH" ] && WIDTH=0

        # Fabricante e part number só via strings (não tem offset fixo curto)
        MANUFACTURER=$(echo "$STRINGS" | grep -v "^BANK\|^Controller\|^[0-9]*$\|DDR\|MHz\|LPDDR" | sed -n '1p' | sed 's/"/\\"/g')
        PART=$(echo "$STRINGS"         | grep -v "^BANK\|^Controller\|^[0-9]*$\|DDR\|MHz\|LPDDR" | sed -n '2p' | sed 's/"/\\"/g')

        printf '{"locator":"%s","bank":"%s","size_mb":%s,"type":"%s","speed_mts":%s,"width_bits":%s,"manufacturer":"%s","part":"%s"},' \
            "$LOCATOR" "$BANK" "$SIZE_MB" "$TYPE" "$SPEED" "$WIDTH" "$MANUFACTURER" "$PART" >> $RAM_TMP
    done

    INNER=$(sed 's/,$//' $RAM_TMP)
    export RAM_SLOTS_JSON="[$INNER]"
}

inventory_collect_base() {
    inventory_hardware
    inventory_gpu
    inventory_ram_slots
    echo "{\"type\":\"inventory_base\",\"hostname\":\"$HOSTNAME\",\"hardware\":{\"cpu\":\"$CPU\",\"ram_mb\":$RAM_MB,\"iface\":\"$IFACE\",\"gpu\":$GPU_JSON,\"ram_slots\":$RAM_SLOTS_JSON},\"users\":[]}"
}

inventory_collect_disks() {
    inventory_disks
    inventory_smart
    inventory_users
    inventory_drive_letters
    inventory_spindown_hdds
    echo "{\"type\":\"inventory_disks\",\"disks\":$DISKS,\"smart\":$SMART_JSON,\"users\":$USERS_JSON,\"drive_letters\":$DRIVE_LETTERS}"
}