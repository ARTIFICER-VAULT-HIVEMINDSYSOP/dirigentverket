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
    if (!v.ok) throw new Error(`verify_failed ${JSON.stringify(v)}`);

    const start = await fetch(`${base}/mock/start?chat=smoke-1`).then((r) =>
      r.json()
    );
    if (start.reply?.type !== "choice") {
      throw new Error(`start_not_choice ${JSON.stringify(start)}`);
    }

    const choice = await fetch(`${base}/mock/choice`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat: "smoke-1", option_id: "intresse" }),
    }).then((r) => r.json());

    if (!choice.reply || choice.reply.error) {
      throw new Error(`choice_failed ${JSON.stringify(choice)}`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          channel: "telegram",
          verify: "pass",
          mock_choice: choice.reply.type,
          node: choice.session?.node,
          option_titles: start.reply.options?.map((o) => o.title),
        },
        null,
        2
      )
    );
  } finally {
    child.kill("SIGTERM");
  }
}

run().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e) }));
  process.exit(1);
});
