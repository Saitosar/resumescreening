'use client';

import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const resultRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };
    
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Please upload a PDF file only' };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
    }
    
    return { valid: true };
  };

  const handleFileSelect = useCallback((selectedFile) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      setFile(null);
      return;
    }
    
    setFile(selectedFile);
    setError('');
    setResult(null);
    setUploadProgress(0);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setResult(response.data);
      setUploadProgress(100);
      
      // Smooth scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Error:', err.response || err);
      const details = err.response?.data?.details || err.response?.data?.error || err.message;
      setError(`Analysis error: ${details}`);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  // Извлекаем структурированные данные для отображения
  const data = Array.isArray(result) && result.length > 0 ? result[0] : null;

  return (
    <main className="main-container">
      <div className="header-wrapper">
        <h1 className="main-title">
          AI Resume Scorer
        </h1>
        <p className="subtitle">Upload your resume and get instant AI-powered analysis</p>
      </div>

      <div className="card upload-card">
        <h2 className="card-title">Step 1: Upload Resume (PDF)</h2>
        
        <div 
          ref={dropZoneRef}
          className={`input-area ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Drop zone for file upload"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="drop-zone-content">
            <div className="drop-zone-icon">
              {isDragging ? '📥' : file ? '📄' : '📎'}
            </div>
            <label className="input-label" htmlFor="file-input">
              <span className="input-text">
                {isDragging 
                  ? 'Drop your PDF file here' 
                  : file 
                    ? file.name 
                    : 'Click to select or drag and drop your PDF file here'}
              </span>
            </label>
            {file && (
              <div className="file-info">
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
            )}
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="file-input"
              aria-label="Select PDF file"
            />
          </div>
        </div>

        {file && !loading && (
          <div className="file-ready-message">
            <span className="file-icon">✓</span>
            <span>File ready: <strong>{file.name}</strong></span>
            <button 
              className="remove-file-btn" 
              onClick={handleReset}
              aria-label="Remove file"
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <div className="progress-container">
            <div className="progress-bar-wrapper">
              <div 
                className="progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Analyzing resume...'}
            </div>
            <div className="spinner"></div>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className={`button primary-button ${loading || !file ? 'disabled' : ''}`}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className="button-spinner"></span>
              Analyzing...
            </>
          ) : (
            'Step 2: Analyze Resume'
          )}
        </button>

        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button 
              className="error-close" 
              onClick={() => setError('')}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Results Section */}
      {data && (
        <div className="card result-card" ref={resultRef}>
          <div className="result-header">
            <h2 className="card-title result-title">
              <span className="result-icon">📊</span>
              Analysis Results: {data.full_name || 'Candidate'}
            </h2>
            <button 
              className="reset-button" 
              onClick={handleReset}
              aria-label="Upload new resume"
            >
              Upload New Resume
            </button>
          </div>
          <div className="result-content">
            
            {/* 1. Overall Score and Verdict */}
            <div className="score-display">
                <div className="score-info">
                    <div className="score-label">Overall Score</div>
                    <div className="score-value">{data.total_score}</div>
                    <div className="score-out-of">out of 100</div>
                </div>
                <div className={`verdict-status status-${data.grade_verdict?.toLowerCase().replace(/\s/g, '-') || 'unknown'}`}>
                    {data.grade_verdict || 'N/A'}
                </div>
            </div>

            {/* 2. Routing Status (Next Step) */}
            {data.routing_status && (
                <div className="result-section routing-section">
                    <h3 className="section-title">
                      <span className="section-icon">🛣️</span>
                      Next Step
                    </h3>
                    <p className="routing-text">{data.routing_status}</p>
                </div>
            )}
            
            {/* 3. Detailed Score Breakdown */}
            {data.scores_breakdown && Object.keys(data.scores_breakdown).length > 0 && (
                <div className="result-section breakdown-section">
                    <h3 className="section-title">
                      <span className="section-icon">📈</span>
                      Score Breakdown by Category
                    </h3>
                    <ul className="breakdown-list" role="list">
                        {Object.entries(data.scores_breakdown).map(([key, value]) => {
                          const score = typeof value === 'number' ? value : 0;
                          return (
                            <li key={key} className="breakdown-item" role="listitem">
                                <div className="breakdown-header">
                                  <span className="breakdown-key">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                  <span className="breakdown-value">{score}%</span>
                                </div>
                                <div className="breakdown-bar-container">
                                    <div 
                                      className="breakdown-bar" 
                                      style={{ 
                                        width: `${score}%`, 
                                        backgroundColor: score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444' 
                                      }}
                                      role="progressbar"
                                      aria-valuenow={score}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                    ></div>
                                </div>
                            </li>
                          );
                        })}
                    </ul>
                </div>
            )}
            
            {/* 4. AI Summary */}
            {data.ai_summary && (
                <div className="result-section summary-section">
                    <h3 className="section-title">
                      <span className="section-icon">🧠</span>
                      AI Summary
                    </h3>
                    <div className="section-text-wrapper">
                      <p className="section-text">{data.ai_summary}</p>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
