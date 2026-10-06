import { object, string, number } from '@safe-shape/core';
export const userV1 = object({ name: string() });
export const userV2 = object({ name: string(), age: number().optional() });
