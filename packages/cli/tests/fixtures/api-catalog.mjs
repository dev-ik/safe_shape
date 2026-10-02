import { apiContract, httpEndpoint } from "@safe-shape/api";
import { object, string } from "@safe-shape/core";

const base = { method: "get", path: "/users/{id}", request: { params: object({ id: string() }) } };
export default apiContract({ getUser: httpEndpoint({ ...base, responses: { 200: object({ id: string() }) } }) });
export const breaking = apiContract({ getUser: httpEndpoint({ ...base, path: "/accounts/{id}", responses: { 200: object({ id: string() }) } }) });
export const refined = apiContract({ getUser: httpEndpoint({ ...base, responses: { 200: object({ id: string() }).refine(() => true, { id: "rule/v1" }) } }) });
