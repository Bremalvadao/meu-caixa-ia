import type { Category, CategoryType } from './types'

const createCategory = (
  id: string,
  name: string,
  group: string,
  type: CategoryType,
  color: string,
  icon?: string,
): Category => ({ id: `default-${id}`, name, group, type, color, icon, isDefault: true })

export const REVIEW_CATEGORY_ID = 'default-review'

export const defaultCategories: Category[] = [
  createCategory('salary', 'Salário', 'Receitas', 'income', '#22C55E', '💼'),
  createCategory('pix-received', 'Pix recebido', 'Receitas', 'income', '#22C55E', '⚡'),
  createCategory('refund', 'Reembolso', 'Receitas', 'income', '#22C55E', '↩️'),
  createCategory('freelance', 'Freela', 'Receitas', 'income', '#22C55E', '🧑‍💻'),
  createCategory('other-income', 'Outros', 'Receitas', 'income', '#22C55E', '➕'),

  createCategory('groceries', 'Mercado', 'Alimentação', 'expense', '#F97316', '🛒'),
  createCategory('restaurant', 'Restaurante', 'Alimentação', 'expense', '#F97316', '🍽️'),
  createCategory('delivery', 'Delivery', 'Alimentação', 'expense', '#F97316', '🛵'),
  createCategory('bakery', 'Padaria', 'Alimentação', 'expense', '#F97316', '🥖'),

  createCategory('rent', 'Aluguel', 'Moradia', 'expense', '#8B5CF6', '🏠'),
  createCategory('condo', 'Condomínio', 'Moradia', 'expense', '#8B5CF6', '🏢'),
  createCategory('electricity', 'Luz', 'Moradia', 'expense', '#8B5CF6', '💡'),
  createCategory('water', 'Água', 'Moradia', 'expense', '#8B5CF6', '💧'),
  createCategory('internet', 'Internet', 'Moradia', 'expense', '#8B5CF6', '📡'),

  createCategory('ride', 'Uber/99', 'Transporte', 'expense', '#3B82F6', '🚕'),
  createCategory('fuel', 'Combustível', 'Transporte', 'expense', '#3B82F6', '⛽'),
  createCategory('parking', 'Estacionamento', 'Transporte', 'expense', '#3B82F6', '🅿️'),
  createCategory('public-transport', 'Transporte público', 'Transporte', 'expense', '#3B82F6', '🚌'),

  createCategory('pharmacy', 'Farmácia', 'Saúde', 'expense', '#EC4899', '💊'),
  createCategory('appointment', 'Consulta', 'Saúde', 'expense', '#EC4899', '🩺'),
  createCategory('health-plan', 'Plano de saúde', 'Saúde', 'expense', '#EC4899', '❤️'),
  createCategory('gym', 'Academia', 'Saúde', 'expense', '#EC4899', '🏋️'),

  createCategory('college', 'Faculdade', 'Educação', 'expense', '#06B6D4', '🎓'),
  createCategory('courses', 'Cursos', 'Educação', 'expense', '#06B6D4', '🧠'),
  createCategory('books', 'Livros', 'Educação', 'expense', '#06B6D4', '📚'),

  createCategory('streaming', 'Streaming', 'Lazer', 'expense', '#A855F7', '📺'),
  createCategory('cinema', 'Cinema', 'Lazer', 'expense', '#A855F7', '🎬'),
  createCategory('travel', 'Viagem', 'Lazer', 'expense', '#A855F7', '✈️'),
  createCategory('bar', 'Bar', 'Lazer', 'expense', '#A855F7', '🍻'),
  createCategory('events', 'Eventos', 'Lazer', 'expense', '#A855F7', '🎟️'),

  createCategory('clothes', 'Roupas', 'Compras', 'expense', '#E879F9', '👕'),
  createCategory('electronics', 'Eletrônicos', 'Compras', 'expense', '#E879F9', '📱'),
  createCategory('home-shopping', 'Casa', 'Compras', 'expense', '#E879F9', '🛋️'),
  createCategory('gifts', 'Presentes', 'Compras', 'expense', '#E879F9', '🎁'),

  createCategory('card-bill', 'Pagamento de fatura', 'Cartão de crédito', 'expense', '#EF4444', '💳'),
  createCategory('card-interest', 'Juros', 'Cartão de crédito', 'expense', '#EF4444', '📈'),
  createCategory('card-fine', 'Multa', 'Cartão de crédito', 'expense', '#EF4444', '⚠️'),
  createCategory('card-fee', 'Anuidade', 'Cartão de crédito', 'expense', '#EF4444', '🗓️'),
  createCategory('iof', 'IOF', 'Cartão de crédito', 'expense', '#EF4444', '🏦'),

  createCategory('bank-fee', 'Tarifa bancária', 'Financeiro', 'expense', '#64748B', '🏦'),
  createCategory('loan', 'Empréstimo', 'Financeiro', 'both', '#64748B', '🤝'),
  createCategory('financial-interest', 'Juros', 'Financeiro', 'expense', '#64748B', '📊'),
  createCategory('fees', 'Taxas', 'Financeiro', 'expense', '#64748B', '🧾'),

  createCategory('investment', 'Aplicação', 'Investimentos', 'expense', '#14B8A6', '🌱'),
  createCategory('redemption', 'Resgate', 'Investimentos', 'income', '#14B8A6', '💰'),
  createCategory('yield', 'Rendimento', 'Investimentos', 'income', '#14B8A6', '📈'),

  createCategory('own-accounts', 'Entre contas próprias', 'Transferências', 'both', '#0EA5E9', '🔁'),
  createCategory('own-pix', 'Pix próprio', 'Transferências', 'both', '#0EA5E9', '⚡'),

  createCategory('review', 'Não identificado', 'Revisar', 'both', '#F59E0B', '⚠️'),
]
