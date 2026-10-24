import { Worker } from 'node:worker_threads';

export interface SchemaCheck {
  valid: boolean;
  diagnostic: string;
}

/** Isolate untrusted schema regexes and recursive validation with a hard deadline. */
export function checkSchema(
  schema: unknown,
  value: unknown,
): Promise<SchemaCheck> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./schema-worker.js', import.meta.url), {
      workerData: { schema, value },
      resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 2 },
    });
    const finish = (result: SchemaCheck) => {
      clearTimeout(timer);
      void worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(
      () =>
        finish({
          valid: false,
          diagnostic: 'Schema validation exceeded 2 seconds',
        }),
      2000,
    );
    worker.once('message', (result: SchemaCheck) => finish(result));
    worker.once('error', () =>
      finish({ valid: false, diagnostic: 'Schema validation failed safely' }),
    );
    worker.once('exit', (code) => {
      if (code !== 0)
        finish({ valid: false, diagnostic: 'Schema worker terminated' });
    });
  });
}
