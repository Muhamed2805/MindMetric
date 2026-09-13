import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { account, getDb, session, user, verification } from "@mindmetric/db";
import { betterAuth } from "better-auth";
import { USER_ROLE } from "./roles";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function useSecureAuthCookies(authUrl: string) {
  return authUrl.startsWith("https://");
}

export function createAuth() {
  const authUrl = requiredEnv("BETTER_AUTH_URL");
  return betterAuth({
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    baseURL: authUrl,
    trustedOrigins: [requiredEnv("WEB_ORIGIN")],
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: USER_ROLE,
          input: false,
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
      customRules: {
        "/sign-in/email": {
          window: 60,
          max: 5,
        },
        "/sign-up/email": {
          window: 60,
          max: 5,
        },
      },
    },
    advanced: {
      useSecureCookies: useSecureAuthCookies(authUrl),
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

export function getAuth() {
  if (!auth) {
    auth = createAuth();
  }

  return auth;
}
