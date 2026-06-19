import { useMemo, useState } from 'react'
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import type { Transaction, TransactionKind } from './types'

const initialTransactions: Transaction[] = [
  { id: '1', description: 'Venda do dia', amount: 1250, kind: 'income', date: '2026-06-19' },
  { id: '2', description: 'Fornecedor', amount: 380, kind: 'expense', date: '2026-06-18' },
]

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<TransactionKind>('income')

  const totals = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.kind === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
    const expense = transactions
      .filter((transaction) => transaction.kind === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    return { income, expense, balance: income - expense }
  }, [transactions])

  function handleSubmit() {
    const numericAmount = Number(amount.replace(',', '.'))
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return

    const nextTransactions: Transaction[] = [
      {
        id: Date.now().toString(),
        description: description.trim(),
        amount: numericAmount,
        kind,
        date: new Date().toISOString().slice(0, 10),
      },
      ...transactions,
    ]

    setTransactions(nextTransactions)
    setDescription('')
    setAmount('')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CONTROLE FINANCEIRO</Text>
          <Text style={styles.title}>Meu Caixa <Text style={styles.titleAccent}>IA</Text></Text>
          <Text style={styles.subtitle}>Clareza para decidir hoje. Inteligência para planejar amanhã.</Text>
        </View>

        <View style={[styles.card, styles.balanceCard]}>
          <Text style={styles.balanceLabel}>Saldo atual</Text>
          <Text style={styles.balanceValue}>{currency.format(totals.balance)}</Text>
          <Text style={styles.balanceHint}>Entradas menos saídas</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.card, styles.summaryCard]}>
            <Text style={styles.cardLabel}>Entradas</Text>
            <Text style={[styles.summaryValue, styles.positive]}>{currency.format(totals.income)}</Text>
          </View>
          <View style={[styles.card, styles.summaryCard]}>
            <Text style={styles.cardLabel}>Saídas</Text>
            <Text style={[styles.summaryValue, styles.negative]}>{currency.format(totals.expense)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>MOVIMENTAÇÃO</Text>
          <Text style={styles.sectionTitle}>Novo lançamento</Text>
          <Text style={styles.inputLabel}>Descrição</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex.: Venda no cartão"
            placeholderTextColor="#8A9692"
          />
          <Text style={styles.inputLabel}>Valor</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor="#8A9692"
          />
          <View style={styles.kindRow}>
            <Pressable
              accessibilityRole="button"
              style={[styles.kindButton, kind === 'income' && styles.kindButtonIncome]}
              onPress={() => setKind('income')}
            >
              <Text style={[styles.kindButtonText, kind === 'income' && styles.kindButtonTextIncome]}>Entrada</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.kindButton, kind === 'expense' && styles.kindButtonExpense]}
              onPress={() => setKind('expense')}
            >
              <Text style={[styles.kindButtonText, kind === 'expense' && styles.kindButtonTextExpense]}>Saída</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Adicionar lançamento</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.eyebrow}>HISTÓRICO</Text>
              <Text style={styles.sectionTitle}>Últimos lançamentos</Text>
            </View>
            <Text style={styles.itemCount}>{transactions.length} itens</Text>
          </View>
          {transactions.slice(0, 6).map((transaction) => (
            <View style={styles.transaction} key={transaction.id}>
              <View style={[styles.transactionIcon, transaction.kind === 'income' ? styles.incomeIcon : styles.expenseIcon]}>
                <Text style={transaction.kind === 'income' ? styles.positive : styles.negative}>
                  {transaction.kind === 'income' ? '↗' : '↘'}
                </Text>
              </View>
              <View style={styles.transactionCopy}>
                <Text style={styles.transactionTitle}>{transaction.description}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(`${transaction.date}T12:00:00`).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text style={[styles.transactionAmount, transaction.kind === 'income' ? styles.positive : styles.negative]}>
                {transaction.kind === 'income' ? '+' : '-'} {currency.format(transaction.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.assistantCard}>
          <View style={styles.spark}><Text style={styles.sparkText}>✦</Text></View>
          <View style={styles.assistantCopy}>
            <Text style={styles.eyebrow}>EM BREVE</Text>
            <Text style={styles.sectionTitle}>Assistente financeiro com IA</Text>
            <Text style={styles.assistantText}>Insights e respostas sobre seus lançamentos em uma próxima etapa.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F6F3' },
  container: { padding: 20, paddingBottom: 48, gap: 14 },
  hero: { paddingTop: 16, paddingBottom: 10 },
  eyebrow: { color: '#628077', fontSize: 11, fontWeight: '800', letterSpacing: 1.6, marginBottom: 7 },
  title: { color: '#17231F', fontSize: 42, fontWeight: '800', letterSpacing: -1.8 },
  titleAccent: { color: '#2BB77B' },
  subtitle: { color: '#607069', fontSize: 15, lineHeight: 22, marginTop: 9 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 20, padding: 20 },
  balanceCard: { backgroundColor: '#071A16', borderColor: '#071A16' },
  balanceLabel: { color: '#9EB2AB', fontSize: 13, marginBottom: 10 },
  balanceValue: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1.2 },
  balanceHint: { color: '#9EB2AB', fontSize: 12, marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1 },
  cardLabel: { color: '#75857F', fontSize: 12, marginBottom: 8 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  positive: { color: '#14875D' },
  negative: { color: '#D75C55' },
  sectionTitle: { color: '#17231F', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  inputLabel: { color: '#53625C', fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 7 },
  input: { borderColor: '#D6E0DA', borderWidth: 1, backgroundColor: '#F8FAF8', color: '#17231F', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 11, fontSize: 15 },
  kindRow: { flexDirection: 'row', gap: 9, marginTop: 16 },
  kindButton: { flex: 1, alignItems: 'center', borderColor: '#D6E0DA', borderWidth: 1, backgroundColor: '#F8FAF8', padding: 12, borderRadius: 10 },
  kindButtonIncome: { borderColor: '#2BB77B', backgroundColor: '#E8F8F1' },
  kindButtonExpense: { borderColor: '#E47770', backgroundColor: '#FFF0EF' },
  kindButtonText: { color: '#697871', fontWeight: '700' },
  kindButtonTextIncome: { color: '#14875D' },
  kindButtonTextExpense: { color: '#B4423B' },
  submitButton: { alignItems: 'center', backgroundColor: '#20A66F', padding: 14, borderRadius: 11, marginTop: 10 },
  submitButtonText: { color: '#FFFFFF', fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  itemCount: { color: '#6F7D78', backgroundColor: '#F0F4F1', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12 },
  transaction: { flexDirection: 'row', alignItems: 'center', borderTopColor: '#E7ECE9', borderTopWidth: 1, paddingVertical: 13, gap: 12 },
  transactionIcon: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 12 },
  incomeIcon: { backgroundColor: '#E8F8F1' },
  expenseIcon: { backgroundColor: '#FFF0EF' },
  transactionCopy: { flex: 1 },
  transactionTitle: { color: '#17231F', fontWeight: '700' },
  transactionDate: { color: '#8A9692', fontSize: 12, marginTop: 3 },
  transactionAmount: { fontSize: 13, fontWeight: '800' },
  assistantCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#EDF9F3', borderColor: '#DCE5DF', borderWidth: 1, borderRadius: 20, padding: 20 },
  spark: { alignItems: 'center', justifyContent: 'center', width: 50, height: 50, borderRadius: 15, backgroundColor: '#071A16' },
  sparkText: { color: '#FFFFFF', fontSize: 22 },
  assistantCopy: { flex: 1 },
  assistantText: { color: '#61716B', fontSize: 13, lineHeight: 19, marginTop: 7 },
})

export default App
