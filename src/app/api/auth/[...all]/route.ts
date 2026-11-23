import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

const handle = (request: Request) => getAuth().handler(request);

export const { GET, POST } = toNextJsHandler(handle);
