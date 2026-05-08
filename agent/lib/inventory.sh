#!/bin/sh

LIB_INV="/usr/lib/forge/inventory"
. "$LIB_INV/hardware.sh"
. "$LIB_INV/drives.sh"

inventory_collect_base() {
    inventory_hardware
    inventory_gpu
    inventory_ram_slots
    echo "{\"type\":\"inventory_base\",\"hostname\":\"$HOSTNAME\",\"hardware\":{\"cpu\":\"$CPU\",\"ram_mb\":$RAM_MB,\"iface\":\"$IFACE\",\"gpu\":$GPU_JSON,\"ram_slots\":$RAM_SLOTS_JSON},\"users\":[]}"
}

inventory_collect_disks() {
    inventory_drive_letters
    inventory_users
    inventory_smart
    inventory_disks
    echo "{\"type\":\"inventory_disks\",\"disks\":$DISKS,\"smart\":$SMART_JSON,\"users\":$USERS_JSON,\"drive_letters\":$DRIVE_LETTERS}"
}