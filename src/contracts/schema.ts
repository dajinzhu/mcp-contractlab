import { message, english, type Text } from '../i18n/message.js';
import { Worker } from 'node:worker_threads';

export interface SchemaCheck {
  valid: boolean;
  diagnostic: string;
  presentation?: Text;
}
export function schemaFailure(text: Text): SchemaCheck {
  return { valid: false, diagnostic: english(text), presentation: text };
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
      () => finish(schemaFailure(message('schema.timeout'))),
      2000,
    );
    worker.once('message', (result: SchemaCheck) => finish(result));
    worker.once('error', () => finish(schemaFailure(message('schema.failed'))));
    worker.once('exit', (code) => {
      if (code !== 0) finish(schemaFailure(message('schema.terminated')));
    });
  });
}
