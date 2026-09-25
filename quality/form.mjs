import { object, string } from "@safe-shape/core";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
export async function runForm() {
  const schema = object({ id: string(), profile: object({ name: string().transform((value) => value.trim()).pipe(string({ minLength: 2 })).warnAsync(async () => false, { id: "notice/v1" }) }) }).omit(["id"]);
  const resolver = standardSchemaResolver(schema);
  const options = { fields: {}, shouldUseNativeValidation: false, criteriaMode: "all" };
  const valid = await resolver({ profile: { name: "Ada" } }, {}, options);
  const invalid = await resolver({ profile: { name: "a" } }, {}, options);
  const rejection = object({ name: string().refineAsync(async () => { throw new Error("private"); }, { id: "lookup/v1" }) });
  const failed = await standardSchemaResolver(rejection)({ name: "Ada" }, {}, options);
  return { valid, invalid, failed, native: await schema.safeParseAsync({ profile: { name: "Ada" } }) };
}

export async function validateProfile(values) {
  const schema = object({ id: string(), profile: object({ name: string().transform((value) => value.trim()).pipe(string({ minLength: 2 })).warnAsync(async () => false, { id: "notice/v1" }) }) }).omit(["id"]);
  return standardSchemaResolver(schema)(values, {}, { fields: {}, shouldUseNativeValidation: false, criteriaMode: "all" });
}
