import { auth } from "./server";
import { headers } from "next/headers";

export async function requireAuth() {
  return auth.api.getSession({ headers: await headers() });
}
