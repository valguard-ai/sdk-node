import { parseValidationHeaders } from "./headers.js";
import { parseValGuardError, ValGuardError } from "./errors.js";
import {
  verifyWebhookSignature,
  signWebhookPayload,
  WEBHOOK_SIGNATURE_HEADER,
} from "./webhook.js";

export {
  parseValidationHeaders,
  parseValGuardError,
  ValGuardError,
  verifyWebhookSignature,
  signWebhookPayload,
  WEBHOOK_SIGNATURE_HEADER,
};

/**
 * @typedef {Object} ValGuardOptions
 * @property {string} apiKey ValGuard API key (`vg_live_…`)
 * @property {string} baseURL Layer base URL (no trailing slash; set via VG_PROXY)
 * @property {string} [agentSlug="default"] Agent slug sent as `X-VG-Agent`
 * @property {string} [flowSlug] Playbook slug sent as `X-VG-Flow` (mutually exclusive with agentSlug)
 * @property {string} [providerKey] Upstream LLM key (`X-Provider-Key`, BYOK)
 * @property {string} [requestId] Optional client correlation id
 * @property {string} [internalSecret] `X-VG-Internal-Secret` for `/internal/*` endpoints (CI/staging)
 * @property {string} [projectId] `X-VG-Project-Id` when using internal secret auth
 */

/**
 * @typedef {Object} ChatCompletionRequest
 * @property {string} model `provider/model` slug
 * @property {Array<{role: string, content: string}>} messages
 * @property {boolean} [stream]
 * @property {number} [temperature]
 * @property {number} [max_tokens]
 */

/**
 * @typedef {Object} ChatCompletionResult
 * @property {number} status
 * @property {unknown} data Parsed JSON body
 * @property {import("./headers.js").ValidationHeaders} validation
 * @property {import("./errors.js").ValGuardErrorInfo | null} error
 */

/**
 * @typedef {Object} TestValidatorsRequest
 * @property {string} output Completion text to validate
 * @property {string} agentSlug Agent slug (required)
 * @property {string} [inputText] Optional prompt text for input-aware validators
 * @property {Array<string | { id?: string, text: string }>} [ragSources]
 * @property {number} [reaskAttempt]
 */

/**
 * @typedef {Object} TestValidatorsResult
 * @property {number} status
 * @property {unknown} data Parsed JSON body
 * @property {import("./headers.js").ValidationHeaders} validation
 * @property {import("./errors.js").ValGuardErrorInfo | null} error
 */

/**
 * @param {string | { id?: string, text: string }} source
 */
function normalizeRagSource(source) {
  if (typeof source === "string") {
    return source;
  }
  return { id: source.id ?? "", text: source.text };
}

/**
 * @param {ValGuardOptions} opts
 */
export function createValGuardClient(opts) {
  const base = opts.baseURL.replace(/\/$/, "");
  const agent = opts.agentSlug ?? "default";

  return {
    baseURL: `${base}/v1`,
    agentSlug: agent,
    defaultHeaders: buildHeaders(opts),

    openaiOptions() {
      const defaultHeaders = opts.flowSlug
        ? { "X-VG-Flow": opts.flowSlug }
        : { "X-VG-Agent": agent };
      return {
        apiKey: opts.apiKey,
        baseURL: `${base}/v1`,
        defaultHeaders,
      };
    },

    buildHeaders(overrides = {}) {
      return buildHeaders({ ...opts, ...overrides });
    },

    withAgent(agentSlug) {
      return createValGuardClient({ ...opts, agentSlug, flowSlug: undefined });
    },

    withPlaybook(flowSlug) {
      return createValGuardClient({ ...opts, flowSlug, agentSlug: undefined });
    },

    withProviderKey(providerKey) {
      return createValGuardClient({ ...opts, providerKey });
    },

    /**
     * @param {Array<string | { id?: string, text: string }>} sources
     */
    withRAGSources(sources) {
      return createValGuardClient({
        ...opts,
        ragSources: sources.map(normalizeRagSource),
      });
    },

    parseResponseHeaders(headers) {
      return parseValidationHeaders(headers);
    },

    /**
     * POST /internal/test-validators — run agent validators without an LLM call.
     * @param {TestValidatorsRequest} body
     * @param {{ headers?: Record<string, string>, fetch?: typeof fetch }} [requestOpts]
     * @returns {Promise<TestValidatorsResult>}
     */
    async testValidators(body, requestOpts = {}) {
      const fetchImpl = requestOpts.fetch ?? globalThis.fetch;
      if (!fetchImpl) {
        throw new Error("fetch is not available — pass requestOpts.fetch");
      }
      if (!body?.output || !body?.agentSlug) {
        throw new Error("testValidators requires output and agentSlug");
      }

      const headers = {
        ...buildInternalTestHeaders(opts),
        "Content-Type": "application/json",
        ...requestOpts.headers,
      };

      /** @type {Record<string, unknown>} */
      const payload = {
        output: body.output,
        agent_slug: body.agentSlug,
      };
      if (body.inputText != null) payload.input_text = body.inputText;
      if (body.ragSources?.length) {
        payload.rag_sources = body.ragSources.map(normalizeRagSource);
      }
      if (body.reaskAttempt != null) payload.reask_attempt = body.reaskAttempt;

      const response = await fetchImpl(`${base}/internal/test-validators`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      return parseInternalTestResponse(response);
    },

    /**
     * POST /v1/chat/completions via fetch (no OpenAI SDK required).
     * @param {ChatCompletionRequest} body
     * @param {{ headers?: Record<string, string>, fetch?: typeof fetch }} [requestOpts]
     * @returns {Promise<ChatCompletionResult>}
     */
    async chatCompletions(body, requestOpts = {}) {
      const fetchImpl = requestOpts.fetch ?? globalThis.fetch;
      if (!fetchImpl) {
        throw new Error("fetch is not available — pass requestOpts.fetch or use openaiOptions()");
      }

      const headers = {
        ...buildHeaders(opts),
        "Content-Type": "application/json",
        ...requestOpts.headers,
      };

      const response = await fetchImpl(`${base}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const validation = parseValidationHeaders(response.headers);
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      const error = !response.ok || (data && typeof data === "object" && data.valid === false)
        ? parseValGuardError(response.status, data)
        : null;

      if (error && !error.softFail && !response.ok) {
        throw new ValGuardError(response.status, error);
      }

      return {
        status: response.status,
        data,
        validation,
        error,
      };
    },
  };
}

/**
 * @param {ValGuardOptions & { ragSources?: Array<string | { id?: string, text: string }> }} opts
 */
function assertMutuallyExclusiveHeaders(opts) {
  if (opts.flowSlug && opts.agentSlug != null && opts.agentSlug !== "") {
    throw new Error("mutually_exclusive_headers: use either withAgent or withPlaybook, not both");
  }
}

function buildHeaders(opts) {
  assertMutuallyExclusiveHeaders(opts);
  /** @type {Record<string, string>} */
  const headers = {
    Authorization: `Bearer ${opts.apiKey}`,
  };

  if (opts.flowSlug) {
    headers["X-VG-Flow"] = opts.flowSlug;
  } else {
    headers["X-VG-Agent"] = opts.agentSlug ?? "default";
  }

  if (opts.providerKey) {
    headers["X-Provider-Key"] = opts.providerKey;
  }
  if (opts.requestId) {
    headers["X-Request-Id"] = opts.requestId;
  }
  if (opts.ragSources?.length) {
    headers["X-VG-Sources"] = JSON.stringify(opts.ragSources.map(normalizeRagSource));
  }

  return headers;
}

/**
 * @param {ValGuardOptions & { ragSources?: Array<string | { id?: string, text: string }> }} opts
 */
function buildInternalTestHeaders(opts) {
  /** @type {Record<string, string>} */
  const headers = {};

  if (opts.apiKey) {
    headers.Authorization = `Bearer ${opts.apiKey}`;
  }
  if (opts.internalSecret) {
    headers["X-VG-Internal-Secret"] = opts.internalSecret;
  }
  if (opts.projectId) {
    headers["X-VG-Project-Id"] = opts.projectId;
  }
  if (!headers.Authorization && !(opts.internalSecret && opts.projectId)) {
    throw new Error(
      "testValidators requires apiKey or both internalSecret and projectId",
    );
  }

  return headers;
}

/**
 * @param {Response} response
 * @returns {Promise<TestValidatorsResult>}
 */
async function parseInternalTestResponse(response) {
  const validation = parseValidationHeaders(response.headers);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  const error = !response.ok ? parseValGuardError(response.status, data) : null;
  if (error && !response.ok) {
    throw new ValGuardError(response.status, error);
  }

  return {
    status: response.status,
    data,
    validation,
    error,
  };
}

export default class ValGuard {
  /**
   * @param {ValGuardOptions & { ragSources?: Array<string | { id?: string, text: string }> }} opts
   */
  constructor(opts) {
    this._optsRaw = opts;
    this._client = createValGuardClient(opts);
  }

  /** @param {Record<string, string | undefined>} [env] */
  static fromEnv(env = process.env) {
    const apiKey = env.VG_API_KEY ?? env.VALGUARD_API_KEY;
    const baseURL = env.VG_PROXY ?? env.VALGUARD_BASE_URL;
    const agentSlug = env.VG_AGENT ?? env.VALGUARD_AGENT ?? "default";
    const providerKey = env.VG_PROVIDER_KEY ?? env.OPENAI_API_KEY;
    const internalSecret = env.INTERNAL_PROXY_SECRET ?? env.VG_INTERNAL_SECRET;
    const projectId = env.VG_PROJECT_ID ?? env.VG_TEST_PROJECT_ID;

    if (!apiKey && !(internalSecret && projectId)) {
      throw new Error("Missing VG_API_KEY (or INTERNAL_PROXY_SECRET + VG_PROJECT_ID for internal test endpoints)");
    }
    if (!baseURL) {
      throw new Error("Missing VG_PROXY (layer base URL)");
    }

    return new ValGuard({
      apiKey,
      baseURL,
      agentSlug,
      providerKey,
      internalSecret,
      projectId,
    });
  }

  get baseURL() {
    return this._client.baseURL;
  }

  get agentSlug() {
    return this._client.agentSlug;
  }

  get defaultHeaders() {
    return this._client.defaultHeaders;
  }

  openaiOptions() {
    return this._client.openaiOptions();
  }

  buildHeaders(overrides) {
    return this._client.buildHeaders(overrides);
  }

  withAgent(agentSlug) {
    return new ValGuard({ ...this._optsRaw, agentSlug, flowSlug: undefined });
  }

  withPlaybook(flowSlug) {
    return new ValGuard({ ...this._optsRaw, flowSlug, agentSlug: undefined });
  }

  withProviderKey(providerKey) {
    return new ValGuard({ ...this._optsRaw, providerKey });
  }

  withRAGSources(sources) {
    return new ValGuard({ ...this._optsRaw, ragSources: sources.map(normalizeRagSource) });
  }

  parseResponseHeaders(headers) {
    return this._client.parseResponseHeaders(headers);
  }

  chatCompletions(body, requestOpts) {
    return this._client.chatCompletions(body, requestOpts);
  }

  testValidators(body, requestOpts) {
    return this._client.testValidators(body, requestOpts);
  }
}

export { ValGuard };
