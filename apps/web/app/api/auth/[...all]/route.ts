import { getAuth } from "@mindmetric/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(getAuth());
