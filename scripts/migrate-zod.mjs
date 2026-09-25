import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/** Convert a deliberately restricted schema-only module without executing it. */
export function migrateZodSource(source, fileName = "schemas.ts") {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const issues = [];
  const fail = (node, message) => {
    const position = file.getLineAndCharacterOfPosition(node.getStart(file));
    issues.push({ line: position.line + 1, column: position.character + 1, message });
    throw new Error("unsupported");
  };
  if (file.parseDiagnostics.length) return { ok: false, issues: file.parseDiagnostics.map((issue) => ({ message: ts.flattenDiagnosticMessageText(issue.messageText, "\n") })) };
  const namespaces = new Set();
  const identifiers = new Set();
  const declarations = new Set();
  function collect(node) {
    if (ts.isIdentifier(node)) identifiers.add(node.text);
    ts.forEachChild(node, collect);
  }
  collect(file);
  const fresh = (base) => { let name = base; while (identifiers.has(name)) name += "_"; identifiers.add(name); return name; };
  const namespace = fresh("safeSchema");
  const inferred = { infer: fresh("SafeInfer"), input: fresh("SafeInput"), output: fresh("SafeOutput") };
  const typeImports = new Set();
  const f = ts.factory;
  const call = (name, args) => f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier(namespace), name), undefined, args);
  const memberCall = (base, name, args) => f.createCallExpression(f.createPropertyAccessExpression(base, name), undefined, args);
  const options = (entries) => f.createObjectLiteralExpression(entries.map(([key, value]) => f.createPropertyAssignment(key, value)), false);
  const literal = (node, allowZero = false) => {
    if (!allowZero && ts.isNumericLiteral(node) && Number(node.text) === 0) return fail(node, "Zero literal equality differs for -0; review manually.");
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword) return node;
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand) && Number(node.operand.text) !== 0) return node;
    return fail(node, "Expected a static JSON literal; expressions and special values need manual migration.");
  };
  function convert(node) {
    if (ts.isParenthesizedExpression(node)) return f.updateParenthesizedExpression(node, convert(node.expression));
    if (ts.isIdentifier(node) && declarations.has(node.text)) return node;
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.typeArguments?.length) return fail(node, "Only supported schema builder calls and schema references can be migrated.");
    const access = node.expression;
    const name = access.name.text;
    const args = [...node.arguments];
    const builder = ts.isIdentifier(access.expression) && namespaces.has(access.expression.text);
    if (!builder) {
      if (["optional", "nullable"].includes(name) && !args.length) return memberCall(convert(access.expression), name, []);
      if (["min", "max"].includes(name) && args.length === 1) {
        const base = convert(access.expression);
        if (!ts.isCallExpression(base) || !ts.isPropertyAccessExpression(base.expression) || !ts.isIdentifier(base.expression.expression) || base.expression.expression.text !== namespace) return fail(node, "Constraints require a direct numeric or array schema.");
        const kind = base.expression.name.text;
        if (kind === "string") return fail(node, "String length semantics differ: Zod counts UTF-16 units; SafeShape counts Unicode code points. Review manually.");
        if (kind !== "number" && kind !== "array") return fail(node, "Only numeric and array bounds are supported.");
        const value = literal(args[0], true);
        const numeric = Number(value.getText(file));
        if (!Number.isFinite(numeric) || (kind === "array" && (!Number.isInteger(numeric) || numeric < 0))) return fail(node, "Invalid numeric bound.");
        const index = kind === "array" ? 1 : 0;
        const key = kind === "number" ? (name === "min" ? "minimum" : "maximum") : (name === "min" ? "minLength" : "maxLength");
        const prior = base.arguments[index];
        const properties = prior && ts.isObjectLiteralExpression(prior) ? [...prior.properties] : [];
        if (properties.some((property) => (property.name && ts.isIdentifier(property.name) && property.name.text === key))) return fail(node, "Repeated bounds need manual review to preserve all checks.");
        properties.push(f.createPropertyAssignment(key, value));
        const nextArgs = [...base.arguments]; nextArgs[index] = f.createObjectLiteralExpression(properties, false);
        return f.updateCallExpression(base, base.expression, undefined, nextArgs);
      }
      return fail(node, `Unsupported method .${name}(); preserve its semantics with an explicit manual migration.`);
    }
    if (["string", "number", "boolean", "unknown", "never"].includes(name) && !args.length) return call(name, []);
    if (name === "literal" && args.length === 1) return call(name, [literal(args[0])]);
    if (["array", "optional", "nullable"].includes(name) && args.length === 1) return call(name, [convert(args[0])]);
    if (["enum", "tuple", "union"].includes(name) && args.length === 1) {
      const values = ts.isAsExpression(args[0]) && args[0].type.getText(file) === "const" ? args[0].expression : args[0];
      if (!ts.isArrayLiteralExpression(values)) return fail(node, "Expected a literal array of values or schemas.");
      if (name !== "tuple" && !values.elements.length) return fail(node, "Empty enum and union need manual migration.");
      const items = values.elements.map((item) => name === "enum" ? literal(item) : convert(item));
      if (name === "enum" && (items.some((item) => !ts.isStringLiteral(item)) || new Set(items.map((item) => item.text)).size !== items.length)) return fail(node, "Only string enums are migrated automatically.");
      return call(name, [f.createArrayLiteralExpression(items)]);
    }
    if (["object", "strictObject", "looseObject"].includes(name) && args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
      const properties = args[0].properties.map((property) => {
        if (ts.isShorthandPropertyAssignment(property) && declarations.has(property.name.text)) return property;
        if (!ts.isPropertyAssignment(property)) return fail(property, "Object spreads, methods and dynamic properties need manual migration.");
        if (ts.isComputedPropertyName(property.name) && !ts.isStringLiteral(property.name.expression)) return fail(property, "Computed keys must be string literals.");
        return f.updatePropertyAssignment(property, property.name, convert(property.initializer));
      });
      const policy = name === "object" ? "strip" : name === "looseObject" ? "passthrough" : "reject";
      return call("object", [f.createObjectLiteralExpression(properties, true), options([["unknownProperties", f.createStringLiteral(policy)]])]);
    }
    return fail(node, `Unsupported Zod builder ${name}; no approximate replacement was generated.`);
  }
  const statements = [];
  for (const statement of file.statements) {
    try {
      if (ts.isImportDeclaration(statement)) {
        if (!ts.isStringLiteral(statement.moduleSpecifier) || !["zod", "zod/v4"].includes(statement.moduleSpecifier.text) || statement.importClause?.name || statement.importClause?.isTypeOnly) fail(statement, "Only namespace Zod imports are supported in schema-only modules.");
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
        else if (bindings && ts.isNamedImports(bindings) && bindings.elements.length === 1 && (bindings.elements[0].propertyName?.text ?? bindings.elements[0].name.text) === "z") namespaces.add(bindings.elements[0].name.text);
        else fail(statement, 'Use import { z } from "zod" or import * as z from "zod".');
      } else if (ts.isVariableStatement(statement) && (statement.declarationList.flags & ts.NodeFlags.Const)) {
        const converted = statement.declarationList.declarations.map((declaration) => {
          if (!ts.isIdentifier(declaration.name) || !declaration.initializer || declaration.type) fail(declaration, "Use const schema declarations without explicit annotations or destructuring.");
          const initializer = convert(declaration.initializer);
          declarations.add(declaration.name.text);
          return f.updateVariableDeclaration(declaration, declaration.name, undefined, undefined, initializer);
        });
        statements.push(f.updateVariableStatement(statement, statement.modifiers, f.updateVariableDeclarationList(statement.declarationList, converted)));
      } else if (ts.isTypeAliasDeclaration(statement) && ts.isTypeReferenceNode(statement.type) && ts.isQualifiedName(statement.type.typeName)) {
        const name = statement.type.typeName;
        const args = statement.type.typeArguments;
        if (!ts.isIdentifier(name.left) || !namespaces.has(name.left.text) || !Object.hasOwn(inferred, name.right.text) || args?.length !== 1 || !ts.isTypeQueryNode(args[0]) || !ts.isIdentifier(args[0].exprName) || !declarations.has(args[0].exprName.text) || statement.typeParameters?.length) fail(statement, "Only infer/input/output aliases of migrated schemas are supported.");
        typeImports.add(name.right.text);
        statements.push(f.updateTypeAliasDeclaration(statement, statement.modifiers, statement.name, undefined, f.createTypeReferenceNode(inferred[name.right.text], args)));
      } else fail(statement, "Move application code, callbacks and unsupported declarations out of the schema-only migration input.");
    } catch (error) { if (error.message !== "unsupported") throw error; }
  }
  if (issues.length) return { ok: false, issues };
  if (!declarations.size) return { ok: false, issues: [{ message: "No supported schema declarations found." }] };
  const specifiers = [f.createImportSpecifier(false, f.createIdentifier("schema"), f.createIdentifier(namespace))];
  for (const name of typeImports) specifiers.push(f.createImportSpecifier(true, f.createIdentifier({ infer: "Infer", input: "InferInput", output: "InferOutput" }[name]), f.createIdentifier(inferred[name])));
  statements.unshift(f.createImportDeclaration(undefined, f.createImportClause(false, undefined, f.createNamedImports(specifiers)), f.createStringLiteral("@safe-shape/core")));
  const output = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(f.updateSourceFile(file, statements));
  return { ok: true, source: output, notes: ["Review immutable outputs and diagnostic differences before adopting the generated module.", "Zod object stripping was made explicit. Unsupported code is never partially rewritten."] };
}

async function main(args) {
  const flags = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!["--input", "--out"].includes(args[i]) || !args[i + 1] || flags.has(args[i])) throw new Error("Usage: node scripts/migrate-zod.mjs --input schemas.ts [--out migrated.ts]");
    flags.set(args[i], args[i + 1]);
  }
  if (!flags.has("--input")) throw new Error("--input is required.");
  const input = resolve(flags.get("--input"));
  const output = flags.has("--out") ? resolve(flags.get("--out")) : undefined;
  if (input === output) throw new Error("Choose a separate output file for review.");
  const result = migrateZodSource(await readFile(input, "utf8"), input);
  if (result.ok && output) await writeFile(output, result.source, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
