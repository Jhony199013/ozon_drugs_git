export interface InteractionDrug {
  name: string
  lpid: string
  active_Substance: string
}

export interface InteractionWebhookPayload {
  drug1: InteractionDrug
  drug2: InteractionDrug
}

const WEBHOOK_URL = 'https://api.medinteract.ru/webhook/f7bbe2b1-9946-4b3a-9a6c-5e19c587d4a7'

export async function requestInteractionAnalysis(payload: InteractionWebhookPayload): Promise<boolean> {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return response.ok
}


