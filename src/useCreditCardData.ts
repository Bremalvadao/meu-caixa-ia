import { useCallback, useEffect, useState } from 'react'
import { createInstallments, reconcileInvoices } from './creditCardUtils'
import { financeStorage } from './storage'
import type { CardInvoice, CardPurchase, CardPurchaseInput, CreditCard, CreditCardInput, InvoiceStatus } from './types'

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const useCreditCardData = () => {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [purchases, setPurchases] = useState<CardPurchase[]>([])
  const [invoices, setInvoices] = useState<CardInvoice[]>([])
  const [isReady, setIsReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [storedCards, storedPurchases, storedInvoices] = await Promise.all([
          financeStorage.loadCreditCards(),
          financeStorage.loadCardPurchases(),
          financeStorage.loadCardInvoices(),
        ])
        const nextInvoices = reconcileInvoices(storedCards, storedPurchases, storedInvoices)
        setCards(storedCards)
        setPurchases(storedPurchases)
        setInvoices(nextInvoices)
        if (JSON.stringify(nextInvoices) !== JSON.stringify(storedInvoices)) await financeStorage.saveCardInvoices(nextInvoices)
      } catch {
        setStorageError('Não foi possível carregar os cartões e faturas.')
      } finally {
        setIsReady(true)
      }
    }
    void load()
  }, [])

  const persistCards = useCallback(async (next: CreditCard[], nextPurchases = purchases, currentInvoices = invoices) => {
    const nextInvoices = reconcileInvoices(next, nextPurchases, currentInvoices)
    setCards(next)
    setInvoices(nextInvoices)
    try {
      await Promise.all([financeStorage.saveCreditCards(next), financeStorage.saveCardInvoices(nextInvoices)])
      setStorageError(null)
    } catch {
      setStorageError('Não foi possível salvar os cartões.')
    }
  }, [invoices, purchases])

  const persistPurchases = useCallback(async (next: CardPurchase[], currentInvoices = invoices) => {
    const nextInvoices = reconcileInvoices(cards, next, currentInvoices)
    setPurchases(next)
    setInvoices(nextInvoices)
    try {
      await Promise.all([financeStorage.saveCardPurchases(next), financeStorage.saveCardInvoices(nextInvoices)])
      setStorageError(null)
    } catch {
      setStorageError('Não foi possível salvar as compras do cartão.')
    }
  }, [cards, invoices])

  const createCard = useCallback((input: CreditCardInput) => {
    const card: CreditCard = { ...input, id: createId('card'), createdAt: new Date().toISOString() }
    void persistCards([...cards, card])
  }, [cards, persistCards])

  const updateCard = useCallback((id: string, input: CreditCardInput) => {
    void persistCards(cards.map((card) => card.id === id ? { ...card, ...input } : card))
  }, [cards, persistCards])

  const toggleCard = useCallback((id: string) => {
    void persistCards(cards.map((card) => card.id === id ? { ...card, active: !card.active } : card))
  }, [cards, persistCards])

  const deleteCard = useCallback((id: string) => {
    if (purchases.some((purchase) => purchase.cardId === id)) return false
    void persistCards(cards.filter((card) => card.id !== id))
    return true
  }, [cards, persistCards, purchases])

  const createPurchase = useCallback((input: CardPurchaseInput) => {
    const card = cards.find((item) => item.id === input.cardId)
    if (!card) return
    const installments = createInstallments(input, card, createId('purchase'))
    void persistPurchases([...purchases, ...installments])
  }, [cards, persistPurchases, purchases])

  const updatePurchase = useCallback((groupId: string, input: CardPurchaseInput) => {
    const card = cards.find((item) => item.id === input.cardId)
    if (!card) return
    const next = purchases.filter((purchase) => purchase.installmentGroupId !== groupId)
    void persistPurchases([...next, ...createInstallments(input, card, groupId)])
  }, [cards, persistPurchases, purchases])

  const deletePurchase = useCallback((groupId: string) => {
    void persistPurchases(purchases.filter((purchase) => purchase.installmentGroupId !== groupId))
  }, [persistPurchases, purchases])

  const setInvoiceStatus = useCallback((id: string, status: InvoiceStatus) => {
    const next = invoices.map((invoice) => invoice.id === id ? {
      ...invoice,
      status,
      paidAmount: status === 'paid' ? invoice.totalAmount : 0,
    } : invoice)
    setInvoices(next)
    void financeStorage.saveCardInvoices(next).catch(() => setStorageError('Não foi possível atualizar a fatura.'))
  }, [invoices])

  return {
    cards,
    purchases,
    invoices,
    isReady,
    storageError,
    createCard,
    updateCard,
    toggleCard,
    deleteCard,
    createPurchase,
    updatePurchase,
    deletePurchase,
    setInvoiceStatus,
  }
}
