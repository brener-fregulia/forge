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

inventory_collect() {
    inventory_hardware
    inventory_disks
    inventory_smart
    echo "{\"type\":\"inventory\",\"hostname\":\"$HOSTNAME\",\"hardware\":{\"cpu\":\"$CPU\",\"ram_mb\":$RAM_MB,\"iface\":\"$IFACE\"},\"disks\":$DISKS,\"smart\":$SMART_JSON,\"users\":[]}"
}