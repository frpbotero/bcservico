import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CautelasService } from './cautelas.service';
import { AssinaturaDto } from './dto/assinatura.dto';

@Controller('cautelas')
@UseGuards(JwtAuthGuard)
export class CautelasController {
  constructor(private cautelas: CautelasService) {}

  @Get('pendentes')
  pendentes() {
    return this.cautelas.pendentes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cautelas.findOne(id);
  }

  @Post(':id/assinatura')
  assinar(
    @Param('id') id: string,
    @Body() dto: AssinaturaDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.cautelas.registrarAssinatura(id, dto, req.user.id);
  }
}
