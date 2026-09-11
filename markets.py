"""Pitch-fuel market snapshot for magasin. Never invents prices.

Keyless public endpoints by default. Optional env:
  CMC_PRO_API_KEY / COINMARKETCAP_API_KEY — authenticated CMC listings
  MARKETS_REFRESH_SEC — 60–120 (default 90)

FX Strong Buy / Strong Sell uses Investing.com technical-summary language.
Investing.com itself is attempted; when it blocks (CORS/403) we use the
TradingView forex scanner Recommend.All buckets (same Strong Buy/Sell cut).
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

QUOTE_SPECS = (
    {"id": "gold", "symbol": "Gold", "yahoo": "GC=F"},
    {"id": "eth", "symbol": "ETH", "yahoo": "ETH-USD", "coingecko": "ethereum"},
    {"id": "btc", "symbol": "BTC", "yahoo": "BTC-USD", "coingecko": "bitcoin"},
    {"id": "nvda", "symbol": "NVDA", "yahoo": "NVDA"},
    {"id": "pltr", "symbol": "PLTR", "yahoo": "PLTR"},
)

FX_TICKERS = (
    "FX_IDC:EURUSD",
    "FX_IDC:GBPUSD",
    "FX_IDC:USDJPY",
    "FX_IDC:USDCHF",
    "FX_IDC:AUDUSD",
    "FX_IDC:USDCAD",
    "FX_IDC:NZDUSD",
    "FX_IDC:EURJPY",
    "FX_IDC:GBPJPY",
    "FX_IDC:EURGBP",
    "FX_IDC:AUDJPY",
    "FX_IDC:EURAUD",
    "FX_IDC:EURCHF",
    "FX_IDC:GBPAUD",
    "FX_IDC:USDSEK",
    "FX_IDC:EURSEK",
    "FX_IDC:USDNOK",
    "FX_IDC:USDMXN",
    "FX_IDC:EURCAD",
    "FX_IDC:GBPCHF",
)

# Investing.com pair_ID for a few majors (screen_ID=25 technicals).
INVESTING_PAIRS = (
    ("1", "EUR/USD"),
    ("2", "GBP/USD"),
    ("3", "USD/JPY"),
    ("4", "USD/CHF"),
    ("5", "AUD/USD"),
    ("7", "USD/CAD"),
    ("8", "NZD/USD"),
    ("9", "EUR/JPY"),
    ("6", "EUR/GBP"),
)

GAINERS_LIMIT = 5


def refresh_sec() -> int:
    try:
        n = int(os.environ.get("MARKETS_REFRESH_SEC") or "90")
    except ValueError:
        n = 90
    return max(60, min(120, n))


def utc_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def empty_quote(spec: dict) -> dict:
    return {
        "id": spec["id"],
        "symbol": spec["symbol"],
        "price": None,
        "change_pct": None,
        "status": "saknas",
    }


def empty_fx() -> dict:
    return {
        "status": "saknas",
        "source": "",
        "style": "investing.com technical summary",
        "strong_buy": [],
        "strong_sell": [],
    }


def empty_gainers() -> dict:
    return {"status": "saknas", "source": "coinmarketcap", "items": []}


def empty_snapshot() -> dict:
    return {
        "ok": True,
        "label": "pitch fuel · market snapshot",
        "disclaimer": "Inte handelsråd. Inga ordrar.",
        "updated_at": "",
        "stale": True,
        "refresh_sec": refresh_sec(),
        "fx": empty_fx(),
        "quotes": [empty_quote(spec) for spec in QUOTE_SPECS],
        "gainers": empty_gainers(),
    }


def display_pair(name: str) -> str:
    raw = str(name or "").strip()
    letters = re.sub(r"[^A-Za-z]", "", raw).upper()
    if len(letters) == 6:
        return letters[:3] + "/" + letters[3:]
    return raw.upper() if raw else ""


def rating_from_recommend(value: Any) -> str | None:
    """Investing.com-style bucket from TradingView Recommend.All (−1…+1)."""
    if not is_number(value):
        return None
    if value >= 0.5:
        return "Strong Buy"
    if value <= -0.5:
        return "Strong Sell"
    return None


def parse_yahoo_chart(payload: Any) -> dict | None:
    if not isinstance(payload, dict):
        return None
    result = (payload.get("chart") or {}).get("result")
    if not isinstance(result, list) or not result or not isinstance(result[0], dict):
        return None
    meta = result[0].get("meta")
    if not isinstance(meta, dict):
        return None
    price = meta.get("regularMarketPrice")
    if not is_number(price):
        return None
    prev = meta.get("chartPreviousClose")
    if not is_number(prev):
        prev = meta.get("previousClose")
    change_pct = None
    if is_number(prev) and prev != 0:
        change_pct = (float(price) - float(prev)) / float(prev) * 100.0
    return {"price": float(price), "change_pct": change_pct}


def parse_coingecko_simple(payload: Any, coin_id: str) -> dict | None:
    if not isinstance(payload, dict):
        return None
    row = payload.get(coin_id)
    if not isinstance(row, dict):
        return None
    price = row.get("usd")
    if not is_number(price):
        return None
    change = row.get("usd_24h_change")
    return {
        "price": float(price),
        "change_pct": float(change) if is_number(change) else None,
    }


def usd_quote(item: dict) -> dict | None:
    q = item.get("quote")
    if isinstance(q, dict):
        usd = q.get("USD")
        return usd if isinstance(usd, dict) else None
    if isinstance(q, list):
        for row in q:
            if isinstance(row, dict) and str(row.get("symbol") or "").upper() == "USD":
                return row
    return None


def parse_cmc_spotlight(payload: Any, limit: int = GAINERS_LIMIT) -> list[dict] | None:
    if not isinstance(payload, dict):
        return None
    data = payload.get("data")
    if not isinstance(data, dict):
        return None
    gainers = data.get("gainerList")
    if not isinstance(gainers, list):
        return None
    items: list[dict] = []
    for row in gainers:
        if not isinstance(row, dict):
            continue
        symbol = str(row.get("symbol") or "").strip()
        if not symbol:
            continue
        pc = row.get("priceChange") if isinstance(row.get("priceChange"), dict) else {}
        chg = pc.get("priceChange24h")
        if not is_number(chg):
            continue
        items.append(
            {
                "symbol": symbol,
                "name": str(row.get("name") or "").strip(),
                "change_pct": float(chg),
            }
        )
        if len(items) >= limit:
            break
    return items


def parse_cmc_listings(payload: Any, limit: int = GAINERS_LIMIT) -> list[dict] | None:
    if not isinstance(payload, dict):
        return None
    rows = payload.get("data")
    if not isinstance(rows, list):
        return None
    scored: list[tuple[float, dict]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        symbol = str(row.get("symbol") or "").strip()
        if not symbol:
            continue
        usd = usd_quote(row)
        if not usd:
            continue
        chg = usd.get("percent_change_24h")
        if not is_number(chg):
            continue
        scored.append(
            (
                float(chg),
                {
                    "symbol": symbol,
                    "name": str(row.get("name") or "").strip(),
                    "change_pct": float(chg),
                },
            )
        )
    if not scored and rows:
        return []
    if not rows:
        return []
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _chg, item in scored[:limit]]


def parse_investing_screen(payload: Any, pair_label: str) -> dict | None:
    if not isinstance(payload, dict):
        return None
    blocks = payload.get("data")
    if not isinstance(blocks, list):
        return None
    for block in blocks:
        if not isinstance(block, dict):
            continue
        screen = block.get("screen_data")
        if not isinstance(screen, dict):
            continue
        for tech in screen.get("technical_data") or []:
            if not isinstance(tech, dict):
                continue
            if str(tech.get("timeframe") or "") not in ("86400", "86400.0"):
                continue
            main = tech.get("main_summary")
            if not isinstance(main, dict):
                continue
            text = str(main.get("text") or "").strip()
            if text in ("Strong Buy", "Strong Sell"):
                return {"pair": pair_label, "rating": text}
            return None
    return None


def parse_tradingview_forex(payload: Any) -> tuple[list[dict], list[dict]] | None:
    if not isinstance(payload, dict):
        return None
    rows = payload.get("data")
    if not isinstance(rows, list):
        return None
    buy: list[dict] = []
    sell: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        cols = row.get("d")
        if not isinstance(cols, list) or not cols:
            continue
        name = display_pair(str(cols[0] or ""))
        if not name:
            continue
        rec = cols[4] if len(cols) > 4 else None
        rating = rating_from_recommend(rec)
        if rating == "Strong Buy":
            buy.append({"pair": name, "rating": rating})
        elif rating == "Strong Sell":
            sell.append({"pair": name, "rating": rating})
    return buy, sell


def http_bytes(url: str, data: bytes | None = None, headers: dict | None = None, timeout: float = 10.0) -> tuple[int, bytes]:
    hdrs = {"User-Agent": UA, "Accept": "application/json,text/plain,*/*"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs, method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return int(resp.status), resp.read()
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read()
        except Exception:
            body = b""
        return int(exc.code), body
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return 0, b""


def http_json(url: str, payload: Any = None, headers: dict | None = None, timeout: float = 10.0) -> Any | None:
    data = None
    extra = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        extra.setdefault("Content-Type", "application/json")
    code, raw = http_bytes(url, data=data, headers=extra, timeout=timeout)
    if code != 200 or not raw:
        return None
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return parsed


def fetch_yahoo_quote(yahoo_symbol: str) -> dict | None:
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        + urllib.request.quote(yahoo_symbol, safe="=^-")
        + "?interval=1d&range=5d"
    )
    return parse_yahoo_chart(http_json(url))


def fetch_coingecko_quotes() -> dict[str, dict]:
    ids = [spec["coingecko"] for spec in QUOTE_SPECS if spec.get("coingecko")]
    if not ids:
        return {}
    url = (
        "https://api.coingecko.com/api/v3/simple/price?ids="
        + ",".join(ids)
        + "&vs_currencies=usd&include_24hr_change=true"
    )
    payload = http_json(url)
    out: dict[str, dict] = {}
    if not isinstance(payload, dict):
        return out
    for spec in QUOTE_SPECS:
        coin = spec.get("coingecko")
        if not coin:
            continue
        parsed = parse_coingecko_simple(payload, coin)
        if parsed:
            out[spec["id"]] = parsed
    return out


def fetch_quotes() -> list[dict]:
    quotes = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        gecko_f = pool.submit(fetch_coingecko_quotes)
        yahoo_fs = {pool.submit(fetch_yahoo_quote, spec["yahoo"]): spec for spec in QUOTE_SPECS}
        try:
            gecko = gecko_f.result()
        except Exception:
            gecko = {}
        if not isinstance(gecko, dict):
            gecko = {}
        by_id: dict[str, dict | None] = {}
        for fut, spec in yahoo_fs.items():
            try:
                by_id[spec["id"]] = fut.result()
            except Exception:
                by_id[spec["id"]] = None
    for spec in QUOTE_SPECS:
        parsed = by_id.get(spec["id"])
        if parsed is None:
            parsed = gecko.get(spec["id"])
        if parsed is None:
            quotes.append(empty_quote(spec))
            continue
        quotes.append(
            {
                "id": spec["id"],
                "symbol": spec["symbol"],
                "price": parsed["price"],
                "change_pct": parsed.get("change_pct"),
                "status": "ok",
            }
        )
    return quotes


def _investing_url(pair_id: str) -> str:
    return (
        "https://aappapi.investing.com/get_screen.php"
        "?screen_ID=25&pair_ID=%s&lang_ID=1&additionalTimeframes=Yes" % pair_id
    )


def fetch_fx_investing() -> dict | None:
    probe_id, probe_label = INVESTING_PAIRS[0]
    probe = http_json(_investing_url(probe_id), timeout=3.0)
    if probe is None:
        return None
    buy: list[dict] = []
    sell: list[dict] = []
    first = parse_investing_screen(probe, probe_label)
    if first:
        if first["rating"] == "Strong Buy":
            buy.append(first)
        elif first["rating"] == "Strong Sell":
            sell.append(first)
    for pair_id, label in INVESTING_PAIRS[1:]:
        payload = http_json(_investing_url(pair_id), timeout=4.0)
        if payload is None:
            continue
        hit = parse_investing_screen(payload, label)
        if not hit:
            continue
        if hit["rating"] == "Strong Buy":
            buy.append(hit)
        elif hit["rating"] == "Strong Sell":
            sell.append(hit)
    return {
        "status": "ok",
        "source": "investing.com",
        "style": "investing.com technical summary",
        "strong_buy": buy,
        "strong_sell": sell,
    }


def fetch_fx_tradingview() -> dict | None:
    payload = http_json(
        "https://scanner.tradingview.com/forex/scan",
        payload={
            "symbols": {"tickers": list(FX_TICKERS)},
            "columns": ["name", "description", "close", "change", "Recommend.All"],
        },
    )
    parsed = parse_tradingview_forex(payload)
    if parsed is None:
        return None
    buy, sell = parsed
    return {
        "status": "ok",
        "source": "tradingview",
        "style": "investing.com technical summary",
        "strong_buy": buy,
        "strong_sell": sell,
    }


def fetch_fx() -> dict:
    inv = fetch_fx_investing()
    if inv is not None:
        return inv
    tv = fetch_fx_tradingview()
    if tv is not None:
        return tv
    return empty_fx()


def _cmc_key() -> str:
    return (
        os.environ.get("CMC_PRO_API_KEY")
        or os.environ.get("COINMARKETCAP_API_KEY")
        or ""
    ).strip()


def fetch_gainers() -> dict:
    spotlight = parse_cmc_spotlight(
        http_json(
            "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/spotlight"
            "?dataType=2&limit=8&rankRange=100&timeframe=24h"
        )
    )
    if spotlight:
        return {"status": "ok", "source": "coinmarketcap", "items": spotlight}

    headers = {}
    listings_url = (
        "https://pro-api.coinmarketcap.com/public-api/v3/cryptocurrency/listings/latest"
        "?start=1&limit=100&convert=USD"
    )
    key = _cmc_key()
    if key:
        listings_url = (
            "https://pro-api.coinmarketcap.com/v3/cryptocurrency/listings/latest"
            "?start=1&limit=100&convert=USD"
        )
        headers["X-CMC_PRO_API_KEY"] = key
    listings = parse_cmc_listings(http_json(listings_url, headers=headers))
    if listings:
        return {"status": "ok", "source": "coinmarketcap", "items": listings}
    return empty_gainers()


def _section_has_data(section: dict, kind: str) -> bool:
    if kind == "fx":
        return bool(section.get("strong_buy") or section.get("strong_sell"))
    if kind == "gainers":
        return bool(section.get("items"))
    return False


def _keep_or_replace(old: dict, new: dict, kind: str) -> dict:
    if new.get("status") == "ok":
        return new
    if old.get("status") in ("ok", "stale") and _section_has_data(old, kind):
        kept = deepcopy(old)
        kept["status"] = "stale"
        return kept
    return new if new else empty_fx() if kind == "fx" else empty_gainers()


def _keep_or_replace_quotes(old_list: list, new_list: list) -> list:
    old_by_id = {q.get("id"): q for q in old_list if isinstance(q, dict)}
    out = []
    for spec in QUOTE_SPECS:
        fresh = next((q for q in new_list if q.get("id") == spec["id"]), None)
        if fresh and fresh.get("status") == "ok" and is_number(fresh.get("price")):
            out.append(fresh)
            continue
        prev = old_by_id.get(spec["id"])
        if prev and prev.get("status") in ("ok", "stale") and is_number(prev.get("price")):
            kept = deepcopy(prev)
            kept["status"] = "stale"
            out.append(kept)
            continue
        out.append(empty_quote(spec))
    return out


def build_snapshot(fx: dict, quotes: list, gainers: dict, previous: dict | None = None) -> dict:
    prev = previous or empty_snapshot()
    snap = empty_snapshot()
    snap["fx"] = _keep_or_replace(prev.get("fx") or empty_fx(), fx, "fx")
    snap["quotes"] = _keep_or_replace_quotes(prev.get("quotes") or [], quotes)
    snap["gainers"] = _keep_or_replace(prev.get("gainers") or empty_gainers(), gainers, "gainers")
    any_ok = (
        snap["fx"].get("status") == "ok"
        or snap["gainers"].get("status") == "ok"
        or any(q.get("status") == "ok" for q in snap["quotes"])
    )
    any_data = (
        _section_has_data(snap["fx"], "fx")
        or _section_has_data(snap["gainers"], "gainers")
        or any(is_number(q.get("price")) for q in snap["quotes"])
    )
    snap["stale"] = not any_ok and any_data
    if any_ok:
        snap["updated_at"] = utc_now()
        snap["stale"] = any(
            q.get("status") == "stale" for q in snap["quotes"]
        ) or snap["fx"].get("status") == "stale" or snap["gainers"].get("status") == "stale"
    elif any_data and prev.get("updated_at"):
        snap["updated_at"] = prev["updated_at"]
        snap["stale"] = True
    else:
        snap["updated_at"] = ""
        snap["stale"] = True
    return snap


_LOCK = threading.Lock()
_CACHE: dict = empty_snapshot()
_STARTED = False


def refresh_markets() -> dict:
    global _CACHE
    with _LOCK:
        previous = deepcopy(_CACHE)
    fx = empty_fx()
    quotes = [empty_quote(spec) for spec in QUOTE_SPECS]
    gainers = empty_gainers()
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs = {
            pool.submit(fetch_fx): "fx",
            pool.submit(fetch_quotes): "quotes",
            pool.submit(fetch_gainers): "gainers",
        }
        for fut in as_completed(jobs):
            kind = jobs[fut]
            try:
                result = fut.result()
            except Exception:
                continue
            if kind == "fx" and isinstance(result, dict):
                fx = result
            elif kind == "quotes" and isinstance(result, list):
                quotes = result
            elif kind == "gainers" and isinstance(result, dict):
                gainers = result
    snap = build_snapshot(fx, quotes, gainers, previous)
    with _LOCK:
        _CACHE = snap
        return deepcopy(_CACHE)


def get_markets_snapshot(wait_first: bool = True) -> dict:
    with _LOCK:
        current = deepcopy(_CACHE)
        has_fresh = bool(current.get("updated_at"))
    if wait_first and not has_fresh:
        return refresh_markets()
    return current


def _refresh_loop() -> None:
    while True:
        time.sleep(refresh_sec())
        try:
            refresh_markets()
        except Exception:
            pass


def start_markets_refresh() -> None:
    global _STARTED
    with _LOCK:
        if _STARTED:
            return
        _STARTED = True
    threading.Thread(target=refresh_markets, name="markets-warm", daemon=True).start()
    threading.Thread(target=_refresh_loop, name="markets-refresh", daemon=True).start()
