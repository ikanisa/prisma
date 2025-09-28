/* eslint-env node */
import express from "express";
import { z } from "zod";
import { runSupervisor } from "./langgraph";
import { moderateInput } from "./moderation";
import { vat_determine } from "./tools";
import { recordAgentLog } from "./agentLogs";

export const app = express();
app.use(express.json());

// SSE chat endpoint
app.get("/v1/agent/chat", async (req, res) => {
  const q = String(req.query.q ?? "");
  try {
    moderateInput(q);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const result = await runSupervisor("rag_qa", { query: q });
  recordAgentLog("/v1/agent/chat", { query: q }, result);
  res.write(`data: ${JSON.stringify(result)}\n\n`);
  res.write("event: end\n");
  res.write("data: [DONE]\n\n");
  res.end();
});

// Audit plan run endpoint
const auditSchema = z.object({ planId: z.string() });
app.post("/v1/audit/plan-run", (req, res) => {
  const parsed = auditSchema.parse(req.body);
  moderateInput(JSON.stringify(parsed));
  const output = { status: "ok" };
  recordAgentLog("/v1/audit/plan-run", parsed, output);
  res.json(output);
});

// VAT evaluation endpoint
const vatSchema = z.object({ country: z.string(), amount: z.number() });
app.post("/v1/tax/vat/evaluate", (req, res) => {
  const parsed = vatSchema.parse(req.body);
  moderateInput(JSON.stringify(parsed));
  const rate = vat_determine(parsed.country);
  const output = { rate, tax: rate ? rate * parsed.amount : null };
  recordAgentLog("/v1/tax/vat/evaluate", parsed, output);
  res.json(output);
});
