from __future__ import annotations

from typing import Any, Tuple


def parse_yaml(text: str) -> Any:
    lines = [line.rstrip("\n") for line in text.splitlines()]
    parsed, _ = _parse_block(lines, 0, 0)
    return parsed


def _parse_block(lines: list[str], start: int, indent: int) -> Tuple[Any, int]:
    items: list[Any] = []
    mapping: dict[str, Any] = {}
    mode: str | None = None
    index = start

    while index < len(lines):
        line = lines[index]
        if not line.strip() or line.lstrip().startswith("#"):
            index += 1
            continue
        current_indent = len(line) - len(line.lstrip(" "))
        if current_indent < indent:
            break
        if current_indent > indent:
            raise ValueError(f"Invalid indentation at line {index + 1}")
        stripped = line.strip()
        if stripped.startswith("- "):
            if mode is None:
                mode = "list"
            if mode != "list":
                raise ValueError(f"Mixed list/map at line {index + 1}")
            content = stripped[2:].strip()
            if not content:
                child, index = _parse_block(lines, index + 1, indent + 2)
                items.append(child)
                continue
            if ":" in content:
                key, value, has_value = _split_key_value(content)
                if not has_value:
                    child, index = _parse_block(lines, index + 1, indent + 2)
                    items.append({key: child})
                else:
                    items.append({key: _parse_scalar(value)})
                    index += 1
                continue
            items.append(_parse_scalar(content))
            index += 1
            continue
        key, value, has_value = _split_key_value(stripped)
        if mode is None:
            mode = "map"
        if mode != "map":
            raise ValueError(f"Mixed list/map at line {index + 1}")
        if not has_value:
            child, index = _parse_block(lines, index + 1, indent + 2)
            mapping[key] = child
        else:
            mapping[key] = _parse_scalar(value)
            index += 1

    return (items if mode == "list" else mapping), index


def _split_key_value(text: str) -> Tuple[str, str, bool]:
    if ":" not in text:
        raise ValueError(f"Invalid mapping entry: {text}")
    key, remainder = text.split(":", 1)
    key = key.strip()
    value = remainder.strip()
    if value == "":
        return key, "", False
    return key, value, True


def _parse_scalar(value: str) -> Any:
    if value.startswith("[") and value.endswith("]"):
        return _parse_inline_list(value[1:-1])
    if value.startswith("\"") and value.endswith("\""):
        return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    lowered = value.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if value.isdigit() or (value.startswith("-") and value[1:].isdigit()):
        return int(value)
    return value


def _parse_inline_list(raw: str) -> list[Any]:
    if not raw.strip():
        return []
    items: list[Any] = []
    current = ""
    in_quote = False
    quote_char = ""
    for char in raw:
        if char in ("'", '"'):
            if not in_quote:
                in_quote = True
                quote_char = char
            elif quote_char == char:
                in_quote = False
            current += char
            continue
        if char == "," and not in_quote:
            items.append(_parse_scalar(current.strip()))
            current = ""
            continue
        current += char
    if current.strip():
        items.append(_parse_scalar(current.strip()))
    return items
