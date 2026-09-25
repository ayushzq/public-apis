import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import FacebookProvider from "next-auth/providers/facebook";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";

// ── Root vs Agent identity ───────────────────────────────────────────────
// `email` is intentionally NOT unique on User anymore — it's unique per
// (email, accountType) [see prisma/schema.prisma]. That is what lets someone
// who is an AGENT on another workspace's org register their own ROOT
// (business-owner) account later using the same email address, exactly like
// signing up for two separate services with one inbox.
//
// NextAuth's PrismaAdapter assumes a plain-unique `email` column (it's built
// for the standard single-identity schema), so OAuth sign-in is wired
// through a thin shim below that always resolves/creates the ROOT identity
// for that email — social login is a business-owner-only path here; agents
// are invited by an owner and always sign in with a password.
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function withRootScopedIdentity(base: Adapter): Adapter {
  return {
    ...base,
    async getUserByEmail(email) {
      const user = await prisma.user.findFirst({ where: { email, accountType: "ROOT" } });
      return user as any;
    },
    async createUser(data: any) {
      const org = await prisma.organization.create({
        data: { name: `${data.name || "Business"} Workspace` },
      });
      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          image: (data as any).image,
          emailVerified: data.emailVerified,
          passwordHash: "SOCIAL_LOGIN",
          role: "OWNER",
          accountType: "ROOT",
          organizationId: org.id,
          allowedPages: ["/dashboard", "/chat", "/contacts", "/campaigns", "/chatbot-builder", "/template", "/settings"],
          primaryPage: "/dashboard",
          status: "ONLINE",
          currentActivity: "Logged in via social login",
        },
      });
      await prisma.organization.update({ where: { id: org.id }, data: { ownerId: user.id } });
      return user as any;
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: withRootScopedIdentity(PrismaAdapter(prisma) as unknown as Adapter),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Security fix (BaseKey audit — high): `allowDangerousEmailAccountLinking: true`
      // let anyone who already controlled *any* login method for an email silently
      // gain a second, auto-linked login method (or vice versa) with no
      // confirmation step — the standard account-takeover vector for OAuth apps.
      // Default (false) requires the user to already be signed in before a new
      // provider is linked to their account.
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0",
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        loginType: { label: "Login Type", type: "text" },
        // "ROOT" = business owner tab, "AGENT" = team-member tab. Two rows can
        // share an email (one per accountType) — this is what tells us which one.
        accountType: { label: "Account Type", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) throw new Error("Email is required");

        const email = credentials.email.toLowerCase();
        const { password, otp, loginType } = credentials;
        const accountType = credentials.accountType === "AGENT" ? "AGENT" : "ROOT";

        let user = await prisma.user.findFirst({ where: { email, accountType } });

        // ── OTP login (business owner only) ──
        if (loginType === "otp") {
          if (accountType !== "ROOT") throw new Error("OTP login is only available for business owners.");
          if (!otp) throw new Error("OTP is required");

          const result = await verifyOtp(email, "login", otp);
          if (!result.ok) throw new Error(result.error);

          if (!user) {
            const org = await prisma.organization.create({ data: { name: "My Workspace" } });
            user = await prisma.user.create({
              data: {
                email,
                name: "Business Owner",
                emailVerified: new Date(),
                role: "OWNER",
                accountType: "ROOT",
                organizationId: org.id,
                allowedPages: ["/dashboard", "/chat", "/contacts", "/campaigns", "/chatbot-builder", "/template", "/settings"],
                primaryPage: "/dashboard",
                status: "ONLINE",
                currentActivity: "Logged in via OTP",
              },
            });
            await prisma.organization.update({ where: { id: org.id }, data: { ownerId: user.id } });
          } else {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: new Date(), status: "ONLINE", currentActivity: "Active via OTP", failedLogins: 0, lockedUntil: null },
            });
          }
          return user as any;
        }

        // ── Password login (both owner and agent tabs) ──
        if (loginType === "password") {
          if (!password) throw new Error("Password is required");
          if (!user) throw new Error("No account found with this email");

          if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new Error(`Too many failed attempts. Try again in ${minutes} minute(s).`);
          }

          if (!user.emailVerified) {
            throw new Error("Account not verified! Please click the verification link sent to your email.");
          }
          if (!user.passwordHash || user.passwordHash === "SOCIAL_LOGIN") {
            throw new Error("Please log in with Social Media or OTP.");
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            const failedLogins = user.failedLogins + 1;
            const lockedUntil = failedLogins >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null;
            await prisma.user.update({ where: { id: user.id }, data: { failedLogins, lockedUntil } });
            throw new Error(
              lockedUntil ? `Too many failed attempts. Account locked for 15 minutes.` : "Incorrect password"
            );
          }

          user = await prisma.user.update({
            where: { id: user.id },
            data: { status: "ONLINE", currentActivity: "Active via Password", failedLogins: 0, lockedUntil: null },
          });
          return user as any;
        }

        throw new Error("Invalid login type");
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // OAuth account-linking / user creation is fully handled by the adapter
      // shim above; the old manual signIn callback duplicated that logic
      // with a plain-email lookup that no longer matches the schema.
      if (account?.provider === "credentials") return true;
      return !!user.email;
    },

    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in: `user` is exactly the row authorize()/adapter returned.
        token.id = (user as any).id;
        token.accountType = (user as any).accountType;
      }
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, role: true, accountType: true, allowedPages: true, primaryPage: true, organizationId: true },
        });

        if (!dbUser) return { ...token, isDeleted: true };

        token.role = dbUser.role;
        token.accountType = dbUser.accountType;
        token.primaryPage = dbUser.primaryPage;
        token.allowedPages = dbUser.allowedPages;
        token.organizationId = dbUser.organizationId;
      }
      return token;
    },

    async session({ session, token }: any) {
      if (token.isDeleted) {
        session.error = "UserDeleted";
        return session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.accountType = token.accountType as string;
        session.user.primaryPage = token.primaryPage as string;
        session.user.allowedPages = token.allowedPages as string[];
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
