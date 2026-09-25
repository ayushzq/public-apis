import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET as string;

export interface MobileTokenPayload {
  ownerId: string;
  organizationId: string;
  role: "OWNER";
}

export function signMobileToken(payload: MobileTokenPayload): string {
  // Long-lived: mobile owner sessions are refreshed by re-login, not silent refresh.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "180d" });
}

export function verifyMobileToken(token: string): MobileTokenPayload {
  return jwt.verify(token, JWT_SECRET) as MobileTokenPayload;
}

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export function requireOwner(request: NextRequest): MobileTokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw new MobileAuthError("Missing bearer token", 401);
  }
  try {
    const payload = verifyMobileToken(token);
    if (payload.role !== "OWNER") {
      throw new MobileAuthError("Forbidden", 403);
    }
    return payload;
  } catch (err) {
    if (err instanceof MobileAuthError) throw err;
    throw new MobileAuthError("Invalid or expired token", 401);
  }
}

export class MobileAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
