import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PERSONA = {
  email: 'load.user@example.com',
  password: 'password123',
  orgSlug: 'demo',
  engagementId: 'demo-engagement',
};

function readPersonaFile() {
  const personaFile = process.env.PERF_PERSONA_FILE;
  if (!personaFile) {
    return null;
  }

  try {
    const absolutePath = path.isAbsolute(personaFile)
      ? personaFile
      : path.join(process.cwd(), personaFile);
    const raw = fs.readFileSync(absolutePath, 'utf8');
    const [headerLine, ...rows] = raw.split(/\r?\n/).filter(Boolean);
    if (!headerLine) {
      return null;
    }
    const headers = headerLine.split(',').map((value) => value.trim());
    const emailIndex = headers.indexOf('email');
    const passwordIndex = headers.indexOf('password');
    const orgSlugIndex = headers.indexOf('orgSlug');
    const engagementIdIndex = headers.indexOf('engagementId');

    // Validate required columns exist
    if (emailIndex === -1 || passwordIndex === -1) {
      console.warn(`PERF_PERSONA_FILE missing required columns (email, password) in ${personaFile}`);
      return null;
    }

    for (const row of rows) {
      const cols = row.split(',').map((value) => value.trim());
      if (cols[emailIndex] && cols[passwordIndex]) {
        return {
          email: cols[emailIndex],
          password: cols[passwordIndex],
          orgSlug: orgSlugIndex >= 0 ? (cols[orgSlugIndex] || undefined) : undefined,
          engagementId: engagementIdIndex >= 0 ? (cols[engagementIdIndex] || undefined) : undefined,
        };
      }
    }
  } catch (error) {
    console.warn(`Unable to read PERF_PERSONA_FILE at ${personaFile}:`, error);
  }
  return null;
}

function resolveDefaultPersona() {
  const personaFromFile = readPersonaFile();
  if (personaFromFile) {
    return personaFromFile;
  }

  return {
    email: process.env.PERF_EMAIL || DEFAULT_PERSONA.email,
    password: process.env.PERF_PASSWORD || DEFAULT_PERSONA.password,
    orgSlug: process.env.PERF_ORG_SLUG || DEFAULT_PERSONA.orgSlug,
    engagementId: process.env.PERF_ENGAGEMENT_ID || DEFAULT_PERSONA.engagementId,
  };
}

export function before(context, events, done) {
  const defaults = resolveDefaultPersona();
  context.vars.email = context.vars.email || defaults.email;
  context.vars.password = context.vars.password || defaults.password;
  context.vars.orgSlug = context.vars.orgSlug || defaults.orgSlug;
  context.vars.engagementId = context.vars.engagementId || defaults.engagementId;

  if (!context.vars.token && process.env.PERF_BEARER_TOKEN) {
    context.vars.token = process.env.PERF_BEARER_TOKEN;
  }

  if (process.env.PERF_STATIC_HEADERS) {
    try {
      const parsed = JSON.parse(process.env.PERF_STATIC_HEADERS);
      if (parsed && typeof parsed === 'object') {
        context.vars.staticHeaders = parsed;
      }
    } catch (error) {
      console.warn('PERF_STATIC_HEADERS is not valid JSON; ignoring.');
    }
  }

  done();
}

function applyAuthHeader(requestParams, token) {
  if (!token) {
    return requestParams;
  }
  requestParams.headers = {
    ...(requestParams.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };
  return requestParams;
}

export function beforeRequest(requestParams, context, ee, next) {
  if (context.vars.staticHeaders) {
    requestParams.headers = {
      ...(requestParams.headers ?? {}),
      ...context.vars.staticHeaders,
    };
  }

  if (context.vars.token) {
    applyAuthHeader(requestParams, context.vars.token);
  }
  next();
}

export function authorise(requestParams, context, ee, next) {
  if (context.vars.token) {
    applyAuthHeader(requestParams, context.vars.token);
  }
  next();
}

export function setEngagement(requestParams, context, ee, next) {
  if (!context.vars.engagementId && process.env.PERF_ENGAGEMENT_ID) {
    context.vars.engagementId = process.env.PERF_ENGAGEMENT_ID;
  }
  next();
}
