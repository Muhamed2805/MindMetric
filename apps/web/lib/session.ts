import { getAuth } from "@mindmetric/auth";
import { headers } from "next/headers";

export async function getServerSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}
