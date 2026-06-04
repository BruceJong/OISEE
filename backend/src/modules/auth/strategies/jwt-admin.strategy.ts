import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminJwtPayload } from '../auth.service';

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.OISEE_JWT_ADMIN_SECRET!,
      issuer: 'oisee-admin',
    });
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.typ !== 'access') {
      return null;
    }
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
