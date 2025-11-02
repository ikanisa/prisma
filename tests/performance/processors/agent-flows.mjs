import { authorise, before, beforeRequest } from './common.mjs';

export { authorise, before, beforeRequest };

export function preparePersona(context, events, done) {
  if (context.vars.payload && typeof context.vars.payload === 'object') {
    const { email, password, orgSlug, engagementId } = context.vars.payload;
    if (email) {
      context.vars.email = email;
    }
    if (password) {
      context.vars.password = password;
    }
    if (orgSlug) {
      context.vars.orgSlug = orgSlug;
    }
    if (engagementId) {
      context.vars.engagementId = engagementId;
    }
  }
  done();
}

export function noteSession(requestParams, context, ee, next) {
  if (requestParams.json && typeof requestParams.json === 'object') {
    requestParams.json.sessionId = context.vars.sessionId ?? requestParams.json.sessionId;
  }
  next();
}
