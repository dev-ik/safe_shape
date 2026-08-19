import { object, string } from "../packages/core/dist/index.js";
import {
  httpContract,
  safeParseHttpResponse,
} from "../packages/http/dist/index.js";

export const userResponseContract = httpContract({
  responses: {
    200: object({
      id: string(),
      name: string(),
    }),
  },
});

export function readUserResponse(
  input,
  status,
  {
    endpoint = "GET /users/me",
    fallback = () => undefined,
    report = () => undefined,
  },
) {
  const current = safeParseHttpResponse(userResponseContract, input, status);

  if (current.success) {
    return Object.freeze({ kind: "valid", data: current.data });
  }

  reportSafely(report, Object.freeze({
    type: "contract_violation",
    boundary: "response",
    endpoint,
    status,
    diagnostics: Object.freeze(current.error.issues.map((issue) => Object.freeze({
      code: issue.code,
      path: issue.path,
    }))),
  }));

  const fallbackInput = readFallbackSafely(fallback);
  const recovered = safeParseHttpResponse(userResponseContract, fallbackInput, status);

  if (recovered.success) {
    return Object.freeze({
      kind: "recovered",
      data: recovered.data,
      error: current.error,
    });
  }

  return Object.freeze({ kind: "unavailable", error: current.error });
}

function reportSafely(report, event) {
  try {
    report(event);
  } catch {
    // Telemetry must not control the response recovery path.
  }
}

function readFallbackSafely(fallback) {
  try {
    return fallback();
  } catch {
    return undefined;
  }
}
