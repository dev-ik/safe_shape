# Production Response Recovery

Runtime response validation detects contract drift after deployment. A client
can report that drift without treating invalid network data as trusted
application data or crashing the whole interface.

`recoverHttpResponse()` keeps validation strict while providing the repeated
framework-neutral control flow. The application still decides how to report a
violation, read trusted fallback input, and render an unavailable state.

## Recommended Flow

1. Call `recoverHttpResponse()` with the network value and an eager or lazy
   fallback.
2. Return parsed data immediately when the state is `valid`.
3. For `recovered` or `unavailable`, report only contract metadata and the
   immutable issues from `networkError`.
4. Render recovered data or a local unavailable state according to `kind`.

Never return the failed network payload as the inferred response type. A cast
such as `payload as User` only moves the failure into application rendering.

## Typed Application Example

```ts
import type { Issue } from "@safe-shape/core";
import { object, string, type Infer } from "@safe-shape/core";
import {
  httpContract,
  recoverHttpResponse,
  type HttpResponseRecoveryResult,
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
type UserResponseState = HttpResponseRecoveryResult<User>;

function readCachedUser(): unknown {
  try {
    const serialized = localStorage.getItem("user");
    return serialized === null ? undefined : JSON.parse(serialized);
  } catch {
    return undefined;
  }
}

declare const telemetry: {
  capture(name: string, event: unknown): void | Promise<void>;
};

function reportContractViolation(event: {
  readonly endpoint: string;
  readonly status: number;
  readonly diagnostics: readonly {
    readonly code: Issue["code"];
    readonly path: Issue["path"];
  }[];
}): void {
  try {
    void Promise.resolve(telemetry.capture("contract_violation", event))
      .catch(() => undefined);
  } catch {
    // Telemetry must not control recovery, even when the SDK throws immediately.
  }
}

export function readUserResponse(input: unknown, status: number): UserResponseState {
  const state = recoverHttpResponse(getUserContract, input, {
    status,
    getFallback: readCachedUser,
  });

  if (state.kind === "valid") return state;

  reportContractViolation({
    endpoint: "GET /users/me",
    status,
    diagnostics: state.networkError.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
    })),
  });

  return state;
}
```

The `recovered` branch contains only data that passed the same schema as the
network response. The original failure remains available as `networkError`.
The `unavailable` branch also contains `fallbackError`, so local diagnostics
can distinguish deployed drift from an invalid cache. It lets the affected
component render a local error state instead of throwing during property
access.

Use `fallback` instead of `getFallback` when the fallback value is already
available. Exactly one must be provided. A lazy fallback is never read for a
valid network response. If reading storage can throw, catch that failure inside
`getFallback` and return `undefined` or another `unknown` value for validation;
application callback exceptions are not swallowed by the helper.

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

Attach rejection handling immediately for asynchronous sinks as well. The runnable
example isolates both throwing and rejecting reporters without waiting for a
pending logger. Its fallback callback is synchronous; use the async parsing API
and application-owned async storage handling when cache reads need awaiting.

For server requests and service failures, see
[Production boundaries](production-boundaries.md).

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
