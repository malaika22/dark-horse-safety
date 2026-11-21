import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** Routes any signed-in role may call: the mobile API, sign-in/account flows, health, docs and uploads. */
const OPEN_PREFIXES = ['/mobile/', '/auth', '/docs', '/uploads', '/crm/uploads', '/health'];

/**
 * Keeps mobile (technician) tokens away from the admin portal APIs.
 *
 * It runs before route guards, so it reads the bearer token itself. Requests without a valid
 * token are passed on untouched; the route's own JwtAuthGuard still answers 401 for them.
 * Admin portal roles are listed in PORTAL_ALLOWED_ROLES (default ADMIN,SUPERVISOR,OPERATOR),
 * so a TECHNICIAN token is rejected on every route outside the open list above.
 */
@Injectable()
export class MobileRoleGuard implements CanActivate {
  private readonly allowed = new Set(
    (process.env.PORTAL_ALLOWED_ROLES ?? 'ADMIN,SUPERVISOR,OPERATOR')
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean),
  );

  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string; headers: Record<string, string | undefined> }>();
    const path = (req.originalUrl ?? req.url ?? '/').split('?')[0];
    if (path === '/' || OPEN_PREFIXES.some((p) => path.startsWith(p))) {
      return true;
    }
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) return true;
    let role: string | undefined;
    try {
      role = this.jwt.verify<{ role?: string }>(header.slice(7)).role;
    } catch {
      return true;
    }
    if (role && !this.allowed.has(role.toUpperCase())) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'This account can only use the mobile app.',
      });
    }
    return true;
  }
}
