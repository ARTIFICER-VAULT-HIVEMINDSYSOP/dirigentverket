/**
 * Smoke: verify challenge + mock choice Intresse.
 * Starts against an already-running server, or boots one briefly.
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

async function run() {
  const child = spawn("node", ["server.js"], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let bootLog = "";
  child.stdout.on("data", (d) => (bootLog += d));
  child.stderr.on("data", (d) => (bootLog += d));
  try {
    await waitOk();

    const challenge = "smoke-challenge-123";
    const verifyUrl =
      `${base}/webhook?hub.mode=subscribe` +
      `&hub.verify_token=${encodeURIComponent(config.verify_token)}` +
      `&hub.challenge=${encodeURIComponent(challenge)}`;
    const v = await fetch(verifyUrl);
    const vText = await v.text();
    if (v.status !== 200 || vText !== challenge) {
      throw new Error(`verify_failed status=${v.status} body=${vText}`);
    }

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
    // intresse → message then auto-walk to intresse_vidare (choice)
    if (choice.reply.type !== "choice" && choice.reply.type !== "message") {
      throw new Error(`unexpected_reply ${JSON.stringify(choice.reply)}`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
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
