import { NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import axios from 'axios';

export async function POST(req) {
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

    // Возвращаем ответ фронтенду
    return NextResponse.json(response.data);

  } catch (error) {
    console.error('Error processing CV:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}