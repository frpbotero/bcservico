import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushDto, SyncItemDto } from './dto/push.dto';

const ENTITY_ORDER = [
  'empresa_emissora',
  'usuarios',
  'clientes',
  'produtos',
  'cautelas',
  'cautela_itens',
];

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async push(dto: PushDto) {
    const sorted = [...dto.operacoes].sort(
      (a, b) => ENTITY_ORDER.indexOf(a.entidade) - ENTITY_ORDER.indexOf(b.entidade),
    );

    const results = { ok: 0, errors: [] as string[] };

    for (const op of sorted) {
      try {
        await this.processOp(op);
        results.ok++;
      } catch (e: any) {
        results.errors.push(`${op.entidade}/${op.entidade_id}: ${e.message}`);
      }
    }

    return results;
  }

  private async processOp(op: SyncItemDto) {
    const { entidade, entidade_id, operacao, payload } = op;

    if (operacao === 'delete') {
      return this.softDelete(entidade, entidade_id);
    }

    const data: any = { ...payload, id: entidade_id };
    const update: any = { ...payload };

    switch (entidade) {
      case 'empresa_emissora':
        return this.prisma.empresaEmissora.upsert({
          where: { id: entidade_id },
          create: data,
          update,
        });
      case 'usuarios':
        return this.prisma.usuario.upsert({
          where: { id: entidade_id },
          create: data,
          update,
        });
      case 'clientes':
        return this.prisma.cliente.upsert({
          where: { id: entidade_id },
          create: data,
          update,
        });
      case 'produtos':
        return this.prisma.produto.upsert({
          where: { id: entidade_id },
          create: data,
          update,
        });
      case 'cautelas':
        return this.prisma.cautela.upsert({
          where: { id: entidade_id },
          create: data,
          update,
        });
      case 'cautela_itens':
        return this.prisma.cautelaItem.upsert({
          where: { id: entidade_id },
          create: data,
          update,
        });
      default:
        throw new Error(`Entidade desconhecida: ${entidade}`);
    }
  }

  private async softDelete(entidade: string, id: string) {
    const now = new Date().toISOString();
    const data = { deletado_em: now };

    switch (entidade) {
      case 'empresa_emissora':
        return this.prisma.empresaEmissora.update({ where: { id }, data });
      case 'usuarios':
        return this.prisma.usuario.update({ where: { id }, data });
      case 'clientes':
        return this.prisma.cliente.update({ where: { id }, data });
      case 'produtos':
        return this.prisma.produto.update({ where: { id }, data });
      case 'cautelas':
        return this.prisma.cautela.update({ where: { id }, data });
      case 'cautela_itens':
        return this.prisma.cautelaItem.delete({ where: { id } });
      default:
        throw new Error(`Entidade desconhecida: ${entidade}`);
    }
  }

  async pull(since: string) {
    const cautelas = await this.prisma.cautela.findMany({
      where: {
        assinatura_coletada_em: { gt: since },
        deletado_em: null,
      },
      select: {
        id: true,
        assinatura_nome: true,
        assinatura_cargo: true,
        assinatura_imagem: true,
        assinatura_coletada_em: true,
      },
    });

    return { cautelas };
  }
}
