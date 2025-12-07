'use client';
import { useState } from 'react';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [debugError, setDebugError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Валидация типа файла (добавлен запасной вариант по расширению)
      const isPdfByType = selectedFile.type === 'application/pdf';
      const isPdfByName = typeof selectedFile.name === 'string' && selectedFile.name.toLowerCase().endsWith('.pdf');
      if (!isPdfByType && !isPdfByName) {
        setDebugError('Пожалуйста, выберите PDF файл');
        setFile(null);
        return;
      }
      
      // Валидация размера (макс 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setDebugError('Файл слишком большой (макс 10MB)');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
      setDebugError(null);
    }
  };

  // Попытка корректно извлечь полезную полезную нагрузку из ответа сервера
  const parseServerResponse = (data) => {
    if (!data && data !== 0) return null;

    // Если пришёл массив — поищем подходящий объект внутри
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error('Пустой ответ от сервера');
      }

      // Ищем первый элемент, содержащий полезную информацию
      for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        if (item.json && typeof item.json === 'object') {
          return item.json;
        }
        if (item.result && typeof item.result === 'object') {
          return item.result;
        }
        if (item.body && typeof item.body === 'object') {
          return item.body;
        }
        // Если сам элемент выглядит как финальный объект
        if (typeof item.total_score !== 'undefined') {
          return item;
        }
      }

      // fallback — возьмём первый элемент и попытаемся извлечь полезные поля
      const first = data[0];
      return (first && (first.json || first.result || first.body)) || first;
    }

    // Если это объект с вложенным result/json/body
    if (data.result) return data.result;
    if (data.json) return data.json;
    if (data.body) return data.body;

    // Если это уже прямой объект с полем total_score — используем его
    if (typeof data === 'object') return data;

    return null;
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

      // ✅ ИСПРАВЛЕНО: Убрана дублирующаяся проверка
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server Error: ${res.status}`);
      }

      const data = await res.json();
      console.log('Raw Data from N8N:', data);

      // Обработка ответа от N8N — используем универсальный парсер
      let finalData = parseServerResponse(data);

      if (!finalData) {
        throw new Error('Некорректный формат ответа от сервера');
      }

      // Если total_score пришёл как строка — попытаемся привести к числу
      if (typeof finalData.total_score === 'string') {
        const parsed = parseFloat(finalData.total_score);
        finalData.total_score = Number.isFinite(parsed) ? parsed : finalData.total_score;
      }

      // Ensure scores_breakdown is at least an object to avoid render errors
      finalData.scores_breakdown = finalData.scores_breakdown || {};

      // Валидация структуры данных
      if (!finalData || typeof finalData !== 'object') {
        throw new Error('Ответ не содержит данных');
      }

      if (typeof finalData.total_score === 'undefined') {
        throw new Error('Отсутствует поле total_score в ответе');
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
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        🤖 AI CV Screening
      </h1>

      {/* Зона загрузки */}
      <div style={{ 
        border: '2px dashed #ccc', 
        padding: '30px', 
        textAlign: 'center', 
        borderRadius: '10px', 
        marginBottom: '30px',
        backgroundColor: '#f9f9f9'
      }}>
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileChange}
          disabled={loading}
          style={{ marginBottom: '20px' }} 
        />
        {file && (
          <p style={{ color: '#666', fontSize: '14px' }}>
            Выбран файл: {file.name} ({formatFileSize(file.size)})
          </p>
        )}
        <br />
        <button 
          onClick={handleUpload} 
          disabled={!file || loading}
          style={{
            padding: '12px 24px', 
            fontSize: '16px', 
            backgroundColor: loading ? '#ccc' : (file ? '#0070f3' : '#ccc'), 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: loading || !file ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          {loading ? '⏳ Анализирую...' : '🚀 Проверить резюме'}
        </button>
      </div>

      {/* ОТОБРАЖЕНИЕ ОШИБОК */}
      {debugError && (
        <div style={{ 
          color: '#d32f2f', 
          padding: '20px', 
          background: '#ffebee', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ef5350'
        }}>
          <strong>❌ Ошибка:</strong> {debugError}
        </div>
      )}

      {/* Результаты */}
      {result && (
        <div>
          <div style={{ 
            backgroundColor: result.total_score >= 70 ? '#e8f5e9' : result.total_score >= 50 ? '#fff8e1' : '#ffebee', 
            padding: '25px', 
            borderRadius: '10px', 
            border: `2px solid ${result.total_score >= 70 ? '#4caf50' : result.total_score >= 50 ? '#ff9800' : '#f44336'}`,
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>
              {result.grade_verdict || 'Результат'}
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>
              <strong>Статус:</strong> {result.routing_status || 'N/A'}
            </p>
            <h1 style={{ 
              fontSize: '56px', 
              margin: '10px 0',
              color: result.total_score >= 70 ? '#4caf50' : result.total_score >= 50 ? '#ff9800' : '#f44336'
            }}>
              {result.total_score}/100
            </h1>
          </div>

          {/* Детали оценки */}
          {result.scores_breakdown && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '15px', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <strong>📊 Experience:</strong> 
                <div style={{ fontSize: '24px', color: '#1976d2', marginTop: '5px' }}>
                  {result.scores_breakdown.experience || 0}%
                </div>
              </div>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <strong>💪 Hard Skills:</strong>
                <div style={{ fontSize: '24px', color: '#1976d2', marginTop: '5px' }}>
                  {result.scores_breakdown.hard_skills || 0}%
                </div>
              </div>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <strong>🛠️ Tools:</strong>
                <div style={{ fontSize: '24px', color: '#1976d2', marginTop: '5px' }}>
                  {result.scores_breakdown.tools || 0}%
                </div>
              </div>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <strong>🎯 Domain:</strong>
                <div style={{ fontSize: '24px', color: '#1976d2', marginTop: '5px' }}>
                  {result.scores_breakdown.domain || 0}%
                </div>
              </div>
            </div>
          )}

          {/* Совет AI */}
          {result.ai_summary && (
            <div style={{ 
              background: '#e3f2fd', 
              padding: '20px', 
              borderRadius: '10px', 
              borderLeft: '5px solid #2196f3',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginTop: 0, color: '#1976d2' }}>💡 Совет AI:</h3>
              <p style={{ margin: 0, lineHeight: '1.6', color: '#333' }}>
                {result.ai_summary}
              </p>
            </div>
          )}
          
          {/* Техническая информация */}
          <details style={{ marginTop: '20px', color: '#666' }}>
            <summary style={{ cursor: 'pointer', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              🔍 Техническая информация (JSON)
            </summary>
            <pre style={{ 
              background: '#263238', 
              color: '#aed581',
              padding: '15px', 
              borderRadius: '5px', 
              overflowX: 'auto',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}