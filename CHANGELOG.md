# Histórico de versões

Todas as versões relevantes do Espaço+ serão registradas neste arquivo.

O projeto utiliza versionamento semântico no formato `MAJOR.MINOR.PATCH`:

- `MAJOR`: mudanças incompatíveis ou grandes reformulações;
- `MINOR`: novas funcionalidades compatíveis;
- `PATCH`: correções e pequenos ajustes compatíveis.

## [0.10.2] - 2026-07-28

### Adicionado

- Opção para imprimir a lista de produtos cadastrados;
- Relatório de impressão com produto, SKU, categoria, PV, preço de venda, estoque e status;
- A impressão respeita a busca e os filtros aplicados na tela de Produtos.

### Alterado

- Número da versão do sistema atualizado para v0.10.2.

## [0.10.1] - 2026-07-27

### Corrigido

- Resultado da importação Herbalife agora permanece visível na própria página;
- Erros da importação agora são exibidos de forma persistente com a mensagem retornada pelo Supabase;
- Redirecionamento automático removido para que o usuário consiga confirmar o resultado.

## [0.10.0] - 2026-07-27

### Adicionado

- Importação assistida da tabela Herbalife para Pernambuco com 67 produtos;
- Prévia comparativa por SKU, separando produtos novos, existentes e conflitos de nome;
- Seleção individual dos registros que devem ser criados ou atualizados;
- Escolha da faixa de preço utilizada como custo de referência;
- Histórico das faixas de preço bruto, 25%, 35%, 42% e 50%;
- Função transacional no Supabase para impedir importações parciais;
- Registro da fonte e da data de referência em cada produto importado.

### Segurança

- Produtos existentes não são sobrescritos automaticamente;
- Importação restrita aos perfis autorizados do módulo comercial;
- Dados de embalagem e unidades não disponíveis na fonte permanecem pendentes de conferência.

### Alterado

- Número da versão do sistema atualizado para `v0.10.0`.

## [0.9.1] - 2026-07-27

### Removido

- Módulo e item de navegação “Fornecedores”, pois o abastecimento do Espaço+ é realizado exclusivamente pela Herbalife.

### Alterado

- Marca dos produtos fixada como `Herbalife` no cadastro e na gravação;
- Filtro de marcas removido do catálogo por não ser necessário;
- Número da versão do sistema atualizado para `v0.9.1`.

## [0.9.0] - 2026-07-27

### Adicionado

- Envio de fotos no cadastro e na edição de produtos;
- Editor de imagem com recorte quadrado, reposicionamento e controle de zoom;
- Otimização automática das fotos para 600 × 600 px em JPEG;
- Exibição segura das imagens no catálogo e na página de detalhes;
- Substituição e remoção de fotos existentes.

### Segurança

- Fotos armazenadas no bucket privado `product-images`, separadas por organização;
- URLs temporárias assinadas para impedir acesso público direto aos arquivos.

## [0.8.0] - 2026-07-27

### Adicionado

- Cadastro completo de produtos com identificação, SKU, código de barras, marca e categoria;
- Controle das unidades de embalagem, estoque e consumo;
- Cadastro de PV, custo de referência, preço de venda e estoque mínimo;
- Gerenciamento de categorias com criação, ativação e desativação;
- Página de detalhes do produto e fluxo de edição;
- Filtros do catálogo por nome ou SKU, categoria, marca, situação e nível de estoque.

### Alterado

- Listagem simulada de produtos substituída pelo catálogo real integrado ao Supabase;
- Situação de estoque calculada com base no saldo atual e no estoque mínimo;
- Número da versão do sistema atualizado para `v0.8.0`.

## [0.7.0] - 2026-07-27

### Adicionado

- Fundação do módulo comercial integrada ao schema existente do Espaço+;
- Estrutura de embalagem, unidades de estoque e consumo, PV e custo médio nos produtos;
- Tabelas de preços de referência por estado e faixa de desconto;
- Histórico não retroativo de Pontos de Volume;
- Estrutura de receitas e ingredientes;
- Estrutura de consumos vinculados aos acessos com snapshots de custo e PV;
- Buckets protegidos para fotos de produtos e receitas;
- Categorias iniciais de produtos para organizações atuais e futuras;
- Perfil de acesso “Gestor” para o módulo comercial;
- Tipos TypeScript para produtos, lotes, movimentações, receitas e consumos.

### Alterado

- Precisão dos saldos de estoque, custos e quantidades preparada para consumo em gramas, mililitros ou unidades;
- Políticas comerciais ajustadas para separar consulta e manutenção de dados sensíveis;
- Estrutura de lotes preparada para consumo FEFO.

## [0.6.8] - 2026-07-27

### Alterado

- Favicon do sistema substituído pelo símbolo oficial do Espaço+.

## [0.6.7] - 2026-07-27

### Alterado

- Logo da página de login redimensionada para 180 × 180 px;
- Bloco institucional abaixo da logo reposicionado para melhorar o espaçamento visual.

## [0.6.6] - 2026-07-27

### Removido

- Card institucional “Mais saúde, mais controle, mais resultados” da página de login.

## [0.6.5] - 2026-07-27

### Corrigido

- Regras responsivas da página de login corrigidas para manter a logo em 200 × 200 px nas resoluções desktop com menor altura.

## [0.6.4] - 2026-07-27

### Alterado

- Logo do cabeçalho da barra lateral substituída pela nova versão destinada ao dashboard;
- Assinatura institucional atualizada para “Gestão Inteligente para transformar resultados”.

## [0.6.3] - 2026-07-27

### Alterado

- Dimensão da logo da página de login ajustada para 200 × 200 px, seguindo a proporção visual aprovada.

## [0.6.2] - 2026-07-27

### Alterado

- Logo principal da página de login substituída pela nova versão do Espaço+;
- Exibição da logo ampliada para 250 × 250 px no layout desktop, com redução responsiva em telas de menor altura.

## [0.6.1] - 2026-07-27

### Alterado

- Identidade visual da tela de login atualizada com a logo oficial do Espaço+;
- Logo do Espaço+ adicionada ao cabeçalho da barra lateral;
- Referências visuais a “Espaço Vida Saudável” substituídas pela identidade do sistema nos pontos alterados.

## [0.6.0] - 2026-07-27

### Adicionado

- Campo Massa muscular esquelética (%) nas avaliações de bioimpedância;
- Exibição do novo indicador na revisão, resumo, relatório e gráficos de evolução;
- Migração do Supabase para armazenar o indicador no histórico das avaliações.

### Alterado

- Campo Massa muscular (%) renomeado para Taxa muscular (%);
- Indicador Idade corporal renomeado para Idade metabólica.

## [0.5.3] - 2026-07-27

### Corrigido

- Exibição das fotos na seleção de clientes para registrar acesso;
- Exibição das fotos no histórico de acessos realizados no dia.

## [0.5.2] - 2026-07-27

### Adicionado

- Fotos dos clientes na seleção para iniciar ou refazer uma avaliação;
- Fotos dos clientes nos registros do histórico recente de avaliações.

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
