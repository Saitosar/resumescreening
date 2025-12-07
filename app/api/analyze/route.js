import { NextResponse } from 'next/server';
import axios from 'axios';

// Оставляем nodejs runtime, так как работаем с буферами файлов
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // 1. Получаем файл из формы
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 2. Превращаем файл в буфер, а затем в Base64 строку
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64File = buffer.toString('base64');

    console.log(`File received: ${file.name}, sending to N8N...`);

    // 3. Отправляем в N8N (файл как строка Base64)
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nUrl) {
      return NextResponse.json({ error: 'N8N_WEBHOOK_URL not configured' }, { status: 500 });
    }

    // Формируем payload. Теперь мы шлем не текст резюме, а сам файл.
    const response = await axios.post(n8nUrl, {
      file_name: file.name,
      file_mime_type: file.type || 'application/pdf',
      file_content_base64: base64File // Передаем сам файл
    }, {
      // Увеличиваем лимит размера тела запроса (на случай больших PDF)
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    // 4. Возвращаем ответ от N8N (например, JSON с результатами анализа)
    return NextResponse.json(response.data, { status: response.status });

  } catch (error) {
    console.error('Error forwarding file to N8N:', error);
    
    if (error.response) {
      return NextResponse.json(error.response.data, { status: error.response.status });
    }

    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, { status: 500 });
  }
}