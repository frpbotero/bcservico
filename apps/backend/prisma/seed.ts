import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const login = process.env.SEED_LOGIN ?? 'admin';
  const senha = process.env.SEED_SENHA ?? 'admin123';

  const existe = await prisma.usuario.findFirst({ where: { deletado_em: null } });
  if (existe) {
    console.log('Já existe ao menos um usuário no banco. Seed ignorado.');
    return;
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const agora = new Date().toISOString();

  await prisma.usuario.create({
    data: {
      id: crypto.randomUUID(),
      nome_completo: 'Administrador',
      login,
      senha_hash,
      perfil: 'admin',
      status: 'ativo',
      criado_em: agora,
      atualizado_em: agora,
      sync_status: 'sincronizado',
    },
  });

  console.log(`Usuário criado: login="${login}" senha="${senha}"`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
