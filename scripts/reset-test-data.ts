/**
 * Script para zerar dados de teste.
 * Executar UMA VEZ com: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reset-test-data.ts
 * Depois pode deletar este arquivo.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Zerando dados de teste...');

  // 1. Deletar transações de carteira
  const wt = await prisma.walletTransaction.deleteMany({});
  console.log(`✓ ${wt.count} transações de carteira removidas`);

  // 2. Zerar saldo das carteiras
  const w = await prisma.wallet.updateMany({ data: { balance: 0 } });
  console.log(`✓ ${w.count} carteiras zeradas`);

  // 3. Deletar transações financeiras
  const ft = await prisma.financeTransaction.deleteMany({});
  console.log(`✓ ${ft.count} transações financeiras removidas`);

  // 4. Deletar agendamentos
  const a = await prisma.appointment.deleteMany({});
  console.log(`✓ ${a.count} agendamentos removidos`);

  // 5. Deletar assinaturas de clientes
  const cs = await prisma.clientSubscription.deleteMany({});
  console.log(`✓ ${cs.count} assinaturas removidas`);

  // 6. Deletar clientes
  const c = await prisma.client.deleteMany({});
  console.log(`✓ ${c.count} clientes removidos`);

  // 7. Deletar solicitações de saque
  const wd = await prisma.withdrawalRequest.deleteMany({}).catch(() => ({ count: 0 }));
  console.log(`✓ ${wd.count} saques removidos`);

  console.log('\n✅ Pronto! Todos os dados de teste foram removidos.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
