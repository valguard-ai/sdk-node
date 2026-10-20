export type ValidationStatus =
  | "pass"
  | "warn"
  | "block"
  | "shadow"
  | "stream_passthrough"
  | "fail";

export type ValidationHeaders = {
  validationStatus: ValidationStatus | null;
  shadowMode: boolean;
  latencyMs: number | null;
  requestId: string | null;
  inputValidationShadow: boolean;
  validationPhase: "input" | null;
  overage: boolean;
  targetType: string | null;
  orchestrationPath: string | null;
  orchestrationValidationsUsed: number | null;
  orchestrationExecutionsRemaining: number | "unlimited" | null;
  idempotencyReplayed: boolean;
  healed: boolean;
  healedRules: string[];
  healedEventCount: number | null;
  healedTrace: string[];
  cacheStatus: string | null;
  traceId: string | null;
  spanId: string | null;
  parentSpanId: string | null;
  agentId: string | null;
  idempotentRunId: string | null;
  runId: string | null;
  runStatus: string | null;
  approvalId: string | null;
  licenseStatus: string | null;
  licenseMode: string | null;
};

export type ValGuardErrorInfo = {
  type: string;
  code: string | null;
  message: string | null;
  reason: string | null;
  details: unknown;
  softFail: boolean;
  body: unknown;
};

export type ValGuardOptions = {
  apiKey: string;
  baseURL: string;
  agentSlug?: string;
  flowSlug?: string;
  providerKey?: string;
  requestId?: string;
  ragSources?: Array<string | { id?: string; text: string }>;
  internalSecret?: string;
  projectId?: string;
  idempotencyKey?: string;
  approvalMode?: string;
  traceparent?: string;
  parentSpanId?: string;
  agentId?: string;
};

export type ChatToolFunction = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export type ChatTool = {
  type: "function";
  function: ChatToolFunction;
};

export type ChatCompletionRequest = {
  model: string;
  messages: Array<{ role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: ChatTool[];
  tool_choice?: unknown;
  parallel_tool_calls?: boolean;
  stream_options?: { include_usage?: boolean };
};

export type StreamChunkEvent =
  | { type: "done" }
  | { type: "raw"; raw: string }
  | {
      type: "chunk";
      id: string | null;
      model: string | null;
      delta: {
        role?: string | null;
        content?: string | null;
        tool_calls?: unknown;
      };
      finishReason: string | null;
      usage?: unknown;
    };

export type ChatCompletionResult = {
  status: number;
  data: unknown;
  validation: ValidationHeaders;
  error: ValGuardErrorInfo | null;
};

export type TestValidatorsRequest = {
  output: string;
  agentSlug: string;
  inputText?: string;
  ragSources?: Array<string | { id?: string; text: string }>;
  reaskAttempt?: number;
};

export type TestValidatorsResult = {
  status: number;
  data: unknown;
  validation: ValidationHeaders;
  error: ValGuardErrorInfo | null;
};

export function verifyWebhookSignature(
  rawBody: string | Buffer | Uint8Array,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean;

export function signWebhookPayload(rawBody: string | Buffer | Uint8Array, secret: string): string;

export const WEBHOOK_SIGNATURE_HEADER: "X-VG-Signature";

export const EVIDENCE_TYP: "valguard-evidence/1";

export function verifyEvidence(
  keyId: string,
  payload: string,
  signature: string,
  secret: string,
): boolean;

export function verifyProof(
  envelope: string | { key_id?: string; payload?: string; signature?: string },
  secret: string,
): boolean;

export function parseValidationHeaders(
  headers: Headers | Record<string, string | undefined | null>,
): ValidationHeaders;

export function parseValGuardError(
  status: number,
  body: unknown,
): ValGuardErrorInfo | null;

export class ValGuardError extends Error {
  status: number;
  info: ValGuardErrorInfo;
  constructor(status: number, info: ValGuardErrorInfo);
}

export function createValGuardClient(opts: ValGuardOptions): {
  baseURL: string;
  agentSlug: string;
  defaultHeaders: Record<string, string>;
  openaiOptions(): {
    apiKey: string;
    baseURL: string;
    defaultHeaders: Record<string, string>;
  };
  buildHeaders(overrides?: Partial<ValGuardOptions>): Record<string, string>;
  withAgent(agentSlug: string): ReturnType<typeof createValGuardClient>;
  withPlaybook(flowSlug: string): ReturnType<typeof createValGuardClient>;
  withProviderKey(providerKey: string): ReturnType<typeof createValGuardClient>;
  withRAGSources(
    sources: Array<string | { id?: string; text: string }>,
  ): ReturnType<typeof createValGuardClient>;
  withIdempotencyKey(idempotencyKey: string): ReturnType<typeof createValGuardClient>;
  withApprovalMode(approvalMode: string): ReturnType<typeof createValGuardClient>;
  withTrace(trace: {
    traceparent?: string;
    parentSpanId?: string;
    agentId?: string;
  }): ReturnType<typeof createValGuardClient>;
  parseResponseHeaders(headers: Headers | Record<string, string | undefined | null>): ValidationHeaders;
  chatCompletions(
    body: ChatCompletionRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<ChatCompletionResult>;
  chatCompletionsStream(
    body: ChatCompletionRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<{
    status: number;
    validation: ValidationHeaders;
    stream: AsyncIterable<StreamChunkEvent>;
    error: ValGuardErrorInfo | null;
  }>;
  testValidators(
    body: TestValidatorsRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<TestValidatorsResult>;
};

export default class ValGuard {
  constructor(opts: ValGuardOptions);
  static fromEnv(env?: Record<string, string | undefined>): ValGuard;
  readonly baseURL: string;
  readonly agentSlug: string;
  readonly defaultHeaders: Record<string, string>;
  openaiOptions(): ReturnType<ReturnType<typeof createValGuardClient>["openaiOptions"]>;
  buildHeaders(overrides?: Partial<ValGuardOptions>): Record<string, string>;
  withAgent(agentSlug: string): ValGuard;
  withPlaybook(flowSlug: string): ValGuard;
  withProviderKey(providerKey: string): ValGuard;
  withRAGSources(sources: Array<string | { id?: string; text: string }>): ValGuard;
  withIdempotencyKey(idempotencyKey: string): ValGuard;
  withApprovalMode(approvalMode: string): ValGuard;
  withTrace(trace: { traceparent?: string; parentSpanId?: string; agentId?: string }): ValGuard;
  parseResponseHeaders(headers: Headers | Record<string, string | undefined | null>): ValidationHeaders;
  chatCompletions(
    body: ChatCompletionRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<ChatCompletionResult>;
  chatCompletionsStream(
    body: ChatCompletionRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<{
    status: number;
    validation: ValidationHeaders;
    stream: AsyncIterable<StreamChunkEvent>;
    error: ValGuardErrorInfo | null;
  }>;
  testValidators(
    body: TestValidatorsRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<TestValidatorsResult>;
}

export { ValGuard };

export function parseChatCompletionStream(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<StreamChunkEvent>;
