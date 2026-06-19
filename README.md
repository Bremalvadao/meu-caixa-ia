# Meu Caixa IA

Base visual de um aplicativo móvel de controle de caixa, criada com Expo, React Native e TypeScript.

Esta versão permite controlar categorias, transações, bancos, cartões de crédito, compras parceladas e faturas. Os dados são persistidos no aparelho com AsyncStorage.

## Funcionalidades atuais

- categorias padrão organizadas por grupo;
- criação, edição e exclusão de categorias do usuário;
- proteção das categorias padrão contra exclusão;
- criação, edição e exclusão de transações manuais;
- cadastro, edição, exclusão e ativação de bancos/contas;
- vínculo obrigatório de cada transação com um banco;
- filtros por mês, tipo, categoria e banco;
- dashboard com entradas, saídas, resultado, totais por categoria, resumo por banco e itens para revisar;
- cards de bancos com saldo inicial, movimentação mensal e saldo estimado;
- cadastro, edição, exclusão e ativação de cartões vinculados a bancos;
- controle de limite total, usado e disponível por cartão;
- compras à vista e parceladas, com geração automática das parcelas futuras;
- faturas mensais com estados aberta, fechada, paga e vencida;
- estornos, juros, multas, anuidades e IOF;
- pagamento de fatura refletido na visão de caixa sem duplicar o consumo;
- dashboard separado entre visão de caixa e visão de consumo;
- armazenamento local preparado para futura substituição por Supabase.

## Requisitos

- Node.js 22.13 ou superior;
- npm;
- Expo Go no celular, ou um emulador Android/iOS configurado.

## Instalação

Na pasta do projeto, instale as dependências:

```bash
npm install
```

## Execução

Inicie o servidor de desenvolvimento pelo script do projeto:

```bash
npm run start
```

O comando equivalente com a CLI do Expo é:

```bash
npx expo start
```

Depois que o Expo iniciar:

- leia o QR Code com o Expo Go para abrir no celular;
- pressione `a` para abrir no Android;
- pressione `i` para abrir no simulador iOS, disponível em macOS.

Também estão disponíveis os scripts:

```bash
npm run android
npm run ios
```

## Estrutura principal

```text
app.json          Configuração do Expo
package.json      Dependências e scripts
tsconfig.json     Configuração do TypeScript
src/main.tsx      Registro do componente raiz
src/App.tsx       Telas e formulários do aplicativo
src/types.ts      Tipos financeiros do aplicativo
src/defaultBanks.ts Bancos sugeridos e banco de contingência
src/creditCardUtils.ts Regras de parcelas, faturas, limites e vencimentos
src/useCreditCardData.ts Estado e operações locais de cartões
src/storage.ts    Persistência local isolada
```

## Tecnologias

- Expo SDK 56
- React Native
- React
- TypeScript
- AsyncStorage

## Limites desta versão

- não há sincronização em nuvem;
- não há integração com OpenAI;
- não há importação de imagens ou comprovantes;
- os dados ficam somente no dispositivo.

## Observação sobre validação

O código foi revisado estaticamente. O build não foi executado porque o ambiente usado na revisão não possui Node.js.
