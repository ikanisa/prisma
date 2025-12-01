import type { AgentRegistryEntry } from "../registry/types.js";

export function buildInstructionsFromEntry(entry: AgentRegistryEntry): string {
  const standardsList = Object.entries(entry.standards)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join("; ");

  const personaSection = entry.persona
    ? `
Tone: ${entry.persona.tone ?? "professional"}
Style: ${entry.persona.style ?? "clear and concise"}

${entry.persona.do ? `DO:\n${entry.persona.do.map((item) => `- ${item}`).join("\n")}` : ""}
${entry.persona.dont ? `\nDON'T:\n${entry.persona.dont.map((item) => `- ${item}`).join("\n")}` : ""}
`
    : "";

  return `
You are ${entry.name}, a specialist ${entry.category} agent.

Description:
${entry.description}

Jurisdictions: ${entry.jurisdictions.join(", ")}

Relevant standards and frameworks:
${standardsList}

Knowledge Base Scopes:
${entry.kb_scopes.map((scope) => `- ${scope}`).join("\n")}

${personaSection}

Rules:
- Always ground your answers in authoritative sources (via tools).
- Use DeepSearch and Supabase search tools to retrieve relevant standards/laws.
- Respect jurisdiction: if user specifies a country, assume that jurisdiction unless instructed otherwise.
- Provide citations to the standards/laws where possible.
- If the subject is outside your specialization, say so and suggest escalation to another specialist agent.
- Be precise, accurate, and cite specific sections or clauses when referencing standards.
`.trim();
}
