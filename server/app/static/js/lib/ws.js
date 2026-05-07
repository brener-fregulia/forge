export function createWS(path, handlers, retryMs = 2000) {
    let ws;

    function connect() {
        ws = new WebSocket(`ws://${location.host}${path}`);
        ws.onopen  = () => console.log(`[FORGE] WS conectado: ${path}`);
        ws.onclose = () => {
            console.log(`[FORGE] WS desconectado: ${path} — reconectando em ${retryMs}ms`);
            setTimeout(connect, retryMs);
        };
        ws.onerror = (e) => console.error(`[FORGE] WS erro: ${path}`, e);
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            handlers[msg.type]?.(msg);
        };
    }

    connect();
    return { close: () => ws?.close() };
}