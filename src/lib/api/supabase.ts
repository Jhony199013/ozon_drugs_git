import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}. ` +
    `Please check your .env.local file and restart the development server.`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Drug {
  id: number
  commercialName: string
  mnnName: string
  active_Substance: string
  lpid: string
  conditionValue?: string
  owner?: string
  pharmacotherapeuticGroups?: string
  siteAddresses?: string
  ownersCountry?: string
  ruNumber?: string
  url?: string
  useInstructions?: string | string[]
  // Взаимодействия (могут приходить из БД как строка JSON, текст или массив)
  drug_Interactions?: string | string[]
  interact_list?: string | string[]
  interact?: string | string[]
  explanation?: string | string[]
  // Противопоказания
  ci_pregnancy?: string
  ci_pregnancy_t1?: string
  ci_pregnancy_t2?: string
  ci_pregnancy_t3?: string
  ci_breastfeeding?: string
  ci_newborns?: string
  ci_children_under_1y?: string
  ci_children_under_3y?: string
  ci_children_under_12y?: string
  ci_children_under_18y?: string
  ci_elderly?: string
  ci_diabetes_mellitus?: string
  ci_endocrine_disorders?: string
  ci_bronchial_asthma?: string
  ci_seizures_epilepsy?: string
  ci_gastrointestinal_diseases?: string
  ci_liver_diseases?: string
  ci_hepatic_failure?: string
  ci_kidney_diseases?: string
  ci_renal_failure?: string
  ci_cardiovascular_diseases?: string
  ci_heart_failure?: string
  ci_driving_and_machinery?: string
}

export interface Cache {
  id: number
  cache_token: string
  // Поля могут быть как text, так и text[] (или JSON-строки массива)
  interact?: string | string[]
  explanation?: string | string[]
  interact_list?: string | string[]
  created_at?: string
  updated_at?: string
}


