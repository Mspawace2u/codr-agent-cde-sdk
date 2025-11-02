import { useState } from 'react'

function Home() {
  const [query, setQuery] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: query,
          jtbds: query,
          input_sources: [],
          outputs: [],
          api_keys_required: [],
          visual_style: {
            theme: 'light',
            color: 'blue',
            font: 'sans',
            vibe: 'clean',
            motion: 'subtle'
          },
          frontend_framework: 'react'
        })
      })

      const data = await response.json()
      if (response.ok) {
        alert(`Agent created! Check your subdomain: ${data.id}.yourdomain.com`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Network error: ${error}`)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: '#0d0d0d',
      color: '#f4f4f4',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <main style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          background: 'linear-gradient(90deg, #a855f7, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🧩 Codr — Build Your Agent Army
        </h1>

        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.8 }}>
          Chat your workflow → Ship your agent → Deploy to Cloudflare in minutes.
        </p>

        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the app you want to build..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid #444',
              background: '#222',
              color: '#fff',
              fontSize: '1rem',
              resize: 'vertical'
            }}
            required
          />

          <button
            type="submit"
            disabled={!query.trim()}
            style={{
              background: 'linear-gradient(90deg, #a855f7, #ec4899)',
              color: '#fff',
              padding: '0.8rem 1.5rem',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: query.trim() ? 'pointer' : 'not-allowed',
              opacity: query.trim() ? 1 : 0.6,
              boxShadow: '0 0 25px rgba(168, 85, 247, 0.6)',
              transition: 'all 0.2s'
            }}
          >
            🚀 Code It
          </button>
        </form>

        <p style={{ marginTop: '2rem', opacity: 0.7, fontSize: '0.9rem' }}>
          <small>Your AI-generated apps will be deployed to unique subdomains automatically.</small>
        </p>
      </main>
    </div>
  )
}

export default Home