import { auth0 } from "@/lib/auth0";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth0.getSession();
  const userId = session?.user.sub?.trim();

  return userId && userId.length > 0 ? userId : null;
}