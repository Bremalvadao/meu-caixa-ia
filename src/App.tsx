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
import { useFinanceData } from './useFinanceData'
import type {
  AppScreen,
  Category,
  CategoryInput,
  CategoryType,
  FinanceTransaction,
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
}
function Dashboard({ month, onMonthChange, transactions, categories }: DashboardProps) {
  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.date.startsWith(month)),
    [month, transactions],
  )
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const expense = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const result = income - expense
  const reviewCount = monthTransactions.filter((item) => item.categoryId === REVIEW_CATEGORY_ID).length
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>()
    monthTransactions.forEach((transaction) => totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
    ))
    return [...totals.entries()]
      .map(([id, total]) => ({ category: categories.find((item) => item.id === id), total }))
      .filter((item): item is { category: Category; total: number } => Boolean(item.category))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [categories, monthTransactions])
  const recent = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>VISÃO GERAL</Text>
        <Text style={styles.pageTitle}>Meu Caixa <Text style={styles.accentText}>IA</Text></Text>
        <Text style={styles.pageSubtitle}>Seu mês financeiro em um só lugar.</Text>
      </View>
      <MonthSelector value={month} onChange={onMonthChange} />
      <View style={[styles.card, styles.resultCard]}>
        <Text style={styles.cardLabel}>Resultado do mês</Text>
        <Text style={[styles.resultValue, { color: result >= 0 ? COLORS.income : COLORS.expense }]}>{money.format(result)}</Text>
        <Text style={styles.cardHint}>{monthTransactions.length} lançamentos no período</Text>
      </View>
      <View style={styles.twoColumns}>
        <View style={[styles.card, styles.halfCard]}><Text style={styles.cardLabel}>Entradas</Text><Text style={[styles.metricValue, styles.income]}>{money.format(income)}</Text></View>
        <View style={[styles.card, styles.halfCard]}><Text style={styles.cardLabel}>Saídas</Text><Text style={[styles.metricValue, styles.expense]}>{money.format(expense)}</Text></View>
      </View>
      {reviewCount > 0 && <View style={styles.warningCard}><Text style={styles.warningIcon}>⚠️</Text><View><Text style={styles.warningTitle}>Revisar lançamentos</Text><Text style={styles.warningText}>{reviewCount} {reviewCount === 1 ? 'item precisa' : 'itens precisam'} de categoria.</Text></View></View>}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Total por categoria</Text>
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
          <TransactionRow key={transaction.id} transaction={transaction} category={categories.find((item) => item.id === transaction.categoryId)} />
        ))}
      </View>
    </ScrollView>
  )
}

type TransactionsProps = DashboardProps & {
  onCreate: () => void
  onEdit: (transaction: FinanceTransaction) => void
  onDelete: (id: string) => void
}
function TransactionsScreen({ month, onMonthChange, transactions, categories, onCreate, onEdit, onDelete }: TransactionsProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const filtered = useMemo(() => transactions
    .filter((transaction) => transaction.date.startsWith(month))
    .filter((transaction) => typeFilter === 'all' || transaction.type === typeFilter)
    .filter((transaction) => categoryFilter === 'all' || transaction.categoryId === categoryFilter)
    .sort((a, b) => b.date.localeCompare(a.date)), [categoryFilter, month, transactions, typeFilter])

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
      <View style={styles.card}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{filtered.length} transações</Text><Text style={styles.cardHint}>Origem manual</Text></View>
        {filtered.length === 0 ? <EmptyText text="Nenhuma transação para estes filtros." /> : filtered.map((transaction) => (
          <View key={transaction.id} style={styles.transactionBlock}>
            <TransactionRow transaction={transaction} category={categories.find((item) => item.id === transaction.categoryId)} />
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

type TransactionModalProps = {
  visible: boolean
  transaction: FinanceTransaction | null
  categories: Category[]
  onClose: () => void
  onSave: (input: TransactionInput) => void
}
function TransactionModal({ visible, transaction, categories, onClose, onSave }: TransactionModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [type, setType] = useState<TransactionType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')

  const compatibleCategories = categories.filter((category) => category.type === 'both' || category.type === type)
  const reset = (next: FinanceTransaction | null) => {
    const nextType = next?.type ?? 'expense'
    setDescription(next?.description ?? '')
    setAmount(next ? String(next.amount).replace('.', ',') : '')
    setDate(next?.date ?? today())
    setType(nextType)
    setCategoryId(next?.categoryId ?? categories.find((category) => category.type === nextType || category.type === 'both')?.id ?? '')
    setNote(next?.note ?? '')
  }
  const close = () => { onClose(); reset(null) }
  const save = () => {
    const numericAmount = Number(amount.replace(',', '.'))
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !categoryId) {
      Alert.alert('Confira os campos', 'Informe descrição, valor positivo, data no formato AAAA-MM-DD e categoria.')
      return
    }
    onSave({ description: description.trim(), amount: numericAmount, date, type, categoryId, note: note.trim() || undefined })
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
function TransactionRow({ transaction, category }: { transaction: FinanceTransaction; category?: Category }) { return <View style={styles.transactionRow}><View style={[styles.transactionIcon, { backgroundColor: `${category?.color ?? COLORS.warning}22` }]}><Text>{category?.icon ?? '⚠️'}</Text></View><View style={styles.transactionInfo}><Text style={styles.transactionTitle}>{transaction.description}</Text><Text style={styles.transactionMeta}>{category?.name ?? 'Não identificado'} · {new Date(`${transaction.date}T12:00:00`).toLocaleDateString('pt-BR')}</Text></View><Text style={[styles.transactionAmount, transaction.type === 'income' ? styles.income : styles.expense]}>{transaction.type === 'income' ? '+' : '-'} {money.format(transaction.amount)}</Text></View> }

export default function App() {
  const finance = useFinanceData()
  const [screen, setScreen] = useState<AppScreen>('dashboard')
  const [month, setMonth] = useState(monthKey())
  const [transactionModal, setTransactionModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null)
  const [categoryModal, setCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const openTransaction = (transaction: FinanceTransaction | null) => { setEditingTransaction(transaction); setTransactionModal(true) }
  const openCategory = (category: Category | null) => { setEditingCategory(category); setCategoryModal(true) }
  const saveTransaction = (input: TransactionInput) => editingTransaction ? finance.updateTransaction(editingTransaction.id, input) : finance.createTransaction(input)
  const saveCategory = (input: CategoryInput) => editingCategory ? finance.updateCategory(editingCategory.id, input) : finance.createCategory(input)

  if (!finance.isReady) return <SafeAreaView style={styles.loading}><StatusBar style="light" /><ActivityIndicator color={COLORS.accent} size="large" /><Text style={styles.loadingText}>Carregando seus dados...</Text></SafeAreaView>

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {finance.storageError && <View style={styles.storageError}><Text style={styles.storageErrorText}>{finance.storageError}</Text></View>}
      <View style={styles.content}>
        {screen === 'dashboard' && <Dashboard month={month} onMonthChange={setMonth} transactions={finance.transactions} categories={finance.categories} />}
        {screen === 'transactions' && <TransactionsScreen month={month} onMonthChange={setMonth} transactions={finance.transactions} categories={finance.categories} onCreate={() => openTransaction(null)} onEdit={openTransaction} onDelete={finance.deleteTransaction} />}
        {screen === 'categories' && <CategoriesScreen categories={finance.categories} onCreate={() => openCategory(null)} onEdit={openCategory} onDelete={finance.deleteCategory} />}
      </View>
      <View style={styles.navigation}>
        {([['dashboard', '◫', 'Resumo'], ['transactions', '↕', 'Transações'], ['categories', '●', 'Categorias']] as const).map(([key, icon, label]) => <Pressable key={key} style={styles.navItem} onPress={() => setScreen(key)}><Text style={[styles.navIcon, screen === key && styles.navActive]}>{icon}</Text><Text style={[styles.navLabel, screen === key && styles.navActive]}>{label}</Text></Pressable>)}
      </View>
      <TransactionModal visible={transactionModal} transaction={editingTransaction} categories={finance.categories} onClose={() => setTransactionModal(false)} onSave={saveTransaction} />
      <CategoryModal visible={categoryModal} category={editingCategory} onClose={() => setCategoryModal(false)} onSave={saveCategory} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background }, loading: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingText: { color: COLORS.muted }, content: { flex: 1 }, screenContent: { padding: 18, paddingBottom: 32, gap: 14 }, hero: { paddingTop: 12, paddingBottom: 4 }, eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.7, marginBottom: 7 }, pageTitle: { color: COLORS.text, fontSize: 38, fontWeight: '900', letterSpacing: -1.5 }, pageTitleSmall: { color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: -1 }, accentText: { color: COLORS.accent }, pageSubtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 5 }, pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }, card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, padding: 17 }, resultCard: { backgroundColor: '#0A201A' }, cardLabel: { color: COLORS.muted, fontSize: 12, marginBottom: 8 }, cardHint: { color: COLORS.muted, fontSize: 11, marginTop: 7 }, resultValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 }, metricValue: { fontSize: 18, fontWeight: '900' }, income: { color: COLORS.income }, expense: { color: COLORS.expense }, twoColumns: { flexDirection: 'row', gap: 12 }, halfCard: { flex: 1 }, monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, padding: 7 }, monthText: { color: COLORS.text, textTransform: 'capitalize', fontWeight: '700' }, iconButton: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, borderRadius: 10 }, iconButtonText: { color: COLORS.text, fontSize: 26, lineHeight: 28 }, warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: COLORS.warning, borderWidth: 1, backgroundColor: '#2A1C05', borderRadius: 16, padding: 15 }, warningIcon: { fontSize: 20 }, warningTitle: { color: COLORS.warning, fontWeight: '800' }, warningText: { color: '#D8B76A', fontSize: 12, marginTop: 2 }, sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 11 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, categoryTotalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopColor: COLORS.border, borderTopWidth: 1 }, categoryDot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 }, categoryTotalName: { flex: 1, color: COLORS.text, fontSize: 13 }, categoryTotalValue: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: 22 }, transactionBlock: { borderTopColor: COLORS.border, borderTopWidth: 1, paddingTop: 3 }, transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }, transactionIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, transactionInfo: { flex: 1 }, transactionTitle: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, transactionMeta: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, transactionAmount: { fontWeight: '900', fontSize: 12 }, rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, paddingBottom: 10 }, actionText: { color: COLORS.accent, fontWeight: '700', fontSize: 12 }, segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, horizontalChips: { gap: 8, paddingRight: 18 }, filterChip: { borderColor: COLORS.border, borderWidth: 1, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 }, filterChipActive: { borderColor: COLORS.accent, backgroundColor: '#10342D' }, filterChipText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' }, filterChipTextActive: { color: COLORS.accent }, primaryButtonSmall: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11 }, primaryButton: { backgroundColor: COLORS.accent, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 }, primaryButtonText: { color: '#04201A', fontWeight: '900' }, categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopColor: COLORS.border, borderTopWidth: 1, paddingVertical: 11 }, categoryIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, categoryInfo: { flex: 1 }, categoryName: { color: COLORS.text, fontWeight: '700', fontSize: 13 }, categoryMeta: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, categoryActions: { alignItems: 'flex-end', gap: 7 }, navigation: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 6 : 10 }, navItem: { flex: 1, alignItems: 'center', gap: 2 }, navIcon: { color: COLORS.muted, fontSize: 18 }, navLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700' }, navActive: { color: COLORS.accent }, storageError: { backgroundColor: '#3B1111', padding: 9 }, storageErrorText: { color: '#FCA5A5', textAlign: 'center', fontSize: 11 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' }, modalSheet: { maxHeight: '92%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: COLORS.border, borderWidth: 1 }, modalContent: { padding: 20, paddingBottom: 38, gap: 14 }, modalTitle: { color: COLORS.text, fontSize: 21, fontWeight: '900' }, closeText: { color: COLORS.accent, fontWeight: '700' }, fieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }, input: { backgroundColor: COLORS.background, borderColor: COLORS.border, borderWidth: 1, borderRadius: 11, color: COLORS.text, paddingHorizontal: 13, paddingVertical: 12 }, inputMultiline: { minHeight: 76, textAlignVertical: 'top' }, categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, maxHeight: 210 }, colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, colorOption: { width: 32, height: 32, borderRadius: 16 }, colorOptionActive: { borderColor: COLORS.text, borderWidth: 3 },
})
