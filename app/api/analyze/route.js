import { NextResponse } from 'next/server';
import axios from 'axios';

// ✅ Обязательно: Указываем Vercel использовать полную среду Node.js
export const runtime = 'nodejs';

export async function POST(req) {
  // ✅ Обязательно: Используем require внутри функции, чтобы избежать статического бандлирования
  let pdf;
  try {
    // В большинстве случаев для Next.js/Vercel лучше всего работает простой require 
    // в сочетании с конфигурацией externalPackages в next.config.js
    pdf = require('pdf-parse');
  } catch (e) {
    console.error('Failed to load pdf-parse via require:', e);
    return NextResponse.json({ 
      error: 'PDF parsing library failed to load. Check server logs.', 
      details: String(e) 
    }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Превращаем файл в буфер
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Извлекаем текст
    // pdf-parse - это, по сути, функция, которую мы вызываем
    const pdfData = await pdf(buffer);
    const resumeText = pdfData.text;

    console.log('CV text extracted, sending to N8N...');

    // Отправляем в N8N
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nUrl) {
      return NextResponse.json({ error: 'N8N_WEBHOOK_URL not configured' }, { status: 500 });
    }

    const response = await axios.post(n8nUrl, {
      resume_text: resumeText
    });

    // Корректно проксируем статус успешного ответа от N8N
    return NextResponse.json(response.data, { status: response.status });

  } catch (error) {
    console.error('Error processing CV:', error);
    
    // Проксируем статус ошибки от N8N, если она есть
    if (error.response) {
      return NextResponse.json(error.response.data, { status: error.response.status });
    }

    // Если это внутренняя ошибка сервера (сеть, таймаут и т.п.)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}