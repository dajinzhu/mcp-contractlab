import { expect, it } from 'vitest';
import { initTemplate } from '../../src/config/init.js';
import { parseConfig } from '../../src/config/load.js';

it.each(['en', 'zh-CN'] as const)(
  'produces a valid empty versioned %s template',
  (locale) => {
    const config = parseConfig(initTemplate(locale), '/tmp/config.yaml');
    expect(config.schemaVersion).toBe(1);
    expect(config.cases).toEqual([]);
    expect(config.safety.allowToolCalls).toEqual([]);
    expect(config.safety.maxToolCalls).toBe(0);
    expect(config.server.transport).toBe('stdio');
    expect(initTemplate(locale)).toBe(initTemplate(locale));
  },
);
