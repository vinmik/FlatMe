import { jwtVerify, SignJWT } from "jose";
import { UnauthorizedError } from "../../domain/errors";
import type { Clock, IssuedToken, TokenClaims, TokenService } from "../../ports";

const ISSUER = "flatme-api";
const AUDIENCE = "flatme-app";

/** HS256 JWTs signed with JWT_SECRET. */
export class JoseTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly ttlDays: number,
    private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async issue(claims: TokenClaims): Promise<IssuedToken> {
    const nowSec = Math.floor(this.clock.now().getTime() / 1000);
    const exp = nowSec + Math.round(this.ttlDays * 86400);
    const token = await new SignJWT({ email: claims.email, role: claims.role })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(claims.userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(nowSec)
      .setExpirationTime(exp)
      .sign(this.key);
    return { token, expiresAt: new Date(exp * 1000).toISOString() };
  }

  async verify(token: string): Promise<TokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["HS256"],
        currentDate: this.clock.now(),
      });
      if (!payload.sub || typeof payload.email !== "string") throw new Error("missing claims");
      return { userId: payload.sub, email: payload.email, role: payload.role === "admin" ? "admin" : "user" };
    } catch {
      throw new UnauthorizedError("Your session has expired. Please sign in again.");
    }
  }
}
