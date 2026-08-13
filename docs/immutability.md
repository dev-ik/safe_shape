# Immutability

Every schema operation returns a new schema.

## Runtime Guarantees

Schema instances are frozen after construction.

Operations such as `refine()` and `optional()` return new frozen schema instances and do
not mutate the original schema.

Refinement options are copied when a schema is created so later changes to the caller's
options object do not affect validation behavior.
