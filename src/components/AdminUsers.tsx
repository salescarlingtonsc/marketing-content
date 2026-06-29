import { useEffect, useState } from 'react'
import { listUsers, setUserStatus, type Profile } from '../lib/admin'

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [msg, setMsg] = useState('')

  async function load() {
    try { setUsers(await listUsers()) } catch (e: any) { setMsg(e.message ?? String(e)) }
  }
  useEffect(() => { load() }, [])

  async function act(id: string, status: 'approved' | 'rejected') {
    try { await setUserStatus(id, status); load() } catch (e: any) { setMsg(e.message ?? String(e)) }
  }

  const pending = users.filter((u) => u.status === 'pending')

  return (
    <section style={{ marginTop: 24, border: '1px solid #e6e6e6', borderRadius: 8, padding: 14 }}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>👤 Users — owner approval ({pending.length} pending)</h2>
      {msg && <p style={{ color: '#b42318', fontSize: 12 }}>{msg}</p>}
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead><tr style={{ textAlign: 'left', color: '#888' }}><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0' }}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td style={{ color: u.status === 'approved' ? '#1a7f37' : u.status === 'rejected' ? '#b42318' : '#9a6700' }}>{u.status}</td>
              <td>
                {u.role !== 'owner' && (
                  <>
                    {u.status !== 'approved' && <button onClick={() => act(u.id, 'approved')} style={{ marginRight: 6, cursor: 'pointer', fontSize: 12 }}>Approve</button>}
                    {u.status !== 'rejected' && <button onClick={() => act(u.id, 'rejected')} style={{ cursor: 'pointer', fontSize: 12 }}>Reject</button>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
