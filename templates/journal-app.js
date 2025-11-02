// src/templates/journal-app.js
// Codr Template: Simple Journal Entry App
// Voice or text journal entries with local storage

export const journalAppTemplate = {
  name: 'Journal Entry App',
  description: 'Simple journal app supporting voice and text entries',
  category: 'productivity',
  framework: 'react',

  files: {
    'src/App.tsx': `
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

interface JournalEntry {
  id: string;
  content: string;
  type: 'text' | 'voice';
  timestamp: Date;
  mood?: string;
  tags?: string[];
}

function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [tags, setTags] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('journal-entries');
    if (saved) {
      const parsed = JSON.parse(saved).map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
      setEntries(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('journal-entries', JSON.stringify(entries));
  }, [entries]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const newEntry: JournalEntry = {
          id: Date.now().toString(),
          content: \`[Voice Recording] \${audioUrl}\`,
          type: 'voice',
          timestamp: new Date(),
          mood: selectedMood,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        setEntries([newEntry, ...entries]);
        setSelectedMood('');
        setTags('');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const saveTextEntry = () => {
    if (currentEntry.trim()) {
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        content: currentEntry.trim(),
        type: 'text',
        timestamp: new Date(),
        mood: selectedMood,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      setEntries([newEntry, ...entries]);
      setCurrentEntry('');
      setSelectedMood('');
      setTags('');
    }
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="journal-app">
      <header>
        <h1>My Journal</h1>
        <p>Record your thoughts and memories</p>
      </header>

      <div className="entry-form">
        <div className="mood-selector">
          <label>How are you feeling?</label>
          <div className="mood-buttons">
            {['😊', '😐', '😢', '😠', '😴', '🤔', '❤️', '✨'].map(mood => (
              <button
                key={mood}
                className={selectedMood === mood ? 'selected' : ''}
                onClick={() => setSelectedMood(mood)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        <div className="tags-input">
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="entry-input">
          <textarea
            placeholder="What's on your mind?"
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            rows={4}
          />
        </div>

        <div className="entry-actions">
          <button
            className={\`voice-button \${isRecording ? 'recording' : ''}\`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? '⏹️ Stop Recording' : '🎤 Voice Note'}
          </button>

          <button
            className="save-button"
            onClick={saveTextEntry}
            disabled={!currentEntry.trim()}
          >
            Save Entry
          </button>
        </div>
      </div>

      <div className="entries-list">
        <h2>Recent Entries</h2>
        {entries.length === 0 ? (
          <div className="empty-state">
            <p>No entries yet. Start writing or recording!</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="entry-card">
              <div className="entry-header">
                <div className="entry-meta">
                  <span className="entry-type">{entry.type === 'voice' ? '🎤' : '📝'}</span>
                  <span className="entry-date">{formatDate(entry.timestamp)}</span>
                  {entry.mood && <span className="entry-mood">{entry.mood}</span>}
                </div>
                <button
                  className="delete-button"
                  onClick={() => deleteEntry(entry.id)}
                >
                  ×
                </button>
              </div>

              <div className="entry-content">
                {entry.type === 'voice' ? (
                  <div className="voice-entry">
                    <audio controls>
                      <source src={entry.content.replace('[Voice Recording] ', '')} type="audio/wav" />
                    </audio>
                  </div>
                ) : (
                  <p>{entry.content}</p>
                )}
              </div>

              {entry.tags && entry.tags.length > 0 && (
                <div className="entry-tags">
                  {entry.tags.map(tag => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
    `,

    'src/App.css': `
.journal-app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

header p {
  color: #7f8c8d;
  margin: 0;
}

.entry-form {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 40px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.mood-selector {
  margin-bottom: 20px;
}

.mood-selector label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #2c3e50;
}

.mood-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mood-buttons button {
  font-size: 24px;
  padding: 8px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.mood-buttons button:hover {
  border-color: #3498db;
}

.mood-buttons button.selected {
  border-color: #3498db;
  background: #ebf5fb;
}

.tags-input input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 20px;
}

.entry-input textarea {
  width: 100%;
  padding: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
}

.entry-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: center;
}

.voice-button, .save-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.voice-button {
  background: #e74c3c;
  color: white;
}

.voice-button:hover {
  background: #c0392b;
}

.voice-button.recording {
  background: #27ae60;
  animation: pulse 1s infinite;
}

.save-button {
  background: #3498db;
  color: white;
}

.save-button:hover {
  background: #2980b9;
}

.save-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.entries-list h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  color: #7f8c8d;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 12px;
}

.entry-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid #ecf0f1;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #7f8c8d;
}

.entry-type {
  font-size: 18px;
}

.entry-mood {
  font-size: 16px;
}

.delete-button {
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

.delete-button:hover {
  background: #fee;
}

.entry-content {
  margin-bottom: 16px;
}

.entry-content p {
  margin: 0;
  line-height: 1.6;
  color: #2c3e50;
}

.voice-entry audio {
  width: 100%;
  max-width: 400px;
}

.entry-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

@media (max-width: 768px) {
  .journal-app {
    padding: 10px;
  }

  .entry-actions {
    flex-direction: column;
  }

  .mood-buttons {
    justify-content: center;
  }
}
    `,

    'package.json': `
{
  "name": "journal-app",
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
    <title>Personal Journal</title>
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