/**
 * Paper ingress-stub: Meta verify + mock choice against intake.json.
 * No live WhatsApp send. Token/brand stay in config, not in flow JSON.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

function loadFlow() {
  const flowPath = path.resolve(__dirname, config.flow_path);
  return JSON.parse(fs.readFileSync(flowPath, "utf8"));
}

/** In-memory sessions: chatId -> { node, data } */
const sessions = new Map();

function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { node: "start", data: {}, last_node: "start" });
  }
  return sessions.get(chatId);
}

function resolveOption(node, optionId) {
  const opt = (node.options || []).find((o) => o.id === optionId);
  return opt || null;
}

function renderNode(flow, nodeId, session) {
  const node = flow.nodes[nodeId];
  if (!node) {
    return { error: "unknown_node", nodeId };
  }
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
    };
  }

  if (node.type === "message") {
    const out = {
      type: "message",
      wa: node.wa || "text",
      body: node.body,
      node: nodeId,
      mode: "paper",
    };
    if (node.expect === "free_text") {
      out.expect = "free_text";
      out.capture = node.capture;
    }
    if (node.next && !node.expect) {
      // auto-advance message → next choice/handoff preview
      out.next_preview = node.next;
    }
    return out;
  }

  if (node.type === "choice") {
    return {
      type: "choice",
      wa: node.wa,
      header: node.header,
      body: node.body,
      footer: node.footer,
      button_label: node.button_label,
      options: (node.options || []).map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
      })),
      node: nodeId,
      mode: "paper",
    };
  }

  if (node.type === "form") {
    return {
      type: "form",
      wa: "flow",
      flow_id: node.flow_id,
      body: node.body,
      fields: node.fields,
      node: nodeId,
      mode: "paper",
      note: "Paper: Flow UI not live; POST /mock/form with field values",
    };
  }

  return { error: "unsupported_type", type: node.type, node: nodeId };
}

function applyChoice(flow, session, optionId) {
  if (session.bot === "silent") {
    return { error: "bot_silent_after_handoff", hint: "POST /mock/reset" };
  }
  const node = flow.nodes[session.node];
  if (!node || node.type !== "choice") {
    return { error: "not_in_choice", current: session.node };
  }
  const opt = resolveOption(node, optionId);
  if (!opt) {
    const fb = node.fallback || "handoff_timeout";
    session.node = fb;
    return renderNode(flow, fb, session);
  }
  if (node.capture?.field) {
    session.data[node.capture.field] =
      node.capture.from === "option_id" ? optionId : opt.title;
  }
  // Walk message chains that auto-have next without waiting for text
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
  // After intresse_info (message with next), paper returns the message then
  // client can follow next_preview — keep session on the message's next if set
  if (
    out.type === "message" &&
    flow.nodes[session.node]?.next &&
    !flow.nodes[session.node]?.expect
  ) {
    // leave session on current message node; caller advances via /mock/next
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
  if (node.capture?.field) {
    session.data[node.capture.field] = text;
  }
  const nextId = node.next;
  return renderNode(flow, nextId, session);
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
  // message then handoff chain
  if (
    out.type === "message" &&
    flow.nodes[nextId]?.next &&
    !flow.nodes[nextId]?.expect
  ) {
    const after = flow.nodes[nextId].next;
    // return confirmation + follow into handoff for paper visibility
    const handoff = renderNode(flow, after, session);
    return { confirmation: out, handoff };
  }
  return out;
}

function verifyMetaSignature(rawBody, header) {
  if (!config.require_signature) return true;
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", config.app_secret)
    .update(rawBody)
    .digest("hex");
  const got = header.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  } catch {
    return false;
  }
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
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-paper-mode": "true",
  });
  res.end(body);
}

function parseUrl(req) {
  return new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
}

const server = http.createServer(async (req, res) => {
  const url = parseUrl(req);
  const flow = loadFlow();

  // Meta webhook verification
  if (req.method === "GET" && url.pathname === "/webhook") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === config.verify_token && challenge) {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(challenge);
      return;
    }
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("verify_failed");
    return;
  }

  // Meta-shaped webhook (paper: log + no outbound)
  if (req.method === "POST" && url.pathname === "/webhook") {
    const raw = await readBody(req);
    if (!verifyMetaSignature(raw, req.headers["x-hub-signature-256"])) {
      sendJson(res, 401, { error: "bad_signature" });
      return;
    }
    let payload = {};
    try {
      payload = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }
    // Acknowledge Meta quickly; paper does not send replies to Cloud API
    sendJson(res, 200, {
      ok: true,
      mode: "paper",
      received: true,
      note: "No live send. Use /mock/* to drive dialog.",
      keys: Object.keys(payload),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      mode: config.mode,
      flow: flow.id,
      version: flow.version,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/mock/start") {
    const chatId = url.searchParams.get("chat") || "paper-chat-1";
    sessions.set(chatId, { node: "start", data: {}, last_node: "start" });
    const session = getSession(chatId);
    sendJson(res, 200, {
      chat: chatId,
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
    const chatId = body.chat || "paper-chat-1";
    const session = getSession(chatId);
    if (!session.node || session.node === undefined) {
      session.node = "start";
    }
    // If at start after reset, ensure start rendered first path: allow choice from start
    if (!flow.nodes[session.node] || flow.nodes[session.node].type !== "choice") {
      // try to get to a choice — if message with next_preview pending
      const cur = flow.nodes[session.node];
      if (cur?.type === "message" && cur.next) {
        renderNode(flow, cur.next, session);
      }
    }
    const reply = applyChoice(flow, session, body.option_id);
    sendJson(res, reply.error ? 400 : 200, {
      chat: chatId,
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
    const chatId = body.chat || "paper-chat-1";
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
    const chatId = body.chat || "paper-chat-1";
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
    const chatId = body.chat || "paper-chat-1";
    sessions.set(chatId, { node: "start", data: {}, last_node: "start" });
    sendJson(res, 200, { ok: true, chat: chatId, node: "start" });
    return;
  }

  sendJson(res, 404, {
    error: "not_found",
    routes: [
      "GET /health",
      "GET /webhook?hub.mode&hub.verify_token&hub.challenge",
      "POST /webhook",
      "GET /mock/start?chat=",
      "POST /mock/choice {chat, option_id}",
      "POST /mock/text {chat, text}",
      "POST /mock/form {chat, fields}",
      "POST /mock/reset {chat}",
    ],
  });
});

const port = Number(config.port) || 8787;
server.listen(port, "127.0.0.1", () => {
  console.log(
    JSON.stringify({
      listening: `http://127.0.0.1:${port}`,
      mode: config.mode,
      verify_token_set: Boolean(config.verify_token),
    })
  );
});
