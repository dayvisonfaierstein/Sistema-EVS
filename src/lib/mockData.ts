// Dados fictícios centralizados para o sistema Espaço+
export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export const formatDate = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
};

export type Cliente = {
  id: string;
  nome: string;
  foto: string;
  telefone: string;
  email: string;
  objetivo: "Emagrecimento" | "Ganho de massa" | "Manutenção" | "Saúde";
  status: "Ativo" | "Inativo" | "Novo";
  ultimaVisita: string;
  totalAcessos: number;
  ultimaAvaliacao: string;
  pesoInicial: number;
  pesoAtual: number;
  meta: number;
  idade: number;
  cadastro: string;
};

const nomes = [
  "Ana Beatriz Souza",
  "Carlos Eduardo Lima",
  "Mariana Ferreira",
  "João Pedro Alves",
  "Fernanda Ribeiro",
  "Rafael Nogueira",
  "Juliana Martins",
  "Bruno Cardoso",
  "Camila Torres",
  "Pedro Henrique Rocha",
  "Larissa Oliveira",
  "Thiago Barbosa",
  "Beatriz Almeida",
  "Gustavo Pereira",
  "Isabela Correia",
  "Marcelo Duarte",
];

export const clientes: Cliente[] = nomes.map((nome, i) => {
  const objetivos: Cliente["objetivo"][] = [
    "Emagrecimento",
    "Ganho de massa",
    "Manutenção",
    "Saúde",
  ];
  const status: Cliente["status"][] = ["Ativo", "Ativo", "Ativo", "Novo", "Inativo"];
  const pesoInicial = 60 + ((i * 3) % 40);
  const pesoAtual = pesoInicial - (i % 8);
  return {
    id: String(i + 1),
    nome,
    foto: `https://i.pravatar.cc/150?img=${i + 5}`,
    telefone: `(11) 9${8000 + i}-${1000 + i * 7}`,
    email: nome.toLowerCase().replace(/ /g, ".") + "@email.com",
    objetivo: objetivos[i % 4],
    status: status[i % 5],
    ultimaVisita: formatDate(new Date(2026, 6, 24 - (i % 20))),
    totalAcessos: 12 + ((i * 5) % 80),
    ultimaAvaliacao: formatDate(new Date(2026, 5, 10 + (i % 15))),
    pesoInicial,
    pesoAtual,
    meta: pesoInicial - 8,
    idade: 22 + ((i * 3) % 40),
    cadastro: formatDate(new Date(2025, i % 12, 5 + (i % 20))),
  };
});

export const kpis = {
  clientesAtivos: 348,
  novosClientesMes: 42,
  acessosHoje: 87,
  acessosMes: 2140,
  avaliacoesMes: 96,
  receitaMensal: 84500,
  despesasMensais: 32400,
  lucroEstimado: 52100,
  estoqueBaixo: 8,
  proximosVencimento: 5,
  contasReceber: 12800,
  contasPagar: 9450,
};

export const acessosPorDia = Array.from({ length: 14 }, (_, i) => ({
  dia: `${i + 11}/07`,
  acessos: 50 + Math.round(Math.sin(i) * 20 + Math.random() * 30),
}));

export const novosClientesPorMes = [
  { mes: "Jan", novos: 24 },
  { mes: "Fev", novos: 32 },
  { mes: "Mar", novos: 28 },
  { mes: "Abr", novos: 41 },
  { mes: "Mai", novos: 38 },
  { mes: "Jun", novos: 45 },
  { mes: "Jul", novos: 42 },
];

export const financeiroMensal = [
  { mes: "Jan", receita: 62000, custos: 24000, lucro: 38000 },
  { mes: "Fev", receita: 68000, custos: 26000, lucro: 42000 },
  { mes: "Mar", receita: 71000, custos: 27500, lucro: 43500 },
  { mes: "Abr", receita: 75000, custos: 29000, lucro: 46000 },
  { mes: "Mai", receita: 79000, custos: 30500, lucro: 48500 },
  { mes: "Jun", receita: 82000, custos: 31000, lucro: 51000 },
  { mes: "Jul", receita: 84500, custos: 32400, lucro: 52100 },
];

export const produtosMaisVendidos = [
  { produto: "Shake Fórmula 1", vendas: 142 },
  { produto: "Chá Termogênico", vendas: 118 },
  { produto: "Proteína Whey", vendas: 96 },
  { produto: "Aloe Vera", vendas: 78 },
  { produto: "Fibra Ativa", vendas: 64 },
];

export const formasPagamento = [
  { nome: "Pix", value: 42 },
  { nome: "Cartão Crédito", value: 28 },
  { nome: "Cartão Débito", value: 16 },
  { nome: "Dinheiro", value: 9 },
  { nome: "Dividido", value: 5 },
];

export const horariosMovimento = Array.from({ length: 13 }, (_, i) => ({
  hora: `${7 + i}h`,
  visitas: Math.round(10 + Math.abs(Math.sin(i / 2)) * 40 + Math.random() * 8),
}));

export const evolucaoMediaClientes = [
  { mes: "Fev", peso: 78.4 },
  { mes: "Mar", peso: 77.1 },
  { mes: "Abr", peso: 76.0 },
  { mes: "Mai", peso: 75.2 },
  { mes: "Jun", peso: 74.3 },
  { mes: "Jul", peso: 73.5 },
];

export const aniversariantes = clientes.slice(0, 5).map((c, i) => ({
  ...c,
  dia: `${25 + i}/07`,
}));

export const proximosEventos = [
  { titulo: "Aulão de Zumba", data: "26/07/2026", hora: "08:00", confirmados: 24 },
  { titulo: "Palestra: Nutrição Consciente", data: "28/07/2026", hora: "19:30", confirmados: 41 },
  { titulo: "Desafio 30 dias", data: "01/08/2026", hora: "07:00", confirmados: 62 },
];

export const alertasEstoque = [
  { produto: "Shake Fórmula 1 - Baunilha", quantidade: 3, minimo: 10 },
  { produto: "Chá Termogênico", quantidade: 5, minimo: 15 },
  { produto: "Barra de Proteína", quantidade: 2, minimo: 20 },
];

export const atividadesRecentes = [
  { icone: "user-plus", texto: "Novo cliente cadastrado: Ana Beatriz", quando: "há 5 min" },
  { icone: "activity", texto: "Nova avaliação: Carlos Eduardo", quando: "há 12 min" },
  { icone: "shopping-cart", texto: "Venda de R$ 187,00 para Mariana", quando: "há 24 min" },
  { icone: "log-in", texto: "Acesso registrado: João Pedro", quando: "há 38 min" },
  { icone: "calendar", texto: "Agendamento: Fernanda 15:00", quando: "há 1 h" },
];

export type Produto = {
  id: string;
  nome: string;
  categoria: string;
  marca: string;
  codigo: string;
  precoCompra: number;
  precoVenda: number;
  estoque: number;
  estoqueMinimo: number;
  validade: string;
  fornecedor: string;
  status: "Ativo" | "Inativo";
};

export const produtos: Produto[] = [
  {
    id: "1",
    nome: "Shake Fórmula 1 Baunilha",
    categoria: "Shakes",
    marca: "Herbalife",
    codigo: "SH001",
    precoCompra: 120,
    precoVenda: 210,
    estoque: 3,
    estoqueMinimo: 10,
    validade: "10/12/2026",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
  {
    id: "2",
    nome: "Chá Termogênico 100g",
    categoria: "Chás",
    marca: "Herbalife",
    codigo: "CH002",
    precoCompra: 95,
    precoVenda: 179,
    estoque: 5,
    estoqueMinimo: 15,
    validade: "02/09/2026",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
  {
    id: "3",
    nome: "Aloe Vera Concentrado",
    categoria: "Bebidas",
    marca: "Herbalife",
    codigo: "AL003",
    precoCompra: 68,
    precoVenda: 129,
    estoque: 24,
    estoqueMinimo: 10,
    validade: "15/03/2027",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
  {
    id: "4",
    nome: "Proteína Whey Chocolate",
    categoria: "Proteínas",
    marca: "Herbalife",
    codigo: "PW004",
    precoCompra: 145,
    precoVenda: 249,
    estoque: 12,
    estoqueMinimo: 8,
    validade: "22/05/2027",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
  {
    id: "5",
    nome: "Barra de Proteína",
    categoria: "Snacks",
    marca: "Herbalife",
    codigo: "BP005",
    precoCompra: 4.5,
    precoVenda: 9.9,
    estoque: 2,
    estoqueMinimo: 20,
    validade: "08/08/2026",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
  {
    id: "6",
    nome: "Fibra Ativa",
    categoria: "Suplementos",
    marca: "Herbalife",
    codigo: "FA006",
    precoCompra: 78,
    precoVenda: 139,
    estoque: 18,
    estoqueMinimo: 10,
    validade: "30/11/2026",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
  {
    id: "7",
    nome: "Multivitamínico",
    categoria: "Suplementos",
    marca: "Herbalife",
    codigo: "MV007",
    precoCompra: 62,
    precoVenda: 119,
    estoque: 15,
    estoqueMinimo: 8,
    validade: "12/04/2027",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
  {
    id: "8",
    nome: "Colágeno Beauty",
    categoria: "Bem-estar",
    marca: "Herbalife",
    codigo: "CB008",
    precoCompra: 89,
    precoVenda: 169,
    estoque: 22,
    estoqueMinimo: 6,
    validade: "18/06/2027",
    fornecedor: "Herbalife Brasil",
    status: "Ativo",
  },
];

export type ContaFinanceira = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: "Pago" | "Pendente" | "Atrasado";
  tipo: "Receber" | "Pagar";
};

export const contas: ContaFinanceira[] = [
  {
    id: "1",
    descricao: "Venda #1024 - Ana Beatriz",
    categoria: "Vendas",
    valor: 340,
    vencimento: "26/07/2026",
    status: "Pendente",
    tipo: "Receber",
  },
  {
    id: "2",
    descricao: "Aluguel do espaço",
    categoria: "Fixas",
    valor: 4500,
    vencimento: "05/08/2026",
    status: "Pendente",
    tipo: "Pagar",
  },
  {
    id: "3",
    descricao: "Venda #1025 - Carlos",
    categoria: "Vendas",
    valor: 189,
    vencimento: "24/07/2026",
    status: "Pago",
    tipo: "Receber",
  },
  {
    id: "4",
    descricao: "Fornecedor Herbalife",
    categoria: "Estoque",
    valor: 8200,
    vencimento: "30/07/2026",
    status: "Pendente",
    tipo: "Pagar",
  },
  {
    id: "5",
    descricao: "Energia elétrica",
    categoria: "Fixas",
    valor: 620,
    vencimento: "18/07/2026",
    status: "Atrasado",
    tipo: "Pagar",
  },
  {
    id: "6",
    descricao: "Venda #1026 - Mariana",
    categoria: "Vendas",
    valor: 259,
    vencimento: "27/07/2026",
    status: "Pendente",
    tipo: "Receber",
  },
  {
    id: "7",
    descricao: "Internet",
    categoria: "Fixas",
    valor: 180,
    vencimento: "22/07/2026",
    status: "Pago",
    tipo: "Pagar",
  },
];

export const agendamentos = [
  {
    id: "1",
    cliente: "Ana Beatriz Souza",
    tipo: "Avaliação",
    data: "24/07/2026",
    hora: "09:00",
    cor: "primary",
  },
  {
    id: "2",
    cliente: "Carlos Eduardo Lima",
    tipo: "Atendimento",
    data: "24/07/2026",
    hora: "10:30",
    cor: "info",
  },
  {
    id: "3",
    cliente: "Mariana Ferreira",
    tipo: "Reavaliação",
    data: "24/07/2026",
    hora: "14:00",
    cor: "warning",
  },
  {
    id: "4",
    cliente: "João Pedro Alves",
    tipo: "Retorno",
    data: "24/07/2026",
    hora: "15:30",
    cor: "chart-4",
  },
  {
    id: "5",
    cliente: "Fernanda Ribeiro",
    tipo: "Avaliação",
    data: "25/07/2026",
    hora: "08:00",
    cor: "primary",
  },
  {
    id: "6",
    cliente: "Rafael Nogueira",
    tipo: "Atendimento",
    data: "25/07/2026",
    hora: "11:00",
    cor: "info",
  },
];

export const acessosRecentes = clientes.slice(0, 8).map((c, i) => ({
  cliente: c.nome,
  foto: c.foto,
  hora: `${8 + i}:${String((i * 13) % 60).padStart(2, "0")}`,
  atendente: ["Paula Souza", "Ricardo Lima", "Beatriz Costa"][i % 3],
  servico: ["Consumo Shake", "Avaliação", "Retirada de produto", "Atendimento"][i % 4],
}));

export const evolucaoCliente = [
  { data: "01/02", peso: 82, imc: 28.4, gordura: 32, musculo: 28 },
  { data: "01/03", peso: 80.5, imc: 27.9, gordura: 30.5, musculo: 28.8 },
  { data: "01/04", peso: 78.8, imc: 27.3, gordura: 29.1, musculo: 29.4 },
  { data: "01/05", peso: 77.2, imc: 26.7, gordura: 27.8, musculo: 30.1 },
  { data: "01/06", peso: 75.9, imc: 26.3, gordura: 26.4, musculo: 30.7 },
  { data: "01/07", peso: 74.5, imc: 25.8, gordura: 25.2, musculo: 31.2 },
];
