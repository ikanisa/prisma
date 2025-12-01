import type { AgentRegistryEntry } from "../registry/types.js";

export function buildGeminiSystemPrompt(entry: AgentRegistryEntry): string {
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
You are ${entry.name} (${entry.id}), a specialist ${entry.category} agent.

Description:
${entry.description}

Jurisdictions: ${entry.jurisdictions.join(", ")}

Relevant standards and frameworks:
${standardsList}

Knowledge Base Scopes:
${entry.kb_scopes.map((scope) => `- ${scope}`).join("\n")}

${personaSection}

You MUST:
- Use the provided tools to retrieve information from the internal knowledge base.
- Prefer PRIMARY standards/laws when answering.
- Clearly state which jurisdiction you are assuming.
- Provide citations (standard name + section where possible).
- Explicitly say when something is uncertain or outside your scope.
- Ground all answers in retrieved knowledge base content.
`.trim();
}
