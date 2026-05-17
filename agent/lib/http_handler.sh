#!/bin/sh
LIB="${LIB:-/usr/lib/forge}"

# Lê headers e extrai Content-Length
CONTENT_LENGTH=0
while IFS= read -r line; do
    line=$(printf '%s' "$line" | tr -d '\r')
    [ -z "$line" ] && break
    case "$line" in
        Content-Length:*) CONTENT_LENGTH="${line#*: }" ;;
        content-length:*) CONTENT_LENGTH="${line#*: }" ;;
    esac
done

# Lê body char a char até Content-Length
BODY=""
i=0
while [ "$i" -lt "$CONTENT_LENGTH" ]; do
    c=$(dd bs=1 count=1 2>/dev/null)
    BODY="$BODY$c"
    i=$((i + 1))
done

CMD=$(printf '%s' "$BODY" | awk -F'"command":"' '{
    if (NF < 2) exit
    s = $2; out = ""; i = 1
    while (i <= length(s)) {
        c = substr(s, i, 1)
        if (c == "\\" && i < length(s)) {
            n = substr(s, i+1, 1)
            if (n == "\"") { out = out "\""; i += 2; continue }
            if (n == "\\") { out = out "\\"; i += 2; continue }
            if (n == "n")  { out = out "\n"; i += 2; continue }
            out = out c n; i += 2; continue
        }
        if (c == "\"") break
        out = out c; i++
    }
    print out
}')

[ -z "$CMD" ] && printf 'HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n\r\n{"error":"missing command"}' && exit 1

OUTPUT=$(sh -c "$CMD" 2>&1)
ESC=$(printf '%s' "$OUTPUT" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\t/\\t/g;s/\r/\\r/g;s/\n/\\n/g')
BODY_OUT="{\"output\":\"$ESC\"}"
LEN=$(printf '%s' "$BODY_OUT" | wc -c | tr -d ' ')

printf 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %s\r\n\r\n%s' "$LEN" "$BODY_OUT"