"""WebSocket - comunicação com o dashboard."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.state import state

router = APIRouter()


@router.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket):
    await websocket.accept()
    state.dashboard_sockets.add(websocket)
    await websocket.send_json({
        "type":    "snapshot",
        "clients": [c.to_summary() for c in state.clients.values()],
        "devices": [d.to_summary() for d in state.devices.values()],
    })
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        state.dashboard_sockets.discard(websocket)