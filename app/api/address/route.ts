import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cep = searchParams.get('cep');

  if (!cep) return NextResponse.json({ error: 'CEP required' }, { status: 400 });

  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
