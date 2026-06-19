export type TransactionType = 'income' | 'expense'
export type CategoryType = TransactionType | 'both'
export type BankType = 'checking' | 'payment' | 'savings' | 'cash' | 'other'
export type AppScreen = 'dashboard' | 'transactions' | 'categories' | 'banks'

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
  bankId: string
  note?: string
  origin: 'manual'
}

export type Bank = {
  id: string
  name: string
  type: BankType
  initialBalance: number
  color?: string
  active: boolean
  createdAt: string
}

export type CategoryInput = Omit<Category, 'id' | 'isDefault'>
export type TransactionInput = Omit<FinanceTransaction, 'id' | 'origin'>
export type BankInput = Omit<Bank, 'id' | 'createdAt'>
