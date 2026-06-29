import { useState } from 'react'
import { supabase } from './lib/supabase'
import { MODULES } from './modules'

export default function App() {
  const [status, setStatus] = useState<string>('Not tested')

  async function testDb() {
    setStatus('Testing…')
    // companies has RLS enabled with no anon policy yet, so a count of 0
    // (and NO error) confirms the table exists and the connection works.
    const { error } = await supabase.from('companies').select('*', { count: 'exact', head: true })
    if (error) {
      setStatus(`DB reachable, table check: ${error.message}`)
    } else {
      setStatus('✅ Connected to Supabase — schema present.')
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '40px auto', padding: '0 20px' }}>
      <h1>Super Marketing Brain</h1>
      <p style={{ color: '#555' }}>
        Reusable cross-industry marketing intelligence. Same backend logic, different ingredients.
        Super-admin tool — separate from all other products.
      </p>

      <button onClick={testDb} style={{ padding: '8px 14px', cursor: 'pointer' }}>
        Test database connection
      </button>
      <p><strong>Status:</strong> {status}</p>

      <h2>The 20-module pipeline</h2>
      <ol>
        {MODULES.map((m) => (
          <li key={m}>{m.replace(/^\d+\.\s/, '')}</li>
        ))}
      </ol>

      <p style={{ color: '#999', fontSize: 13 }}>
        Strategy + specs live in <code>/docs</code>. Schema in <code>/supabase/migrations</code>.
      </p>
    </main>
  )
}
