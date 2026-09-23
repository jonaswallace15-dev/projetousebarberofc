'use client';

// Tokenização de cartão no browser, direto contra o Pagar.me — o número do cartão
// nunca passa pelo nosso backend. Usa a public key (NEXT_PUBLIC_PAGARME_PUBLIC_KEY).
//
// PAUSADO (10/2026): numa conta de teste nova confirmamos que o token gerado aqui
// não é reconhecido por nenhum endpoint da secret key (ver comentário em
// lib/pagarme.ts). app/plano/[planId]/page.tsx hoje manda o cartão cru pro backend
// em vez de chamar tokenizeCard(). Voltar a usar isso assim que a Stone confirmar
// que o fluxo de token via chave pública funciona nessa conta.

export interface CardInput {
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

export async function tokenizeCard(card: CardInput): Promise<string> {
  const publicKey = process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY;
  if (!publicKey) throw new Error('Pagar.me não configurado (chave pública ausente)');

  const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${publicKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'card',
      card: {
        number: card.number.replace(/\s/g, ''),
        holder_name: card.holderName,
        exp_month: card.expMonth,
        exp_year: card.expYear,
        cvv: card.cvv,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) {
    throw new Error(data?.message || 'Não foi possível validar o cartão. Confira os dados e tente novamente.');
  }
  return data.id as string;
}
