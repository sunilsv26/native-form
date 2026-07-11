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

const unionSchema = z.object({
  item: z.union([z.string(), z.object({ email: z.string().email() })]),
});

adapterContractSuite("zod", {
  goodNestedResolver: zodResolver(goodNestedSchema),
  goodArrayResolver: zodResolver(goodArraySchema),
  badArrayResolver: zodResolver(badArraySchema),
  nestedArrayResolver: zodResolver(nestedArraySchema),
  optionalResolver: zodResolver(optionalSchema),
  unionResolver: zodResolver(unionSchema),
});
