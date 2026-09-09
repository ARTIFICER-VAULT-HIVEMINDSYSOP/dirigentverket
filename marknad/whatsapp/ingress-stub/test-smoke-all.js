/**
 * Paper smoke: verify + all four intake branches.
 * No live WhatsApp send.
 */
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
      const r = await fetch(`${base}/health`);
      if (r.ok) return;
    } catch {
      /* retry */
    }
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

    const challenge = "all-branches-challenge";
    const v = await fetch(
      `${base}/webhook?hub.mode=subscribe` +
        `&hub.verify_token=${encodeURIComponent(config.verify_token)}` +
        `&hub.challenge=${encodeURIComponent(challenge)}`
    );
    const vText = await v.text();
    if (v.status !== 200 || vText !== challenge) {
      throw new Error(`verify_failed ${v.status} ${vText}`);
    }

    const results = { verify: "pass", branches: {} };

    // Interest
    await json("POST", "/mock/reset", { chat: "b-intresse" });
    await json("GET", "/mock/start?chat=b-intresse");
    let r = await json("POST", "/mock/choice", {
      chat: "b-intresse",
      option_id: "intresse",
    });
    if (r.status >= 400 || r.data.reply?.error) {
      throw new Error(`intresse ${JSON.stringify(r.data)}`);
    }
    results.branches.interest = {
      type: r.data.reply?.type,
      node: r.data.session?.node,
    };

    // Question → topic → text → handoff
    await json("POST", "/mock/reset", { chat: "b-fraga" });
    await json("GET", "/mock/start?chat=b-fraga");
    r = await json("POST", "/mock/choice", {
      chat: "b-fraga",
      option_id: "fraga",
    });
    r = await json("POST", "/mock/choice", {
      chat: "b-fraga",
      option_id: "land",
    });
    r = await json("POST", "/mock/text", {
      chat: "b-fraga",
      text: "Any new listings in Spain?",
    });
    if (r.data.reply?.type !== "handoff") {
      throw new Error(`fraga_handoff ${JSON.stringify(r.data)}`);
    }
    results.branches.question = {
      type: r.data.reply.type,
      tag: r.data.reply.tag,
      queue: r.data.reply.queue,
    };

    // Book → form → confirmation+handoff
    await json("POST", "/mock/reset", { chat: "b-boka" });
    await json("GET", "/mock/start?chat=b-boka");
    r = await json("POST", "/mock/choice", {
      chat: "b-boka",
      option_id: "boka",
    });
    if (r.data.reply?.type !== "form") {
      throw new Error(`boka_form ${JSON.stringify(r.data)}`);
    }
    r = await json("POST", "/mock/form", {
      chat: "b-boka",
      fields: {
        namn: "Alex Example",
        land_intresse: "Portugal",
        kontaktpreferens: "WhatsApp",
        budget_band: "Prefer to discuss",
        notis: "Paper smoke",
      },
    });
    const bookReply = r.data.reply;
    const bookOk =
      bookReply?.handoff?.type === "handoff" ||
      bookReply?.type === "handoff" ||
      bookReply?.confirmation?.type === "message";
    if (!bookOk) {
      throw new Error(`boka_complete ${JSON.stringify(r.data)}`);
    }
    results.branches.book = {
      has_confirmation: Boolean(bookReply?.confirmation || bookReply?.type === "message"),
      handoff_tag: bookReply?.handoff?.tag || bookReply?.tag,
      queue: bookReply?.handoff?.queue || bookReply?.queue,
    };

    // Human → handoff
    await json("POST", "/mock/reset", { chat: "b-human" });
    await json("GET", "/mock/start?chat=b-human");
    r = await json("POST", "/mock/choice", {
      chat: "b-human",
      option_id: "manniska",
    });
    if (r.data.reply?.type !== "handoff") {
      throw new Error(`human ${JSON.stringify(r.data)}`);
    }
    results.branches.human = {
      type: r.data.reply.type,
      tag: r.data.reply.tag,
    };

    results.ok = true;
    console.log(JSON.stringify(results, null, 2));
  } finally {
    child.kill("SIGTERM");
  }
}

run().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e) }));
  process.exit(1);
});
