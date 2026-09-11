import { object, string } from "@safe-shape/core";
export const schema = object({ id: string(), name: string() });
export const parse = (input) => schema.safeParse(input);
