#!/bin/bash
PROJECT_ROOT="/opt/forge"
WORK_DIR="$PROJECT_ROOT/build/initramfs-work"
TFTP_DIR="/srv/tftp"
WEBSOCAT_BIN="$PROJECT_ROOT/build/websocat"
AGENT_SCRIPT="$PROJECT_ROOT/agent/forge-agent.sh"
ALPINE_INITRAMFS_BASE="$TFTP_DIR/alpine-initramfs"
ALPINE_MODLOOP="$TFTP_DIR/alpine-modloop"
KERNEL_VERSION="6.18.7-0-lts"
APK_DIR="$PROJECT_ROOT/build"

APKS="lsblk libmount libsmartcols libblkid libncursesw libuuid smartmontools libgcc libstdc++ \
      ntfs-3g ntfs-3g-libs ntfs-3g-progs sgdisk dosfstools wimlib popt fuse3-libs hdparm"