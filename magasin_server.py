#!/usr/bin/env python3
"""Static files + magasin comments/bookings. No ForceX writes. No invented times."""
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import threading
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(os.environ.get("DIRIGENT_ROOT") or Path(__file__).resolve().parent)
PUBLIC = ROOT / "public"
HOST = os.environ.get("DIRIGENT_HOST") or "0.0.0.0"
PORT = int(os.environ.get("DIRIGENT_PORT") or "8765")
STOCK = timezone(timedelta(hours=2))
TENANT_FILE = ROOT / "tenant.json"


def tenant() -> dict:
    """White-label config. Missing file = cluster defaults. Never invents data."""
    try:
        data = json.loads(TENANT_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}

def mag_files() -> dict:
    """Magazine id -> queue file. Tenant may declare its own desks."""
    mags = tenant().get("magazines")
    out = {}
    if isinstance(mags, list):
        for m in mags:
            if isinstance(m, dict) and m.get("id") and m.get("queue_file"):
                out[str(m["id"])] = PUBLIC / str(m["queue_file"])
    if out:
        return out
    return {
        "william": PUBLIC / "william-magasin.json",
        "daniel": PUBLIC / "magasin.json",
        "leads": PUBLIC / "leads-magasin.json",
    }


MAG_FILES = mag_files()
QUEUE = PUBLIC / "pending-forcex-comments.json"
BOKA_Q = PUBLIC / "pending-boka.json"
LUCKOR = PUBLIC / "luckor.json"
LOCK = threading.Lock()

PHRASE_SUBS = (
    (re.compile(r"\binget svar\b", re.I), "No answer"),
    (re.compile(r"\bfel nummer\b", re.I), "Wrong number"),
    (re.compile(r"\bröstbrevlåda\b", re.I), "Voicemail"),
    (re.compile(r"\bvoicemail\b", re.I), "Voicemail"),
    (re.compile(r"\båterkom\b", re.I), "Call back"),
    (re.compile(r"\baterkom\b", re.I), "Call back"),
    (re.compile(r"\bring senare\b", re.I), "Call later"),
    (re.compile(r"\bupptagen\b", re.I), "Busy"),
    (re.compile(r"\bbokat\b", re.I), "Meeting booked"),
    (re.compile(r"\bNA\b", re.I), "No answer"),
    (re.compile(r"\bVM\b", re.I), "Voicemail"),
)
DAY_SUBS = (
    (re.compile(r"\bONS\b", re.I), "Wed"),
    (re.compile(r"\bTIS\b", re.I), "Tue"),
    (re.compile(r"\bTOR\b", re.I), "Thu"),
    (re.compile(r"\bFRE\b", re.I), "Fri"),
    (re.compile(r"\bLÖR\b", re.I), "Sat"),
    (re.compile(r"\bLOR\b", re.I), "Sat"),
    (re.compile(r"\bSÖN\b", re.I), "Sun"),
    (re.compile(r"\bSON\b", re.I), "Sun"),
    (re.compile(r"\bMÅN\b", re.I), "Mon"),
    (re.compile(r"\bMAN\b", re.I), "Mon"),
)
DOW = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"]


def utc_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def to_english(text: str, park: str | None) -> str:
    raw = (text or "").strip()
    if not raw:
        if park == "NA":
            return "No answer"
        if park == "VM":
            return "Voicemail"
        if park == "RECOVERY":
            return "Recovery"
        return ""
    out = raw
    for rx, repl in PHRASE_SUBS:
        out = rx.sub(repl, out)
    for rx, repl in DAY_SUBS:
        out = rx.sub(repl, out)
    return re.sub(r"\s+", " ", out).strip()


def parse_tid(dag: str, tid: str) -> dict | None:
    dag = (dag or "").strip()
    tid = (tid or "").strip().replace(".", ":", 1)
    tid = __import__("re").sub(r"(?i)\s*(am|pm)\s*$", "", tid).strip()
    if not tid:
        return None
    if not dag:
        dag = datetime.now(STOCK).date().isoformat()
    try:
        hh, mm = tid.split(":")
        when = datetime.fromisoformat(dag).replace(
            hour=int(hh), minute=int(mm), second=0, microsecond=0, tzinfo=STOCK
        )
    except (ValueError, TypeError):
        return None
    label_short = "%s %s" % (DOW[when.weekday()], when.strftime("%H:%M"))
    label_crm = "%s %s" % (DOW[when.weekday()], when.strftime("%d %b %H:%M"))
    return {
        "when": when,
        "lucka": label_short,
        "crm": label_crm,
        "iso": when.isoformat(),
        "dag": dag,
        "tid": when.strftime("%H:%M"),
    }


def crm_comment(text: str, park: str | None, booked: dict | None) -> str:
    base = to_english(text, park)
    if booked:
        bit = (("Call back " if park in ("NA", "VM") else "Booked ") + booked["crm"])
        if base:
            if bit.lower() in base.lower():
                return base
            return base.rstrip(".") + ". " + bit + "."
        return bit + "."
    return base


def atomic_write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", dir=str(path.parent), suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def load_mag(magasin: str) -> tuple[Path, dict]:
    path = MAG_FILES[magasin]
    if not path.exists():
        data = {"rows": []}
        if magasin == "daniel":
            atomic_write_json(path, data)
        return path, data
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        data = {"rows": []}
    if not isinstance(data, dict):
        data = {"rows": []}
    if not isinstance(data.get("rows"), list):
        data["rows"] = []
    return path, data


def append_json_list(path: Path, item: dict) -> None:
    items: list = []
    if path.exists():
        try:
            loaded = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(loaded, list):
                items = loaded
        except json.JSONDecodeError:
            items = []
    items.append(item)
    atomic_write_json(path, items)



def skip_names() -> tuple:
    """Names the pilot has excluded. Lives outside git — never hardcoded here."""
    q = tenant().get("queue")
    if isinstance(q, dict) and isinstance(q.get("skip_names"), list):
        return tuple(str(x).strip().lower() for x in q["skip_names"] if str(x).strip())
    local = ROOT / "skip-names.local.json"
    try:
        data = json.loads(local.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ()
    if isinstance(data, list):
        return tuple(str(x).strip().lower() for x in data if str(x).strip())
    return ()


def queue_csv() -> Path:
    q = tenant().get("queue")
    if isinstance(q, dict) and q.get("csv"):
        return Path(str(q["csv"]))
    return Path(os.environ.get("DIRIGENT_QUEUE_CSV") or (ROOT.parent / "crm-followup-queue.csv"))


def skip_owners(magasin: str) -> tuple:
    """Owners whose cards must not be worked in this magazine. Config, not code."""
    mags = tenant().get("magazines")
    if isinstance(mags, list):
        for m in mags:
            if isinstance(m, dict) and str(m.get("id")) == magasin:
                own = m.get("not_owned_by")
                if isinstance(own, list):
                    return tuple(str(x).strip() for x in own if str(x).strip())
    local = ROOT / "skip-owners.local.json"
    try:
        data = json.loads(local.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ()
    if isinstance(data, dict) and isinstance(data.get(magasin), list):
        return tuple(str(x).strip() for x in data[magasin] if str(x).strip())
    return ()


SKIP_NAMES = skip_names()
QUEUE_CSV = queue_csv()


def has_time_comment(row: dict) -> bool:
    c = str(row.get("card_comment") or "").strip()
    return bool(c) and bool(re.search(r"\d", c))


def has_calendar(row: dict) -> bool:
    if str(row.get("avtalad_tid") or "").strip():
        return True
    return bool(re.search(r"\d", str(row.get("lucka") or "")))


def both_confirmed(row: dict) -> bool:
    return has_time_comment(row) and has_calendar(row)


def norm_tel(raw: str) -> str:
    s = re.sub(r"\D", "", raw or "")
    if s.startswith("46") and len(s) >= 10:
        return "+" + s
    if s.startswith("0") and len(s) >= 8:
        return "+46" + s[1:]
    if len(s) >= 8:
        return "+" + s
    return ""


def row_key(r: dict) -> str:
    kid = str(r.get("id") or "").strip()
    namn = str(r.get("namn") or "").strip().lower()
    tel = norm_tel(str(r.get("telefon") or ""))
    if tel and namn:
        return "n:" + namn + "|" + tel
    if tel:
        return "t:" + tel
    if namn:
        return "n:" + namn
    return "i:" + kid


def collapse_rows(rows: list) -> list:
    out = []
    seen = {}
    for r in rows:
        if not isinstance(r, dict):
            continue
        k = row_key(r)
        if k in seen:
            prev = out[seen[k]]
            if (not prev.get("brand") or prev.get("brand") == "saknas") and r.get("brand") and r.get("brand") != "saknas":
                prev["brand"] = r["brand"]
            if prev.get("saldo") in (None, "") and r.get("saldo") not in (None, ""):
                prev["saldo"] = r.get("saldo")
            lc = str(r.get("last_contact") or r.get("card_comment_at") or "")
            pl = str(prev.get("last_contact") or prev.get("card_comment_at") or "")
            if lc > pl:
                prev["last_contact"] = lc
            continue
        seen[k] = len(out)
        out.append(r)
    return out


def existing_keys(rows: list) -> set[str]:
    keys = set()
    for r in rows:
        if not isinstance(r, dict):
            continue
        keys.add(str(r.get("id") or "").strip())
        keys.add(str(r.get("namn") or "").strip().lower())
        tel = norm_tel(str(r.get("telefon") or ""))
        if tel:
            keys.add(tel)
    return keys


def next_with_phone(magasin: str, rows: list) -> dict | None:
    if magasin not in MAG_FILES:
        return None
    # RP follow-up CSV is Daniel's customers. Never feed William from it.
    if magasin in ("william", "leads"):
        return None
    if not QUEUE_CSV.exists():
        return None
    keys = existing_keys(rows) | other_booker_keys(magasin)
    try:
        raw = QUEUE_CSV.read_text(encoding="utf-8")
    except OSError:
        return None
    lines = [ln for ln in raw.splitlines() if ln.strip()]
    if len(lines) < 2:
        return None
    import csv
    from io import StringIO
    rdr = csv.DictReader(StringIO("\n".join(lines)), delimiter=";")
    cands = []
    for rec in rdr:
        namn = (rec.get("namn") or "").strip()
        low = namn.lower()
        if any(s in low for s in SKIP_NAMES):
            continue
        namn = re.sub(r"\s+None$", "", namn).strip()
        st = str(rec.get("status") or "").strip().upper()
        if st in ("RECOVERY", "NOT INTEREST", "FLIPPED"):
            continue
        kid = str(rec.get("kund_id") or "").strip()
        tel = norm_tel(rec.get("telefon") or "")
        if not tel or not kid or not namn:
            continue
        if kid in keys or namn.lower() in keys or tel in keys:
            continue
        brand = rec.get("brand") or ""
        north = 0 if re.search(r"north", brand, re.I) else 1
        sen = rec.get("senaste") or rec.get("last_comment") or ""
        cands.append((north, sen or "9999", kid, namn, tel, brand))
    if not cands:
        return None
    cands.sort(key=lambda x: (x[0], x[1]))
    _n, _senaste, kid, namn, tel, brand = cands[0]
    return {
        "id": kid,
        "namn": namn,
        "telefon": tel,
        "lucka": "",
        "brand": brand or "saknas",
        "status": "",
        "card_comment": "",
        "card_comment_at": "",
        "pending_forcex": False,
        "avtalad": False,
        "saldo": None,
    }



def other_booker_keys(magasin: str) -> set[str]:
    others = []
    if magasin == "william":
        others = ["daniel", "leads"]
    elif magasin == "daniel":
        others = ["william", "leads"]
    elif magasin == "leads":
        others = ["daniel", "william"]
    keys = set()
    for other in others:
        path = MAG_FILES.get(other)
        if path and path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                data = {"rows": []}
            for r in data.get("rows") or []:
                if not isinstance(r, dict):
                    continue
                keys.add(str(r.get("id") or "").strip())
                keys.add(str(r.get("namn") or "").strip().lower())
                tel = norm_tel(str(r.get("telefon") or ""))
                if tel:
                    keys.add(tel)
    if magasin == "william":
        for sticky_name in sticky_files("william"):
            sticky = PUBLIC / sticky_name
            if sticky.exists():
                try:
                    extra = json.loads(sticky.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    extra = []
                if isinstance(extra, list):
                    for x in extra:
                        keys.add(str(x).strip())
    return keys


def sticky_files(magasin: str) -> tuple:
    """Extra id lists that must never enter this magazine. Files stay local."""
    mags = tenant().get("magazines")
    if isinstance(mags, list):
        for m in mags:
            if isinstance(m, dict) and str(m.get("id")) == magasin:
                sticky = m.get("sticky_files")
                if isinstance(sticky, list):
                    return tuple(str(x) for x in sticky if str(x).strip())
    local = ROOT / "sticky-files.local.json"
    try:
        data = json.loads(local.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ()
    if isinstance(data, dict) and isinstance(data.get(magasin), list):
        return tuple(str(x) for x in data[magasin] if str(x).strip())
    return ()


def row_on_other(magasin: str, row: dict) -> bool:
    keys = other_booker_keys(magasin)
    if not keys:
        return False
    if str(row.get("id") or "").strip() in keys:
        return True
    if str(row.get("namn") or "").strip().lower() in keys:
        return True
    tel = norm_tel(str(row.get("telefon") or ""))
    return bool(tel and tel in keys)


def status_from_park(park: str | None, booked: dict | None) -> str | None:
    p = (park or "").upper()
    if p in ("NA", "VM"):
        return "No answer"
    if p == "RECOVERY":
        return "RECOVERY"
    if booked:
        return "CALL BACK"
    return None


def apply_tid(row: dict, booked: dict | None, park: str | None) -> None:
    st = status_from_park(park, booked)
    if booked:
        row["lucka"] = booked["lucka"]
        row["avtalad"] = True
        row["avtalad_tid"] = booked["iso"]
        row["avtalad_dag"] = booked["dag"]
        if st:
            row["status"] = st
    else:
        if st:
            row["status"] = st
        if park:
            row["lucka"] = ""
        # empty callback: calendar avtalad_tid stays so follow-up cannot steal it


def collide(rows: list, row_id: str, lucka: str) -> bool:
    if not lucka:
        return False
    for r in rows:
        if not isinstance(r, dict):
            continue
        if str(r.get("id")) == row_id:
            continue
        if str(r.get("lucka") or "") == lucka:
            return True
    return False


def read_body(handler) -> dict | None:
    try:
        length = int(handler.headers.get("Content-Length") or "0")
    except ValueError:
        return None
    raw = handler.rfile.read(length) if length > 0 else b""
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    return payload


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s %s\n" % (self.address_string(), (fmt % args)))

    def _json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/luckor":
            qs = parse_qs(parsed.query)
            magasin = (qs.get("magasin") or [""])[0]
            slots = []
            if LUCKOR.exists() and magasin in MAG_FILES:
                try:
                    data = json.loads(LUCKOR.read_text(encoding="utf-8"))
                    slots = data.get(magasin) or []
                except json.JSONDecodeError:
                    slots = []
            self._json(200, {"ok": True, "slots": slots})
            return
        super().do_GET()

    def _save_row(self, magasin: str, row_id: str, text: str, park: str | None, dag: str, tid: str, require_comment: bool):
        booked = parse_tid(dag, tid)
        if tid and booked is None:
            self._json(400, {"ok": False, "fel": "saknar giltig tid"})
            return
        english = crm_comment(text, park, booked)
        if require_comment and not english:
            self._json(400, {"ok": False, "fel": "saknar kommentar"})
            return
        if not english and booked:
            english = crm_comment("", park, booked)
        at = utc_now()
        with LOCK:
            path_json, data = load_mag(magasin)
            rows = data["rows"]
            idx = next(
                (i for i, r in enumerate(rows) if isinstance(r, dict) and str(r.get("id")) == row_id),
                -1,
            )
            if idx < 0:
                self._json(404, {"ok": False, "fel": "saknar rad"})
                return
            row = rows[idx]
            if magasin == "william" and row_on_other(magasin, row):
                self._json(409, {"ok": False, "fel": "inte Daniels kund på William"})
                return
            if magasin == "william":
                who = " ".join(str(row.get(k) or "") for k in ("assigned_to", "namn", "kalla"))
                blocked = skip_owners("william")
                if blocked and re.search("|".join(re.escape(b) for b in blocked), who, re.I):
                    self._json(409, {"ok": False, "fel": "annan bokares kund"})
                    return
            if magasin == "leads" and row_on_other(magasin, row):
                self._json(409, {"ok": False, "fel": "inte kundkö på leads"})
                return
            if booked and collide(rows, row_id, booked["lucka"]):
                self._json(409, {"ok": False, "fel": "avtalad tid upptagen"})
                return
            same = bool(english) and str(row.get("card_comment") or "").strip() == english
            if english and not same:
                row["card_comment"] = english
                row["card_comment_at"] = at
                row["pending_forcex"] = True
            if park in ("NA", "VM", "RECOVERY") or booked:
                if park in ("NA", "VM"):
                    row["last_contact"] = at
                    row["status"] = "No answer"
                    apply_tid(row, booked, park)
                elif park == "RECOVERY":
                    row["last_contact"] = at
                    row["status"] = "RECOVERY"
                else:
                    apply_tid(row, booked, park)
                gone = rows.pop(idx)
                nxt = next_with_phone(magasin, rows)
                if nxt and row_key(nxt) != row_key(gone):
                    rows.append(nxt)
                data["rows"] = collapse_rows(rows)
            else:
                data["rows"] = collapse_rows(rows)
            atomic_write_json(path_json, data)
            if english and not same:
                append_json_list(
                    QUEUE,
                    {
                        "id": row_id,
                        "namn": row.get("namn") or "",
                        "text": english,
                        "magasin": magasin,
                        "at": at,
                    },
                )
            if booked:
                append_json_list(
                    BOKA_Q,
                    {
                        "id": row_id,
                        "magasin": magasin,
                        "iso": booked["iso"],
                        "lucka": booked["lucka"],
                        "at": at,
                    },
                )
        self._json(
            200,
            {
                "ok": True,
                "card_comment": english,
                "lucka": row.get("lucka") or "",
            },
        )

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        payload = read_body(self)
        if payload is None:
            self._json(400, {"ok": False})
            return
        magasin = str(payload.get("magasin") or "").strip()
        row_id = str(payload.get("id") or "").strip()
        text = "" if payload.get("text") is None else str(payload.get("text"))
        dag = "" if payload.get("dag") is None else str(payload.get("dag"))
        tid = "" if payload.get("tid") is None else str(payload.get("tid"))
        park = payload.get("park")
        if park in ("", None):
            park = None
        else:
            park = str(park).strip().upper()
            if park not in ("NA", "VM", "RECOVERY"):
                self._json(400, {"ok": False})
                return
        if magasin not in MAG_FILES or not row_id:
            self._json(400, {"ok": False})
            return
        if path == "/api/kommentar":
            self._save_row(magasin, row_id, text, park, dag, tid, require_comment=not bool(tid or park))
            return
        if path == "/api/boka":
            self._save_row(magasin, row_id, text, park, dag, tid, require_comment=False)
            return
        self._json(404, {"ok": False})


def main() -> None:
    os.chdir(PUBLIC)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print("magasin_server %s:%s serving %s" % (HOST, PORT, PUBLIC), flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
