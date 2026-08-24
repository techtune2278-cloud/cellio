'use client'

import { useState, useEffect } from 'react'
import { createClient } from './supabase/client'
import Footer from './components/Footer'

const FREEZER_COLORS = [
  'bg-emerald-500 text-white shadow-emerald-500/30',
  'bg-amber-500 text-white shadow-amber-500/30',
  'bg-sky-500 text-white shadow-sky-500/30',
  'bg-rose-500 text-white shadow-rose-500/30',
  'bg-violet-600 text-white shadow-violet-600/30',
  'bg-indigo-500 text-white shadow-indigo-500/30'
]

const FRIDGE_COLORS = [
  'bg-cyan-500 text-white shadow-cyan-500/30',
  'bg-lime-500 text-white shadow-lime-500/30',
  'bg-fuchsia-500 text-white shadow-fuchsia-500/30',
  'bg-yellow-500 text-white shadow-yellow-500/30',
  'bg-teal-500 text-white shadow-teal-500/30',
  'bg-pink-500 text-white shadow-pink-500/30'
]

const CAVE_UNITS = ['Bouteille (75cl)', 'Demi-bouteille (37.5cl)', 'Magnum (1.5L)', 'Jéroboam (3L)', 'Litre', 'Cubi / BIB', 'Caisse(s)', 'Carton(s)', 'Pièce(s)']
const ARMOIRE_UNITS = ['Pot 250mL', 'Pot de 350mL', 'Pot 500mL', 'Pot 750mL', 'Pot 1L', 'Pot 1,5L', 'Pot 2L', 'Pot de confiture', 'Gramme (g)', 'Kilo (kg)', 'Pièce(s)']

interface Equipment { id: string; name: string; is_secondary: boolean }
interface Category { id: string; name: string }
interface ProductTemplate { id: string; name: string }
interface Item {
  id: string; cellar_id: string; categorie: string; produit: string;
  qte: number; unite: string; date_entree: string; date_peremption: string | null; notes: string | null;
  millesime: string | null; domaine: string | null; date_fabrication: string | null;
}

export default function HomePage() {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [activeEqId, setActiveEqId] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductTemplate[]>([])
  const [items, setItems] = useState<Item[]>([])
  
  const [filterCat, setFilterCat] = useState('')
  const [searchTxt, setSearchTxt] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalContextIsSecondary, setModalContextIsSecondary] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  
  const [selectedCat, setSelectedCat] = useState('')
  const [newCatInput, setNewCatInput] = useState('')
  const [isCreatingCat, setIsCreatingCat] = useState(false)

  const [selectedProd, setSelectedProd] = useState('')
  const [newProdInput, setNewProdInput] = useState('')
  const [isCreatingProd, setIsCreatingProd] = useState(false)

  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('Bouteille (75cl)')
  const [dateEntree, setDateEntree] = useState(new Date().toISOString().slice(0, 10))
  const [datePeremption, setDatePeremption] = useState('')
  const [millesime, setMillesime] = useState('')
  const [domaine, setDomaine] = useState('')
  const [dateFabrication, setDateFabrication] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [notes, setNotes] = useState('')
  
  const [newEqName, setNewEqName] = useState('')
  const [newEqIsSecondary, setNewEqIsSecondary] = useState(false)

  const supabase = createClient()

  function getCookie(name: string) {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
  }

  // Identifie le type de catégorie pour filtrer dynamiquement
  const getCategoryContextType = (catName: string) => {
    const lower = (catName || '').toLowerCase()
    if (lower.includes('vin') || lower.includes('champagne') || lower.includes('spiritueux') || lower.includes('apéritif') || lower.includes('apritif') || lower.includes('rouge') || lower.includes('blanc') || lower.includes('rosé') || lower.includes('pétillant') || lower.includes('bière') || lower.includes('alcool')) return 'cave'
    if (lower.includes('confiture') || lower.includes('compote') || lower.includes('gelée') || lower.includes('pot') || lower.includes('conserve') || lower.includes('miel') || lower.includes('sauce') || lower.includes('sirop') || lower.includes('jus')) return 'armoire'
    return 'both'
  }

  useEffect(() => { loadInitialData() }, [])

  async function loadInitialData() {
    const userId = getCookie('congelo_user_id')

    let query = supabase.from('cellars').select('*').order('created_at', { ascending: true })
    if (userId) query = query.eq('user_id', userId)

    const { data: fData } = await query
    if (fData && fData.length > 0) {
      setEquipments(fData)
      setActiveEqId(String(fData[0].id))
    }

    const { data: cData } = await supabase.from('categories').select('*').order('name')
    if (cData && cData.length > 0) {
      setCategories(cData)
    }
    loadItems()
  }

  async function loadProductsForCategory(catName: string) {
    const { data } = await supabase.from('product_templates').select('*, categories!inner(name)').eq('categories.name', catName)
    if (data) {
      // Filtre anti-doublons ULTRA robuste (ignore espaces et majuscules)
      const uniqueProductsMap = new Map()
      data.forEach(item => {
        const key = item.name.trim().toLowerCase()
        if (!uniqueProductsMap.has(key)) {
          uniqueProductsMap.set(key, item)
        }
      })
      const uniqueProducts = Array.from(uniqueProductsMap.values())
      
      setProducts(uniqueProducts)
      if (uniqueProducts.length > 0) {
        setSelectedProd(uniqueProducts[0].name)
        setIsCreatingProd(false) 
      } else {
        setSelectedProd('')
        setIsCreatingProd(true) 
      }
    }
  }

  async function loadItems() {
    const userId = getCookie('congelo_user_id')
    let query = supabase.from('items').select('*').order('created_at', { ascending: false })
    if (userId) query = query.eq('user_id', userId)
    const { data } = await query
    if (data) setItems(data)
  }

  const handleCategoryChange = (val: string) => {
    if (val === '__NEW_CAT__') { 
      setIsCreatingCat(true)
      setSelectedCat('')
      setProducts([])
      setIsCreatingProd(true)
      setSelectedProd('')
    } else { 
      setIsCreatingCat(false)
      setSelectedCat(val)
      loadProductsForCategory(val) 
    }
  }

  const handleProductChange = (val: string) => {
    if (val === '__NEW_PROD__') { setIsCreatingProd(true); setSelectedProd('') } 
    else { setIsCreatingProd(false); setSelectedProd(val) }
  }

  async function handleAddEq(e: React.FormEvent) {
    e.preventDefault()
    if (!newEqName.trim()) return
    const userId = getCookie('congelo_user_id')
    if (!userId) {
      alert("Erreur : Utilisateur non reconnu, veuillez vous reconnecter.")
      return
    }

    const { data, error } = await supabase.from('cellars').insert([{ name: newEqName.trim(), user_id: userId, is_secondary: newEqIsSecondary }]).select()
    if (!error && data) {
      setEquipments([...equipments, data[0]])
      setActiveEqId(String(data[0].id))
      setNewEqName('')
    } else if (error) {
      alert("Erreur lors de la création de l'espace : " + error.message)
    }
  }

  async function handleDeleteEq(eqId: string, eqName: string, e: React.MouseEvent) {
    e.stopPropagation() 
    const itemsInEq = items.filter(i => String(i.cellar_id) === String(eqId))
    if (itemsInEq.length > 0) {
      if (!confirm(`⚠️ Attention ! L'espace "${eqName}" contient encore ${itemsInEq.length} produit(s).\n\nÊtes-vous sûr de vouloir supprimer cet espace ainsi que tout son contenu ?`)) return
      await supabase.from('items').delete().eq('cellar_id', eqId)
    } else {
      if (!confirm(`Voulez-vous vraiment supprimer l'espace "${eqName}" ?`)) return
    }
    const { error } = await supabase.from('cellars').delete().eq('id', eqId)
    if (!error) {
      const newEqs = equipments.filter(eq => String(eq.id) !== String(eqId))
      setEquipments(newEqs)
      if (String(activeEqId) === String(eqId)) setActiveEqId(newEqs.length > 0 ? String(newEqs[0].id) : '')
      loadItems() 
    } else {
      alert("Erreur lors de la suppression de l'équipement : " + error.message)
    }
  }

  // --- GESTION DU CONTEXTE (CAVE vs ARMOIRE) POUR LA MODALE ---
  function getRelevantCategories(isSec: boolean) {
    return categories.filter(c => {
      const type = getCategoryContextType(c.name)
      if (type === 'both') return true
      return isSec ? type === 'armoire' : type === 'cave'
    })
  }

  function openAddModal() {
    const eq = equipments.find(e => String(e.id) === String(activeEqId))
    const isSec = eq?.is_secondary || false
    setModalContextIsSecondary(isSec)

    setEditingItemId(null); 
    setIsCreatingCat(false); 
    setIsCreatingProd(false);
    setNewCatInput('');
    setNewProdInput('');
    
    const relevantCats = getRelevantCategories(isSec)
    if (relevantCats.length > 0) {
      setSelectedCat(relevantCats[0].name)
      loadProductsForCategory(relevantCats[0].name)
    } else {
      setSelectedCat('')
      setProducts([])
    }
    
    setQty(1)
    setUnit(isSec ? 'Pot 250mL' : 'Bouteille (75cl)')
    setDateEntree(new Date().toISOString().slice(0, 10))
    setDatePeremption('')
    setMillesime('')
    setDomaine('')
    setDateFabrication(new Date().toISOString().slice(0, 7))
    setNotes('')
    setIsModalOpen(true)
  }

  function openEditModal(item: Item) {
    const eq = equipments.find(e => String(e.id) === String(item.cellar_id))
    const isSec = eq?.is_secondary || false
    setModalContextIsSecondary(isSec)

    setEditingItemId(item.id); 
    setSelectedCat(item.categorie); 
    setIsCreatingCat(false);
    setNewCatInput('');
    setNewProdInput('');
    
    loadProductsForCategory(item.categorie).then(() => { setSelectedProd(item.produit) })
    setQty(item.qte)
    setUnit(item.unite || (isSec ? 'Pot 250mL' : 'Bouteille (75cl)'))
    setDateEntree(item.date_entree || new Date().toISOString().slice(0, 10))
    setDatePeremption(item.date_peremption || '')
    setMillesime(item.millesime || '')
    setDomaine(item.domaine || '')
    setDateFabrication(item.date_fabrication ? item.date_fabrication.slice(0, 7) : new Date().toISOString().slice(0, 7))
    setNotes(item.notes || '')
    setIsModalOpen(true)
  }

  function openDuplicateModal(item: Item) {
    const eq = equipments.find(e => String(e.id) === String(item.cellar_id))
    const isSec = eq?.is_secondary || false
    setModalContextIsSecondary(isSec)

    setEditingItemId(null); 
    setSelectedCat(item.categorie); 
    setIsCreatingCat(false);
    setNewCatInput('');
    setNewProdInput('');
    
    loadProductsForCategory(item.categorie).then(() => { setSelectedProd(item.produit) });
    setQty(item.qte)
    setUnit(item.unite || (isSec ? 'Pot 250mL' : 'Bouteille (75cl)'))
    setDateEntree(item.date_entree || new Date().toISOString().slice(0, 10))
    setDatePeremption(item.date_peremption || '')
    setMillesime(item.millesime || '')
    setDomaine(item.domaine || '')
    setDateFabrication(item.date_fabrication ? item.date_fabrication.slice(0, 7) : new Date().toISOString().slice(0, 7))
    setNotes(item.notes || '')
    setIsModalOpen(true);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    let finalCat = selectedCat
    
    // 1. Gestion de la catégorie
    if (isCreatingCat && newCatInput.trim()) {
      finalCat = newCatInput.trim()
      const { data: existingCat } = await supabase.from('categories').select('id').ilike('name', finalCat).single()
      if (!existingCat) {
        await supabase.from('categories').insert([{ name: finalCat }])
      }
      const { data: cData } = await supabase.from('categories').select('*').order('name')
      if (cData) setCategories(cData)
    }
    
    // 2. Gestion du produit avec sécurité anti-doublon
    let finalProd = selectedProd
    if (isCreatingProd && newProdInput.trim()) {
      finalProd = newProdInput.trim()
      let catObj = categories.find(c => c.name.toLowerCase() === finalCat.toLowerCase())
      let realCatId = catObj?.id
      
      if (!realCatId) {
         const { data: freshCat } = await supabase.from('categories').select('id').ilike('name', finalCat).single()
         realCatId = freshCat?.id
      }
      
      if (realCatId) {
        const { data: existingProd } = await supabase.from('product_templates')
          .select('id').eq('category_id', realCatId).ilike('name', finalProd).maybeSingle()
          
        if (!existingProd) {
          await supabase.from('product_templates').insert([{ category_id: realCatId, name: finalProd }])
        }
      }
    }
    if (!finalProd) return

    // 3. Sauvegarde de l'item
    const userId = getCookie('congelo_user_id')
    const targetEq = activeEqId || (equipments[0] ? String(equipments[0].id) : null)
    if (!targetEq) { alert('Veuillez créer un espace de stockage.'); return }

    const payload = {
      categorie: finalCat, 
      produit: finalProd, 
      qte: qty, 
      unite: unit, 
      date_entree: dateEntree, 
      date_peremption: datePeremption || null, 
      millesime: !modalContextIsSecondary && millesime.trim() ? millesime.trim() : null,
      domaine: !modalContextIsSecondary && domaine.trim() ? domaine.trim() : null,
      date_fabrication: modalContextIsSecondary && dateFabrication ? `${dateFabrication}-01` : null,
      notes: notes.trim() || null 
    }

    if (editingItemId) {
      const { error } = await supabase.from('items').update(payload).eq('id', editingItemId)
      if (!error) { setIsModalOpen(false); loadItems() }
      else alert(error.message)
    } else {
      const { error } = await supabase.from('items').insert([{ user_id: userId, cellar_id: targetEq, ...payload }])
      if (!error) { setIsModalOpen(false); loadItems() }
      else alert(error.message)
    }
  }

  async function updateQty(id: string, delta: number) {
    const item = items.find(i => String(i.id) === String(id))
    if (!item) return
    const newQty = Math.max(0, item.qte + delta)
    if (newQty === 0) {
      if (confirm('Quantité à 0 — Supprimer ce produit ?')) await supabase.from('items').delete().eq('id', id)
      else return
    } else {
      await supabase.from('items').update({ qte: newQty }).eq('id', id)
    }
    loadItems()
  }

  async function deleteItem(id: string) { await supabase.from('items').delete().eq('id', id); loadItems() }

  const filteredItems = items.filter(i => {
    if (activeEqId && String(i.cellar_id) !== String(activeEqId)) return false
    if (filterCat && i.categorie !== filterCat) return false
    if (searchTxt) {
      const searchLower = searchTxt.toLowerCase()
      const matchProduit = i.produit.toLowerCase().includes(searchLower)
      const matchNote = i.notes ? i.notes.toLowerCase().includes(searchLower) : false
      const matchMillesime = i.millesime ? i.millesime.toLowerCase().includes(searchLower) : false
      const matchDomaine = i.domaine ? i.domaine.toLowerCase().includes(searchLower) : false
      
      if (!matchProduit && !matchNote && !matchMillesime && !matchDomaine) return false
    }
    return true
  })

  const freezers = equipments.filter(e => !e.is_secondary)
  const fridges = equipments.filter(e => e.is_secondary)
  
  const filteredModalCategories = getRelevantCategories(modalContextIsSecondary)

  return (
    <div className="space-y-6 pb-20">
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Mes Caves & Réserves</h2>
        
        {freezers.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {freezers.map((f, index) => {
                const isActive = String(activeEqId) === String(f.id)
                const colorClass = FREEZER_COLORS[index % FREEZER_COLORS.length]
                return (
                  <div key={f.id} className={`flex items-center rounded-xl transition shadow-sm ${isActive ? `${colorClass} ring-4 ring-offset-2 ring-slate-200 scale-105` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <button onClick={() => setActiveEqId(String(f.id))} className="px-3 py-2.5 text-sm font-bold flex-1 text-left">
                      🍷 {f.name}
                    </button>
                    <button onClick={(e) => handleDeleteEq(String(f.id), f.name, e)} className="pr-3 pl-1 py-2.5 text-sm opacity-60 hover:opacity-100 hover:text-red-500 transition-opacity" title="Supprimer cet espace">
                      🗑️
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {fridges.length > 0 && (
          <div className="mb-4 pt-3 border-t border-slate-50">
            <div className="flex flex-wrap gap-2">
              {fridges.map((f, index) => {
                const isActive = String(activeEqId) === String(f.id)
                const colorClass = FRIDGE_COLORS[index % FRIDGE_COLORS.length]
                return (
                  <div key={f.id} className={`flex items-center rounded-xl transition shadow-sm ${isActive ? `${colorClass} ring-4 ring-offset-2 ring-slate-200 scale-105` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    <button onClick={() => setActiveEqId(String(f.id))} className="px-3 py-2.5 text-sm font-bold flex-1 text-left">
                      🍯 {f.name}
                    </button>
                    <button onClick={(e) => handleDeleteEq(String(f.id), f.name, e)} className="pr-3 pl-1 py-2.5 text-sm opacity-60 hover:opacity-100 hover:text-red-500 transition-opacity" title="Supprimer cet espace">
                      🗑️
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleAddEq} className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex gap-4 items-center mb-2 px-1">
            <label className="text-sm text-slate-600 font-medium flex items-center gap-1 cursor-pointer">
              <input type="radio" name="eqType" checked={!newEqIsSecondary} onChange={() => setNewEqIsSecondary(false)} className="accent-sky-500" />
              🍷 Cave
            </label>
            <label className="text-sm text-slate-600 font-medium flex items-center gap-1 cursor-pointer">
              <input type="radio" name="eqType" checked={newEqIsSecondary} onChange={() => setNewEqIsSecondary(true)} className="accent-sky-500" />
              🍯 Réserve
            </label>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder={newEqIsSecondary ? "Nouvelle réserve..." : "Nouvelle cave..."} value={newEqName} onChange={e => setNewEqName(e.target.value)} className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 text-slate-800" />
            <button type="submit" className="px-4 py-2 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition">+ Ajouter</button>
          </div>
        </form>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <button onClick={openAddModal} className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2 text-base">
          <span>+ Ajouter un produit</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:max-w-md">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none flex-1">
            <option value="">Toutes les catégories</option>
            {getRelevantCategories(equipments.find(e => String(e.id) === String(activeEqId))?.is_secondary || false).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <input type="text" placeholder="Rechercher vin, domaine, pot..." value={searchTxt} onChange={e => setSearchTxt(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none flex-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            const eq = equipments.find(e => String(e.id) === String(item.cellar_id))
            const isSecondary = eq?.is_secondary || false
            
            let colorClass = 'bg-slate-600 text-white'
            if (eq) {
               if (isSecondary) {
                 const fIndex = fridges.findIndex(f => String(f.id) === String(eq.id))
                 colorClass = FRIDGE_COLORS[fIndex % FRIDGE_COLORS.length]
               } else {
                 const fIndex = freezers.findIndex(f => String(f.id) === String(eq.id))
                 colorClass = FREEZER_COLORS[fIndex % FREEZER_COLORS.length]
               }
            }
            const eqName = eq ? eq.name : 'Inconnu'
            const eqIcon = isSecondary ? '🍯' : '🍷'

            return (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      {item.domaine && <span className="text-xs font-semibold text-rose-700 block mb-0.5">{item.domaine}</span>}
                      <h3 className="font-bold text-slate-800 text-base">
                        {item.produit} {!isSecondary && item.millesime && <span className="text-slate-500 font-normal">({item.millesime})</span>}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] uppercase tracking-wider text-sky-600 font-semibold">{item.categorie}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${colorClass}`}>{eqIcon} {eqName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDuplicateModal(item)} className="text-xs text-slate-400 hover:text-teal-600 font-semibold px-2 py-1 bg-slate-50 rounded-lg border border-slate-100" title="Dupliquer ce produit">Copier 📋</button>
                      <button onClick={() => openEditModal(item)} className="text-xs text-slate-400 hover:text-sky-600 font-semibold px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">Éditer ✏️</button>
                      <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 text-base font-bold px-2" title="Supprimer ce produit">🗑️</button>
                    </div>
                  </div>
                  {item.notes && <p className="text-xs text-slate-400 italic mt-1">Note : {item.notes}</p>}
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-50">
                  <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-white rounded-lg shadow-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-600">-</button>
                    <span className="text-sm font-bold px-2 text-slate-800 min-w-[60px] text-center">{item.qte} {item.unite}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-white rounded-lg shadow-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-600">+</button>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    {item.date_peremption ? <span className="font-semibold text-amber-600 block">Apogée / DLC : {item.date_peremption}</span> : null}
                    {isSecondary && item.date_fabrication ? (
                      <span className="font-semibold text-teal-600 block">Fabriqué en : {item.date_fabrication.slice(5, 7)}/{item.date_fabrication.slice(0, 4)}</span>
                    ) : (
                      <span className="text-slate-400">Ajouté le {item.date_entree}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <span className="text-4xl">📦</span>
            <p className="text-slate-400 text-sm mt-2">Cet espace est vide pour le moment.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                {editingItemId ? 'Modifier ✏️' : `Ajouter à ${equipments.find(e => String(e.id) === String(activeEqId))?.name} ${modalContextIsSecondary ? '🍯' : '🍷'}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Catégorie</label>
                <select value={isCreatingCat ? '__NEW_CAT__' : selectedCat} onChange={e => handleCategoryChange(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500">
                  <option value="__NEW_CAT__" className="font-bold text-teal-600">+ Créer une nouvelle catégorie...</option>
                  {filteredModalCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              {isCreatingCat && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nom de la nouvelle catégorie</label>
                  <input type="text" placeholder={modalContextIsSecondary ? "ex: Confitures, Gelées..." : "ex: Vin rouge, Spiritueux..."} value={newCatInput} onChange={e => setNewCatInput(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" required />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Produit</label>
                <select value={isCreatingProd ? '__NEW_PROD__' : selectedProd} onChange={e => handleProductChange(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500">
                  <option value="__NEW_PROD__" className="font-bold text-teal-600">+ Ajouter un nouveau produit...</option>
                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              {isCreatingProd && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nom du nouveau produit</label>
                  <input type="text" placeholder={modalContextIsSecondary ? "ex: Gelée de mûres..." : "ex: Château Margaux..."} value={newProdInput} onChange={e => setNewProdInput(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" required />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Quantité</label>
                  <input type="number" min="1" step="any" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Unité</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500">
                    {(modalContextIsSecondary ? ARMOIRE_UNITS : CAVE_UNITS).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!modalContextIsSecondary && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Domaine</label>
                    <input type="text" placeholder="ex: Domaine de la Romanée..." value={domaine} onChange={e => setDomaine(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Millésime</label>
                    <input type="number" placeholder="ex: 2018" value={millesime} onChange={e => setMillesime(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" />
                  </div>
                </div>
              )}
              {modalContextIsSecondary && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Fabriqué en (Mois/Année)</label>
                  <input type="month" value={dateFabrication} onChange={e => setDateFabrication(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Date d'entrée</label>
                  <input type="date" value={dateEntree} onChange={e => setDateEntree(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Apogée / DLC</label>
                  <input type="date" value={datePeremption} onChange={e => setDatePeremption(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Note (Emplacement...)</label>
                <input type="text" placeholder={modalContextIsSecondary ? "ex: Étagère du haut..." : "ex: Garder couché..."} value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-none focus:border-sky-500" />
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg transition text-base">
                  {editingItemId ? 'Enregistrer les modifications' : "Valider l'ajout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}