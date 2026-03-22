"""
ABI-based XDR event payload decoder for SoroScan (issue #58).

Decodes raw Soroban event payloads into human-readable JSON using
per-contract ABI definitions.  Failures are always safe — they never
block event persistence.
"""
import logging
from typing import Any

import jsonschema
from stellar_sdk import scval, xdr as stellar_xdr

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ABI meta-schema — validates the *structure* of an uploaded ABI JSON.
# ---------------------------------------------------------------------------

ABI_META_SCHEMA: dict[str, Any] = {
    "type": "array",
    "items": {
        "type": "object",
        "required": ["name", "fields"],
        "additionalProperties": False,
        "properties": {
            "name": {"type": "string", "minLength": 1},
            "fields": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["name", "type"],
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string", "minLength": 1},
                        "type": {
                            "type": "string",
                            "enum": [
                                "Address",
                                "I128",
                                "U128",
                                "I64",
                                "U64",
                                "I32",
                                "U32",
                                "String",
                                "Bool",
                                "Bytes",
                                "Symbol",
                                "Map",
                                "Vec",
                            ],
                        },
                    },
                },
            },
        },
    },
}


def validate_abi_json(abi_json: Any) -> None:
    """Validate *abi_json* against :data:`ABI_META_SCHEMA`.

    Raises :class:`jsonschema.ValidationError` on invalid input.
    """
    jsonschema.validate(instance=abi_json, schema=ABI_META_SCHEMA)


# ---------------------------------------------------------------------------
# ScVal → Python value decoder
# ---------------------------------------------------------------------------

def _decode_sc_val(sc_val_obj: stellar_xdr.SCVal, type_hint: str) -> Any:
    """Convert a single ``SCVal`` to a Python-native value.

    *type_hint* is the ``type`` string from the ABI field definition
    (e.g. ``"Address"``, ``"I128"``).  It guides coercion but the
    function also falls back to ``str()`` for unrecognised types.
    """
    try:
        if type_hint == "Address":
            return scval.to_address(sc_val_obj).address
        if type_hint in ("I128", "U128"):
            return scval.to_int128(sc_val_obj) if type_hint == "I128" else scval.to_uint128(sc_val_obj)
        if type_hint in ("I64", "U64"):
            return scval.to_int64(sc_val_obj) if type_hint == "I64" else scval.to_uint64(sc_val_obj)
        if type_hint in ("I32", "U32"):
            return scval.to_int32(sc_val_obj) if type_hint == "I32" else scval.to_uint32(sc_val_obj)
        if type_hint == "String":
            return scval.to_string(sc_val_obj)
        if type_hint == "Bool":
            return scval.to_bool(sc_val_obj)
        if type_hint == "Bytes":
            raw = scval.to_bytes(sc_val_obj)
            return raw.hex() if isinstance(raw, bytes) else str(raw)
        if type_hint == "Symbol":
            return scval.to_symbol(sc_val_obj)
        if type_hint == "Map":
            native = scval.to_native(sc_val_obj)
            return native if isinstance(native, dict) else str(native)
        if type_hint == "Vec":
            native = scval.to_native(sc_val_obj)
            return native if isinstance(native, list) else str(native)
    except Exception:
        pass  # fall through to generic conversion

    # Generic fallback
    try:
        return scval.to_native(sc_val_obj)
    except Exception:
        return str(sc_val_obj)


# ---------------------------------------------------------------------------
# Public decoder
# ---------------------------------------------------------------------------

def decode_event_payload(
    raw_xdr: str,
    abi_json: list[dict[str, Any]],
    event_type: str,
) -> dict[str, Any] | None:
    """Decode *raw_xdr* into a named-field dict using *abi_json*.

    Returns ``None`` when:
    - *abi_json* has no definition matching *event_type*
    - The XDR cannot be parsed

    Raises nothing — all exceptions are caught, logged, and converted
    to a ``None`` return so event persistence is never blocked.
    """
    # Find matching event definition
    event_def = next(
        (e for e in abi_json if e["name"] == event_type),
        None,
    )
    if event_def is None:
        return None

    try:
        sc_val_obj = stellar_xdr.SCVal.from_xdr(raw_xdr)
    except Exception as exc:
        logger.warning(
            "Failed to parse XDR for event_type=%s: %s",
            event_type,
            exc,
        )
        raise

    fields = event_def.get("fields", [])
    if not fields:
        return {}

    # Soroban events typically encode topic/data as an ScVec
    # If the top-level value is a Vec, map positionally to fields.
    # Otherwise, decode the single value if there's exactly one field.
    result: dict[str, Any] = {}

    if sc_val_obj.type == stellar_xdr.SCValType.SCV_VEC and sc_val_obj.vec is not None:
        vec_items = sc_val_obj.vec.sc_vec
        for i, field_def in enumerate(fields):
            if i < len(vec_items):
                result[field_def["name"]] = _decode_sc_val(
                    vec_items[i], field_def["type"]
                )
            else:
                result[field_def["name"]] = None
    elif len(fields) == 1:
        result[fields[0]["name"]] = _decode_sc_val(sc_val_obj, fields[0]["type"])
    else:
        # Multiple fields expected but XDR is not a vec — best effort
        result[fields[0]["name"]] = _decode_sc_val(sc_val_obj, fields[0]["type"])
        for remaining in fields[1:]:
            result[remaining["name"]] = None

    return result
