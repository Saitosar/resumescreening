import { NextResponse } from 'next/server';
import axios from 'axios';

// ✅ ФИКС 1: Указываем Vercel использовать среду Node.js для поддержки pdf-parse
export const runtime = 'nodejs';

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

    // ✅ ФИКС 2: Динамически загружаем pdf-parse, чтобы обойти проблемы бандлирования
    let pdf;
    try {
      // Используем динамический require для обхода проблем с импортом в Next.js/Vercel
      // Эта логика была проверена ранее и является наиболее устойчивой
      const nativeRequire = (typeof __non_webpack_require__ === 'function')
        ? __non_webpack_require__
        : (eval('typeof require === "function" ? require : undefined'));

      if (!nativeRequire) {
        throw new Error('Runtime require is not available');
      }

      const pdfPkg = nativeRequire('pdf-parse');
      pdf = pdfPkg && (pdfPkg.default || pdfPkg);
    } catch (e) {
      console.error('Failed to load pdf-parse:', e);
      // Возвращаем ошибку, если библиотека не загрузилась
      return NextResponse.json({ error: 'Failed to load pdf parsing library', details: String(e) }, { status: 500 });
    }

    // Извлекаем текст
    let pdfData;
    try {
      if (typeof pdf === 'function') {
        // Поддержка старого API
        pdfData = await pdf(buffer);
      } else if (pdf && typeof pdf.PDFParse === 'function') {
        // Поддержка нового API
        const parser = new pdf.PDFParse({ data: buffer });
        const textResult = await parser.getText();
        pdfData = { text: textResult?.text ?? '' };
      } else {
        // Fallback
        pdfData = await pdf(buffer);
      }
    } catch (e) {
      console.error('Error parsing PDF:', e);
      return NextResponse.json({ error: 'Failed to parse PDF', details: String(e) }, { status: 500 });
    }
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

    // ✅ ФИКС 3: Корректно проксируем статус успешного ответа от N8N
    return NextResponse.json(response.data, { status: response.status });

  } catch (error) {
    console.error('Error processing CV:', error);
    
    // ✅ ФИКС 4: Проксируем статус ошибки от N8N, если она есть
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