const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export function resolveOpenApiReference(document, value, seen = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.$ref) return value;
  const reference = value.$ref;
  if (typeof reference !== 'string' || !reference.startsWith('#/')) throw new Error('UNSUPPORTED_OPENAPI_REFERENCE');
  if (seen.has(reference)) throw new Error('CYCLIC_OPENAPI_REFERENCE');
  let resolved = document;
  for (const part of reference.slice(2).split('/')) resolved = resolved?.[part.replaceAll('~1', '/').replaceAll('~0', '~')];
  if (!resolved) throw new Error('UNRESOLVED_OPENAPI_REFERENCE');
  const siblingEntries = Object.entries(value).filter(([key]) => key !== '$ref');
  const target = resolveOpenApiReference(document, resolved, new Set([...seen, reference]));
  return siblingEntries.length === 0 ? target : { ...target, ...Object.fromEntries(siblingEntries) };
}

function operationParameters(document, pathItem, operation) {
  const combined = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
    .map(parameter => resolveOpenApiReference(document, parameter));
  const byIdentity = new Map();
  for (const parameter of combined) byIdentity.set(`${parameter.in}:${parameter.name}`, parameter);
  return [...byIdentity.values()];
}

export function listOpenApiOperations(document) {
  const operations = [];
  for (const [path, rawPathItem] of Object.entries(document?.paths ?? {})) {
    const pathItem = resolveOpenApiReference(document, rawPathItem);
    for (const method of METHODS) {
      const rawOperation = pathItem?.[method.toLowerCase()];
      if (!rawOperation) continue;
      const operation = resolveOpenApiReference(document, rawOperation);
      operations.push({ ...operation, parameters: operationParameters(document, pathItem, operation), method, path });
    }
  }
  return operations;
}

function decodedSegments(pathname) {
  try { return pathname.split('/').map(segment => decodeURIComponent(segment)); }
  catch { throw new Error('INVALID_API_PATH'); }
}

function assertSafePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/api/v1/') || path.includes('#')) throw new Error('INVALID_API_PATH');
  if (decodedSegments(path.split('?')[0]).some(segment => segment === '..' || segment === '.')) throw new Error('INVALID_API_PATH');
  const url = new URL(path, 'https://contract.invalid');
  if (url.origin !== 'https://contract.invalid' || decodedSegments(url.pathname).some(segment => segment === '..' || segment === '.')) throw new Error('INVALID_API_PATH');
  return url;
}

function matchTemplate(template, pathname) {
  const expected = template.split('/');
  const actual = pathname.split('/');
  if (expected.length !== actual.length) return undefined;
  const parameters = {};
  for (let index = 0; index < expected.length; index += 1) {
    const match = expected[index].match(/^\{([^}]+)\}$/);
    if (match) parameters[match[1]] = decodeURIComponent(actual[index]);
    else if (expected[index] !== actual[index]) return undefined;
  }
  return parameters;
}

export function discoverOperation(document, method, path) {
  const normalizedMethod = String(method ?? '').toUpperCase();
  if (!METHODS.has(normalizedMethod)) throw new Error('INVALID_REQUEST');
  const url = assertSafePath(path);
  for (const [template, rawPathItem] of Object.entries(document?.paths ?? {})) {
    const pathItem = resolveOpenApiReference(document, rawPathItem);
    const pathParameters = matchTemplate(template, url.pathname);
    const rawOperation = pathItem[normalizedMethod.toLowerCase()];
    if (pathParameters && rawOperation) {
      const operation = resolveOpenApiReference(document, rawOperation);
      return { ...operation, parameters: operationParameters(document, pathItem, operation), template, method: normalizedMethod, pathParameters };
    }
  }
  throw new Error('OPERATION_NOT_IN_VERIFIED_CONTRACT');
}

function resolveSchema(document, schema, seen = new Set()) {
  if (!schema?.$ref) return schema ?? {};
  return resolveSchema(document, resolveOpenApiReference(document, schema, seen), seen);
}

function valid(document, inputSchema, value, seen = new Set()) {
  const schema = resolveSchema(document, inputSchema, seen);
  if (Array.isArray(schema.type)) return schema.type.some(type => valid(document, { ...schema, type }, value, seen));
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.anyOf && !schema.anyOf.some(item => valid(document, item, value, seen))) return false;
  if (schema.oneOf && schema.oneOf.filter(item => valid(document, item, value, seen)).length !== 1) return false;
  if (schema.allOf && !schema.allOf.every(item => valid(document, item, value, seen))) return false;
  if (schema.type === 'null') return value === null;
  if (schema.type === 'string') {
    if (typeof value !== 'string' || (schema.minLength !== undefined && value.length < schema.minLength) || (schema.maxLength !== undefined && value.length > schema.maxLength)) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) return false;
    if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
    if (schema.format === 'uri') { try { new URL(value); } catch { return false; } }
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (schema.type === 'integer' && !Number.isInteger(value))) return false;
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
  }
  if (schema.type === 'boolean' && typeof value !== 'boolean') return false;
  if (schema.type === 'array') {
    if (!Array.isArray(value) || (schema.minItems !== undefined && value.length < schema.minItems) || (schema.maxItems !== undefined && value.length > schema.maxItems)) return false;
    if (!value.every(item => valid(document, schema.items ?? {}, item, seen))) return false;
    if (schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) return false;
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if ((schema.required ?? []).some(key => !(key in value))) return false;
    if (schema.maxProperties !== undefined && Object.keys(value).length > schema.maxProperties) return false;
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) return false;
    for (const [key, item] of Object.entries(value)) {
      if (schema.propertyNames && !valid(document, schema.propertyNames, key, seen)) return false;
      const child = schema.properties?.[key];
      if (child && !valid(document, child, item, seen)) return false;
      if (!child && schema.additionalProperties === false) return false;
      if (!child && typeof schema.additionalProperties === 'object' && !valid(document, schema.additionalProperties, item, seen)) return false;
    }
  }
  return true;
}

function coerceQuery(schema, value) {
  const type = schema?.type;
  if (type === 'integer' || type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  if (type === 'boolean') return value === 'true' ? true : value === 'false' ? false : value;
  return value;
}

export function validateOperationRequest(document, operation, { body, query = new URLSearchParams() } = {}) {
  const requestBody = operation.requestBody;
  if (requestBody?.required && body === undefined) throw new Error('REQUEST_BODY_REQUIRED');
  if (!requestBody && body !== undefined) throw new Error('REQUEST_BODY_FORBIDDEN');
  if (body !== undefined && operation['x-max-body-bytes'] !== undefined && Buffer.byteLength(JSON.stringify(body)) > operation['x-max-body-bytes']) throw new Error('REQUEST_BODY_TOO_LARGE');
  if (body !== undefined && !valid(document, requestBody?.content?.['application/json']?.schema ?? {}, body)) throw new Error('REQUEST_SCHEMA_MISMATCH');
  const parameters = (operation.parameters ?? []).map(item => resolveOpenApiReference(document, item));
  const queryParameters = new Map(parameters.filter(item => item.in === 'query').map(item => [item.name, item]));
  for (const key of query.keys()) if (!queryParameters.has(key)) throw new Error('UNKNOWN_QUERY_PARAMETER');
  for (const [name, parameter] of queryParameters) {
    const values = query.getAll(name);
    if (parameter.required && values.length === 0) throw new Error('QUERY_SCHEMA_MISMATCH');
    if (values.some(value => !valid(document, parameter.schema ?? {}, coerceQuery(parameter.schema, value)))) throw new Error('QUERY_SCHEMA_MISMATCH');
  }
  for (const parameter of parameters.filter(item => item.in === 'path')) {
    const value = operation.pathParameters?.[parameter.name];
    if (parameter.required && value === undefined) throw new Error('PATH_SCHEMA_MISMATCH');
    if (value !== undefined && !valid(document, parameter.schema ?? {}, value)) throw new Error('PATH_SCHEMA_MISMATCH');
  }
  return operation;
}

export function assertOperationScope(operation, scopes = []) {
  const required = operation?.['x-required-scope'];
  if (required && !['public', 'authenticated'].includes(required) && !scopes.includes(required)) throw new Error('MISSING_OPERATION_SCOPE');
}
