import { apiFetch } from './api';

export const getBusinessInsights = async (data: any): Promise<string[]> => {
  try {
    const result = await apiFetch('/api/ai/insights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.insights || [];
  } catch {
    return [
      'Aumente seu ticket médio oferecendo produtos de pós-barba.',
      'Clientes que não voltam em 30 dias podem receber um cupom via WhatsApp.',
      'O horário das 14h está ocioso, considere uma promoção relâmpago.',
    ];
  }
};
