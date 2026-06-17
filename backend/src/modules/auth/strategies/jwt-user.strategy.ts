import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserJwtPayload } from '../auth.service';

@Injectable()
export class JwtUserStrategy extends PassportStrategy(Strategy, 'jwt-user') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.OISEE_JWT_USER_SECRET ?? 'oisee_dev_user_secret_fallback',
      issuer: 'oisee-user',
    });
  }

  async validate(payload: UserJwtPayload) {
    if (payload.typ !== 'access') {
      return null;
    }
    return { id: payload.sub };
  }
}
