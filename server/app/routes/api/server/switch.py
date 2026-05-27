"""SNMP - leitura da MAC table do MikroTik CRS326 via snmpwalk."""
import asyncio
from pathlib import Path
from app.config import SWITCH_IP, SWITCH_COMMUNITY
from fastapi import APIRouter

OID_MAC_PORT   = "1.3.6.1.2.1.17.4.3.1.2"
OID_IF_NAME    = "1.3.6.1.2.1.2.2.1.2"
OID_IF_PHYS = "1.3.6.1.2.1.2.2.1.6"

router = APIRouter()


async def _walk(oid: str, suffix_len: int = 1) -> dict:
    proc = await asyncio.create_subprocess_exec(
        "snmpwalk", "-v2c", "-c", SWITCH_COMMUNITY, SWITCH_IP, oid,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    stdout, _ = await proc.communicate()
    result = {}
    for line in stdout.decode().splitlines():
        if "=" not in line:
            continue
        oid_part, _, val_part = line.partition(" = ")
        parts = oid_part.strip().split(".")
        suffix = ".".join(parts[-suffix_len:])
        val = val_part.split(":", 1)[-1].strip().strip('"')
        result[suffix] = val
    return result


async def _get_switch_oui() -> str | None:
    """Retorna o OUI do switch (3 primeiros octetos) via ifPhysAddress."""
    proc = await asyncio.create_subprocess_exec(
        "snmpwalk", "-v2c", "-c", SWITCH_COMMUNITY, SWITCH_IP, OID_IF_PHYS,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    stdout, _ = await proc.communicate()
    for line in stdout.decode().splitlines():
        if "Hex-STRING:" not in line:
            continue
        hex_part = line.split("Hex-STRING:")[-1].strip()
        octets = hex_part.split()
        if len(octets) < 3 or octets == ["00", "00", "00", "00", "00", "00"]:
            continue
        return ":".join(o.lower() for o in octets[:3])
    return None


def _get_server_macs() -> set[str]:
    """Retorna todos os MACs das interfaces do servidor."""
    macs = set()
    for path in Path("/sys/class/net").iterdir():
        addr_file = path / "address"
        try:
            mac = addr_file.read_text().strip()
            if mac and mac != "00:00:00:00:00:00":
                macs.add(mac.lower())
        except Exception:
            pass
    return macs


async def get_mac_port_map() -> dict[str, str]:
    """Retorna {mac: port_name} filtrando MACs do switch e do servidor."""
    if_names_raw, mac_ports_raw, switch_oui = await asyncio.gather(
        _walk(OID_IF_NAME, suffix_len=1),
        _walk(OID_MAC_PORT, suffix_len=6),
        _get_switch_oui(),
    )

    server_macs = _get_server_macs()
    index_to_name = {idx: name for idx, name in if_names_raw.items()}

    mac_to_port: dict[str, str] = {}
    for mac_suffix, port_idx in mac_ports_raw.items():
        octets = mac_suffix.split(".")
        mac = ":".join(f"{int(o):02x}" for o in octets)

        if mac in server_macs:
            continue
        if switch_oui and mac.startswith(switch_oui):
            continue

        port_name = index_to_name.get(port_idx, f"port{port_idx}")
        mac_to_port[mac] = port_name

    return mac_to_port


@router.get("/switch/ports")
async def switch_ports():
    """MAC table do switch - {mac: port_name}."""
    return await get_mac_port_map()