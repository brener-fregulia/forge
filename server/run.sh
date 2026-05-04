#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8080 \
    --ws-ping-interval 3 \
    --ws-ping-timeout 2 \
    --reload \
    --reload-include "*.html" \
    --reload-include "*.css" \
    --reload-include "*.js" \
    --reload-exclude "*.py"