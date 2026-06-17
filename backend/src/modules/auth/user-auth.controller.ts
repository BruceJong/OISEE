import { Body, Controller, Get, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtUserGuard } from './guards/jwt-user.guard';
import { CurrentUser, CurrentUserInfo } from './decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BusinessException } from '../../common/exceptions/business.exception';
import {
  ERROR_CODES,
  UserLoginSchema,
  UserLoginInput,
  UserRegisterSchema,
  UserRegisterInput,
  GradeClassifySchema,
  GradeClassifyInput,
  WechatMockLoginSchema,
  WechatMockLoginInput,
} from '@oisee/shared';

@Controller('auth')
export class UserAuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(UserRegisterSchema))
  async register(@Body() body: UserRegisterInput) {
    return this.auth.userRegister(body);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(UserLoginSchema))
  async login(@Body() body: UserLoginInput) {
    return this.auth.userLogin(body.username, body.password);
  }

  /** 微信「模拟扫码」：返回一份假资料（登录直登 / 注册预填都用它） */
  @Post('wechat/mock-scan')
  async wechatMockScan() {
    return this.auth.wechatMockProfile();
  }

  @Post('wechat/login')
  @UsePipes(new ZodValidationPipe(WechatMockLoginSchema))
  async wechatLogin(@Body() body: WechatMockLoginInput) {
    return this.auth.wechatLogin(body);
  }

  /** 注册第二步：实时定位年级阶段 */
  @Post('classify-grade')
  @UsePipes(new ZodValidationPipe(GradeClassifySchema))
  async classifyGrade(@Body() body: GradeClassifyInput) {
    const gradeStage = await this.auth.classifyGrade(body.age, body.learningStage);
    return { gradeStage };
  }

  @Get('me')
  @UseGuards(JwtUserGuard)
  async me(@CurrentUser() current: CurrentUserInfo) {
    const user = await this.auth.getUserById(current.id);
    if (!user) {
      throw new BusinessException(ERROR_CODES.AUTH_INVALID_CREDENTIALS, '用户不存在');
    }
    return user;
  }
}
