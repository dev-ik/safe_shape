# RFC 0043: Correct literal equality inside graph comparison

## Status

Accepted as a correctness fix for 3.1 quality qualification.

## Problem and Correction

Graph comparison intentionally avoids whole-node equality shortcuts so recursive
references are checked in their own definition context. However, the literal
leaf branch unconditionally reported `literal.value.changed`, including when
both encoded literal values were equal. Consequently `union([string(),
literal(null)])` versus `nullable(string())` incorrectly reported breaking in
v2 while v1 and runtime acceptance agreed.

After existing opaque-behavior guards, equal literal values must produce a safe
leaf analysis using the existing encoded-literal equality function. Unequal
values retain their current breaking finding. Graph annotation classification,
reference traversal, opaque guards, snapshot serialization, and public shapes
remain unchanged. This corrects a false breaking result; it does not weaken the
requirements for declaring arbitrary opaque behavior safe.

## Evidence

A fixed-seed nested-schema grammar exposed the case. A minimized regression
covers nullable/optional versus equivalent unions in every mode and graph side,
and unequal literals remain breaking. Existing recursive tests and generated
witnesses must pass before release.
