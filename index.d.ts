export type ValidationStatus = "pass" | "warn" | "block" | "shadow";

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
};

export type ChatCompletionRequest = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
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
  parseResponseHeaders(headers: Headers | Record<string, string | undefined | null>): ValidationHeaders;
  chatCompletions(
    body: ChatCompletionRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<ChatCompletionResult>;
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
  parseResponseHeaders(headers: Headers | Record<string, string | undefined | null>): ValidationHeaders;
  chatCompletions(
    body: ChatCompletionRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<ChatCompletionResult>;
  testValidators(
    body: TestValidatorsRequest,
    requestOpts?: { headers?: Record<string, string>; fetch?: typeof fetch },
  ): Promise<TestValidatorsResult>;
}

export { ValGuard };
