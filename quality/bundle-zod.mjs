import { strictObject, string } from "zod";
export const schema = strictObject({ id: string(), name: string() });
export const parse = (input) => schema.safeParse(input);
