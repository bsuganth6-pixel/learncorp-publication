import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const config = JSON.parse(readFileSync(resolve(root, 'frontend/vercel.json'), 'utf8')) as {
  $schema?: string;
  framework?: string;
  installCommand?: string;
  buildCommand?: string;
  regions?: string[];
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  [key: string]: unknown;
};

// Vercel function region for each Render region the API might be deployed to (the closest pairings).
const NEAREST_VERCEL_REGION: Record<string, string> = {
  singapore: 'sin1', oregon: 'pdx1', ohio: 'cle1', frankfurt: 'fra1', virginia: 'iad1',
};

describe('frontend/vercel.json', () => {
  it('is the project config Vercel reads for Root Directory = frontend', () => {
    expect(config.$schema).toBe('https://openapi.vercel.sh/vercel.json');
    expect(config.framework).toBe('nextjs');
    expect(config.installCommand).toBe('npm ci');
    expect(config.buildCommand).toBe('npm run build');
  });

  it('runs the server-rendered pages in the region nearest the API (render.yaml)', () => {
    const renderYaml = readFileSync(resolve(root, 'render.yaml'), 'utf8');
    const apiRegion = renderYaml.match(/^\s*region:\s*(\w+)/m)?.[1];
    expect(apiRegion, 'render.yaml should declare a region').toBeDefined();
    expect(config.regions).toEqual([NEAREST_VERCEL_REGION[apiRegion!]]);
  });

  it('adds the baseline security headers to every path, and no full CSP that could break Next.js or the map embed', () => {
    expect(config.headers).toHaveLength(1);
    const [rule] = config.headers!;
    expect(rule.source).toBe('/(.*)');
    const headers = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Permissions-Policy']).toContain('camera=()');

    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
    // These would also restrict what the site itself loads (scripts, styles, images, the map iframe).
    for (const restrictive of ['default-src', 'script-src', 'style-src', 'img-src', 'frame-src', 'child-src', 'connect-src']) {
      expect(csp).not.toContain(restrictive);
    }
  });

  it('leaves Referrer-Policy to next.config.js, which makes it stricter on the one-time-link pages', () => {
    const keys = config.headers!.flatMap((r) => r.headers.map((h) => h.key.toLowerCase()));
    expect(keys).not.toContain('referrer-policy');
    expect(keys).not.toContain('cache-control');
  });

  it('does not duplicate what next.config.js or the dashboard own: the /api proxy, environment variables, per-project secrets', () => {
    for (const key of ['rewrites', 'redirects', 'env', 'build', 'services', 'routes', 'functions']) {
      expect(config, `vercel.json should not set "${key}"`).not.toHaveProperty(key);
    }
  });
});
