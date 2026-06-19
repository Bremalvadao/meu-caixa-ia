export type TransactionKind = 'income' | 'expense'

export type Transaction = {
  id: string
  description: string
  amount: number
  kind: TransactionKind
  date: string
}

