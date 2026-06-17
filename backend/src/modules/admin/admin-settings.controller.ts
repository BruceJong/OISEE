import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { AdminSettingsService } from './admin-settings.service';

@Controller('admin/settings')
@UseGuards(JwtAdminGuard)
export class AdminSettingsController {
  constructor(private svc: AdminSettingsService) {}

  @Get()
  listAll() {
    return this.svc.listAll();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.svc.get(key);
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() body: { value: any }) {
    return this.svc.set(key, body.value);
  }
}
