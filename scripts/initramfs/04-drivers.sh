#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Embutindo módulos ata/nvme"
sudo mkdir -p /mnt/modloop
sudo mount -o loop "$ALPINE_MODLOOP" /mnt/modloop 2>/dev/null || true

mkdir -p "lib/modules/$KERNEL_VERSION/kernel/drivers"
for drv in ata nvme scsi block usb; do
    if [ -d "/mnt/modloop/modules/$KERNEL_VERSION/kernel/drivers/$drv" ]; then
        sudo cp -r "/mnt/modloop/modules/$KERNEL_VERSION/kernel/drivers/$drv" \
                   "lib/modules/$KERNEL_VERSION/kernel/drivers/"
        echo "    drv: $drv"
    fi
done
sudo cp "/mnt/modloop/modules/$KERNEL_VERSION/modules."* \
        "lib/modules/$KERNEL_VERSION/"

sudo umount /mnt/modloop