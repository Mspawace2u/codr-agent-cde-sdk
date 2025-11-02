// src/templates/idea-bank-app.js
// Codr Template: Idea Bank Capture App
// Capture ideas from all devices and file types

export const ideaBankAppTemplate = {
  name: 'Idea Bank Capture App',
  description: 'Capture and organize ideas from all devices and file types',
  category: 'productivity',
  framework: 'react',

  files: {
    'src/App.tsx': `
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface Idea {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'file' | 'link';
  tags: string[];
  category: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  attachments?: File[];
  links?: string[];
}

const CATEGORIES = [
  'Business', 'Creative', 'Technical', 'Personal', 'Research', 'Product'
];

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('idea-bank');
    if (saved) {
      const parsed = JSON.parse(saved).map((idea: any) => ({
        ...idea,
        createdAt: new Date(idea.createdAt)
      }));
      setIdeas(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('idea-bank', JSON.stringify(ideas));
  }, [ideas]);

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         idea.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         idea.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || idea.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const newIdea: Idea = {
        id: Date.now().toString(),
        title: \`File Upload: \${files.map(f => f.name).join(', ')}\`,
        content: \`Uploaded \${files.length} file(s)\`,
        type: 'file',
        tags: ['upload', 'file'],
        category: 'Technical',
        priority: 'medium',
        createdAt: new Date(),
        attachments: files
      };
      setIdeas([newIdea, ...ideas]);
    }
  };

  const handleVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const newIdea: Idea = {
          id: Date.now().toString(),
          title: 'Voice Note',
          content: \`[Voice Recording] \${audioUrl}\`,
          type: 'voice',
          tags: ['voice', 'recording'],
          category: 'Personal',
          priority: 'medium',
          createdAt: new Date()
        };

        setIdeas([newIdea, ...ideas]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 30000); // 30 second limit
      alert('Recording for 30 seconds...');
    } catch (error) {
      alert('Could not access microphone');
    }
  };

  const handleImageCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera on mobile
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        const newIdea: Idea = {
          id: Date.now().toString(),
          title: 'Image Capture',
          content: \`[Image] \${imageUrl}\`,
          type: 'image',
          tags: ['image', 'capture', 'mobile'],
          category: 'Creative',
          priority: 'medium',
          createdAt: new Date(),
          attachments: [file]
        };
        setIdeas([newIdea, ...ideas]);
      }
    };
    input.click();
  };

  const deleteIdea = (id: string) => {
    setIdeas(ideas.filter(idea => idea.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voice': return '🎤';
      case 'image': return '📷';
      case 'file': return '📎';
      case 'link': return '🔗';
      default: return '💡';
    }
  };

  return (
    <div className="idea-bank">
      <header>
        <h1>💡 Idea Bank</h1>
        <p>Capture ideas from anywhere, anytime</p>
      </header>

      <div className="controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="capture-buttons">
          <button onClick={() => setShowForm(true)} className="primary">
            ✏️ Write Idea
          </button>
          <button onClick={handleVoiceRecording}>
            🎤 Voice Note
          </button>
          <button onClick={handleImageCapture}>
            📷 Capture Image
          </button>
          <button onClick={() => fileInputRef.current?.click()}>
            📎 Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {showForm && (
        <IdeaForm
          onSave={(idea) => {
            setIdeas([idea, ...ideas]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="ideas-grid">
        {filteredIdeas.map(idea => (
          <div key={idea.id} className="idea-card">
            <div className="idea-header">
              <div className="idea-meta">
                <span className="idea-type">{getTypeIcon(idea.type)}</span>
                <span
                  className="idea-priority"
                  style={{ backgroundColor: getPriorityColor(idea.priority) }}
                >
                  {idea.priority}
                </span>
                <span className="idea-category">{idea.category}</span>
              </div>
              <button
                className="delete-btn"
                onClick={() => deleteIdea(idea.id)}
              >
                ×
              </button>
            </div>

            <h3 className="idea-title">{idea.title}</h3>

            <div className="idea-content">
              {idea.type === 'voice' && idea.content.includes('[Voice Recording]') ? (
                <audio controls>
                  <source src={idea.content.replace('[Voice Recording] ', '')} type="audio/wav" />
                </audio>
              ) : idea.type === 'image' && idea.content.includes('[Image]') ? (
                <img
                  src={idea.content.replace('[Image] ', '')}
                  alt="Captured idea"
                  style={{ maxWidth: '100%', borderRadius: '8px' }}
                />
              ) : (
                <p>{idea.content}</p>
              )}
            </div>

            {idea.tags.length > 0 && (
              <div className="idea-tags">
                {idea.tags.map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
            )}

            <div className="idea-footer">
              <small>
                {idea.createdAt.toLocaleDateString()} at {idea.createdAt.toLocaleTimeString()}
              </small>
            </div>
          </div>
        ))}
      </div>

      {filteredIdeas.length === 0 && (
        <div className="empty-state">
          <h3>No ideas found</h3>
          <p>Start capturing your ideas using the buttons above!</p>
        </div>
      )}
    </div>
  );
}

function IdeaForm({ onSave, onCancel }: {
  onSave: (idea: Idea) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const idea: Idea = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      type: 'text',
      category,
      priority,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: new Date()
    };

    onSave(idea);
  };

  return (
    <div className="idea-form-overlay">
      <div className="idea-form">
        <h2>Add New Idea</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title for your idea"
              required
            />
          </div>

          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your idea in detail"
              rows={6}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="primary">Save Idea</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
    `,

    'src/App.css': `
.idea-bank {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

header p {
  color: #7f8c8d;
  margin: 0;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 30px;
  align-items: center;
}

.search-bar input {
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 25px;
  font-size: 16px;
  width: 300px;
  max-width: 100%;
}

.filters select {
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  background: white;
}

.capture-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.capture-buttons button {
  padding: 12px 16px;
  border: 2px solid #3498db;
  border-radius: 8px;
  background: white;
  color: #3498db;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.capture-buttons button:hover {
  background: #3498db;
  color: white;
}

.capture-buttons button.primary {
  background: #3498db;
  color: white;
}

.idea-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.idea-form {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.idea-form h2 {
  margin-top: 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

.form-actions button {
  padding: 12px 24px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
}

.form-actions button.primary {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.ideas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.idea-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border: 1px solid #ecf0f1;
  transition: transform 0.2s;
}

.idea-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.idea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.idea-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.idea-type {
  font-size: 20px;
}

.idea-priority {
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.idea-category {
  background: #ecf0f1;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #7f8c8d;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #e74c3c;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: #fee;
}

.idea-title {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
  font-weight: 600;
}

.idea-content {
  margin-bottom: 15px;
}

.idea-content p {
  margin: 0;
  line-height: 1.6;
  color: #34495e;
}

.idea-content audio {
  width: 100%;
  max-width: 300px;
}

.idea-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.tag {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.idea-footer {
  border-top: 1px solid #ecf0f1;
  padding-top: 10px;
}

.idea-footer small {
  color: #7f8c8d;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.empty-state h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar input {
    width: 100%;
  }

  .capture-buttons {
    justify-content: center;
  }

  .ideas-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }
}
    `,

    'package.json': `
{
  "name": "idea-bank-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.0.0"
  }
}
    `,

    'vite.config.ts': `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
    `,

    'index.html': `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Idea Bank</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
    `,

    'src/main.tsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
    `,

    'src/vite-env.d.ts': `
/// <reference types="vite/client" />
    `,

    'tsconfig.json': `
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
    `
  }
};