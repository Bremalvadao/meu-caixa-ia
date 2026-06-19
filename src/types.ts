export type TransactionType = 'income' | 'expense'
export type CategoryType = TransactionType | 'both'
export type AppScreen = 'dashboard' | 'transactions' | 'categories'

export type Category = {
  id: string
  name: string
  group: string
  type: CategoryType
  color: string
  icon?: string
  isDefault: boolean
}

export type FinanceTransaction = {
  id: string
  date: string
  description: string
  amount: number
  type: TransactionType
  categoryId: string
  note?: string
  origin: 'manual'
}

export type CategoryInput = Omit<Category, 'id' | 'isDefault'>
export type TransactionInput = Omit<FinanceTransaction, 'id' | 'origin'>
