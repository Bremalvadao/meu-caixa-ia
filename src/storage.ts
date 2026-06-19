import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Category, FinanceTransaction } from './types'

const STORAGE_KEYS = {
  userCategories: '@meu-caixa-ia/user-categories-v1',
  transactions: '@meu-caixa-ia/transactions-v1',
}

const readArray = async <T>(key: string): Promise<T[]> => {
  const value = await AsyncStorage.getItem(key)
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export const financeStorage = {
  loadUserCategories: () => readArray<Category>(STORAGE_KEYS.userCategories),
  saveUserCategories: (categories: Category[]) =>
    AsyncStorage.setItem(STORAGE_KEYS.userCategories, JSON.stringify(categories)),
  loadTransactions: () => readArray<FinanceTransaction>(STORAGE_KEYS.transactions),
  saveTransactions: (transactions: FinanceTransaction[]) =>
    AsyncStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions)),
}
