import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultCategories, REVIEW_CATEGORY_ID } from './defaultCategories'
import { financeStorage } from './storage'
import type {
  Category,
  CategoryInput,
  FinanceTransaction,
  TransactionInput,
} from './types'

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const useFinanceData = () => {
  const [userCategories, setUserCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [isReady, setIsReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [storedCategories, storedTransactions] = await Promise.all([
          financeStorage.loadUserCategories(),
          financeStorage.loadTransactions(),
        ])
        setUserCategories(storedCategories.filter((category) => !category.isDefault))
        setTransactions(storedTransactions)
      } catch {
        setStorageError('Não foi possível carregar os dados locais.')
      } finally {
        setIsReady(true)
      }
    }

    void load()
  }, [])

  const categories = useMemo(() => [...defaultCategories, ...userCategories], [userCategories])

  const persistCategories = useCallback(async (next: Category[]) => {
    setUserCategories(next)
    try {
      await financeStorage.saveUserCategories(next)
      setStorageError(null)
    } catch {
      setStorageError('Não foi possível salvar as categorias.')
    }
  }, [])

  const persistTransactions = useCallback(async (next: FinanceTransaction[]) => {
    setTransactions(next)
    try {
      await financeStorage.saveTransactions(next)
      setStorageError(null)
    } catch {
      setStorageError('Não foi possível salvar as transações.')
    }
  }, [])

  const createCategory = useCallback((input: CategoryInput) => {
    const category: Category = { ...input, id: createId('category'), isDefault: false }
    void persistCategories([...userCategories, category])
  }, [persistCategories, userCategories])

  const updateCategory = useCallback((id: string, input: CategoryInput) => {
    const current = userCategories.find((category) => category.id === id)
    if (!current) return
    void persistCategories(userCategories.map((category) => (
      category.id === id ? { ...category, ...input, isDefault: false } : category
    )))
  }, [persistCategories, userCategories])

  const deleteCategory = useCallback((id: string) => {
    const current = userCategories.find((category) => category.id === id)
    if (!current) return

    const nextCategories = userCategories.filter((category) => category.id !== id)
    const nextTransactions = transactions.map((transaction) => (
      transaction.categoryId === id ? { ...transaction, categoryId: REVIEW_CATEGORY_ID } : transaction
    ))
    void persistCategories(nextCategories)
    void persistTransactions(nextTransactions)
  }, [persistCategories, persistTransactions, transactions, userCategories])

  const createTransaction = useCallback((input: TransactionInput) => {
    const transaction: FinanceTransaction = { ...input, id: createId('transaction'), origin: 'manual' }
    void persistTransactions([transaction, ...transactions])
  }, [persistTransactions, transactions])

  const updateTransaction = useCallback((id: string, input: TransactionInput) => {
    void persistTransactions(transactions.map((transaction) => (
      transaction.id === id ? { ...transaction, ...input, origin: 'manual' } : transaction
    )))
  }, [persistTransactions, transactions])

  const deleteTransaction = useCallback((id: string) => {
    void persistTransactions(transactions.filter((transaction) => transaction.id !== id))
  }, [persistTransactions, transactions])

  return {
    categories,
    transactions,
    isReady,
    storageError,
    createCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
