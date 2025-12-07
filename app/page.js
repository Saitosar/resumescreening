'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // 1. Просто сохраняем файл в стейт при выборе
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(''); // Сбрасываем ошибки
      setResult(null); // Сбрасываем старый результат
    }
  };

  // 2. Отправка файла на наш API (который перешлет его в N8N)
  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    
    // Создаем FormData для отправки бинарного файла
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Отправляем на наш новый endpoint
      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Сохраняем результат от N8N
      setResult(response.data);
    } catch (err) {
      console.error('Error:', err);
      setError('Произошла ошибка при анализе резюме. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50 text-gray-900">
      <div className="z-10 w-full max-w-3xl items-center justify-between font-mono text-sm lg:flex mb-10">
        <h1 className="text-4xl font-bold text-blue-600">CV Scoring App</h1>
      </div>

      <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-lg">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Загрузите резюме (PDF)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {/* Кнопка теперь активируется, если есть file и нет загрузки */}
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className={`w-full py-3 px-4 rounded-lg text-white font-bold transition-colors
            ${!file || loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}
        >
          {loading ? 'Анализируем...' : 'Проверить резюме'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Блок отображения результатов */}
      {result && (
        <div className="w-full max-w-3xl mt-8 bg-white p-8 rounded-xl shadow-lg border-t-4 border-green-500">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Результат анализа</h2>
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
            {/* Здесь мы выводим то, что вернул N8N. Обычно это свойство text или output */}
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </div>
        </div>
      )}
    </main>
  );
}