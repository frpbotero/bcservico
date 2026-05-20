import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssinaturaDto } from './dto/assinatura.dto';

@Injectable()
export class CautelasService {
  constructor(private prisma: PrismaService) {}

  async pendentes() {
    return this.prisma.cautela.findMany({
      where: { status: 'aguardando_entrega', deletado_em: null },
      include: {
        cliente: {
          select: { razao_social: true, cnpj_cpf: true, cidade: true, uf: true },
        },
      },
      orderBy: { data_emissao: 'desc' },
    });
  }

  async findOne(id: string) {
    const cautela = await this.prisma.cautela.findFirst({
      where: { id, deletado_em: null },
      include: {
        cliente: true,
        itens: {
          include: {
            produto: {
              select: { nome: true, unidade_medida: true, codigo_interno: true },
            },
          },
        },
      },
    });

    if (!cautela) throw new NotFoundException('Cautela não encontrada');
    return cautela;
  }

  async registrarAssinatura(id: string, dto: AssinaturaDto, operadorId: string) {
    const cautela = await this.prisma.cautela.findFirst({
      where: { id, deletado_em: null },
    });

    if (!cautela) throw new NotFoundException('Cautela não encontrada');
    if (cautela.status !== 'aguardando_entrega') {
      throw new BadRequestException('Cautela não está aguardando entrega');
    }

    return this.prisma.cautela.update({
      where: { id },
      data: {
        status: 'entregue_assinada',
        assinatura_nome: dto.assinatura_nome,
        assinatura_cargo: dto.assinatura_cargo ?? null,
        assinatura_imagem: dto.assinatura_imagem,
        assinatura_coletada_em: new Date().toISOString(),
        assinatura_operador_id: operadorId,
        atualizado_em: new Date().toISOString(),
      },
    });
  }
}
