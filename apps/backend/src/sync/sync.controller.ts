import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncService } from './sync.service';
import { PushDto } from './dto/push.dto';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private sync: SyncService) {}

  @Post('push')
  push(@Body() dto: PushDto) {
    return this.sync.push(dto);
  }

  @Get('pull')
  pull(@Query('since') since: string) {
    return this.sync.pull(since ?? new Date(0).toISOString());
  }
}
