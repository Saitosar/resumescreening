'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  // Состояние result теперь может быть массивом, строкой или null
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Ответ может быть массивом, поэтому сохраняем его как есть
      setResult(response.data);
    } catch (err) {
      console.error('Error:', err.response || err);
      const details = err.response?.data?.details || err.message;
      setError(`Ошибка анализа: ${details}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Извлекаем структурированные данные для отображения
  const data = Array.isArray(result) && result.length > 0 ? result[0] : null;

  return (
    <main className="main-container">
      <div className="header-wrapper">
        <h1 className="main-title">
          AI Resume Scorer
        </h1>
      </div>

      <div className="card upload-card">
        <h2 className="card-title">1. Загрузите резюме (PDF)</h2>
        
        <div className="input-area">
          <label className="input-label">
            <span className="input-text">Нажмите, чтобы выбрать файл или перетащите его сюда</span>
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>

        {file && (
            <p className="file-ready-message">
                ✅ Файл готов: **{file.name}**
            </p>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className={`button primary-button ${loading || !file ? 'disabled' : ''}`}
        >
          {loading ? '🧠 Анализируем...' : '2. Оценить резюме'}
        </button>

        {error && (
          <div className="error-message">
            ⚠️ Ошибка: {error}
          </div>
        )}
      </div>

      {/* Блок отображения результатов */}
      {data && (
        <div className="card result-card">
          <h2 className="card-title result-title">
            📊 Результат оценки: {data.full_name}
          </h2>
          <div className="result-content">
            
            {/* 1. Общая оценка и вердикт */}
            <div className="score-display">
                <div>
                    <div className="score-label">Общий балл:</div>
                    <div className="score-value">{data.total_score}</div>
                </div>
                <div className={`verdict-status status-${data.grade_verdict.toLowerCase().replace(/\s/g, '-')}`}>
                    {data.grade_verdict}
                </div>
            </div>

            {/* 2. Статус роутинга (Следующий шаг) */}
            {data.routing_status && (
                <div className="result-section routing-section">
                    <h3 className="section-title">Следующий шаг 🛣️</h3>
                    <p className="routing-text">{data.routing_status}</p>
                </div>
            )}
            
            {/* 3. Детальная разбивка баллов */}
            {data.scores_breakdown && (
                <div className="result-section breakdown-section">
                    <h3 className="section-title">Разбивка по категориям</h3>
                    <ul className="breakdown-list">
                        {Object.entries(data.scores_breakdown).map(([key, value]) => (
                            <li key={key} className="breakdown-item">
                                <span className="breakdown-key">{key.replace(/_/g, ' ')}</span>
                                <span className="breakdown-value">{value}%</span>
                                <div className="breakdown-bar-container">
                                    <div 
                                      className="breakdown-bar" 
                                      style={{ width: `${value}%`, backgroundColor: value > 70 ? '#10b981' : value > 40 ? '#f59e0b' : '#ef4444' }}
                                    ></div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* 4. Резюме от AI */}
            {data.ai_summary && (
                <div className="result-section summary-section">
                    <h3 className="section-title">Резюме от AI 🧠</h3>
                    {/* Используем pre-wrap для сохранения форматирования, если оно есть */}
                    <p className="section-text">{data.ai_summary}</p>
                </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}