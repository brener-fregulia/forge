#!/bin/sh

spindown_hdds() {
    for dev in $(lsblk -b -n -d -o NAME,ROTA | awk '$2=="1"{print $1}'); do
        hdparm -y /dev/$dev > /dev/null 2>&1
    done
}

post_inventory_maintenance() {
    spindown_hdds
}