import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      insights: [
        'Aumente seu ticket médio oferecendo produtos de pós-barba.',
        'Clientes que não voltam em 30 dias podem receber um cupom via WhatsApp.',
        'O horário das 14h está ocioso, considere uma promoção relâmpago.',
      ],
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analise os seguintes dados da barbearia e forneça 3 dicas curtas e poderosas para aumentar o faturamento ou retenção de clientes em português brasileiro: ${JSON.stringify(body)}.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: 'Uma dica estratégica para a barbearia.',
              },
            },
          },
          required: ['insights'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('No text content');

    const result = JSON.parse(text.trim());
    return NextResponse.json({
      insights:
        result.insights?.length > 0
          ? result.insights
          : ['Mantenha o bom trabalho!', 'Foque em fidelizar novos clientes.', 'Ofereça combos de serviços.'],
    });
  } catch (error) {
    return NextResponse.json({
      insights: [
        'Aumente seu ticket médio oferecendo produtos de pós-barba.',
        'Clientes que não voltam em 30 dias podem receber um cupom via WhatsApp.',
        'O horário das 14h está ocioso, considere uma promoção relâmpago.',
      ],
    });
  }
}
