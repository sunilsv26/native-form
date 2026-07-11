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

const nestedArraySchema = yup.object({
  groups: yup
    .array()
    .of(yup.array().of(yup.object({ email: yup.string().email().required() }))),
});

const optionalSchema = yup.object({
  maybe: yup
    .object({
      nickname: yup.string().optional(),
    })
    .optional(),
});

const unionSchema = yup.object({
  item: yup.lazy((val) => {
    if (typeof val === "string") return yup.string();
    return yup.object({ email: yup.string().email().required() });
  }),
});

adapterContractSuite("yup", {
  goodNestedResolver: yupResolver(goodNestedSchema as any),
  goodArrayResolver: yupResolver(goodArraySchema as any),
  badArrayResolver: yupResolver(badArraySchema as any),
  nestedArrayResolver: yupResolver(nestedArraySchema as any),
  optionalResolver: yupResolver(optionalSchema as any),
  unionResolver: yupResolver(unionSchema as any),
});
