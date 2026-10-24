import type { Tool } from '@modelcontextprotocol/client';
import { isDeepStrictEqual } from 'node:util';
import type { Report } from '../types.js';

export function coverageTracker() {
  let tools: Tool[] | undefined;
  const attempted = new Set<string>(),
    completed = new Set<string>();
  const branches: {
    tool: string;
    path: string;
    values: unknown[];
    observed: Set<number>;
  }[] = [];
  return {
    discover(definitions: Tool[]) {
      tools = definitions;
      for (const tool of tools) {
        const properties = tool.inputSchema.properties;
        if (!properties || typeof properties !== 'object') continue;
        for (const [key, schema] of Object.entries(properties).sort(
          ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
        )) {
          if (
            schema &&
            typeof schema === 'object' &&
            !Array.isArray(schema) &&
            Array.isArray(schema.enum) &&
            schema.enum.length <= 32
          )
            branches.push({
              tool: tool.name,
              path: '/' + key.replace(/~/g, '~0').replace(/\//g, '~1'),
              values: schema.enum,
              observed: new Set(),
            });
        }
      }
    },
    attempt(name: string) {
      attempted.add(name);
    },
    complete(name: string, args: Record<string, unknown>) {
      completed.add(name);
      for (const b of branches.filter((b) => b.tool === name)) {
        const key = b.path.slice(1).replace(/~1/g, '/').replace(/~0/g, '~');
        if (!Object.hasOwn(args, key)) continue;
        b.values.forEach((v, i) => {
          if (isDeepStrictEqual(v, args[key])) b.observed.add(i);
        });
      }
    },
    report(): NonNullable<Report['coverage']> {
      const advertised = tools?.map((t) => t.name).sort() ?? [];
      return {
        discoveryComplete: tools !== undefined,
        advertisedTools: advertised,
        attemptedTools: [...attempted].sort(),
        completedTools: [...completed].sort(),
        untestedTools: advertised.filter((n) => !completed.has(n)),
        enumBranches: branches.map((b) => ({
          tool: b.tool,
          path: b.path,
          total: b.values.length,
          observed: [...b.observed].sort((a, b) => a - b),
        })),
        limitations: [
          'Completed calls only; assertions passing does not prove full behavior coverage.',
          'Only explicit root-property enums with at most 32 values are tracked; refs, compositions, nested properties, optionality and arbitrary branches remain unmeasured.',
        ],
      };
    },
  };
}
