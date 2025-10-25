# GPT-5 Adoption Guide

GPT-5 introduces new reasoning-oriented capabilities, API controls, and tooling support that can materially improve full-stack development workflows. This guide summarizes the most important features, configuration options, and migration steps for engineering teams integrating GPT-5 into Prisma projects.

## Model Selection

| Variant | Best for |
| --- | --- |
| `gpt-5` | Complex reasoning, broad domain knowledge, and multi-step agentic tasks such as full-stack feature delivery. |
| `gpt-5-mini` | Cost-optimized reasoning with balanced speed and capability for day-to-day chatops and operational runbooks. |
| `gpt-5-nano` | High-throughput automation such as classification, routing, and validation tasks. |

The system card refers to these models as `gpt-5-thinking`, `gpt-5-thinking-mini`, and `gpt-5-thinking-nano`. Map those names to the API aliases above when configuring environments.

## Key API Parameters

GPT-5 removes temperature, top-p, and logprobs controls. Replace them with the following dedicated parameters:

- **Reasoning effort** (`reasoning.effort`): `minimal`, `low`, `medium` (default), or `high`. Minimal and low reduce latency, while medium and high provide deeper deliberation for complex migrations or debugging.
- **Verbosity** (`text.verbosity`): `low`, `medium`, or `high`. Use high for detailed migration plans and code reviews, medium for balanced answers, and low for concise SQL or shell snippets.
- **Max output tokens** (`max_output_tokens`): Cap response length, especially when chaining multiple tool calls or storing results in logs.

### Minimal reasoning effort

Minimal effort produces very few reasoning tokens, which speeds up tool-driven workflows like schema linting. Prompt GPT-5 to "outline steps" before answering if you still need structured reasoning while keeping the setting minimal.

### Verbosity tuning

Low verbosity suits terse responses such as infrastructure commands. Medium and high instruct the model to emit thorough explanations, which is useful when documenting migrations or refactors.

## Tooling Enhancements

GPT-5 expands tool calling with:

- **Custom tools** (`type: "custom"`): Accept freeform plaintext payloads so the model can send SQL, code, or DSL snippets directly to backend services.
- **Context-free grammars**: Attach a Lark grammar to custom tools to enforce strict response syntax and reduce parsing errors.
- **Allowed tools** (`tool_choice.allowed_tools`): Declare all available tools once, then restrict the active subset per request with `mode: "auto"` or `mode: "required"` to improve safety and predictability.
- **Preambles**: Ask GPT-5 to describe why it is invoking a tool to increase observability and operator trust during agentic runs.

## Runtime Integration

- The agent orchestration service now defaults to `gpt-5-mini` with environment overrides (`AGENT_MODEL`, `OPENAI_AGENT_MODEL`).
- Responses API calls share central defaults controlled by `OPENAI_DEFAULT_REASONING_EFFORT` (`minimal` → `high`) and `OPENAI_DEFAULT_VERBOSITY` (`low` → `high`). Use `OPENAI_AGENT_REASONING_EFFORT` / `OPENAI_AGENT_VERBOSITY` and the summary equivalents to tune specific workflows.
- Web summarisation, policy checks, and streaming endpoints pass through the GPT-5 reasoning controls, removing unsupported parameters like `temperature`.

## Migration Tips

1. **Migrate to the Responses API**: It supports passing chain-of-thought between turns via `previous_response_id`, reducing duplicate reasoning and latency.
2. **Start with prompt optimization**: Use the prompt optimizer to adapt existing GPT-4.1 or o3 prompts to GPT-5 idioms before large rollouts.
3. **Match reasoning levels**: When replacing o3, begin with `reasoning.effort = "medium"`. For GPT-4.1 workloads, start with `"minimal"` or `"low"` to maintain responsiveness.
4. **Validate custom tool inputs**: Freeform tool payloads enable rich automation but require server-side validation and sandboxing.
5. **Monitor verbosity settings**: Align verbosity with downstream logging and storage limits; excessive verbosity can increase costs during long agent sessions.

## Example Requests

```python
from openai import OpenAI

client = OpenAI()

# Low-latency instruction following
result = client.responses.create(
    model="gpt-5",
    input="Write a haiku about code.",
    reasoning={"effort": "low"},
    text={"verbosity": "low"},
)

print(result.output_text)

# Minimal reasoning for rapid estimation
response = client.responses.create(
    model="gpt-5",
    input="How much gold would it take to coat the Statue of Liberty in a 1mm layer?",
    reasoning={"effort": "minimal"},
)

print(response)
```

Integrate these patterns into deployment pipelines and production agents to take full advantage of GPT-5's reasoning-first architecture.
