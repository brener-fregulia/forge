#!/bin/sh
# Utilitários JSON

json_escape() {
    # Escapa string para uso seguro em JSON
    echo "$1" | sed 's/\\/\\\\/g;s/"/\\"/g' | tr '\n' ' ' | sed 's/ $//'
}