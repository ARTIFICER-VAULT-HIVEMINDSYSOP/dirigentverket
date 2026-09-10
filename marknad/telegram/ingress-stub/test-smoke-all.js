import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
);
const base = `http://127.0.0.1:${config.port}`;

async function waitOk(ms = 4000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server_not_up");
}

async function json(method, urlPath, body) {
  const opts = { method, headers: { "content-type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${base}${urlPath}`, opts);
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

async function run() {
  const child = spawn("node", ["server.js"], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitOk();
    const v = await fetch(
      `${base}/verify?secret=${encodeURIComponent(config.webhook_secret)}`
    ).then((r) => r.json());
    if (!v.ok) throw new Error("verify_failed");

    const results = { ok: true, channel: "telegram", verify: "pass", branches: {} };

    await json("POST", "/mock/reset", { chat: "b-i" });
    await json("GET", "/mock/start?chat=b-i");
    let r = await json("POST", "/mock/choice", {
      chat: "b-i",
      option_id: "intresse",
    });
    results.branches.interest = {
      type: r.data.reply?.type,
      node: r.data.session?.node,
    };

    await json("POST", "/mock/reset", { chat: "b-q" });
    await json("GET", "/mock/start?chat=b-q");
    r = await json("POST", "/mock/choice", { chat: "b-q", option_id: "fraga" });
    r = await json("POST", "/mock/choice", {
      chat: "b-q",
      option_id: "process",
    });
    if (r.data.reply?.type === "choice" || r.data.session?.node === "fraga_after_faq") {
      r = await json("POST", "/mock/choice", {
        chat: "b-q",
        option_id: "manniska_efter_faq",
      });
    } else {
      r = await json("POST", "/mock/choice", {
        chat: "b-q",
        option_id: "manniska_efter_faq",
      });
    }
    if (r.data.reply?.type !== "handoff") {
      throw new Error(`question ${JSON.stringify(r.data)}`);
    }
    results.branches.question = { type: "handoff", via: "faq_then_human" };

    await json("POST", "/mock/reset", { chat: "b-b" });
    await json("GET", "/mock/start?chat=b-b");
    r = await json("POST", "/mock/choice", { chat: "b-b", option_id: "boka" });
    r = await json("POST", "/mock/form", {
      chat: "b-b",
      fields: {
        namn: "Alex",
        land_intresse: "Portugal",
        kontaktpreferens: "WhatsApp",
      },
    });
    const book = r.data.reply;
    if (!(book?.handoff || book?.type === "handoff" || book?.confirmation)) {
      throw new Error(`book ${JSON.stringify(r.data)}`);
    }
    results.branches.book = { ok: true };

    await json("POST", "/mock/reset", { chat: "b-h" });
    await json("GET", "/mock/start?chat=b-h");
    r = await json("POST", "/mock/choice", {
      chat: "b-h",
      option_id: "manniska",
    });
    if (r.data.reply?.type !== "handoff") {
      throw new Error(`human ${JSON.stringify(r.data)}`);
    }
    results.branches.human = { type: "handoff" };

    console.log(JSON.stringify(results, null, 2));
  } finally {
    child.kill("SIGTERM");
  }
}

run().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e) }));
  process.exit(1);
});
