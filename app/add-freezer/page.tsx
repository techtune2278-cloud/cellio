'use client'

import { useState } from 'react'
import { createClient } from '../supabase/client'
import { useRouter } from 'next/navigation'

export default function AddFreezerPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Récupérer l'ID user depuis le cookie (on simplifie)
    const userId = document.cookie.split('; ').find(row => row.startsWith('congelo_user_id='))?.split('=')[1]

    const { error } = await supabase
      .from('freezers')
      .insert([{ name, description, user_id: userId }])

    if (!error) router.push('/')
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-sm mt-8 border border-slate-100">
      <h1 className="text-xl font-bold mb-6 text-slate-800">Ajouter un espace 🍷</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          placeholder="Nom (ex: Cave Sous-sol, Réserve...)" 
          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-rose-500 text-slate-800"
          value={name} onChange={e => setName(e.target.value)}
          required
        />
        <input 
          placeholder="Description (Optionnel)" 
          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-rose-500 text-slate-800"
          value={description} onChange={e => setDescription(e.target.value)}
        />
        <button className="w-full bg-rose-800 hover:bg-rose-900 text-white font-bold py-3 rounded-xl transition shadow-md">
          Créer l'espace
        </button>
      </form>
    </div>
  )
}