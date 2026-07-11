import { z } from "zod";
import { zodResolver } from "../src/index";
import { adapterContractSuite } from "@native-form/adapter-contracts";

const goodNestedSchema = z.object({
  user: z.object({
    email: z.string().email(),
  }),
});

const goodArraySchema = z.object({
  users: z.array(
    z.object({
      email: z.string().email(),
    }),
  ),
});

const badArraySchema = z.object({
  users: z.array(
    z.object({
      email: z.string().email("Invalid email"),
    }),
  ),
});

const nestedArraySchema = z.object({
  groups: z.array(z.array(z.object({ email: z.string().email() }))),
});

const optionalSchema = z.object({
  maybe: z
    .object({
      nickname: z.string().optional(),
    })
    .optional(),
});

// (unionSchema defined later with nullable branch)

const nullableSchema = z.object({
  maybe: z.string().nullable().optional(),
});

const discriminatedSchema = z.object({
  entry: z
    .object({
      type: z.union([z.literal("a"), z.literal("b")]),
    })
    .catchall(z.any())
    .extend({
      type: z.union([z.literal("a"), z.literal("b")]),
    }),
});

// Better: discriminated union for entry
const discriminatedUnionSchema = z.object({
  entry: z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), a: z.string() }),
    z.object({ type: z.literal("b"), b: z.string() }),
    z.object({ type: z.literal("x"), x: z.object({ value: z.string() }) }),
  ]),
});

const tupleSchema = z.object({ tuple: z.tuple([z.string(), z.string()]) });

const unionSchema = z.object({
  item: z.union([
    z.string(),
    z.null(),
    z.object({ email: z.string().email() }),
  ]),
});

adapterContractSuite("zod", {
  goodNestedResolver: zodResolver(goodNestedSchema),
  goodArrayResolver: zodResolver(goodArraySchema),
  badArrayResolver: zodResolver(badArraySchema),
  nestedArrayResolver: zodResolver(nestedArraySchema),
  optionalResolver: zodResolver(optionalSchema),
  unionResolver: zodResolver(unionSchema),
  nullableResolver: zodResolver(nullableSchema),
  discriminatedResolver: zodResolver(discriminatedUnionSchema),
  tupleResolver: zodResolver(tupleSchema),
});
