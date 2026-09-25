import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    error?: "UserDeleted";
    user?: {
      id?: string;
      role?: string;
      accountType?: string;
      allowedPages?: string[];
      primaryPage?: string;
      organizationId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accountType?: string;
    allowedPages?: string[];
    primaryPage?: string;
    organizationId?: string | null;
    isDeleted?: boolean;
  }
}

// Re-import so DefaultSession is resolvable in the module augmentation above.
import type { DefaultSession } from "next-auth";
