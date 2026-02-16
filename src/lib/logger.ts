const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'api_key', 'apikey'];

function getMinLevel(): Level {
  const env = process.env.LOG_LEVEL as string | undefined;
  if (env) {
    if (env in LEVELS) return env as Level;
    console.warn(
      JSON.stringify({ level: 'warn', msg: `Invalid LOG_LEVEL "${env}". Valid: ${Object.keys(LEVELS).join(', ')}. Using default.`, module: 'logger', ts: new Date().toISOString() }),
    );
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const minLevel = getMinLevel();

export interface Logger {
  debug(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
  child(extra: Record<string, unknown>): Logger;
}

function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk))) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = v;
    }
  }
  return result;
}

function emit(level: Level, module: string, msg: string, extra?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[minLevel]) return;

  const line = JSON.stringify({
    level,
    msg,
    module,
    ts: new Date().toISOString(),
    ...(extra ? redactSensitive(extra) : {}),
  });

  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export function createLogger(module: string, baseExtra?: Record<string, unknown>): Logger {
  return {
    debug(msg, extra) {
      emit('debug', module, msg, { ...baseExtra, ...extra });
    },
    info(msg, extra) {
      emit('info', module, msg, { ...baseExtra, ...extra });
    },
    warn(msg, extra) {
      emit('warn', module, msg, { ...baseExtra, ...extra });
    },
    error(msg, extra) {
      emit('error', module, msg, { ...baseExtra, ...extra });
    },
    child(extra) {
      return createLogger(module, { ...baseExtra, ...extra });
    },
  };
}
