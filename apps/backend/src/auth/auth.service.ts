import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findFirst({
      where: {
        login: { equals: dto.login, mode: 'insensitive' },
        deletado_em: null,
      },
    });

    if (!user || user.status !== 'ativo') {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    const valid = await bcrypt.compare(dto.senha, user.senha_hash);
    if (!valid) throw new UnauthorizedException('Senha incorreta');

    const token = this.jwt.sign({
      sub: user.id,
      login: user.login,
      perfil: user.perfil,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        nome_completo: user.nome_completo,
        login: user.login,
        perfil: user.perfil,
      },
    };
  }
}
