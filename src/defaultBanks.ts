import type { Bank, BankType } from './types'

export const FALLBACK_BANK_ID = 'bank-other'

const createBank = (id: string, name: string, type: BankType, color?: string): Bank => ({
  id: `bank-${id}`,
  name,
  type,
  initialBalance: 0,
  color,
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
})

export const defaultBanks: Bank[] = [
  createBank('nubank', 'Nubank', 'payment', '#8B5CF6'),
  createBank('itau', 'Itaú', 'checking', '#F97316'),
  createBank('c6', 'C6 Bank', 'checking', '#94A3B8'),
  createBank('inter', 'Banco Inter', 'checking', '#F97316'),
  createBank('bradesco', 'Bradesco', 'checking', '#EF4444'),
  createBank('santander', 'Santander', 'checking', '#EF4444'),
  createBank('caixa', 'Caixa', 'checking', '#3B82F6'),
  createBank('bb', 'Banco do Brasil', 'checking', '#EAB308'),
  createBank('mercado-pago', 'Mercado Pago', 'payment', '#38BDF8'),
  createBank('picpay', 'PicPay', 'payment', '#22C55E'),
  createBank('cash', 'Dinheiro físico', 'cash', '#14B8A6'),
  createBank('other', 'Outros', 'other', '#64748B'),
]
