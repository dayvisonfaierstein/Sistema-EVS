# Histórico de versões

Todas as versões relevantes do Espaço+ serão registradas neste arquivo.

O projeto utiliza versionamento semântico no formato `MAJOR.MINOR.PATCH`:

- `MAJOR`: mudanças incompatíveis ou grandes reformulações;
- `MINOR`: novas funcionalidades compatíveis;
- `PATCH`: correções e pequenos ajustes compatíveis.

## [0.1.0] - 2026-07-24

### Adicionado

- Estrutura inicial baseada no layout aprovado do Lovable;
- Integração com Supabase;
- Autenticação, recuperação de senha e sessão persistente;
- Perfis, permissões e cadastro da organização;
- Arquitetura multiempresa com RLS;
- Cadastro, listagem e perfil de clientes;
- Upload privado de foto;
- Registro e histórico de acessos;
- Cadastro e histórico de avaliações corporais;
- Cálculo automático de IMC;
- Gráficos de evolução;
- Dashboard com dados reais;
- Relatório individual em PDF;
- Migrations e seed de desenvolvimento.

### Segurança

- Separação de dados por organização;
- Políticas de acesso por perfil;
- Proteção de arquivos privados;
- Exclusão de credenciais e artefatos locais do Git.

### Pendente

- Gestão comercial completa;
- Financeiro e caixa;
- Agenda e eventos conectados;
- Portal do cliente conectado;
- PWA e relatórios avançados.
