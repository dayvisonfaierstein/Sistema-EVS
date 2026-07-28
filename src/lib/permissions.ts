export type PermissionRequirement = {
  anyOf: string[];
};

export const routePermissions: Array<{
  match: RegExp;
  requirement: PermissionRequirement;
}> = [
  { match: /^\/dashboard(?:\/|$)/, requirement: { anyOf: ["dashboard.view"] } },
  { match: /^\/clientes\/novo(?:\/|$)/, requirement: { anyOf: ["clients.create"] } },
  { match: /^\/clientes\/editar(?:\/|$)/, requirement: { anyOf: ["clients.update"] } },
  { match: /^\/clientes(?:\/|$)/, requirement: { anyOf: ["clients.view"] } },
  {
    match: /^\/avaliacoes\/nova(?:\/|$)/,
    requirement: { anyOf: ["assessments.create"] },
  },
  {
    match: /^\/avaliacoes(?:\/|$)/,
    requirement: { anyOf: ["assessments.view", "assessments.create"] },
  },
  {
    match: /^\/acessos(?:\/|$)/,
    requirement: { anyOf: ["accesses.view", "accesses.create"] },
  },
  { match: /^\/agenda(?:\/|$)/, requirement: { anyOf: ["agenda.view"] } },
  {
    match: /^\/vendas(?:\/|$)/,
    requirement: { anyOf: ["sales.view", "sales.create"] },
  },
  {
    match: /^\/produtos\/novo(?:\/|$)/,
    requirement: { anyOf: ["products.create"] },
  },
  {
    match: /^\/produtos\/editar(?:\/|$)/,
    requirement: { anyOf: ["products.update"] },
  },
  {
    match: /^\/produtos\/importar-herbalife(?:\/|$)/,
    requirement: { anyOf: ["products.create", "products.update"] },
  },
  { match: /^\/produtos(?:\/|$)/, requirement: { anyOf: ["products.view"] } },
  { match: /^\/estoque(?:\/|$)/, requirement: { anyOf: ["inventory.view"] } },
  {
    match: /^\/receitas\/novo(?:\/|$)/,
    requirement: { anyOf: ["recipes.create"] },
  },
  {
    match: /^\/receitas\/editar(?:\/|$)/,
    requirement: { anyOf: ["recipes.update"] },
  },
  { match: /^\/receitas(?:\/|$)/, requirement: { anyOf: ["recipes.view"] } },
  { match: /^\/financeiro(?:\/|$)/, requirement: { anyOf: ["finance.view"] } },
  { match: /^\/eventos(?:\/|$)/, requirement: { anyOf: ["events.view"] } },
  { match: /^\/campanhas(?:\/|$)/, requirement: { anyOf: ["campaigns.view"] } },
  {
    match: /^\/relatorios(?:\/|$)/,
    requirement: {
      anyOf: [
        "reports.clients",
        "reports.assessments",
        "reports.accesses",
        "reports.sales",
        "reports.inventory",
        "reports.finance",
      ],
    },
  },
  { match: /^\/usuarios(?:\/|$)/, requirement: { anyOf: ["users.view"] } },
  {
    match: /^\/configuracoes(?:\/|$)/,
    requirement: {
      anyOf: [
        "settings.organization",
        "settings.permissions",
        "settings.integrations",
        "settings.subscription.view",
        "audit.view",
      ],
    },
  },
];

export function getRouteRequirement(pathname: string) {
  return routePermissions.find(({ match }) => match.test(pathname))?.requirement;
}
