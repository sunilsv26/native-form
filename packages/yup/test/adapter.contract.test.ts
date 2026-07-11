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
    if (val === null) return yup.mixed().nullable();
    if (typeof val === "string") return yup.string();
    return yup.object({ email: yup.string().email().required() });
  }),
});

const nullableSchema = yup.object({
  maybe: yup.string().nullable().notRequired(),
});

const discriminatedUnionSchema = yup.object({
  entry: yup.lazy((val) => {
    if (val && val.type === "a") {
      return yup.object({
        type: yup.mixed().oneOf(["a"]).required(),
        a: yup.string().required(),
      });
    }

    if (val && val.type === "x") {
      return yup.object({
        type: yup.mixed().oneOf(["x"]).required(),
        x: yup.object({ value: yup.string().required() }).required(),
      });
    }

    return yup.object({
      type: yup.mixed().oneOf(["b"]).required(),
      b: yup.string().required(),
    });
  }),
});

const tupleSchema = yup.object({
  tuple: yup.array().of(yup.string()).length(2).required(),
});

adapterContractSuite("yup", {
  goodNestedResolver: yupResolver(goodNestedSchema as any),
  goodArrayResolver: yupResolver(goodArraySchema as any),
  badArrayResolver: yupResolver(badArraySchema as any),
  nestedArrayResolver: yupResolver(nestedArraySchema as any),
  optionalResolver: yupResolver(optionalSchema as any),
  unionResolver: yupResolver(unionSchema as any),
  nullableResolver: yupResolver(nullableSchema as any),
  discriminatedResolver: yupResolver(discriminatedUnionSchema as any),
  tupleResolver: yupResolver(tupleSchema as any),
});
