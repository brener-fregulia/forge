#!/bin/sh

inventory_hardware() {
    CPU=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | sed 's/^ *//')
    RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    RAM_MB=$((RAM_KB / 1024))
    export CPU RAM_MB
}

inventory_gpu() {
    GPU_JSON="[]"
    GPU_TMP=/tmp/forge-gpu.tmp
    > $GPU_TMP

    for dev_path in /sys/bus/pci/devices/*/; do
        CLASS=$(cat "$dev_path/class" 2>/dev/null)
        echo "$CLASS" | grep -qE "^0x03" || continue

        VENDOR_ID=$(cat "$dev_path/vendor" 2>/dev/null | tr -d '\n')
        DEVICE_ID=$(cat "$dev_path/device" 2>/dev/null | tr -d '\n')
        LABEL=$(cat "$dev_path/label" 2>/dev/null | tr -d '\n' | sed 's/"/\\"/g')

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

        SIZE_MB=$(od -An -j12 -N2 -tu2 "$entry" 2>/dev/null | tr -d ' \n')
        TYPE_ID=$(od -An -j18 -N1 -tu1 "$entry" 2>/dev/null | tr -d ' \n')
        SPEED=$(od -An -j21 -N2 -tu2   "$entry" 2>/dev/null | tr -d ' \n')
        WIDTH=$(od -An -j8  -N2 -tu2   "$entry" 2>/dev/null | tr -d ' \n')

        [ -z "$SIZE_MB" ] && SIZE_MB=0
        TYPE=$(mem_type "${TYPE_ID:-0}")
        [ -z "$SPEED" ] && SPEED=0
        [ -z "$WIDTH" ] && WIDTH=0

        MANUFACTURER=$(echo "$STRINGS" | grep -v "^BANK\|^Controller\|^[0-9]*$\|DDR\|MHz\|LPDDR" | sed -n '1p' | sed 's/"/\\"/g')
        PART=$(echo "$STRINGS"         | grep -v "^BANK\|^Controller\|^[0-9]*$\|DDR\|MHz\|LPDDR" | sed -n '2p' | sed 's/"/\\"/g')

        printf '{"locator":"%s","bank":"%s","size_mb":%s,"type":"%s","speed_mts":%s,"width_bits":%s,"manufacturer":"%s","part":"%s"},' \
            "$LOCATOR" "$BANK" "$SIZE_MB" "$TYPE" "$SPEED" "$WIDTH" "$MANUFACTURER" "$PART" >> $RAM_TMP
    done

    INNER=$(sed 's/,$//' $RAM_TMP)
    export RAM_SLOTS_JSON="[$INNER]"
}