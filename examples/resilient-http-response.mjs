import { object, string } from "../packages/core/dist/index.js";
import {
  httpContract,
  recoverHttpResponse,
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
  const state = recoverHttpResponse(userResponseContract, input, {
    status,
    getFallback: () => readFallbackSafely(fallback),
  });

  if (state.kind === "valid") return state;

  reportSafely(report, Object.freeze({
    type: "contract_violation",
    boundary: "response",
    endpoint,
    status,
    diagnostics: Object.freeze(state.networkError.issues.map((issue) => Object.freeze({
      code: issue.code,
      path: issue.path,
    }))),
  }));

  return state;
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
