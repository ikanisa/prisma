import crypto from 'node:crypto';

const personas = [];

export function init(context, events, done) {
  if (context.config.payload && Array.isArray(context.config.payload.data)) {
    for (const row of context.config.payload.data) {
      if (row && row.email && row.password && row.orgSlug) {
        personas.push({ email: row.email, password: row.password, orgSlug: row.orgSlug });
      }
    }
  }
  if (personas.length === 0) {
    personas.push({ email: 'load.user@example.com', password: 'password123', orgSlug: 'demo' });
  }
  done();
}

export function beforeRequest(requestParams, context, ee, next) {
  if (!context.vars.persona) {
    const choice = personas[crypto.randomInt(0, personas.length)];
    context.vars.persona = choice;
    context.vars.email = choice.email;
    context.vars.password = choice.password;
    context.vars.orgSlug = choice.orgSlug;
  }

  if (context.vars.token) {
    requestParams.headers = {
      ...(requestParams.headers ?? {}),
      Authorization: `Bearer ${context.vars.token}`,
    };
  }
  return next();
}

export function authorise(requestParams, context, ee, next) {
  if (context.vars.token) {
    requestParams.headers = {
      ...(requestParams.headers ?? {}),
      Authorization: `Bearer ${context.vars.token}`,
    };
  }
  next();
}
