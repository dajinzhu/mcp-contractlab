import { message } from '../i18n/message.js';
import { parentPort, workerData } from 'node:worker_threads';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { schemaFailure } from './schema.js';

const { schema, value } = workerData as {
  schema: object | boolean;
  value: unknown;
};
try {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: false,
    validateFormats: false,
    addUsedSchema: false,
  });
  const validate = ajv.compile(schema);
  const valid = validate(value);
  const error = validate.errors?.[0];
  parentPort?.postMessage(
    valid
      ? { valid, diagnostic: '' }
      : schemaFailure(
          message(
            'schema.validation',
            error?.instancePath || '/',
            error?.keyword || 'schema',
          ),
        ),
  );
} catch {
  parentPort?.postMessage(schemaFailure(message('schema.unsupported')));
}
