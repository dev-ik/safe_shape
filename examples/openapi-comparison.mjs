import assert from "node:assert/strict";
import { compareOpenApi } from "safe-shape";

const previous = `openapi: 3.1.0
info: {title: Users, version: '1'}
paths:
  /users:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: {type: string, minLength: 2}
      responses:
        204: {description: Saved}
`;
const next = previous.replace("minLength: 2", "minLength: 3");
const report = compareOpenApi(previous, next);
assert.equal(report.compatible, false);
assert.equal(report.decision, "migration-required");
assert.ok(report.findings.some((finding) => finding.comparison?.status === "breaking"));
assert.equal(compareOpenApi(next, previous).compatible, true);
console.log("OpenAPI YAML comparison: request tightening detected, widening accepted.");
