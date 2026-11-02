import { Request } from 'express';

const MAX_UA_LENGTH = 300;

/** `req.ip` honours the configured `trust proxy` hop count (see app.ts), so it can't be spoofed past it. */
export const getClientIp = (req: Request): string => req.ip || req.socket.remoteAddress || 'unknown';

export const getUserAgent = (req: Request): string => (req.get('user-agent') || '').slice(0, MAX_UA_LENGTH);

/** "Chrome on Windows" style label for the sessions list. Intentionally coarse. */
export function describeUserAgent(ua: string | undefined): string {
  if (!ua) return 'Unknown device';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) || /CriOS\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser';
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'an unknown OS';
  return `${browser} on ${os}`;
}
