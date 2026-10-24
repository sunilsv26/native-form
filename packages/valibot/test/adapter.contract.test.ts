import * as v from "valibot";
import { valibotResolver } from "../src/index";
import { adapterContractSuite } from "@native-form/adapter-contracts";

const goodNestedSchema = v.object({
  user: v.object({
    email: v.pipe(v.string(), v.email()),
  }),
});

const goodArraySchema = v.object({
  users: v.array(
    v.object({
      email: v.pipe(v.string(), v.email()),
    }),
  ),
});

const badArraySchema = v.object({
  users: v.array(
    v.object({
      email: v.pipe(v.string(), v.email("Invalid email")),
    }),
  ),
});

const nestedArraySchema = v.object({
  groups: v.array(
    v.array(
      v.object({
        email: v.pipe(v.string(), v.email()),
      }),
    ),
  ),
});

const optionalSchema = v.object({
  maybe: v.optional(
    v.object({
      nickname: v.optional(v.string()),
    }),
  ),
});

const nullableSchema = v.object({
  maybe: v.optional(v.nullable(v.string())),
});

const discriminatedUnionSchema = v.object({
  entry: v.variant("type", [
    v.object({ type: v.literal("a"), a: v.string() }),
    v.object({ type: v.literal("b"), b: v.string() }),
    v.object({ type: v.literal("x"), x: v.object({ value: v.string() }) }),
  ]),
});

const tupleSchema = v.object({
  tuple: v.tuple([v.string(), v.string()]),
});

const unionSchema = v.object({
  item: v.union([
    v.string(),
    v.null_(),
    v.object({ email: v.pipe(v.string(), v.email()) }),
  ]),
});

adapterContractSuite("valibot", {
  goodNestedResolver: valibotResolver(goodNestedSchema),
  goodArrayResolver: valibotResolver(goodArraySchema),
  badArrayResolver: valibotResolver(badArraySchema),
  nestedArrayResolver: valibotResolver(nestedArraySchema),
  optionalResolver: valibotResolver(optionalSchema),
  unionResolver: valibotResolver(unionSchema),
  nullableResolver: valibotResolver(nullableSchema),
  discriminatedResolver: valibotResolver(discriminatedUnionSchema),
  tupleResolver: valibotResolver(tupleSchema),
});

