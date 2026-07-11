import * as yup from "yup";
import { yupResolver } from "../src/index";
import { adapterContractSuite } from "@native-form/adapter-contracts";

const goodNestedSchema = yup.object({
  user: yup.object({
    email: yup.string().email().required(),
  }),
});

const goodArraySchema = yup.object({
  users: yup.array().of(
    yup.object({
      email: yup.string().email().required(),
    }),
  ),
});

const badArraySchema = yup.object({
  users: yup.array().of(
    yup.object({
      email: yup.string().email("Invalid email").required(),
    }),
  ),
});

adapterContractSuite("yup", {
  goodNestedResolver: yupResolver(goodNestedSchema as any),
  goodArrayResolver: yupResolver(goodArraySchema as any),
  badArrayResolver: yupResolver(badArraySchema as any),
});
