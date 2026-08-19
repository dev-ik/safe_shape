# Production Response Recovery

Runtime response validation detects contract drift after deployment. A client
can report that drift without treating invalid network data as trusted
application data or crashing the whole interface.

SafeShape keeps this policy in application code. `safeParseHttpResponse()`
remains strict and side-effect free; the application decides how to report a
violation, recover from trusted fallback data, and render an unavailable state.

## Recommended Flow

1. Validate the network response with `safeParseHttpResponse()`.
2. Return parsed data when validation succeeds.
3. Report only contract metadata and immutable issues when validation fails.
4. Read a stale cache or construct another explicit fallback as `unknown`.
5. Validate the fallback through the same HTTP contract.
6. Return a local unavailable state when neither value satisfies the contract.

Never return the failed network payload as the inferred response type. A cast
such as `payload as User` only moves the failure into application rendering.

## Typed Application Example

```ts
import type { Issue, ValidationError } from "@safe-shape/core";
import { object, string, type Infer } from "@safe-shape/core";
import {
  httpContract,
  safeParseHttpResponse,
} from "@safe-shape/http";

const userSchema = object({
  id: string(),
  name: string(),
});

const getUserContract = httpContract({
  responses: {
    200: userSchema,
  },
});

type User = Infer<typeof userSchema>;
type UserResponseState =
  | { readonly kind: "valid"; readonly data: User }
  | {
      readonly kind: "recovered";
      readonly data: User;
      readonly error: ValidationError;
    }
  | { readonly kind: "unavailable"; readonly error: ValidationError };

function readCachedUser(): unknown {
  try {
    const serialized = localStorage.getItem("user");
    return serialized === null ? undefined : JSON.parse(serialized);
  } catch {
    return undefined;
  }
}

declare const telemetry: {
  capture(name: string, event: unknown): void;
};

function reportContractViolation(event: {
  readonly endpoint: string;
  readonly status: number;
  readonly diagnostics: readonly {
    readonly code: Issue["code"];
    readonly path: Issue["path"];
  }[];
}): void {
  // The telemetry adapter should isolate SDK failures and apply deduplication.
  telemetry.capture("contract_violation", event);
}

export function readUserResponse(input: unknown, status: number): UserResponseState {
  const current = safeParseHttpResponse(getUserContract, input, status);

  if (current.success) {
    return { kind: "valid", data: current.data };
  }

  reportContractViolation({
    endpoint: "GET /users/me",
    status,
    diagnostics: current.error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
    })),
  });

  const cached = safeParseHttpResponse(getUserContract, readCachedUser(), status);

  if (cached.success) {
    return {
      kind: "recovered",
      data: cached.data,
      error: current.error,
    };
  }

  return { kind: "unavailable", error: current.error };
}
```

The `recovered` branch contains only data that passed the same schema as the
network response. The original error remains available for diagnostics. The
`unavailable` branch lets the affected component render a local error state
instead of throwing during property access.

A runnable JavaScript version is available in
[`examples/resilient-http-response.mjs`](../examples/resilient-http-response.mjs).

## Telemetry Safety

Do not include the raw response body or complete issue objects by default. They
can contain credentials, session data, personal information, or
application-owned custom messages. Prefer an event with:

- endpoint or stable operation id;
- HTTP status;
- application and contract versions;
- request or trace id when it is safe to retain;
- selected SafeShape issue codes and application-redacted paths.

Record keys can appear as path segments, so applications with sensitive or
user-controlled keys must redact them before transmission. Keep the complete
immutable `ValidationError` locally when the recovery state needs it.

Group and rate-limit repeated violations by stable fields such as operation,
status, issue code, and issue path. Keep the telemetry adapter non-throwing so
an unavailable monitoring service cannot break response recovery.

## Environment Policy

Development and test environments can use the throwing `parseHttpResponse()`
helper when a violation should stop the flow immediately. Production code can
use the discriminated application state above. The schema and accepted values
stay identical in every environment; only the application's failure policy
changes.

Runtime recovery is the last line of defense. CI should also compare reviewed
response contract snapshots on the output side. For a server producer, a
forward compatibility check proves that the new response set remains inside
the previous consumer contract:

```sh
safe-shape --json contract check \
  --module ./dist/contracts/user.js \
  --export userSchema \
  --against ./.safe-shape/user.contract.json \
  --side output \
  --compatibility forward
```

The runtime path still matters when a backend is deployed without running that
gate or when an upstream service violates its declared contract.
