import { FormEvent, useMemo, useState } from 'react'
import type { Transaction, TransactionKind } from './types'

const STORAGE_KEY = 'meu-caixa-ia:transactions'

const initialTransactions: Transaction[] = [
  { id: '1', description: 'Venda do dia', amount: 1250, kind: 'income', date: '2026-06-19' },
  { id: '2', description: 'Fornecedor', amount: 380, kind: 'expense', date: '2026-06-18' },
]

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function loadTransactions() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return initialTransactions

  try {
    return JSON.parse(saved) as Transaction[]
  } catch {
    return initialTransactions
  }
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions)
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericAmount = Number(amount.replace(',', '.'))
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return

    const nextTransactions = [
      {
        id: crypto.randomUUID(),
        description: description.trim(),
        amount: numericAmount,
        kind,
        date: new Date().toISOString().slice(0, 10),
      },
      ...transactions,
    ]

    setTransactions(nextTransactions)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTransactions))
    setDescription('')
    setAmount('')
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">CONTROLE FINANCEIRO</p>
          <h1>Meu Caixa <span>IA</span></h1>
          <p className="hero-copy">Clareza para decidir hoje. Inteligência para planejar amanhã.</p>
        </div>
        <div className="status"><i /> Dados salvos neste navegador</div>
      </header>

      <section className="summary-grid" aria-label="Resumo financeiro">
        <article className="summary-card primary">
          <p>Saldo atual</p>
          <strong>{currency.format(totals.balance)}</strong>
          <small>Entradas menos saídas</small>
        </article>
        <article className="summary-card">
          <p>Entradas</p>
          <strong className="positive">{currency.format(totals.income)}</strong>
          <small>{transactions.filter((item) => item.kind === 'income').length} lançamentos</small>
        </article>
        <article className="summary-card">
          <p>Saídas</p>
          <strong className="negative">{currency.format(totals.expense)}</strong>
          <small>{transactions.filter((item) => item.kind === 'expense').length} lançamentos</small>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">MOVIMENTAÇÃO</p>
              <h2>Novo lançamento</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <label>
              Descrição
              <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Venda no cartão" />
            </label>
            <label>
              Valor
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
            </label>
            <div className="kind-selector">
              <button type="button" className={kind === 'income' ? 'active' : ''} onClick={() => setKind('income')}>Entrada</button>
              <button type="button" className={kind === 'expense' ? 'active expense' : ''} onClick={() => setKind('expense')}>Saída</button>
            </div>
            <button className="submit-button" type="submit">Adicionar lançamento</button>
          </form>
        </article>

        <article className="panel history">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">HISTÓRICO</p>
              <h2>Últimos lançamentos</h2>
            </div>
            <span>{transactions.length} itens</span>
          </div>
          <div className="transactions">
            {transactions.slice(0, 6).map((transaction) => (
              <div className="transaction" key={transaction.id}>
                <div className={`transaction-icon ${transaction.kind}`}>{transaction.kind === 'income' ? '↗' : '↘'}</div>
                <div className="transaction-copy">
                  <strong>{transaction.description}</strong>
                  <small>{new Date(`${transaction.date}T12:00:00`).toLocaleDateString('pt-BR')}</small>
                </div>
                <strong className={transaction.kind === 'income' ? 'positive' : 'negative'}>
                  {transaction.kind === 'income' ? '+' : '-'} {currency.format(transaction.amount)}
                </strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="assistant-card">
        <div className="spark">✦</div>
        <div>
          <p className="eyebrow">EM BREVE</p>
          <h2>Assistente financeiro com IA</h2>
          <p>Insights de fluxo de caixa, alertas e respostas sobre seus lançamentos — com integração segura pelo servidor.</p>
        </div>
      </section>
    </main>
  )
}

export default App

