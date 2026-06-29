import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')

  async function signIn() {
    setMsg('Signing in…')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setMsg(`Error: ${error.message}`)
  }
  async function signUp() {
    setMsg('Creating account…')
    const { error } = await supabase.auth.signUp({ email, password: pw })
    setMsg(error ? `Error: ${error.message}` : 'Account created. If email confirmation is on, confirm then sign in.')
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 360, margin: '80px auto', padding: '0 18px' }}>
      <h1 style={{ fontSize: 20 }}>Super Marketing Brain</h1>
      <p style={{ color: '#888', fontSize: 13 }}>Super-admin sign in.</p>
      <input
        placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 9, marginBottom: 8, boxSizing: 'border-box' }}
      />
      <input
        placeholder="password" type="password" value={pw} onChange={(e) => setPw(e.target.value)}
        style={{ width: '100%', padding: 9, marginBottom: 10, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={signIn} style={{ padding: '9px 16px', cursor: 'pointer', fontWeight: 600 }}>Sign in</button>
        <button onClick={signUp} style={{ padding: '9px 16px', cursor: 'pointer' }}>Create account</button>
      </div>
      {msg && <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>{msg}</p>}
    </main>
  )
}
