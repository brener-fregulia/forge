// Wrapper WebSocket com logs de debug

export function createWS(path, handlers) {
    const ws = new WebSocket(`ws://${location.host}${path}`);
    ws.onopen    = () => console.log(`[FORGE] WS conectado: ${path}`);
    ws.onclose   = () => console.log(`[FORGE] WS desconectado: ${path}`);
    ws.onerror   = (e) => console.error(`[FORGE] WS erro: ${path}`, e);
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handlers[msg.type]?.(msg);
    };
    return ws;
}