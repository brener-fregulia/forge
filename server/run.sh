#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8080 \
    --reload \
    --ws-ping-interval 3 \
    --ws-ping-timeout 2