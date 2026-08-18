# Compatibility Rule Matrix

This document is the normative SafeShape 2.0 compatibility matrix. For each
requested direction, `source` is the set of values being migrated and `target`
is the receiving contract:

```text
backward: previous ⊆ next
forward:  next ⊆ previous
full:     both relationships
```

`safe` means containment is proven. `breaking` means a counterexample class is
known. `unknown` means neither proof is currently available. `risky` is
reserved for a credible non-containment risk without a formal counterexample.

## General Rules

| Source | Target | Result | Proof |
| --- | --- | --- | --- |
| exact semantic node | same node | `safe` | identical accepted set |
| runtime-equal, annotations changed | same runtime node | `annotation-only` | metadata is not runtime behavior |
| `never` without unresolved opaque behavior | any | `safe` | empty set is a subset of every set |
| any without unresolved opaque behavior | `unknown` | `safe` | `unknown` accepts every value |
| `unknown` | narrower target | `breaking` | source includes values outside target |
| inhabited source | provably empty target | `breaking` | a constructible source witness is rejected |
| source with unknown inhabitation | provably empty target | `unknown` | no source witness is proven |
| changed/anonymous opaque behavior | any dependent relationship | `unknown` | behavior cannot be reconstructed |
| provably disjoint primitive kinds | each other | `breaking` | accepted sets do not overlap |
| unsupported cross-kind relationship | any | `unknown` | no containment or counterexample proof |

## Node Rules

| Node or relationship | Safe condition | Breaking condition | Conservative result |
| --- | --- | --- | --- |
| string | source length interval is inside target; pattern and format unchanged | length counterexample exists | changed pattern/format is `unknown` |
| number/integer | source range/integer lattice is inside target | range or integer counterexample exists | unproven `multipleOf` lattice is `unknown` |
| literal | target accepts the exact value under all native constraints | target rejects the exact value | opaque target behavior is `unknown` |
| enum | every source member is accepted by target | at least one finite source member is rejected | non-finite source into enum is `unknown` unless separately proven |
| array | source length interval and item set are contained | length or item counterexample exists | opaque item relation propagates |
| tuple/array | fixed or effective source length is accepted and every positional/homogeneous item is contained | an accepted length or item counterexample exists | uninhabited alternative lengths remain `unknown` |
| union | every source choice is contained by a target choice | an uncovered finite singleton or inhabited choice disjoint from all targets exists | possible collective coverage of a non-finite choice is `unknown` |
| discriminated union | identical structure | none beyond general exact rules yet | changed structure is `unknown` |
| intersection | identical structure | none beyond general exact rules yet | changed structure is `unknown` |
| record | target key and value schemas contain source keys and values | either contained relationship breaks | opaque key/value relationship propagates |
| nullable/optional | target preserves the extra null/undefined member and contains the inner set | source member is removed | opaque inner relationship propagates |
| transform input | stable matching id and contained visible inner contract | contained native input rule breaks | changed/anonymous id is `unknown` |
| opaque transform output | stable matching non-anonymous id | no structural breaking claim for erased output | changed/anonymous id is `unknown` |
| reference/recursion | referenced definitions are coinductively contained, independent of ids and reuse topology | a concrete recursive member rule breaks | unsupported reference-dependent shortcuts remain `unknown` |

Literal checks include Unicode code point length, ECMAScript Unicode patterns,
SafeShape `email`, `uuid`, `date`, and `date-time` formats, numeric range,
integer, and exact decimal `multipleOf` constraints.

## Object Shape Rules

| Source property | Target property | Result |
| --- | --- | --- |
| required | same property optional, containing schema | `safe` |
| optional | same property required | `breaking` |
| absent under `reject` | new optional target property | `safe` |
| absent under `strip` | new optional target property | `breaking`: accepted input is rejected or newly emitted |
| absent under `passthrough` | optional universal identity property | `safe` |
| absent under `passthrough` | optional provably narrower property | `breaking` |
| absent under `passthrough` | optional opaque property | `unknown` |
| absent | new required target property | `breaking` |
| present | target absent under `reject` or `strip` | `breaking` |
| identity-preserving property present | target absent under `passthrough` | `safe` |
| transform/output-changing property present | target absent under `passthrough` | `unknown` |
| present in both | present in both | compare requiredness and property schemas recursively |

Unknown-property policies are intentionally stricter than input acceptance
alone because `strip` and `passthrough` produce different outputs:

| Source \ Target | `reject` | `strip` | `passthrough` |
| --- | --- | --- | --- |
| `reject` | `safe` | `safe` | `safe` |
| `strip` | `breaking` | `safe` | `breaking` |
| `passthrough` | `breaking` | `breaking` | `safe` |

Shape findings are combined with the policy result, so any breaking component
makes the directional report breaking.

## HTTP Presentation Mapping

HTTP presentation does not change containment results:

| Exchange | Producer | Consumer | Backward focus | Forward focus |
| --- | --- | --- | --- | --- |
| request | client | server | server consumer | client producer |
| response | server | client | client consumer | server producer |

Full compatibility presents both producer and consumer concerns. Each
presentation finding retains its original direction and proof data.

## Rule Completion

M5 is complete: finite enum/literal, tuple/array, witness-based union,
object-policy, recursive graph, side-selected transform, HTTP presentation,
migration diagnostics, and generic CI integration are implemented. Migration
diagnostics and transport presentation only project existing findings; neither
changes the containment proof defined by this matrix.
