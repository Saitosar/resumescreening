'use client';
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [debugError, setDebugError] = useState(null); // Для отладки на экране

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setResult(null);
      setDebugError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setDebugError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Server Error: ${res.status}`);

      const data = await res.json();
      console.log('Raw Data from N8N:', data);

      // === НОВАЯ ЛОГИКА ОБРАБОТКИ ===
      let finalData = null;

      // 1. Если это массив (как у нас сейчас) -> берем первый элемент
      if (Array.isArray(data)) {
        finalData = data[0];
      } 
      // 2. Если это объект, но внутри есть свойство "result" или "data"
      else if (data.result) {
        finalData = data.result;
      }
      // 3. Если это чистый объект
      else {
        finalData = data;
      }

      // Проверка на корректность данных
      if (!finalData || typeof finalData.total_score === 'undefined') {
        throw new Error('Некорректный формат ответа от AI');
      }

      setResult(finalData);

    } catch (error) {
      console.error('Error:', error);
      setDebugError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>🤖 AI CV Screening</h1>

      {/* Зона загрузки */}
      <div style={{ border: '2px dashed #ccc', padding: '30px', textAlign: 'center', borderRadius: '10px', marginBottom: '30px' }}>
        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ marginBottom: '20px' }} />
        <br />
        <button 
          onClick={handleUpload} 
          disabled={!file || loading}
          style={{
            padding: '10px 20px', 
            fontSize: '16px', 
            backgroundColor: loading ? '#ccc' : '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Анализирую...' : 'Проверить резюме'}
        </button>
      </div>

      {/* ОТОБРАЖЕНИЕ ОШИБОК НА ЭКРАНЕ (ЕСЛИ ЕСТЬ) */}
      {debugError && (
        <div style={{ color: 'red', padding: '20px', background: '#ffe6e6', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>Ошибка:</strong> {debugError}
        </div>
      )}

      {/* Результаты */}
      {result && (
        <div>
          <div style={{ 
            backgroundColor: result.total_score > 70 ? '#e6fffa' : '#fff5f5', 
            padding: '20px', 
            borderRadius: '10px', 
            border: `1px solid ${result.total_score > 70 ? '#38b2ac' : '#fc8181'}`,
            marginBottom: '20px'
          }}>
            <h2 style={{ marginTop: 0 }}>Вердикт: {result.grade_verdict}</h2>
            <p><strong>Статус:</strong> {result.routing_status}</p>
            <h1 style={{ fontSize: '48px', margin: '10px 0' }}>{result.total_score}/100</h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '8px' }}>
              <strong>Experience:</strong> {result.scores_breakdown?.experience}%
            </div>
            <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '8px' }}>
              <strong>Hard Skills:</strong> {result.scores_breakdown?.hard_skills}%
            </div>
            <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '8px' }}>
              <strong>Tools:</strong> {result.scores_breakdown?.tools}%
            </div>
            <div style={{ background: '#f7fafc', padding: '15px', borderRadius: '8px' }}>
              <strong>Domain:</strong> {result.scores_breakdown?.domain}%
            </div>
          </div>

          <div style={{ background: '#ebf8ff', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #4299e1' }}>
            <h3>Совет AI:</h3>
            <p>{result.ai_summary}</p>
          </div>
          
          {/* ТЕХНИЧЕСКАЯ ИНФО (ЧТОБЫ ТЫ ВИДЕЛ ЧТО ПРИШЛО) */}
          <details style={{ marginTop: '20px', color: '#666' }}>
            <summary>Техническая информация (JSON)</summary>
            <pre style={{ background: '#eee', padding: '10px', borderRadius: '5px', overflowX: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}