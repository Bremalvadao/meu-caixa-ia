import { useMemo, useState, type ComponentProps } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { REVIEW_CATEGORY_ID } from './defaultCategories'
import { effectiveInvoiceStatus, isInvoiceDueSoon, openAmountForCard, signedPurchaseAmount } from './creditCardUtils'
import { useCreditCardData } from './useCreditCardData'
import { useFinanceData } from './useFinanceData'
import type {
  AppScreen,
  Bank,
  BankInput,
  BankType,
  CardInvoice,
  CardPurchase,
  CardPurchaseInput,
  CardPurchaseType,
  Category,
  CategoryInput,
  CategoryType,
  CreditCard,
  CreditCardInput,
  FinanceTransaction,
  InvoiceStatus,
  TransactionInput,
  TransactionType,
} from './types'

const COLORS = {
  background: '#07110F',
  surface: '#0E1B18',
  surfaceRaised: '#142420',
  border: '#243833',
  text: '#F4F7F5',
  muted: '#8FA39C',
  income: '#22C55E',
  expense: '#EF4444',
  warning: '#F59E0B',
  accent: '#2DD4BF',
}

const COLOR_OPTIONS = ['#22C55E', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B']
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const shiftMonth = (value: string, amount: number) => {
  const [year, month] = value.split('-').map(Number)
  return monthKey(new Date(year, month - 1 + amount, 1))
}
const monthLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
const typeLabel = (type: CategoryType) => type === 'income' ? 'Entrada' : type === 'expense' ? 'Saída' : 'Ambos'
const bankTypeLabel = (type: BankType) => ({ checking: 'Conta corrente', payment: 'Conta pagamento', savings: 'Poupança', cash: 'Dinheiro físico', other: 'Outros' })[type]
const purchaseTypeLabel = (type: CardPurchaseType) => ({ purchase: 'Compra', refund: 'Estorno', interest: 'Juros', fine: 'Multa', annual_fee: 'Anuidade', iof: 'IOF' })[type]
const invoiceStatusLabel = (status: InvoiceStatus) => ({ open: 'Aberta', closed: 'Fechada', paid: 'Paga', overdue: 'Vencida' })[status]

type MonthSelectorProps = { value: string; onChange: (value: string) => void }
function MonthSelector({ value, onChange }: MonthSelectorProps) {
  return (
    <View style={styles.monthSelector}>
      <Pressable style={styles.iconButton} onPress={() => onChange(shiftMonth(value, -1))}><Text style={styles.iconButtonText}>‹</Text></Pressable>
      <Text style={styles.monthText}>{monthLabel(value)}</Text>
      <Pressable style={styles.iconButton} onPress={() => onChange(shiftMonth(value, 1))}><Text style={styles.iconButtonText}>›</Text></Pressable>
    </View>
  )
}

type DashboardProps = {
  month: string
  onMonthChange: (value: string) => void
  transactions: FinanceTransaction[]
  categories: Category[]
  banks: Bank[]
  cards: CreditCard[]
  cardPurchases: CardPurchase[]
  invoices: CardInvoice[]
}
function Dashboard({ month, onMonthChange, transactions, categories, banks, cards, cardPurchases, invoices }: DashboardProps) {
  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(month)),
    [month, transactions],
  )
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const expense = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const result = income - expense
  const reviewCount = monthTransactions.filter((item) => item.categoryId === REVIEW_CATEGORY_ID).length
  const cardMonthPurchases = cardPurchases.filter((purchase) => purchase.invoiceMonth === month)
  const cardSpending = cardMonthPurchases.reduce((sum, purchase) => sum + signedPurchaseAmount(purchase), 0)
  const cashConsumption = monthTransactions.filter((item) => item.type === 'expense' && item.categoryId !== 'default-card-bill')
  const consumptionTotal = cashConsumption.reduce((sum, item) => sum + item.amount, 0) + cardSpending
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>()
    cashConsumption.forEach((transaction) => totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
    ))
    cardMonthPurchases.forEach((purchase) => totals.set(
      purchase.categoryId,
      (totals.get(purchase.categoryId) ?? 0) + signedPurchaseAmount(purchase),
    ))
    return [...totals.entries()]
      .map(([id, total]) => ({ category: categories.find((item) => item.id === id), total }))
      .filter((item): item is { category: Category; total: number } => Boolean(item.category))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [cardMonthPurchases, cashConsumption, categories])
  const recent = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const bankSummaries = banks.map((bank) => {
    const items = monthTransactions.filter((transaction) => transaction.bankId === bank.id)
    const bankIncome = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const bankExpense = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    return { bank, income: bankIncome, expense: bankExpense, result: bankIncome - bankExpense, count: items.length }
  }).filter((item) => item.count > 0)
  const totalCardLimit = cards.filter((card) => card.active).reduce((sum, card) => sum + card.totalLimit, 0)
  const totalUsedLimit = cards.filter((card) => card.active).reduce((sum, card) => sum + openAmountForCard(card.id, invoices), 0)
  const dueSoonCount = invoices.filter((invoice) => invoice.referenceMonth === month && isInvoiceDueSoon(invoice)).length
  const overdueCount = invoices.filter((invoice) => invoice.referenceMonth === month && effectiveInvoiceStatus(invoice) === 'overdue').length

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>VISÃO GERAL</Text>
        <Text style={styles.pageTitle}>Meu Caixa <Text style={styles.accentText}>IA</Text></Text>
        <Text style={styles.pageSubtitle}>Seu mês financeiro em um só lugar.</Text>
      </View>
      <MonthSelector value={month} onChange={onMonthChange} />
      <Text style={styles.sectionTitle}>Visão de caixa</Text>
      <View style={[styles.card, styles.resultCard]}>
        <Text style={styles.cardLabel}>Resultado do mês</Text>
        <Text style={[styles.resultValue, { color: result >= 0 ? COLORS.income : COLORS.expense }]}>{money.format(result)}</Text>
        <Text style={styles.cardHint}>{monthTransactions.length} lançamentos no período</Text>
      </View>
      <View style={styles.twoColumns}>
        <View style={[styles.card, styles.halfCard]}><Text style={styles.cardLabel}>Entradas</Text><Text style={[styles.metricValue, styles.income]}>{money.format(income)}</Text></View>
        <View style={[styles.card, styles.halfCard]}><Text style={styles.cardLabel}>Saídas</Text><Text style={[styles.metricValue, styles.expense]}>{money.format(expense)}</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Visão de consumo</Text>
      <View style={styles.twoColumns}>
        <View style={[styles.card, styles.halfCard]}><Text style={styles.cardLabel}>Consumo real</Text><Text style={[styles.metricValue, styles.expense]}>{money.format(consumptionTotal)}</Text></View>
        <View style={[styles.card, styles.halfCard]}><Text style={styles.cardLabel}>Gastos no cartão</Text><Text style={[styles.metricValue, styles.expense]}>{money.format(cardSpending)}</Text></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Limites dos cartões</Text>
        <View style={styles.categoryTotalRow}><Text style={styles.categoryTotalName}>Limite usado</Text><Text style={[styles.categoryTotalValue, styles.expense]}>{money.format(totalUsedLimit)}</Text></View>
        <View style={styles.categoryTotalRow}><Text style={styles.categoryTotalName}>Limite disponível</Text><Text style={[styles.categoryTotalValue, { color: totalCardLimit - totalUsedLimit >= 0 ? COLORS.income : COLORS.expense }]}>{money.format(totalCardLimit - totalUsedLimit)}</Text></View>
        <Text style={styles.cardHint}>{dueSoonCount} vencendo em até 7 dias · {overdueCount} vencidas</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fatura atual por cartão</Text>
        {cards.length === 0 ? <EmptyText text="Nenhum cartão cadastrado." /> : cards.map((card) => {
          const invoice = invoices.find((item) => item.cardId === card.id && item.referenceMonth === month)
          const status = invoice ? effectiveInvoiceStatus(invoice) : 'open'
          const color = status === 'overdue' ? COLORS.expense : invoice && isInvoiceDueSoon(invoice) ? COLORS.warning : status === 'paid' ? COLORS.income : COLORS.text
          return <View key={card.id} style={[styles.categoryTotalRow, !card.active && styles.inactiveCard]}><Text style={styles.categoryTotalName}>{card.name}</Text><Text style={[styles.categoryTotalValue, { color }]}>{money.format(invoice?.totalAmount ?? 0)}</Text></View>
        })}
      </View>
      {reviewCount > 0 && <View style={styles.warningCard}><Text style={styles.warningIcon}>⚠️</Text><View><Text style={styles.warningTitle}>Revisar lançamentos</Text><Text style={styles.warningText}>{reviewCount} {reviewCount === 1 ? 'item precisa' : 'itens precisam'} de categoria.</Text></View></View>}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Consumo por categoria</Text>
        {categoryTotals.length === 0 ? <EmptyText text="Nenhuma movimentação neste mês." /> : categoryTotals.map(({ category, total }) => (
          <View style={styles.categoryTotalRow} key={category.id}>
            <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
            <Text style={styles.categoryTotalName}>{category.icon} {category.name}</Text>
            <Text style={styles.categoryTotalValue}>{money.format(total)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Últimas transações</Text>
        {recent.length === 0 ? <EmptyText text="Cadastre sua primeira transação manual." /> : recent.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} category={categories.find((item) => item.id === transaction.categoryId)} bank={banks.find((item) => item.id === transaction.bankId)} />
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resumo por banco</Text>
        {bankSummaries.length === 0 ? <EmptyText text="Nenhum banco movimentado neste mês." /> : bankSummaries.map(({ bank, income: bankIncome, expense: bankExpense, result: bankResult, count }) => (
          <View key={bank.id} style={[styles.transactionBlock, !bank.active && { opacity: 0.5 }]}>
            <View style={styles.categoryTotalRow}><View style={[styles.categoryDot, { backgroundColor: bank.color ?? COLORS.muted }]} /><Text style={styles.categoryTotalName}>{bank.name}</Text><Text style={[styles.categoryTotalValue, { color: bankResult >= 0 ? COLORS.income : COLORS.expense }]}>{money.format(bankResult)}</Text></View>
            <Text style={styles.cardHint}>{money.format(bankIncome)} entradas · {money.format(bankExpense)} saídas · {count} transações</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

type TransactionsProps = Pick<DashboardProps, 'month' | 'onMonthChange' | 'transactions' | 'categories' | 'banks'> & {
  onCreate: () => void
  onEdit: (transaction: FinanceTransaction) => void
  onDelete: (id: string) => void
}
function TransactionsScreen({ month, onMonthChange, transactions, categories, banks, onCreate, onEdit, onDelete }: TransactionsProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [bankFilter, setBankFilter] = useState('all')
  const filtered = useMemo(() => transactions
    .filter((transaction) => transaction.date.startsWith(month))
    .filter((transaction) => typeFilter === 'all' || transaction.type === typeFilter)
    .filter((transaction) => categoryFilter === 'all' || transaction.categoryId === categoryFilter)
    .filter((transaction) => bankFilter === 'all' || transaction.bankId === bankFilter)
    .sort((a, b) => b.date.localeCompare(a.date)), [bankFilter, categoryFilter, month, transactions, typeFilter])

  const confirmDelete = (transaction: FinanceTransaction) => Alert.alert(
    'Excluir transação?',
    transaction.description,
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => onDelete(transaction.id) }],
  )

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>LANÇAMENTOS</Text><Text style={styles.pageTitleSmall}>Transações</Text></View><Pressable style={styles.primaryButtonSmall} onPress={onCreate}><Text style={styles.primaryButtonText}>+ Nova</Text></Pressable></View>
      <MonthSelector value={month} onChange={onMonthChange} />
      <View style={styles.segmentRow}>
        {(['all', 'income', 'expense'] as const).map((type) => <FilterChip key={type} active={typeFilter === type} label={type === 'all' ? 'Todas' : type === 'income' ? 'Entradas' : 'Saídas'} onPress={() => setTypeFilter(type)} />)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
        <FilterChip active={categoryFilter === 'all'} label="Categorias" onPress={() => setCategoryFilter('all')} />
        {categories.map((category) => <FilterChip key={category.id} active={categoryFilter === category.id} label={`${category.icon ?? ''} ${category.name}`} onPress={() => setCategoryFilter(category.id)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
        <FilterChip active={bankFilter === 'all'} label="Todos os bancos" onPress={() => setBankFilter('all')} />
        {banks.map((bank) => <FilterChip key={bank.id} active={bankFilter === bank.id} label={bank.name} onPress={() => setBankFilter(bank.id)} />)}
      </ScrollView>
      <View style={styles.card}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{filtered.length} transações</Text><Text style={styles.cardHint}>Manual e faturas</Text></View>
        {filtered.length === 0 ? <EmptyText text="Nenhuma transação para estes filtros." /> : filtered.map((transaction) => (
          <View key={transaction.id} style={styles.transactionBlock}>
            <TransactionRow transaction={transaction} category={categories.find((item) => item.id === transaction.categoryId)} bank={banks.find((item) => item.id === transaction.bankId)} />
            <View style={styles.rowActions}><Pressable onPress={() => onEdit(transaction)}><Text style={styles.actionText}>Editar</Text></Pressable><Pressable onPress={() => confirmDelete(transaction)}><Text style={[styles.actionText, styles.expense]}>Excluir</Text></Pressable></View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

type CategoriesProps = {
  categories: Category[]
  onCreate: () => void
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}
function CategoriesScreen({ categories, onCreate, onEdit, onDelete }: CategoriesProps) {
  const groups = useMemo(() => {
    const result = new Map<string, Category[]>()
    categories.forEach((category) => result.set(category.group, [...(result.get(category.group) ?? []), category]))
    return [...result.entries()]
  }, [categories])

  const confirmDelete = (category: Category) => Alert.alert(
    'Excluir categoria?',
    'Transações desta categoria serão movidas para Revisar.',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => onDelete(category.id) }],
  )

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>ORGANIZAÇÃO</Text><Text style={styles.pageTitleSmall}>Categorias</Text></View><Pressable style={styles.primaryButtonSmall} onPress={onCreate}><Text style={styles.primaryButtonText}>+ Nova</Text></Pressable></View>
      <Text style={styles.pageSubtitle}>Categorias padrão são protegidas. As suas podem ser editadas e excluídas.</Text>
      {groups.map(([group, items]) => (
        <View style={styles.card} key={group}>
          <Text style={styles.sectionTitle}>{group}</Text>
          {items.map((category) => (
            <View style={styles.categoryRow} key={category.id}>
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}22` }]}><Text>{category.icon ?? '•'}</Text></View>
              <View style={styles.categoryInfo}><Text style={styles.categoryName}>{category.name}</Text><Text style={styles.categoryMeta}>{typeLabel(category.type)} · {category.isDefault ? 'Padrão' : 'Minha categoria'}</Text></View>
              {!category.isDefault && <View style={styles.categoryActions}><Pressable onPress={() => onEdit(category)}><Text style={styles.actionText}>Editar</Text></Pressable><Pressable onPress={() => confirmDelete(category)}><Text style={[styles.actionText, styles.expense]}>Excluir</Text></Pressable></View>}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

type BanksProps = {
  month: string
  onMonthChange: (value: string) => void
  banks: Bank[]
  transactions: FinanceTransaction[]
  onCreate: () => void
  onEdit: (bank: Bank) => void
  onDelete: (id: string) => boolean
  onToggle: (id: string) => void
}
function BanksScreen({ month, onMonthChange, banks, transactions, onCreate, onEdit, onDelete, onToggle }: BanksProps) {
  const confirmDelete = (bank: Bank) => Alert.alert(
    'Excluir banco?',
    'Bancos com transações ou cartões vinculados não podem ser excluídos. Você pode inativá-los.',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => {
      if (!onDelete(bank.id)) Alert.alert('Banco em uso', 'Remova ou altere as transações e os cartões vinculados antes de excluir este banco.')
    } }],
  )

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>CONTAS</Text><Text style={styles.pageTitleSmall}>Bancos</Text></View><Pressable style={styles.primaryButtonSmall} onPress={onCreate}><Text style={styles.primaryButtonText}>+ Novo</Text></Pressable></View>
      <Text style={styles.pageSubtitle}>Gerencie contas, carteiras digitais e dinheiro físico.</Text>
      <MonthSelector value={month} onChange={onMonthChange} />
      {banks.map((bank) => {
        const monthItems = transactions.filter((transaction) => transaction.bankId === bank.id && transaction.date.startsWith(month))
        const allItems = transactions.filter((transaction) => transaction.bankId === bank.id)
        const income = monthItems.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
        const expense = monthItems.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
        const result = income - expense
        const estimatedBalance = bank.initialBalance + allItems.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0)
        return (
          <View key={bank.id} style={[styles.card, !bank.active && { opacity: 0.48 }]}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}><View style={styles.categoryTotalRow}><View style={[styles.categoryDot, { backgroundColor: bank.color ?? COLORS.muted }]} /><Text style={styles.sectionTitle}>{bank.name}</Text></View><Text style={styles.cardHint}>{bankTypeLabel(bank.type)} · {bank.active ? 'Ativo' : 'Inativo'}</Text></View>
              <Text style={[styles.metricValue, { color: estimatedBalance >= 0 ? COLORS.income : COLORS.expense }]}>{money.format(estimatedBalance)}</Text>
            </View>
            <Text style={styles.cardHint}>Saldo estimado</Text>
            <View style={styles.twoColumns}>
              <View style={{ flex: 1 }}><Text style={styles.cardLabel}>Entradas</Text><Text style={[styles.metricValue, styles.income]}>{money.format(income)}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.cardLabel}>Saídas</Text><Text style={[styles.metricValue, styles.expense]}>{money.format(expense)}</Text></View>
            </View>
            <View style={styles.categoryTotalRow}><Text style={styles.categoryTotalName}>Resultado do mês · {monthItems.length} transações</Text><Text style={[styles.categoryTotalValue, { color: result >= 0 ? COLORS.income : COLORS.expense }]}>{money.format(result)}</Text></View>
            <View style={styles.rowActions}><Pressable onPress={() => onEdit(bank)}><Text style={styles.actionText}>Editar</Text></Pressable><Pressable onPress={() => onToggle(bank.id)}><Text style={styles.actionText}>{bank.active ? 'Inativar' : 'Ativar'}</Text></Pressable><Pressable onPress={() => confirmDelete(bank)}><Text style={[styles.actionText, styles.expense]}>Excluir</Text></Pressable></View>
          </View>
        )
      })}
    </ScrollView>
  )
}

type CardsProps = {
  month: string
  onMonthChange: (value: string) => void
  cards: CreditCard[]
  banks: Bank[]
  categories: Category[]
  purchases: CardPurchase[]
  invoices: CardInvoice[]
  onCreateCard: () => void
  onEditCard: (card: CreditCard) => void
  onDeleteCard: (id: string) => boolean
  onToggleCard: (id: string) => void
  onCreatePurchase: () => void
  onEditPurchase: (purchase: CardPurchase) => void
  onDeletePurchase: (groupId: string) => void
  onInvoiceStatus: (invoice: CardInvoice, card: CreditCard, status: InvoiceStatus) => void
}

function CardsScreen({ month, onMonthChange, cards, banks, categories, purchases, invoices, onCreateCard, onEditCard, onDeleteCard, onToggleCard, onCreatePurchase, onEditPurchase, onDeletePurchase, onInvoiceStatus }: CardsProps) {
  const monthPurchases = purchases.filter((purchase) => purchase.invoiceMonth === month)
  const visibleInvoices = invoices.filter((invoice) => invoice.referenceMonth >= month).slice(0, 18)
  const confirmDeleteCard = (card: CreditCard) => Alert.alert('Excluir cartão?', 'Cartões com compras não podem ser excluídos. Você pode inativá-los.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => { if (!onDeleteCard(card.id)) Alert.alert('Cartão em uso', 'Exclua as compras vinculadas antes de remover este cartão.') } }])
  const confirmDeletePurchase = (purchase: CardPurchase) => Alert.alert('Excluir compra?', 'Todas as parcelas desta compra serão removidas.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => onDeletePurchase(purchase.installmentGroupId) }])

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.pageHeader}><View><Text style={styles.eyebrow}>CRÉDITO</Text><Text style={styles.pageTitleSmall}>Cartões</Text></View><View style={styles.headerActions}><Pressable style={styles.secondaryButtonSmall} onPress={onCreatePurchase}><Text style={styles.secondaryButtonText}>+ Compra</Text></Pressable><Pressable style={styles.primaryButtonSmall} onPress={onCreateCard}><Text style={styles.primaryButtonText}>+ Cartão</Text></Pressable></View></View>
      <MonthSelector value={month} onChange={onMonthChange} />
      {cards.length === 0 ? <View style={styles.card}><EmptyText text="Cadastre seu primeiro cartão de crédito." /></View> : cards.map((card) => {
        const bank = banks.find((item) => item.id === card.bankId)
        const currentInvoice = invoices.find((invoice) => invoice.cardId === card.id && invoice.referenceMonth === month)
        const used = openAmountForCard(card.id, invoices)
        const available = card.totalLimit - used
        const status = currentInvoice ? effectiveInvoiceStatus(currentInvoice) : 'open'
        const dueSoon = currentInvoice ? isInvoiceDueSoon(currentInvoice) : false
        const invoiceHigh = Boolean(currentInvoice && (currentInvoice.totalAmount < 0 || currentInvoice.totalAmount >= card.totalLimit * 0.8))
        const statusColor = status === 'overdue' || invoiceHigh ? COLORS.expense : dueSoon ? COLORS.warning : status === 'paid' ? COLORS.income : COLORS.accent
        return (
          <View key={card.id} style={[styles.card, !card.active && styles.inactiveCard]}>
            <View style={styles.sectionHeader}><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{card.name}</Text><Text style={styles.cardHint}>{bank?.name ?? 'Banco não encontrado'} · {card.active ? 'Ativo' : 'Inativo'}</Text></View><View style={[styles.statusBadge, { borderColor: statusColor }]}><Text style={{ color: statusColor, fontWeight: '800', fontSize: 11 }}>{invoiceStatusLabel(status)}</Text></View></View>
            <View style={styles.categoryTotalRow}><Text style={styles.categoryTotalName}>Fatura atual</Text><Text style={[styles.metricValue, { color: statusColor }]}>{money.format(currentInvoice?.totalAmount ?? 0)}</Text></View>
            <View style={styles.twoColumns}><View style={{ flex: 1 }}><Text style={styles.cardLabel}>Limite usado</Text><Text style={[styles.metricValue, styles.expense]}>{money.format(used)}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardLabel}>Disponível</Text><Text style={[styles.metricValue, { color: available >= card.totalLimit * 0.2 ? COLORS.income : COLORS.expense }]}>{money.format(available)}</Text></View></View>
            <Text style={styles.cardHint}>Limite total {money.format(card.totalLimit)} · Fecha dia {card.closingDay} · Vence dia {card.dueDay}</Text>
            <View style={styles.rowActions}><Pressable onPress={() => onEditCard(card)}><Text style={styles.actionText}>Editar</Text></Pressable><Pressable onPress={() => onToggleCard(card.id)}><Text style={styles.actionText}>{card.active ? 'Inativar' : 'Ativar'}</Text></Pressable><Pressable onPress={() => confirmDeleteCard(card)}><Text style={[styles.actionText, styles.expense]}>Excluir</Text></Pressable></View>
          </View>
        )
      })}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Compras da fatura</Text>
        {monthPurchases.length === 0 ? <EmptyText text="Nenhuma compra nesta fatura." /> : monthPurchases.map((purchase) => {
          const card = cards.find((item) => item.id === purchase.cardId)
          const category = categories.find((item) => item.id === purchase.categoryId)
          const signed = signedPurchaseAmount(purchase)
          return <View key={purchase.id} style={styles.transactionBlock}><View style={styles.transactionRow}><View style={[styles.transactionIcon, { backgroundColor: `${category?.color ?? COLORS.warning}22` }]}><Text>{category?.icon ?? '💳'}</Text></View><View style={styles.transactionInfo}><Text style={styles.transactionTitle}>{purchase.description}</Text><Text style={styles.transactionMeta}>{card?.name} · {purchaseTypeLabel(purchase.type)} · {purchase.currentInstallment}/{purchase.totalInstallments}{purchase.needsReview ? ' · Revisar' : ''}</Text></View><Text style={[styles.transactionAmount, { color: signed < 0 ? COLORS.income : COLORS.expense }]}>{money.format(signed)}</Text></View><View style={styles.rowActions}><Pressable onPress={() => onEditPurchase(purchase)}><Text style={styles.actionText}>Editar compra</Text></Pressable><Pressable onPress={() => confirmDeletePurchase(purchase)}><Text style={[styles.actionText, styles.expense]}>Excluir</Text></Pressable></View></View>
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Faturas atuais e futuras</Text>
        {visibleInvoices.length === 0 ? <EmptyText text="As faturas aparecerão após a primeira compra." /> : visibleInvoices.map((invoice) => {
          const card = cards.find((item) => item.id === invoice.cardId)
          if (!card) return null
          const status = effectiveInvoiceStatus(invoice)
          const color = status === 'overdue' ? COLORS.expense : isInvoiceDueSoon(invoice) ? COLORS.warning : status === 'paid' ? COLORS.income : COLORS.text
          return <View key={invoice.id} style={styles.transactionBlock}><View style={styles.categoryTotalRow}><View style={{ flex: 1 }}><Text style={styles.transactionTitle}>{card.name} · {monthLabel(invoice.referenceMonth)}</Text><Text style={styles.transactionMeta}>Fecha {invoice.closingDate} · vence {invoice.dueDate} · {invoiceStatusLabel(status)}</Text></View><Text style={[styles.categoryTotalValue, { color }]}>{money.format(invoice.totalAmount)}</Text></View><View style={styles.rowActions}><Pressable onPress={() => onInvoiceStatus(invoice, card, 'closed')}><Text style={styles.actionText}>Fechar</Text></Pressable><Pressable onPress={() => onInvoiceStatus(invoice, card, 'paid')}><Text style={[styles.actionText, styles.income]}>Pagar</Text></Pressable><Pressable onPress={() => onInvoiceStatus(invoice, card, 'overdue')}><Text style={[styles.actionText, styles.expense]}>Vencida</Text></Pressable></View></View>
        })}
      </View>
    </ScrollView>
  )
}

type CreditCardModalProps = { visible: boolean; card: CreditCard | null; banks: Bank[]; onClose: () => void; onSave: (input: CreditCardInput) => void }
function CreditCardModal({ visible, card, banks, onClose, onSave }: CreditCardModalProps) {
  const [bankId, setBankId] = useState('')
  const [name, setName] = useState('')
  const [totalLimit, setTotalLimit] = useState('')
  const [closingDay, setClosingDay] = useState('1')
  const [dueDay, setDueDay] = useState('10')
  const availableBanks = banks.filter((bank) => bank.active || bank.id === card?.bankId)
  const reset = (next: CreditCard | null) => { setBankId(next?.bankId ?? banks.find((bank) => bank.active)?.id ?? ''); setName(next?.name ?? ''); setTotalLimit(next ? String(next.totalLimit).replace('.', ',') : ''); setClosingDay(String(next?.closingDay ?? 1)); setDueDay(String(next?.dueDay ?? 10)) }
  const close = () => { onClose(); reset(null) }
  const save = () => {
    const limit = Number(totalLimit.replace(',', '.')); const closing = Number(closingDay); const due = Number(dueDay)
    if (!bankId || !name.trim() || !Number.isFinite(limit) || limit <= 0 || !Number.isInteger(closing) || closing < 1 || closing > 31 || !Number.isInteger(due) || due < 1 || due > 31) { Alert.alert('Confira os campos', 'Informe banco, nome, limite positivo e dias entre 1 e 31.'); return }
    onSave({ bankId, name: name.trim(), totalLimit: limit, closingDay: closing, dueDay: due, active: card?.active ?? true }); close()
  }
  return <Modal visible={visible} animationType="slide" transparent onShow={() => reset(card)} onRequestClose={close}><KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.modalSheet}><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled"><View style={styles.sectionHeader}><Text style={styles.modalTitle}>{card ? 'Editar cartão' : 'Novo cartão'}</Text><Pressable onPress={close}><Text style={styles.closeText}>Fechar</Text></Pressable></View><Text style={styles.fieldLabel}>Banco vinculado</Text><View style={styles.segmentRow}>{availableBanks.map((bank) => <FilterChip key={bank.id} active={bankId === bank.id} label={bank.name} onPress={() => setBankId(bank.id)} />)}</View><Field label="Nome do cartão" value={name} onChangeText={setName} placeholder="Ex.: Nubank Platinum" /><Field label="Limite total" value={totalLimit} onChangeText={setTotalLimit} placeholder="0,00" keyboardType="decimal-pad" /><View style={styles.twoColumns}><View style={{ flex: 1 }}><Field label="Dia de fechamento" value={closingDay} onChangeText={setClosingDay} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label="Dia de vencimento" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" /></View></View><Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>Salvar cartão</Text></Pressable></ScrollView></View></KeyboardAvoidingView></Modal>
}

type CardPurchaseModalProps = { visible: boolean; purchase: CardPurchase | null; cards: CreditCard[]; categories: Category[]; onClose: () => void; onSave: (input: CardPurchaseInput) => void }
function CardPurchaseModal({ visible, purchase, cards, categories, onClose, onSave }: CardPurchaseModalProps) {
  const [cardId, setCardId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [totalInstallments, setTotalInstallments] = useState('1')
  const [type, setType] = useState<CardPurchaseType>('purchase')
  const [needsReview, setNeedsReview] = useState(false)
  const availableCards = cards.filter((card) => card.active || card.id === purchase?.cardId)
  const expenseCategories = categories.filter((category) => category.type === 'expense' || category.type === 'both')
  const reset = (next: CardPurchase | null) => { setCardId(next?.cardId ?? cards.find((card) => card.active)?.id ?? ''); setCategoryId(next?.categoryId ?? expenseCategories[0]?.id ?? ''); setPurchaseDate(next?.purchaseDate ?? today()); setDescription(next?.description ?? ''); setTotalAmount(next ? String(next.totalAmount).replace('.', ',') : ''); setTotalInstallments(String(next?.totalInstallments ?? 1)); setType(next?.type ?? 'purchase'); setNeedsReview(next?.needsReview ?? false) }
  const close = () => { onClose(); reset(null) }
  const save = () => {
    const amount = Number(totalAmount.replace(',', '.')); const installments = Number(totalInstallments)
    if (!cardId || !categoryId || !description.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(installments) || installments < 1 || installments > 120) { Alert.alert('Confira os campos', 'Informe cartão, categoria, descrição, data, valor positivo e parcelas entre 1 e 120.'); return }
    onSave({ cardId, categoryId, purchaseDate, description: description.trim(), totalAmount: amount, totalInstallments: installments, type, needsReview }); close()
  }
  const purchaseTypes: CardPurchaseType[] = ['purchase', 'refund', 'interest', 'fine', 'annual_fee', 'iof']
  return <Modal visible={visible} animationType="slide" transparent onShow={() => reset(purchase)} onRequestClose={close}><KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.modalSheet}><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled"><View style={styles.sectionHeader}><Text style={styles.modalTitle}>{purchase ? 'Editar compra' : 'Nova compra no cartão'}</Text><Pressable onPress={close}><Text style={styles.closeText}>Fechar</Text></Pressable></View><Text style={styles.fieldLabel}>Cartão</Text><View style={styles.segmentRow}>{availableCards.map((card) => <FilterChip key={card.id} active={cardId === card.id} label={card.name} onPress={() => setCardId(card.id)} />)}</View><Text style={styles.fieldLabel}>Tipo</Text><View style={styles.segmentRow}>{purchaseTypes.map((item) => <FilterChip key={item} active={type === item} label={purchaseTypeLabel(item)} onPress={() => setType(item)} />)}</View><Field label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Supermercado" /><Field label="Data da compra" value={purchaseDate} onChangeText={setPurchaseDate} placeholder="AAAA-MM-DD" /><View style={styles.twoColumns}><View style={{ flex: 1 }}><Field label="Valor total" value={totalAmount} onChangeText={setTotalAmount} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Parcelas" value={totalInstallments} onChangeText={setTotalInstallments} keyboardType="number-pad" /></View></View><Text style={styles.fieldLabel}>Categoria</Text><View style={styles.categoryPicker}>{expenseCategories.map((category) => <FilterChip key={category.id} active={categoryId === category.id} label={`${category.icon ?? ''} ${category.name}`} onPress={() => setCategoryId(category.id)} />)}</View><Pressable style={styles.reviewToggle} onPress={() => setNeedsReview(!needsReview)}><Text style={{ color: needsReview ? COLORS.warning : COLORS.muted }}>{needsReview ? '✓ Precisa de revisão' : 'Marcar para revisão'}</Text></Pressable><Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>Salvar compra</Text></Pressable></ScrollView></View></KeyboardAvoidingView></Modal>
}

type BankModalProps = {
  visible: boolean
  bank: Bank | null
  onClose: () => void
  onSave: (input: BankInput) => void
}
function BankModal({ visible, bank, onClose, onSave }: BankModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<BankType>('checking')
  const [initialBalance, setInitialBalance] = useState('0')
  const [color, setColor] = useState<string | undefined>(undefined)
  const reset = (next: Bank | null) => { setName(next?.name ?? ''); setType(next?.type ?? 'checking'); setInitialBalance(String(next?.initialBalance ?? 0).replace('.', ',')); setColor(next?.color) }
  const close = () => { onClose(); reset(null) }
  const save = () => {
    const numericBalance = Number(initialBalance.replace(',', '.'))
    if (!name.trim() || !Number.isFinite(numericBalance)) { Alert.alert('Confira os campos', 'Informe o nome e um saldo inicial válido.'); return }
    onSave({ name: name.trim(), type, initialBalance: numericBalance, color, active: bank?.active ?? true })
    close()
  }
  const bankTypes: BankType[] = ['checking', 'payment', 'savings', 'cash', 'other']
  return (
    <Modal visible={visible} animationType="slide" transparent onShow={() => reset(bank)} onRequestClose={close}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHeader}><Text style={styles.modalTitle}>{bank ? 'Editar banco' : 'Novo banco'}</Text><Pressable onPress={close}><Text style={styles.closeText}>Fechar</Text></Pressable></View>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Conta principal" />
          <Text style={styles.fieldLabel}>Tipo</Text><View style={styles.segmentRow}>{bankTypes.map((item) => <FilterChip key={item} active={type === item} label={bankTypeLabel(item)} onPress={() => setType(item)} />)}</View>
          <Field label="Saldo inicial" value={initialBalance} onChangeText={setInitialBalance} placeholder="0,00" keyboardType="decimal-pad" />
          <Text style={styles.fieldLabel}>Cor (opcional)</Text><View style={styles.colorRow}>{COLOR_OPTIONS.map((item) => <Pressable accessibilityLabel={`Cor ${item}`} key={item} onPress={() => setColor(item)} style={[styles.colorOption, { backgroundColor: item }, color === item && styles.colorOptionActive]} />)}</View>
          <Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>Salvar banco</Text></Pressable>
        </ScrollView></View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

type TransactionModalProps = {
  visible: boolean
  transaction: FinanceTransaction | null
  categories: Category[]
  banks: Bank[]
  onClose: () => void
  onSave: (input: TransactionInput) => void
}
function TransactionModal({ visible, transaction, categories, banks, onClose, onSave }: TransactionModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [type, setType] = useState<TransactionType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [bankId, setBankId] = useState('')
  const [note, setNote] = useState('')

  const compatibleCategories = categories.filter((category) => category.type === 'both' || category.type === type)
  const availableBanks = banks.filter((bank) => bank.active || bank.id === transaction?.bankId)
  const reset = (next: FinanceTransaction | null) => {
    const nextType = next?.type ?? 'expense'
    setDescription(next?.description ?? '')
    setAmount(next ? String(next.amount).replace('.', ',') : '')
    setDate(next?.date ?? today())
    setType(nextType)
    setCategoryId(next?.categoryId ?? categories.find((category) => category.type === nextType || category.type === 'both')?.id ?? '')
    setBankId(next?.bankId ?? banks.find((bank) => bank.active)?.id ?? '')
    setNote(next?.note ?? '')
  }
  const close = () => { onClose(); reset(null) }
  const save = () => {
    const numericAmount = Number(amount.replace(',', '.'))
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !categoryId || !bankId) {
      Alert.alert('Confira os campos', 'Informe descrição, valor positivo, data no formato AAAA-MM-DD, categoria e banco.')
      return
    }
    onSave({ description: description.trim(), amount: numericAmount, date, type, categoryId, bankId, note: note.trim() || undefined })
    close()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onShow={() => reset(transaction)} onRequestClose={close}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.sectionHeader}><Text style={styles.modalTitle}>{transaction ? 'Editar transação' : 'Nova transação'}</Text><Pressable onPress={close}><Text style={styles.closeText}>Fechar</Text></Pressable></View>
            <View style={styles.segmentRow}>{(['income', 'expense'] as const).map((item) => <FilterChip key={item} active={type === item} label={item === 'income' ? 'Entrada' : 'Saída'} onPress={() => { setType(item); setCategoryId(categories.find((category) => category.type === item || category.type === 'both')?.id ?? '') }} />)}</View>
            <Field label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Mercado" />
            <Field label="Valor" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
            <Field label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
            <Text style={styles.fieldLabel}>Banco</Text>
            <View style={styles.segmentRow}>{availableBanks.map((bank) => <FilterChip key={bank.id} active={bankId === bank.id} label={bank.name} onPress={() => setBankId(bank.id)} />)}</View>
            <Text style={styles.fieldLabel}>Categoria</Text>
            <ScrollView style={{ maxHeight: 210 }} nestedScrollEnabled contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {compatibleCategories.map((category) => <FilterChip key={category.id} active={categoryId === category.id} label={`${category.icon ?? ''} ${category.name}`} onPress={() => setCategoryId(category.id)} />)}
            </ScrollView>
            <Field label="Observação (opcional)" value={note} onChangeText={setNote} placeholder="Detalhes do lançamento" multiline />
            <Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>Salvar transação</Text></Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

type CategoryModalProps = {
  visible: boolean
  category: Category | null
  onClose: () => void
  onSave: (input: CategoryInput) => void
}
function CategoryModal({ visible, category, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('Outros')
  const [type, setType] = useState<CategoryType>('expense')
  const [color, setColor] = useState(COLORS.accent)
  const [icon, setIcon] = useState('')
  const reset = (next: Category | null) => { setName(next?.name ?? ''); setGroup(next?.group ?? 'Outros'); setType(next?.type ?? 'expense'); setColor(next?.color ?? COLORS.accent); setIcon(next?.icon ?? '') }
  const close = () => { onClose(); reset(null) }
  const save = () => {
    if (!name.trim() || !group.trim()) { Alert.alert('Confira os campos', 'Nome e grupo são obrigatórios.'); return }
    onSave({ name: name.trim(), group: group.trim(), type, color, icon: icon.trim() || undefined })
    close()
  }
  return (
    <Modal visible={visible} animationType="slide" transparent onShow={() => reset(category)} onRequestClose={close}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHeader}><Text style={styles.modalTitle}>{category ? 'Editar categoria' : 'Nova categoria'}</Text><Pressable onPress={close}><Text style={styles.closeText}>Fechar</Text></Pressable></View>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Pets" />
          <Field label="Grupo" value={group} onChangeText={setGroup} placeholder="Ex.: Casa" />
          <Field label="Ícone (opcional)" value={icon} onChangeText={setIcon} placeholder="Ex.: 🐾" />
          <Text style={styles.fieldLabel}>Tipo</Text><View style={styles.segmentRow}>{(['income', 'expense', 'both'] as const).map((item) => <FilterChip key={item} active={type === item} label={typeLabel(item)} onPress={() => setType(item)} />)}</View>
          <Text style={styles.fieldLabel}>Cor</Text><View style={styles.colorRow}>{COLOR_OPTIONS.map((item) => <Pressable accessibilityLabel={`Cor ${item}`} key={item} onPress={() => setColor(item)} style={[styles.colorOption, { backgroundColor: item }, color === item && styles.colorOptionActive]} />)}</View>
          <Pressable style={styles.primaryButton} onPress={save}><Text style={styles.primaryButtonText}>Salvar categoria</Text></Pressable>
        </ScrollView></View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

type FieldProps = ComponentProps<typeof TextInput> & { label: string }
function Field({ label, ...props }: FieldProps) { return <View><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor={COLORS.muted} style={[styles.input, props.multiline && styles.inputMultiline]} /></View> }
function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text></Pressable> }
function EmptyText({ text }: { text: string }) { return <Text style={styles.emptyText}>{text}</Text> }
function TransactionRow({ transaction, category, bank }: { transaction: FinanceTransaction; category?: Category; bank?: Bank }) { return <View style={styles.transactionRow}><View style={[styles.transactionIcon, { backgroundColor: `${category?.color ?? COLORS.warning}22` }]}><Text>{category?.icon ?? '⚠️'}</Text></View><View style={styles.transactionInfo}><Text style={styles.transactionTitle}>{transaction.description}</Text><Text style={styles.transactionMeta}>{category?.name ?? 'Não identificado'} · {bank?.name ?? 'Outros'} · {new Date(`${transaction.date}T12:00:00`).toLocaleDateString('pt-BR')}</Text></View><Text style={[styles.transactionAmount, transaction.type === 'income' ? styles.income : styles.expense]}>{transaction.type === 'income' ? '+' : '-'} {money.format(transaction.amount)}</Text></View> }

export default function App() {
  const finance = useFinanceData()
  const credit = useCreditCardData()
  const [screen, setScreen] = useState<AppScreen>('dashboard')
  const [month, setMonth] = useState(monthKey())
  const [transactionModal, setTransactionModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null)
  const [categoryModal, setCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [bankModal, setBankModal] = useState(false)
  const [editingBank, setEditingBank] = useState<Bank | null>(null)
  const [cardModal, setCardModal] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [purchaseModal, setPurchaseModal] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<CardPurchase | null>(null)

  const openTransaction = (transaction: FinanceTransaction | null) => { setEditingTransaction(transaction); setTransactionModal(true) }
  const openCategory = (category: Category | null) => { setEditingCategory(category); setCategoryModal(true) }
  const openBank = (bank: Bank | null) => { setEditingBank(bank); setBankModal(true) }
  const openCard = (card: CreditCard | null) => { setEditingCard(card); setCardModal(true) }
  const openPurchase = (purchase: CardPurchase | null) => { setEditingPurchase(purchase); setPurchaseModal(true) }
  const saveTransaction = (input: TransactionInput) => editingTransaction ? finance.updateTransaction(editingTransaction.id, input) : finance.createTransaction(input)
  const saveCategory = (input: CategoryInput) => editingCategory ? finance.updateCategory(editingCategory.id, input) : finance.createCategory(input)
  const saveBank = (input: BankInput) => editingBank ? finance.updateBank(editingBank.id, input) : finance.createBank(input)
  const saveCard = (input: CreditCardInput) => editingCard ? credit.updateCard(editingCard.id, input) : credit.createCard(input)
  const savePurchase = (input: CardPurchaseInput) => editingPurchase ? credit.updatePurchase(editingPurchase.installmentGroupId, input) : credit.createPurchase(input)
  const deleteBank = (id: string) => credit.cards.some((card) => card.bankId === id) ? false : finance.deleteBank(id)
  const setInvoiceStatus = (invoice: CardInvoice, card: CreditCard, status: InvoiceStatus) => {
    credit.setInvoiceStatus(invoice.id, status)
    if (status === 'paid') finance.createInvoicePayment(invoice.id, card.name, invoice.totalAmount, today(), card.bankId)
  }

  if (!finance.isReady || !credit.isReady) return <SafeAreaView style={styles.loading}><StatusBar style="light" /><ActivityIndicator color={COLORS.accent} size="large" /><Text style={styles.loadingText}>Carregando seus dados...</Text></SafeAreaView>

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {(finance.storageError || credit.storageError) && <View style={styles.storageError}><Text style={styles.storageErrorText}>{finance.storageError ?? credit.storageError}</Text></View>}
      <View style={styles.content}>
        {screen === 'dashboard' && <Dashboard month={month} onMonthChange={setMonth} transactions={finance.transactions} categories={finance.categories} banks={finance.banks} cards={credit.cards} cardPurchases={credit.purchases} invoices={credit.invoices} />}
        {screen === 'transactions' && <TransactionsScreen month={month} onMonthChange={setMonth} transactions={finance.transactions} categories={finance.categories} banks={finance.banks} onCreate={() => openTransaction(null)} onEdit={openTransaction} onDelete={finance.deleteTransaction} />}
        {screen === 'categories' && <CategoriesScreen categories={finance.categories} onCreate={() => openCategory(null)} onEdit={openCategory} onDelete={finance.deleteCategory} />}
        {screen === 'banks' && <BanksScreen month={month} onMonthChange={setMonth} banks={finance.banks} transactions={finance.transactions} onCreate={() => openBank(null)} onEdit={openBank} onDelete={deleteBank} onToggle={finance.toggleBank} />}
        {screen === 'cards' && <CardsScreen month={month} onMonthChange={setMonth} cards={credit.cards} banks={finance.banks} categories={finance.categories} purchases={credit.purchases} invoices={credit.invoices} onCreateCard={() => openCard(null)} onEditCard={openCard} onDeleteCard={credit.deleteCard} onToggleCard={credit.toggleCard} onCreatePurchase={() => openPurchase(null)} onEditPurchase={openPurchase} onDeletePurchase={credit.deletePurchase} onInvoiceStatus={setInvoiceStatus} />}
      </View>
      <View style={styles.navigation}>
        {([['dashboard', '◫', 'Resumo'], ['transactions', '↕', 'Transações'], ['categories', '●', 'Categorias'], ['banks', '▣', 'Bancos'], ['cards', '▤', 'Cartões']] as const).map(([key, icon, label]) => <Pressable key={key} style={styles.navItem} onPress={() => setScreen(key)}><Text style={[styles.navIcon, screen === key && styles.navActive]}>{icon}</Text><Text style={[styles.navLabel, screen === key && styles.navActive]}>{label}</Text></Pressable>)}
      </View>
      <TransactionModal visible={transactionModal} transaction={editingTransaction} categories={finance.categories} banks={finance.banks} onClose={() => setTransactionModal(false)} onSave={saveTransaction} />
      <CategoryModal visible={categoryModal} category={editingCategory} onClose={() => setCategoryModal(false)} onSave={saveCategory} />
      <BankModal visible={bankModal} bank={editingBank} onClose={() => setBankModal(false)} onSave={saveBank} />
      <CreditCardModal visible={cardModal} card={editingCard} banks={finance.banks} onClose={() => setCardModal(false)} onSave={saveCard} />
      <CardPurchaseModal visible={purchaseModal} purchase={editingPurchase} cards={credit.cards} categories={finance.categories} onClose={() => setPurchaseModal(false)} onSave={savePurchase} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background }, loading: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingText: { color: COLORS.muted }, content: { flex: 1 }, screenContent: { padding: 18, paddingBottom: 32, gap: 14 }, hero: { paddingTop: 12, paddingBottom: 4 }, eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.7, marginBottom: 7 }, pageTitle: { color: COLORS.text, fontSize: 38, fontWeight: '900', letterSpacing: -1.5 }, pageTitleSmall: { color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: -1 }, accentText: { color: COLORS.accent }, pageSubtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 5 }, pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }, headerActions: { flexDirection: 'row', gap: 7 }, card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, padding: 17 }, inactiveCard: { opacity: 0.48 }, statusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, resultCard: { backgroundColor: '#0A201A' }, cardLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 8 }, cardHint: { color: COLORS.muted, fontSize: 11, marginTop: 7 }, resultValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 }, metricValue: { fontSize: 18, fontWeight: '900' }, income: { color: COLORS.income }, expense: { color: COLORS.expense }, twoColumns: { flexDirection: 'row', gap: 12 }, halfCard: { flex: 1 }, monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, padding: 7 }, monthText: { color: COLORS.text, textTransform: 'capitalize', fontWeight: '700' }, iconButton: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, borderRadius: 10 }, iconButtonText: { color: COLORS.text, fontSize: 26, lineHeight: 28 }, warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: COLORS.warning, borderWidth: 1, backgroundColor: '#2A1C05', borderRadius: 16, padding: 15 }, warningIcon: { fontSize: 20 }, warningTitle: { color: COLORS.warning, fontWeight: '800' }, warningText: { color: '#D8B76A', fontSize: 12, marginTop: 2 }, sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 11 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, categoryTotalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopColor: COLORS.border, borderTopWidth: 1 }, categoryDot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 }, categoryTotalName: { flex: 1, color: COLORS.text, fontSize: 13 }, categoryTotalValue: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: 22 }, transactionBlock: { borderTopColor: COLORS.border, borderTopWidth: 1, paddingTop: 3 }, transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }, transactionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, transactionInfo: { flex: 1 }, transactionTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, transactionMeta: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, transactionAmount: { fontWeight: '900', fontSize: 12 }, rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, paddingBottom: 10 }, actionText: { color: COLORS.accent, fontWeight: '700', fontSize: 12 }, segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, horizontalChips: { gap: 8, paddingRight: 18 }, filterChip: { borderColor: COLORS.border, borderWidth: 1, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 }, filterChipActive: { borderColor: COLORS.accent, backgroundColor: '#10342D' }, filterChipText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' }, filterChipTextActive: { color: COLORS.accent }, primaryButtonSmall: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11 }, secondaryButtonSmall: { borderColor: COLORS.accent, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 11 }, secondaryButtonText: { color: COLORS.accent, fontWeight: '800', fontSize: 12 }, primaryButton: { backgroundColor: COLORS.accent, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 }, primaryButtonText: { color: '#04201A', fontWeight: '900' }, categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopColor: COLORS.border, borderTopWidth: 1, paddingVertical: 11 }, categoryIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, categoryInfo: { flex: 1 }, categoryName: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, categoryMeta: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, categoryActions: { alignItems: 'flex-end', gap: 7 }, navigation: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 6 : 10 }, navItem: { flex: 1, alignItems: 'center', gap: 2 }, navIcon: { color: COLORS.muted, fontSize: 18 }, navLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '700' }, navActive: { color: COLORS.accent }, storageError: { backgroundColor: '#3B1111', padding: 9 }, storageErrorText: { color: '#FCA5A5', textAlign: 'center', fontSize: 11 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }, modalSheet: { maxHeight: '92%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: COLORS.border, borderWidth: 1 }, modalContent: { padding: 20, paddingBottom: 38, gap: 14 }, modalTitle: { color: COLORS.text, fontSize: 21, fontWeight: '900' }, closeText: { color: COLORS.accent, fontWeight: '700' }, fieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }, input: { backgroundColor: COLORS.background, borderColor: COLORS.border, borderWidth: 1, borderRadius: 11, color: COLORS.text, paddingHorizontal: 13, paddingVertical: 12 }, inputMultiline: { minHeight: 76, textAlignVertical: 'top' }, categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, maxHeight: 210 }, reviewToggle: { borderColor: COLORS.warning, borderWidth: 1, borderRadius: 11, padding: 12, alignItems: 'center' }, colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, colorOption: { width: 32, height: 32, borderRadius: 16 }, colorOptionActive: { borderColor: COLORS.text, borderWidth: 3 },
})
