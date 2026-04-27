import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import type { Request } from "express"

const DEFAULT_TOKEN = "ODBkZjVkYWFiMGZjYjYxM2E0Mzk1Njk5ZmE2Y2Y0MzZlNTAxMjVlNQ"

@Injectable()
export class BearerAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>()
    const header = req.headers.authorization
    const expected = process.env.KEYCRM_TOKEN ?? DEFAULT_TOKEN

    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token")
    }
    const token = header.slice("Bearer ".length).trim()
    if (token !== expected) {
      throw new UnauthorizedException("Invalid bearer token")
    }
    return true
  }
}
