import { parentPort, workerData } from 'node:worker_threads';
import { Ajv2020 } from 'ajv/dist/2020.js';

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
  parentPort?.postMessage({
    valid,
    diagnostic: valid
      ? ''
      : `${error?.instancePath || '/'}: ${error?.keyword || 'schema'} validation failed`,
  });
} catch {
  parentPort?.postMessage({
    valid: false,
    diagnostic:
      'Unsupported or invalid advertised JSON Schema (external references are not fetched)',
  });
}
