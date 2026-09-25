# Production failures without stopping the application

Runtime validation and application availability are separate responsibilities.
Handle invalid data at each request, message or component boundary: report the
violation and reject that operation, or recover with data checked by the same
schema. The next operation can continue normally.

Use `safeParse` or `safeParseAsync` and check `success` before accessing `data`.
`parse` and `parseAsync` intentionally throw on validation failures. Core never
changes these semantics based on NODE_ENV and does not configure a global logger.
Synchronous parsing of an async schema is a programming error; use the async
method. Unexpected JavaScript errors, such as a throwing input getter, still need
an application exception boundary.

The runnable [production handler](../examples/production-boundary.mjs) demonstrates:

- Invalid request: log a contract violation, return 400, do not call the service.
- Invalid service response: log a response violation, return a local 503 result.
- Unexpected parsing/service failure: log an operational failure and return 503.
- Valid request and response: return the validated data with status 201.
- Throwing, rejecting or pending telemetry: keep the chosen operation result.

```js
import { createUserHandler } from "../examples/production-boundary.mjs";

const handleCreateUser = createUserHandler({
  saveUser: async (input) => database.createUser(input),
  report: (event) => logger.warn(event),
});

const response = await handleCreateUser(requestBody);
// Map response.status/body to your framework's response API.
```

The handler is application code, not a new SafeShape API. Its default sink writes
a JSON event to console.warn. A supplied sink receives stable operation/boundary
names and selected issue codes with redacted paths, without raw inputs, returned
payloads, exception messages or custom diagnostic text. A rejected sink promise
gets a handler immediately; logging is best effort and is not awaited. Applications
can own bounded queues, rate limits and delivery guarantees in their logger.

HTTP response clients can instead use the existing
[validated fallback flow](production-response-recovery.md). Invalid data never
becomes trusted application data simply because a warning was logged. A 503 does
not undo an operation that already committed; transaction and retry policy belong
to the application.

`npm run examples:check` runs the
[production tests](../examples/production-boundary.test.mjs) with strict unhandled
rejection handling. They cover invalid → valid request sequences, callback
exceptions, throwing getters, response drift, logger throws/rejections and an
unavailable cache. They do not claim protection from process termination, memory
exhaustion or errors outside the application boundary.
