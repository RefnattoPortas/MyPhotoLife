export async function GET() {
  return new Response(JSON.stringify({ error: true, message: 'Rota não encontrada.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST() {
  return new Response(JSON.stringify({ error: true, message: 'Rota não encontrada.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PUT() {
  return new Response(JSON.stringify({ error: true, message: 'Rota não encontrada.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH() {
  return new Response(JSON.stringify({ error: true, message: 'Rota não encontrada.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ error: true, message: 'Rota não encontrada.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
