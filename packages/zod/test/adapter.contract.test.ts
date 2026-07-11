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

adapterContractSuite("zod", {
  goodNestedResolver: zodResolver(goodNestedSchema),
  goodArrayResolver: zodResolver(goodArraySchema),
  badArrayResolver: zodResolver(badArraySchema),
});
