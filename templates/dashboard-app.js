// src/templates/dashboard-app.js
// Codr Template: Dashboard App
// Pipeline, project, asset, or onboarding management dashboard

export const dashboardAppTemplate = {
  name: 'Management Dashboard',
  description: 'Dashboard for pipeline, project, asset, or onboarding management',
  category: 'business',
  framework: 'react',

  files: {
    'src/App.tsx': `
import React, { useState, useEffect } from 'react';
import './App.css';

interface DashboardItem {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: Date;
  description?: string;
  tags: string[];
  createdAt: Date;
}

interface Metric {
  id: string;
  label: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

const DASHBOARD_TYPES = {
  pipeline: {
    name: 'Sales Pipeline',
    items: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    metrics: ['Total Leads', 'Conversion Rate', 'Avg Deal Size', 'Pipeline Value']
  },
  project: {
    name: 'Project Management',
    items: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
    metrics: ['Total Tasks', 'Completed', 'Overdue', 'Team Velocity']
  },
  asset: {
    name: 'Asset Management',
    items: ['Available', 'In Use', 'Maintenance', 'Retired'],
    metrics: ['Total Assets', 'Utilization Rate', 'Maintenance Cost', 'Downtime']
  },
  onboarding: {
    name: 'Onboarding Tracker',
    items: ['Applied', 'Screening', 'Interview', 'Offer', 'Onboarded', 'Rejected'],
    metrics: ['Applications', 'Hire Rate', 'Time to Hire', 'Retention Rate']
  }
};

function App() {
  const [dashboardType, setDashboardType] = useState<keyof typeof DASHBOARD_TYPES>('pipeline');
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Load saved data
    const savedItems = localStorage.getItem(\`dashboard-\${dashboardType}-items\`);
    const savedMetrics = localStorage.getItem(\`dashboard-\${dashboardType}-metrics\`);

    if (savedItems) {
      const parsed = JSON.parse(savedItems).map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined
      }));
      setItems(parsed);
    } else {
      // Initialize with sample data based on type
      setItems(getSampleItems(dashboardType));
    }

    if (savedMetrics) {
      setMetrics(JSON.parse(savedMetrics));
    } else {
      setMetrics(getSampleMetrics(dashboardType));
    }
  }, [dashboardType]);

  useEffect(() => {
    localStorage.setItem(\`dashboard-\${dashboardType}-items\`, JSON.stringify(items));
  }, [items, dashboardType]);

  useEffect(() => {
    localStorage.setItem(\`dashboard-\${dashboardType}-metrics\`, JSON.stringify(metrics));
  }, [metrics, dashboardType]);

  const getSampleItems = (type: keyof typeof DASHBOARD_TYPES): DashboardItem[] => {
    const config = DASHBOARD_TYPES[type];
    return config.items.map((status, index) => ({
      id: \`\${type}-\${index}\`,
      title: \`\${config.name} Item \${index + 1}\`,
      status: status.toLowerCase().replace(' ', '-') as any,
      priority: ['low', 'medium', 'high', 'urgent'][index % 4] as any,
      assignee: ['Alice', 'Bob', 'Charlie', 'Diana'][index % 4],
      dueDate: new Date(Date.now() + (index + 1) * 86400000),
      description: \`Sample \${status} item for \${config.name}\`,
      tags: ['sample', type],
      createdAt: new Date()
    }));
  };

  const getSampleMetrics = (type: keyof typeof DASHBOARD_TYPES): Metric[] => {
    const config = DASHBOARD_TYPES[type];
    return config.metrics.map((metric, index) => ({
      id: \`\${type}-metric-\${index}\`,
      label: metric,
      value: Math.floor(Math.random() * 1000) + 100,
      change: (Math.random() - 0.5) * 20,
      trend: ['up', 'down', 'stable'][index % 3] as any
    }));
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(filter.toLowerCase()) ||
    item.description?.toLowerCase().includes(filter.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'closed won': case 'onboarded': return '#27ae60';
      case 'in-progress': case 'review': case 'negotiation': return '#f39c12';
      case 'todo': case 'lead': case 'applied': return '#3498db';
      case 'closed lost': case 'rejected': case 'retired': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#e74c3c';
      case 'high': return '#e67e22';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const updateItemStatus = (id: string, newStatus: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, status: newStatus as any } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const config = DASHBOARD_TYPES[dashboardType];
  const statusCounts = config.items.reduce((acc, status) => {
    acc[status] = items.filter(item => item.status === status.toLowerCase().replace(' ', '-')).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="dashboard-app">
      <header>
        <h1>📊 {config.name} Dashboard</h1>
        <p>Track and manage your {dashboardType} workflow</p>
      </header>

      <div className="dashboard-controls">
        <div className="type-selector">
          {Object.entries(DASHBOARD_TYPES).map(([key, typeConfig]) => (
            <button
              key={key}
              className={dashboardType === key ? 'active' : ''}
              onClick={() => setDashboardType(key as keyof typeof DASHBOARD_TYPES)}
            >
              {typeConfig.name}
            </button>
          ))}
        </div>

        <div className="search-filter">
          <input
            type="text"
            placeholder="Search items..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button onClick={() => setShowForm(true)} className="primary">
            + Add Item
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        {metrics.map(metric => (
          <div key={metric.id} className="metric-card">
            <div className="metric-header">
              <h3>{metric.label}</h3>
              <span className={\`trend \${metric.trend}\`}>
                {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                {Math.abs(metric.change).toFixed(1)}%
              </span>
            </div>
            <div className="metric-value">{metric.value}</div>
            <div className="metric-chart">
              <div className="chart-placeholder">
                Chart visualization would go here
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="kanban-board">
        {config.items.map(status => (
          <div key={status} className="kanban-column">
            <div className="column-header">
              <h3>{status}</h3>
              <span className="item-count">{statusCounts[status] || 0}</span>
            </div>
            <div className="column-content">
              {filteredItems
                .filter(item => item.status === status.toLowerCase().replace(' ', '-'))
                .map(item => (
                  <div key={item.id} className="kanban-card">
                    <div className="card-header">
                      <h4>{item.title}</h4>
                      <div className="card-actions">
                        <span
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(item.priority) }}
                        >
                          {item.priority}
                        </span>
                        <button
                          className="delete-btn"
                          onClick={() => deleteItem(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="card-description">{item.description}</p>
                    )}

                    <div className="card-meta">
                      {item.assignee && <span className="assignee">👤 {item.assignee}</span>}
                      {item.dueDate && (
                        <span className={\`due-date \${item.dueDate < new Date() ? 'overdue' : ''}\`}>
                          📅 {item.dueDate.toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {item.tags.length > 0 && (
                      <div className="card-tags">
                        {item.tags.map(tag => (
                          <span key={tag} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="status-selector">
                      <select
                        value={item.status}
                        onChange={(e) => updateItemStatus(item.id, e.target.value)}
                      >
                        {config.items.map(s => (
                          <option key={s} value={s.toLowerCase().replace(' ', '-')}>
                            Move to {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <ItemForm
          dashboardType={dashboardType}
          onSave={(item) => {
            setItems([...items, item]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function ItemForm({ dashboardType, onSave, onCancel }: {
  dashboardType: keyof typeof DASHBOARD_TYPES;
  onSave: (item: DashboardItem) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const item: DashboardItem = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      status: status as any,
      priority,
      assignee: assignee.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: new Date()
    };

    onSave(item);
  };

  const config = DASHBOARD_TYPES[dashboardType];

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <h2>Add New {config.name} Item</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {config.items.map(s => (
                  <option key={s} value={s.toLowerCase().replace(' ', '-')}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assignee</label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
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
            <button type="submit" className="primary">Add Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
    `,

    'src/App.css': `
.dashboard-app {
  max-width: 1400px;
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

.dashboard-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
}

.type-selector {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.type-selector button {
  padding: 10px 20px;
  border: 2px solid #3498db;
  border-radius: 25px;
  background: white;
  color: #3498db;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.type-selector button:hover,
.type-selector button.active {
  background: #3498db;
  color: white;
}

.search-filter {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-filter input {
  padding: 10px 16px;
  border: 2px solid #ddd;
  border-radius: 25px;
  font-size: 16px;
  width: 250px;
}

.search-filter button.primary {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 600;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border: 1px solid #ecf0f1;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.metric-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.trend {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.trend.up {
  background: #d4edda;
  color: #155724;
}

.trend.down {
  background: #f8d7da;
  color: #721c24;
}

.trend.stable {
  background: #fff3cd;
  color: #856404;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: #212529;
  margin-bottom: 16px;
}

.metric-chart {
  height: 80px;
}

.chart-placeholder {
  height: 100%;
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  font-size: 14px;
  text-align: center;
}

.kanban-board {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding-bottom: 20px;
}

.kanban-column {
  flex: 1;
  min-width: 300px;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.column-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 18px;
}

.item-count {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.column-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 400px;
}

.kanban-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #ecf0f1;
  cursor: move;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.delete-btn {
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: #fee;
}

.card-description {
  color: #34495e;
  margin-bottom: 12px;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 12px;
}

.assignee {
  background: #ecf0f1;
  padding: 2px 6px;
  border-radius: 8px;
}

.due-date {
  background: #fff3cd;
  padding: 2px 6px;
  border-radius: 8px;
}

.due-date.overdue {
  background: #f8d7da;
  color: #721c24;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tag {
  background: #3498db;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
}

.status-selector {
  margin-top: 12px;
}

.status-selector select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.form-overlay {
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

.form-modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-modal h2 {
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
  min-height: 80px;
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

@media (max-width: 768px) {
  .dashboard-controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .kanban-board {
    flex-direction: column;
  }

  .kanban-column {
    min-width: unset;
  }

  .form-row {
    flex-direction: column;
  }
}
    `,

    'package.json': `
{
  "name": "dashboard-app",
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
    <title>Management Dashboard</title>
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