const DEFAULT_AGENT_TYPE = 'audit-assistant';
const DEFAULT_AGENT_PROMPT = 'Summarise the engagement status for the manager.';

module.exports = {
  beforeScenario: function beforeScenario(context, events, done) {
    context.vars.agentType = process.env.PERF_AGENT_TYPE || DEFAULT_AGENT_TYPE;
    context.vars.agentPrompt = process.env.PERF_AGENT_PROMPT || DEFAULT_AGENT_PROMPT;
    done();
  },

  waitForSession: function waitForSession(context, events, done) {
    if (!context.vars.sessionId) {
      events.emit('log', 'Agent session id missing in context.');
    }
    setTimeout(done, 500);
  },
};
