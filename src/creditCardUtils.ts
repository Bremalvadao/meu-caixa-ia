import type { CardInvoice, CardPurchase, CardPurchaseInput, CreditCard, InvoiceStatus } from './types'

const pad = (value: number) => String(value).padStart(2, '0')

export const shiftReferenceMonth = (month: string, amount: number) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + amount, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

const dateForMonth = (month: string, day: number) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(year, monthNumber, 0).getDate()
  return `${month}-${pad(Math.min(day, lastDay))}`
}

export const invoiceMonthForPurchase = (purchaseDate: string, closingDay: number) => {
  const month = purchaseDate.slice(0, 7)
  return Number(purchaseDate.slice(8, 10)) > closingDay ? shiftReferenceMonth(month, 1) : month
}

export const signedPurchaseAmount = (purchase: Pick<CardPurchase, 'installmentAmount' | 'type'>) => (
  purchase.type === 'refund' ? -purchase.installmentAmount : purchase.installmentAmount
)

export const createInstallments = (input: CardPurchaseInput, card: CreditCard, groupId: string): CardPurchase[] => {
  const installments = Math.max(1, Math.round(input.totalInstallments))
  const baseAmount = Math.floor((input.totalAmount / installments) * 100) / 100
  const firstInvoiceMonth = invoiceMonthForPurchase(input.purchaseDate, card.closingDay)
  const createdAt = new Date().toISOString()

  return Array.from({ length: installments }, (_, index) => {
    const installmentAmount = index === installments - 1
      ? Number((input.totalAmount - baseAmount * (installments - 1)).toFixed(2))
      : baseAmount
    return {
      id: `${groupId}-${index + 1}`,
      installmentGroupId: groupId,
      cardId: input.cardId,
      categoryId: input.categoryId,
      purchaseDate: input.purchaseDate,
      invoiceMonth: shiftReferenceMonth(firstInvoiceMonth, index),
      description: input.description,
      totalAmount: input.totalAmount,
      installmentAmount,
      currentInstallment: index + 1,
      totalInstallments: installments,
      type: input.type,
      origin: 'manual' as const,
      needsReview: input.needsReview,
      createdAt,
    }
  })
}

export const reconcileInvoices = (
  cards: CreditCard[],
  purchases: CardPurchase[],
  currentInvoices: CardInvoice[],
): CardInvoice[] => {
  const totals = new Map<string, number>()
  purchases.forEach((purchase) => {
    const key = `${purchase.cardId}:${purchase.invoiceMonth}`
    totals.set(key, (totals.get(key) ?? 0) + signedPurchaseAmount(purchase))
  })

  return [...totals.entries()].map(([key, totalAmount]) => {
    const [cardId, referenceMonth] = key.split(':')
    const card = cards.find((item) => item.id === cardId)
    const existing = currentInvoices.find((item) => item.cardId === cardId && item.referenceMonth === referenceMonth)
    return {
      id: existing?.id ?? `invoice-${cardId}-${referenceMonth}`,
      cardId,
      referenceMonth,
      closingDate: dateForMonth(referenceMonth, card?.closingDay ?? 1),
      dueDate: dateForMonth(referenceMonth, card?.dueDay ?? 1),
      totalAmount: Number(totalAmount.toFixed(2)),
      paidAmount: existing?.paidAmount ?? 0,
      status: existing?.status ?? 'open',
    }
  }).sort((a, b) => a.referenceMonth.localeCompare(b.referenceMonth))
}

export const effectiveInvoiceStatus = (invoice: CardInvoice, today = new Date()): InvoiceStatus => {
  if (invoice.status === 'paid') return 'paid'
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  return invoice.status === 'overdue' || invoice.dueDate < todayKey ? 'overdue' : invoice.status
}

export const isInvoiceDueSoon = (invoice: CardInvoice, today = new Date()) => {
  if (effectiveInvoiceStatus(invoice, today) === 'paid') return false
  const due = new Date(`${invoice.dueDate}T12:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.ceil((due.getTime() - start.getTime()) / 86400000)
  return days >= 0 && days <= 7
}

export const openAmountForCard = (cardId: string, invoices: CardInvoice[]) => invoices
  .filter((invoice) => invoice.cardId === cardId && invoice.status !== 'paid')
  .reduce((sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount), 0)

