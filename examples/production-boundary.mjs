import { object, string } from "@safe-shape/core";

const user = object({ id: string({ minLength: 1 }), name: string({ minLength: 1 }) });
const createUser = user.omit(["id"]);

// Application policy, using ordinary SafeShape results. No environment switch.
export function createUserHandler({ saveUser, report = (event) => console.warn(JSON.stringify(event)) }) {
  return async function handleCreateUser(input) {
    let boundary = "request";
    try {
      const request = await createUser.safeParseAsync(input);
      if (!request.success) {
        reportSafely(report, violation(boundary, request.error));
        return { status: 400, body: { code: "invalid_request" } };
      }
      boundary = "operation";
      const saved = await saveUser(request.data);
      boundary = "response";
      const response = await user.safeParseAsync(saved);
      if (!response.success) {
        reportSafely(report, violation(boundary, response.error));
        return { status: 503, body: { code: "response_unavailable" } };
      }
      return { status: 201, body: response.data };
    } catch {
      // Covers unexpected parsing/runtime and application callback failures.
      // Do not log raw exceptions: their messages can contain private values.
      reportSafely(report, Object.freeze({ type: "operation_failed", operation: "create-user", boundary }));
      return { status: 503, body: { code: "operation_unavailable" } };
    }
  };
}

function violation(boundary, error) {
  return Object.freeze({
    type: "contract_violation", operation: "create-user", boundary,
    diagnostics: Object.freeze(error.issues.map((issue) => Object.freeze({
      code: issue.code,
      // Unexpected property names are input too; log only known contract paths.
      path: Object.freeze(issue.path.map((key) => key === "name" || key === "id" ? key : "<unknown>")),
    }))),
  });
}

function reportSafely(report, event) {
  try {
    // Attach rejection handling immediately. A pending sink must not stall work.
    void Promise.resolve(report(event)).catch(() => undefined);
  } catch {
    // Logging is best effort and cannot change the operation's result.
  }
}
