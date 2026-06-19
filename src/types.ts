export type TransactionType = 'income' | 'expense'
export type CategoryType = TransactionType | 'both'
export type BankType = 'checking' | 'payment' | 'savings' | 'cash' | 'other'
export type CardPurchaseType = 'purchase' | 'refund' | 'interest' | 'fine' | 'annual_fee' | 'iof'
export type InvoiceStatus = 'open' | 'closed' | 'paid' | 'overdue'
export type AppScreen = 'dashboard' | 'transactions' | 'categories' | 'banks' | 'cards'

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
  invoiceId?: string
  note?: string
  origin: 'manual' | 'card_invoice'
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

export type CreditCard = {
  id: string
  bankId: string
  name: string
  totalLimit: number
  closingDay: number
  dueDay: number
  active: boolean
  createdAt: string
}

export type CardPurchase = {
  id: string
  installmentGroupId: string
  cardId: string
  categoryId: string
  purchaseDate: string
  invoiceMonth: string
  description: string
  totalAmount: number
  installmentAmount: number
  currentInstallment: number
  totalInstallments: number
  type: CardPurchaseType
  origin: 'manual'
  needsReview: boolean
  createdAt: string
}

export type CardInvoice = {
  id: string
  cardId: string
  referenceMonth: string
  closingDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
}

export type CategoryInput = Omit<Category, 'id' | 'isDefault'>
export type TransactionInput = Omit<FinanceTransaction, 'id' | 'origin'>
export type BankInput = Omit<Bank, 'id' | 'createdAt'>
export type CreditCardInput = Omit<CreditCard, 'id' | 'createdAt'>
export type CardPurchaseInput = Pick<CardPurchase, 'cardId' | 'categoryId' | 'purchaseDate' | 'description' | 'totalAmount' | 'totalInstallments' | 'type' | 'needsReview'>
