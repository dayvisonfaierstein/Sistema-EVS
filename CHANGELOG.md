# Histórico de versões

Todas as versões relevantes do Espaço+ serão registradas neste arquivo.

O projeto utiliza versionamento semântico no formato `MAJOR.MINOR.PATCH`:

- `MAJOR`: mudanças incompatíveis ou grandes reformulações;
- `MINOR`: novas funcionalidades compatíveis;
- `PATCH`: correções e pequenos ajustes compatíveis.

## [0.5.1] - 2026-07-27

### Corrigido

- Exibição das fotos dos clientes nos avatares da tabela e da visualização em cartões;
- Geração segura e agrupada de URLs temporárias para fotos armazenadas no bucket privado.

## [0.5.0] - 2026-07-27

### Adicionado

- Edição completa do cadastro diretamente pelo perfil do cliente;
- Alteração, recorte, substituição e remoção da foto existente;
- Exibição segura da foto armazenada no bucket privado;
- Opção para usar o mesmo número de telefone no WhatsApp.
- Política segura para exclusão da foto substituída no Storage da própria unidade.

### Alterado

- Nome completo e data de nascimento passam a ser os únicos campos obrigatórios;
- Telefone, WhatsApp, e-mail, CPF e objetivo principal passam a ser opcionais;
- Formulário de cliente unificado entre os fluxos de criação e edição.

## [0.4.0] - 2026-07-27

### Adicionado

- Editor profissional de foto no cadastro do cliente com recorte quadrado, reposicionamento, zoom e suporte a gestos;
- Redimensionamento automático para 600 × 600 px e otimização JPEG antes do upload;
- Validação de formato e tamanho, prévia final, loading, cancelamento, troca e remoção da foto;
- Atalho Registrar acesso no cabeçalho da página Clientes.

### Alterado

- Remoção do item redundante Novo cadastro do menu lateral;
- Upload do cliente passa a armazenar somente a foto recortada e otimizada.

## [0.3.1] - 2026-07-27

### Corrigido

- Navegação dos botões Iniciar, Reavaliar e Nova avaliação;
- Estrutura de rotas do módulo de Avaliação Corporal para renderizar corretamente o formulário.

## [0.3.0] - 2026-07-27

### Adicionado

- Módulo completo de Avaliação Corporal e Bioimpedância integrado aos clientes;
- Formulário em cinco etapas com dados gerais, medidas, bioimpedância, objetivos e revisão;
- Resumo de evolução corporal no perfil do cliente;
- Comparação automática com a avaliação anterior;
- Histórico, linha do tempo e gráficos por período;
- Relatório visual responsivo com impressão A4 e exportação pelo navegador;
- Módulos separados de Plano de Experiência de 3 dias e Indicações;
- Referências e classificações corporais centralizadas para futura configuração por equipamento;
- Migration com novos campos históricos, tabelas, índices e políticas RLS.

### Mantido

- Avaliações anteriores como registros independentes;
- Autenticação, organização, perfis e isolamento de dados existentes;
- Identidade visual, menu e componentes do sistema.

## [0.2.5] - 2026-07-25

### Alterado

- Substituição do favicon padrão do Lovable pelo ícone oficial fornecido pelo site MyHerbalife.

## [0.2.4] - 2026-07-25

### Alterado

- Reposicionamento do conteúdo institucional para mais próximo do logo;
- Remoção da área branca excedente no arquivo do logo;
- Preservação da posição do arco verde-limão e da marca-d'água inferior.

## [0.2.3] - 2026-07-25

### Alterado

- Ajuste da tela de login para caber integralmente no desktop sem barra de rolagem;
- Substituição da marca provisória pelo logo institucional do Espaço Vida Saudável;
- Refinamento do arco verde-limão e da marca-d'água inferior em uma única faixa.

## [0.2.2] - 2026-07-25

### Alterado

- Reposicionamento do card institucional na área esquerda do login;
- Inclusão de padrão orgânico em marca d’água no rodapé do painel;
- Preservação do arco verde-limão e dos ícones existentes.

## [0.2.1] - 2026-07-25

### Alterado

- Redução proporcional da tela de login para uma apresentação mais compacta;
- Manutenção dos ícones, fotografia, recursos e comportamento da versão anterior.

## [0.2.0] - 2026-07-25

### Adicionado

- Nova interface responsiva de login do Espaço+;
- Fotografia institucional local na área central;
- Exibição da versão no login e no menu do sistema;
- Suporte ao apelido de acesso `admin`, vinculado por variável de ambiente.

### Mantido

- Autenticação, sessão e recuperação de senha existentes no Supabase;
- Redirecionamento por perfil e proteção das rotas;
- Regras de acesso, banco de dados e dashboard sem alterações.

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
