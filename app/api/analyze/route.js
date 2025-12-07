import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
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

    // Динамически загружаем библиотеку парсинга PDF через createRequire,
    // чтобы избежать проблем с ESM/CJS, которые возникают при статическом импорте.
    let pdf;
    try {
      // Use a runtime require obtained via eval to avoid webpack replacing or polyfilling it.
      // This ensures we call the real Node.js require at runtime in the dev server.
      const nativeRequire = (typeof __non_webpack_require__ === 'function')
        ? __non_webpack_require__
        : (eval('typeof require === "function" ? require : undefined'));

      if (!nativeRequire) {
        throw new Error('Runtime require is not available');
      }

      const pdfPkg = nativeRequire('pdf-parse');
      console.log('pdf-parse package type:', typeof pdfPkg, 'keys:', pdfPkg && Object.keys(pdfPkg));
      pdf = pdfPkg && (pdfPkg.default || pdfPkg);
    } catch (e) {
      console.error('Failed to load pdf-parse:', e);
      return NextResponse.json({ error: 'Failed to load pdf parsing library', details: String(e) }, { status: 500 });
    }

    // Извлекаем текст
    let pdfData;
    try {
      if (typeof pdf === 'function') {
        // older style: pdf(buffer)
        pdfData = await pdf(buffer);
      } else if (pdf && typeof pdf.PDFParse === 'function') {
        // new API: instantiate PDFParse
        const parser = new pdf.PDFParse({ data: buffer });
        // prefer getText() which returns { text }
        if (typeof parser.getText === 'function') {
          const textResult = await parser.getText();
          pdfData = { text: textResult?.text ?? '' };
        } else if (typeof parser.getInfo === 'function') {
          const info = await parser.getInfo();
          pdfData = { text: '' };
        } else {
          throw new Error('PDFParse instance does not expose getText()');
        }
      } else {
        throw new Error('Unsupported pdf-parse export shape');
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

    // Возвращаем ответ фронтенду
   return NextResponse.json(response.data, { status: response.status });

  } catch (error) {
    console.error('Error processing CV:', error);
    if (error.response) {
      // Если это ошибка HTTP (4xx или 5xx) от N8N, 
      // проксируем его статус и тело ошибки клиенту.
      return NextResponse.json(error.response.data, { status: error.response.status });
    }

    // Если это внутренняя ошибка сервера (pdf-parse, сеть, таймаут и т.п.)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error.message 
    }, { status: 500 });
  }
}