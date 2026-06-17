import './Upload.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = '';

function Upload() {
  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState('Music');
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async () => {
    setError('');

    if (!title || !file) {
      setError('Please add a title and choose a video file.');
      return;
    }

    const token = localStorage.getItem('th_token');
    if (!token) {
      setError('You must be logged in to upload. Please sign in first.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('category', category);

    setLoading(true);
    setProgress(0);

    try {
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status === 201) {
              resolve(data);
            } else {
              reject(new Error(data.message || 'Upload failed.'));
            }
          } catch {
            reject(new Error('Server returned invalid response.'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error. Cannot connect to server.'));

        xhr.open('POST', `${API}/api/videos`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      alert(`"${result.title}" published successfully! 🎉`);
      navigate('/');

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="th-upload-page">
      <h1>Upload Your<br /><span style={{ color: '#f5c842' }}>Performance</span></h1>
      <p className="sub">Share your talent with the world in under 60 seconds.</p>

      {error && (
        <div style={{
          background: 'rgba(220,53,69,0.12)',
          border: '1px solid rgba(220,53,69,0.35)',
          color: '#ff6b6b',
          fontSize: '13px',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          ⚠ {error}
        </div>
      )}

      <div
        className="th-dropzone"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !loading && document.getElementById('file-input').click()}
        style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
      >
        <div className="th-dropzone-icon">🎬</div>
        {file ? (
          <p><strong style={{ color: '#f5c842' }}>{file.name}</strong></p>
        ) : (
          <p><strong>Click or drag</strong> your video here<br />MP4, MOV up to 100MB</p>
        )}
        <input
          id="file-input"
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files[0])}
        />
      </div>

      {loading && (
        <div style={{ margin: '16px 0' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#7a7f94',
            marginBottom: '6px',
          }}>
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '99px',
            height: '6px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: '#f5c842',
              borderRadius: '99px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      <div className="th-upload-form">
        <div className="th-field">
          <label>Video Title</label>
          <input
            type="text"
            placeholder="Give your performance a name..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="th-field">
          <label>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            disabled={loading}
          >
            <option>Music</option>
            <option>Dance</option>
            <option>Hip-Hop</option>
            <option>Comedy</option>
            <option>Other</option>
          </select>
        </div>

        <button
          className="th-btn-main"
          onClick={handleSubmit}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? `Uploading... ${progress}%` : 'Publish Performance 🚀'}
        </button>
      </div>
    </div>
  );
}

export default Upload;
