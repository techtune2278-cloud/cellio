import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variables d'environnement Supabase manquantes.")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const [
      { data: items, error: itemsErr },
      { data: cellars, error: cellarsErr },
      { data: rules, error: rulesErr },
      { data: settings, error: settingsErr }
    ] = await Promise.all([
      supabase.from('items').select('*'),
      supabase.from('cellars').select('id, is_secondary'),
      supabase.from('alert_rules').select('*'),
      supabase.from('user_settings').select('*')
    ])

    if (itemsErr) throw new Error("Erreur table items: " + itemsErr.message)
    if (cellarsErr) throw new Error("Erreur table cellars: " + cellarsErr.message)

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, message: "Aucun produit en base." })
    }

    const eqMap = new Map((cellars || []).map(c => [String(c.id), c.is_secondary]))
    const ruleMap = new Map((rules || []).map(r => [`${r.user_id}_${r.categorie}`, { fridge: r.fridge_days, freezer: r.freezer_days }]))
    const settingsMap = new Map((settings || []).map(s => [s.user_id, s.ntfy_topic]))

    const today = new Date().toISOString().slice(0, 10)
    const todayTime = new Date(today).getTime()

    const alertesParUser: Record<string, string[]> = {}

    const getDefaultDaysForCategory = (catName: string): number => {
      const lower = (catName || '').toLowerCase()
      if (lower.includes('vin') || lower.includes('rouge') || lower.includes('blanc') || lower.includes('rosé')) return 730
      if (lower.includes('champagne') || lower.includes('pétillant') || lower.includes('bulle')) return 365
      if (lower.includes('apéritif') || lower.includes('apritif') || lower.includes('spiritueux')) return 180
      if (lower.includes('gelée') || lower.includes('compote') || lower.includes('confi')) return 180
      return 90
    }

    items.forEach(item => {
      const isSecondary = eqMap.get(String(item.cellar_id)) ?? false
      const userRule = ruleMap.get(`${item.user_id}_${item.categorie}`)
      
      const defVal = getDefaultDaysForCategory(item.categorie)
      const threshold = userRule 
        ? (isSecondary ? userRule.fridge : userRule.freezer)
        : defVal

      let requiresAttention = false

      // --- NOUVELLES RÈGLES ---
      // Règle 1 : Si Apogée/DLC renseignée -> Alerte 30 jours avant (ou moins)
      if (item.date_peremption) {
        const dlcTime = new Date(item.date_peremption).getTime()
        const daysLeft = Math.ceil((dlcTime - todayTime) / (1000 * 60 * 60 * 24))
        if (daysLeft <= 30) requiresAttention = true
      } 
      // Règle 2 : Si aucune date renseignée -> Alerte à 80% du seuil écoulé
      else if (item.date_entree) {
        const entreeTime = new Date(item.date_entree).getTime()
        const ageDays = Math.floor((todayTime - entreeTime) / (1000 * 60 * 60 * 24))
        if (ageDays >= (threshold * 0.8)) requiresAttention = true
      }
      // ------------------------

      if (requiresAttention) {
        if (!alertesParUser[item.user_id]) alertesParUser[item.user_id] = []
        
        const dateInfo = item.date_peremption 
          ? `(DLC/Apogée : ${item.date_peremption})` 
          : `(Ajouté le : ${item.date_entree})`
          
        alertesParUser[item.user_id].push(`• ${item.produit} ${dateInfo}`)
      }
    })

    let envois = 0

    for (const [userId, produits] of Object.entries(alertesParUser)) {
      const topic = settingsMap.get(userId)
      if (topic) {
        const listText = produits.slice(0, 10).join('\n') + (produits.length > 10 ? `\n... et ${produits.length - 10} autres` : '')
        
        await fetch(`https://ntfy.sh/${topic}`, {
          method: 'POST',
          body: `${produits.length} produit(s) requièrent votre attention :\n\n${listText}`,
          headers: { 
            'Title': 'CELLIO - Alertes'
          }
        })
        envois++
      }
    }

    return NextResponse.json({ 
      success: true, 
      users_notifies: Object.keys(alertesParUser).length, 
      notifications_envoyees: envois 
    })

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      erreur: error.message || "Erreur inconnue",
      details: error.stack
    }, { status: 500 })
  }
}