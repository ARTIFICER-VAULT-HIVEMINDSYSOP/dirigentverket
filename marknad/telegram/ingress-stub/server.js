/**
 * Paper Telegram ingress-stub.
 * Same intake.json dialog; inline buttons ≈ WhatsApp choices.
 * No live Bot API send. bot_token stays empty / in local config only.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
);

function loadFlow() {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, config.flow_path), "utf8")
  );
}

const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { node: "start", data: {}, last_node: "start" });
  }
  return sessions.get(chatId);
}

function renderNode(flow, nodeId, session) {
  const node = flow.nodes[nodeId];
  if (!node) return { error: "unknown_node", nodeId };
  session.last_node = nodeId;
  session.node = nodeId;

  if (node.type === "handoff") {
    session.bot = "silent";
    return {
      type: "handoff",
      tag: node.tag,
      queue: node.queue,
      user_message: node.user_message,
      summary: (node.summary_template || "").replace(/\{(\w+)\}/g, (_, k) =>
        session.data[k] ?? `{${k}}`
      ),
      bot: "silent",
      mode: "paper",
      channel: "telegram",
    };
  }

  if (node.type === "message") {
    return {
      type: "message",
      body: node.body,
      node: nodeId,
      expect: node.expect,
      capture: node.capture,
      next_preview: node.next && !node.expect ? node.next : undefined,
      mode: "paper",
      channel: "telegram",
    };
  }

  if (node.type === "choice") {
    return {
      type: "choice",
      tg: node.tg || "inline_keyboard",
      header: node.header,
      body: node.body,
      options: (node.options || []).map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
      })),
      node: nodeId,
      mode: "paper",
      channel: "telegram",
    };
  }

  if (node.type === "form") {
    return {
      type: "form",
      body: node.body,
      fields: node.fields,
      node: nodeId,
      mode: "paper",
      channel: "telegram",
      note: "Paper: step questions or mock form; no live WebApp",
    };
  }

  return { error: "unsupported_type", type: node.type };
}

function applyChoice(flow, session, optionId) {
  if (session.bot === "silent") {
    return { error: "bot_silent_after_handoff", hint: "POST /mock/reset" };
  }
  let node = flow.nodes[session.node];
  if (node?.type === "message" && node.next && !node.expect) {
    renderNode(flow, node.next, session);
    node = flow.nodes[session.node];
  }
  if (!node || node.type !== "choice") {
    return { error: "not_in_choice", current: session.node };
  }
  const opt = (node.options || []).find((o) => o.id === optionId);
  if (!opt) {
    return renderNode(flow, node.fallback || "handoff_timeout", session);
  }
  if (node.capture?.field) {
    session.data[node.capture.field] =
      node.capture.from === "option_id" ? optionId : opt.title;
  }
  let nextId = opt.next;
  let out = renderNode(flow, nextId, session);
  while (
    out.type === "message" &&
    flow.nodes[nextId]?.next &&
    !flow.nodes[nextId]?.expect
  ) {
    nextId = flow.nodes[nextId].next;
    out = renderNode(flow, nextId, session);
  }
  return out;
}

function applyText(flow, session, text) {
  if (session.bot === "silent") {
    return { error: "bot_silent_after_handoff", hint: "POST /mock/reset" };
  }
  const node = flow.nodes[session.node];
  if (!node || node.expect !== "free_text") {
    return { error: "not_expecting_text", current: session.node };
  }
  if (node.capture?.field) session.data[node.capture.field] = text;
  return renderNode(flow, node.next, session);
}

function applyForm(flow, session, fields) {
  if (session.bot === "silent") {
    return { error: "bot_silent_after_handoff", hint: "POST /mock/reset" };
  }
  const node = flow.nodes[session.node];
  if (!node || node.type !== "form") {
    return { error: "not_in_form", current: session.node };
  }
  Object.assign(session.data, fields || {});
  const nextId = node.on_complete;
  let out = renderNode(flow, nextId, session);
  if (
    out.type === "message" &&
    flow.nodes[nextId]?.next &&
    !flow.nodes[nextId]?.expect
  ) {
    const after = flow.nodes[nextId].next;
    return { confirmation: out, handoff: renderNode(flow, after, session) };
  }
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-paper-mode": "true",
    "x-channel": "telegram",
  });
  res.end(JSON.stringify(obj, null, 2));
}

function parseUrl(req) {
  return new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
}

const server = http.createServer(async (req, res) => {
  const url = parseUrl(req);
  const flow = loadFlow();

  // Telegram webhook secret check (paper)
  if (req.method === "POST" && url.pathname === "/webhook") {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret && secret !== config.webhook_secret) {
      sendJson(res, 401, { error: "bad_secret" });
      return;
    }
    const raw = await readBody(req);
    let update = {};
    try {
      update = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }
    // Paper: acknowledge only — no Bot API outbound
    sendJson(res, 200, {
      ok: true,
      mode: "paper",
      channel: "telegram",
      note: "No live send. Use /mock/* to drive dialog.",
      update_id: update.update_id,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      mode: config.mode,
      channel: "telegram",
      flow: flow.id,
      version: flow.version,
      token_configured: Boolean(config.bot_token),
    });
    return;
  }

  // Paper stand-in for "bot reachable / secret ok"
  if (req.method === "GET" && url.pathname === "/verify") {
    const q = url.searchParams.get("secret");
    if (q === config.webhook_secret) {
      sendJson(res, 200, { ok: true, verify: "pass", channel: "telegram" });
      return;
    }
    sendJson(res, 403, { ok: false, verify: "fail" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/mock/start") {
    const chatId = url.searchParams.get("chat") || "tg-paper-1";
    sessions.set(chatId, { node: "start", data: {}, last_node: "start" });
    const session = getSession(chatId);
    sendJson(res, 200, {
      chat: chatId,
      command: "/start",
      reply: renderNode(flow, "start", session),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/mock/choice") {
    const raw = await readBody(req);
    let body = {};
    try {
      body = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }
    const chatId = body.chat || "tg-paper-1";
    const session = getSession(chatId);
    const reply = applyChoice(flow, session, body.option_id);
    sendJson(res, reply.error ? 400 : 200, {
      chat: chatId,
      callback_data: body.option_id,
      session: { node: session.node, data: session.data, bot: session.bot },
      reply,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/mock/text") {
    const raw = await readBody(req);
    let body = {};
    try {
      body = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }
    const chatId = body.chat || "tg-paper-1";
    const session = getSession(chatId);
    const reply = applyText(flow, session, body.text || "");
    sendJson(res, reply.error ? 400 : 200, {
      chat: chatId,
      session: { node: session.node, data: session.data, bot: session.bot },
      reply,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/mock/form") {
    const raw = await readBody(req);
    let body = {};
    try {
      body = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }
    const chatId = body.chat || "tg-paper-1";
    const session = getSession(chatId);
    const reply = applyForm(flow, session, body.fields || {});
    sendJson(res, reply.error ? 400 : 200, {
      chat: chatId,
      session: { node: session.node, data: session.data, bot: session.bot },
      reply,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/mock/reset") {
    const raw = await readBody(req);
    let body = {};
    try {
      body = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
      body = {};
    }
    const chatId = body.chat || "tg-paper-1";
    sessions.set(chatId, { node: "start", data: {}, last_node: "start" });
    sendJson(res, 200, { ok: true, chat: chatId, node: "start" });
    return;
  }

  sendJson(res, 404, {
    error: "not_found",
    routes: [
      "GET /health",
      "GET /verify?secret=",
      "POST /webhook",
      "GET /mock/start?chat=",
      "POST /mock/choice {chat, option_id}",
      "POST /mock/text {chat, text}",
      "POST /mock/form {chat, fields}",
      "POST /mock/reset {chat}",
    ],
  });
});

const port = Number(config.port) || 8788;
server.listen(port, "127.0.0.1", () => {
  console.log(
    JSON.stringify({
      listening: `http://127.0.0.1:${port}`,
      mode: config.mode,
      channel: "telegram",
    })
  );
});
