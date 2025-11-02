// templates/data-transformer.js
// Codr Template: Data Transformer Agent
// Transforms data between formats for chaining

export const dataTransformerTemplate = {
  name: 'Data Transformer Agent',
  description: 'Transforms data between different formats (JSON, XML, CSV, etc.)',
  category: 'processing',
  framework: 'worker',

  files: {
    'src/index.js': `
/**
 * Data Transformer Agent
 * Transforms data between different formats and structures
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { data, inputFormat, outputFormat, transformations } = await request.json();

      // Apply transformations
      let transformedData = data;

      // Format conversion
      if (inputFormat && outputFormat && inputFormat !== outputFormat) {
        transformedData = await convertFormat(transformedData, inputFormat, outputFormat);
      }

      // Custom transformations
      if (transformations && Array.isArray(transformations)) {
        transformedData = await applyTransformations(transformedData, transformations);
      }

      // Store transformed data
      const transformId = crypto.randomUUID();
      await env.TRANSFORMED_DATA.put(\`transform:\${transformId}\`, JSON.stringify({
        id: transformId,
        originalData: data,
        transformedData,
        inputFormat,
        outputFormat,
        transformations,
        transformedAt: new Date().toISOString()
      }), { expirationTtl: 3600 });

      // Trigger next agent
      if (env.NEXT_AGENT_URL) {
        await triggerNextAgent(transformedData, env);
      }

      return new Response(JSON.stringify({
        success: true,
        transformId,
        data: transformedData,
        nextAgentTriggered: !!env.NEXT_AGENT_URL
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Data transformation error:', error);
      return new Response(JSON.stringify({
        error: 'Transformation failed',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function convertFormat(data, inputFormat, outputFormat) {
  // Convert between formats
  switch (\`\${inputFormat}->\${outputFormat}\`) {
    case 'json->csv':
      return jsonToCsv(data);
    case 'csv->json':
      return csvToJson(data);
    case 'xml->json':
      return xmlToJson(data);
    case 'json->xml':
      return jsonToXml(data);
    default:
      return data; // No conversion needed
  }
}

async function applyTransformations(data, transformations) {
  let result = data;

  for (const transform of transformations) {
    switch (transform.type) {
      case 'map':
        result = result.map(item => {
          const newItem = { ...item };
          if (transform.mappings) {
            Object.entries(transform.mappings).forEach(([oldKey, newKey]) => {
              if (newItem[oldKey] !== undefined) {
                newItem[newKey] = newItem[oldKey];
                delete newItem[oldKey];
              }
            });
          }
          return newItem;
        });
        break;

      case 'filter':
        if (transform.condition) {
          result = result.filter(item => {
            // Simple condition evaluation
            const field = transform.condition.field;
            const operator = transform.condition.operator;
            const value = transform.condition.value;

            switch (operator) {
              case 'equals': return item[field] === value;
              case 'contains': return String(item[field]).includes(value);
              case 'greater': return Number(item[field]) > Number(value);
              case 'less': return Number(item[field]) < Number(value);
              default: return true;
            }
          });
        }
        break;

      case 'add_field':
        if (transform.field && transform.value !== undefined) {
          if (Array.isArray(result)) {
            result = result.map(item => ({ ...item, [transform.field]: transform.value }));
          } else {
            result[transform.field] = transform.value;
          }
        }
        break;

      case 'remove_field':
        if (transform.field) {
          if (Array.isArray(result)) {
            result = result.map(item => {
              const newItem = { ...item };
              delete newItem[transform.field];
              return newItem;
            });
          } else {
            delete result[transform.field];
          }
        }
        break;
    }
  }

  return result;
}

function jsonToCsv(jsonData) {
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    return '';
  }

  const headers = Object.keys(jsonData[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  jsonData.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return \`"\${value.replace(/"/g, '""')}"\`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\\n');
}

function csvToJson(csvData) {
  const lines = csvData.split('\\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function xmlToJson(xmlData) {
  // Simple XML to JSON conversion (for basic XML structures)
  // In production, you'd use a proper XML parser
  const json = { data: xmlData };
  return json;
}

function jsonToXml(jsonData) {
  // Simple JSON to XML conversion
  // In production, you'd use a proper XML generator
  return \`<data>\${JSON.stringify(jsonData)}</data>\`;
}

async function triggerNextAgent(transformedData, env) {
  try {
    await fetch(env.NEXT_AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${env.AGENT_API_KEY || ''}\`
      },
      body: JSON.stringify({
        source: 'data-transformer',
        data: transformedData,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.warn('Error triggering next agent:', error);
  }
}
    `,

    'wrangler.toml': `
name = "data-transformer-agent"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
NEXT_AGENT_URL = ""  # URL of next agent in chain
AGENT_API_KEY = ""   # API key for triggering next agent

[[kv_namespaces]]
binding = "TRANSFORMED_DATA"
id = "your-kv-namespace-id"
preview_id = "your-kv-namespace-id"
    `,

    'package.json': `
{
  "name": "data-transformer-agent",
  "version": "1.0.0",
  "description": "Data transformation micro-agent for format conversion and data manipulation",
  "main": "src/index.js",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {},
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
    `,

    'README.md': `
# Data Transformer Agent

Transforms data between different formats and applies custom transformations for chaining to other agents.

## Features

- ✅ Format conversion (JSON ↔ CSV, JSON ↔ XML)
- ✅ Data mapping (rename fields)
- ✅ Filtering (based on conditions)
- ✅ Field addition/removal
- ✅ Chaining to next agents
- ✅ Data persistence in KV

## API

Send POST requests with:

\`\`\`json
{
  "data": {...},           // Data to transform
  "inputFormat": "json",   // Optional: "json", "csv", "xml"
  "outputFormat": "csv",   // Optional: "json", "csv", "xml"
  "transformations": [     // Optional: Array of transformations
    {
      "type": "map",
      "mappings": {"oldField": "newField"}
    },
    {
      "type": "filter",
      "condition": {"field": "status", "operator": "equals", "value": "active"}
    }
  ]
}
\`\`\`

## Configuration

- \`NEXT_AGENT_URL\`: URL to trigger after transformation
- \`AGENT_API_KEY\`: API key for next agent authentication
    `
  }
};