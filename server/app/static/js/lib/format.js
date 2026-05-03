// Utilitários de formatação

export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0, n = Number(bytes);
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2) + " " + units[i];
}