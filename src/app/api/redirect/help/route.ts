import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect('https://pharmskills.ru/vopros-otvet/', 307);
}

