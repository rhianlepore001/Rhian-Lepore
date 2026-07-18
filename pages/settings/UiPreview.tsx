import React, { useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import {
  Button,
  Input,
  Select,
  Card,
  Modal,
  Table,
  Tabs,
  Badge,
  EmptyState,
  Skeleton,
  SkeletonCard,
  ErrorState,
  Checkbox,
  type SelectOption,
  type TableColumn,
  type TabItem
} from '../../components/ui';
import {
  User,
  Mail,
  Lock,
  Search,
  Eye,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'client';
  status: 'active' | 'inactive' | 'pending';
}

const MOCK_USERS: MockUser[] = [
  { id: '1', name: 'Rhian Lepore', email: 'rhian@agendix.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Ana Silva', email: 'ana.silva@agendix.com', role: 'staff', status: 'active' },
  { id: '3', name: 'Lucas Souza', email: 'lucas@gmail.com', role: 'client', status: 'pending' },
  { id: '4', name: 'Maria Souza', email: 'maria@outlook.com', role: 'client', status: 'inactive' },
];

export const UiPreview: React.FC = () => {
  const { colors, font } = useBrutalTheme();

  // Estados dos Controles do Preview
  const [activeTab, setActiveTab] = useState('basics');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  
  // Estados de Formulários
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [selectError, setSelectError] = useState('');

  // Tabela e dados
  const [usersData, setUsersData] = useState<MockUser[]>(MOCK_USERS);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);

  const simulateLoading = () => {
    setButtonLoading(true);
    setTimeout(() => {
      setButtonLoading(false);
    }, 2000);
  };

  const validateForm = () => {
    let valid = true;
    if (!inputValue) {
      setInputError('O campo de nome é obrigatório.');
      valid = false;
    } else {
      setInputError('');
    }

    if (!selectValue) {
      setSelectError('Por favor, selecione um perfil.');
      valid = false;
    } else {
      setSelectError('');
    }

    if (valid) {
      alert(`Dados validados com sucesso!\nNome: ${inputValue}\nPerfil: ${selectValue}`);
    }
  };

  const tabsItems: TabItem[] = [
    { id: 'basics', label: 'Básico (Buttons & Badges)', icon: <Play /> },
    { id: 'forms', label: 'Formulários (Inputs & Selects)', icon: <Mail /> },
    { id: 'layout', label: 'Estrutura (Cards & Tables)', icon: <User /> },
    { id: 'feedback', label: 'Feedback (Modal & States)', icon: <AlertTriangle /> },
  ];

  const selectOptions: SelectOption[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'staff', label: 'Equipe/Profissional' },
    { value: 'client', label: 'Cliente Final' },
    { value: 'disabled-opt', label: 'Perfil Desativado', disabled: true },
  ];

  const columns: TableColumn<MockUser>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (row) => <span className="font-bold">{row.name}</span>,
    },
    {
      key: 'email',
      header: 'E-mail',
      render: (row) => row.email,
    },
    {
      key: 'role',
      header: 'Perfil',
      render: (row) => {
        const badgeMap: Record<MockUser['role'], 'accent' | 'neutral'> = {
          admin: 'accent',
          staff: 'neutral',
          client: 'neutral',
        };
        return <Badge variant={badgeMap[row.role]}>{row.role}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const badgeMap: Record<MockUser['status'], 'success' | 'warning' | 'danger'> = {
          active: 'success',
          inactive: 'danger',
          pending: 'warning',
        };
        return <Badge variant={badgeMap[row.status]}>{row.status}</Badge>;
      },
    },
  ];

  return (
    <SettingsLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Cabeçalho */}
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tight ${colors.text} ${font.heading}`}>
            Preview de Componentes Base
          </h1>
          <p className={`text-sm ${colors.textSecondary} mt-1`}>
            Esta tela serve como ambiente de teste e validação prática (smoke test visual) para todos os componentes criados na Fase 0.
          </p>
        </div>

        {/* Abas Principais */}
        <Tabs tabs={tabsItems} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Conteúdo das Abas */}
        <div className="mt-6">
          {activeTab === 'basics' && (
            <div className="space-y-8">
              {/* Seção Buttons */}
              <Card title="Buttons (Variantes & Estados)">
                <div className="space-y-6">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Variações de Cores/Estilos</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="danger">Danger</Button>
                      <Button variant="success">Success</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Tamanhos</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="sm" variant="primary">Small (sm)</Button>
                      <Button size="md" variant="primary">Medium (md)</Button>
                      <Button size="lg" variant="primary">Large (lg)</Button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Com Ícones & Largura Total</h4>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Button icon={<Plus />}>Adicionar Item</Button>
                      <Button iconRight={<Eye />} variant="secondary">Ver Detalhes</Button>
                      <Button icon={<Trash2 />} variant="danger" size="sm">Excluir</Button>
                    </div>
                    <div className="max-w-xs">
                      <Button fullWidth variant="outline">Botão Largura Total</Button>
                    </div>
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.textMuted}`}>Estados Dinâmicos (Clique para testar Loading)</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={simulateLoading} loading={buttonLoading}>
                        {buttonLoading ? 'Carregando...' : 'Clique para Carregar'}
                      </Button>
                      <Button disabled variant="primary">Disabled</Button>
                      <Button disabled loading variant="secondary">Disabled Loading</Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Caixas de seleção (Checkbox)">
                <div className="space-y-4">
                  <Checkbox label="Opção padrão" defaultChecked />
                  <Checkbox label="Desabilitado" disabled />
                  <Checkbox label="Com erro" error="Selecione para continuar." />
                </div>
              </Card>

              {/* Seção Badges */}
              <Card title="Badges (Sinalizadores)">
                <div className="space-y-4">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${colors.textMuted}`}>Variações Semânticas</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="accent">Accent / Info</Badge>
                    <Badge variant="success">Success / Ativo</Badge>
                    <Badge variant="warning">Warning / Pendente</Badge>
                    <Badge variant="danger">Danger / Inativo</Badge>
                    <Badge variant="neutral">Neutral / Outro</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'forms' && (
            <div className="space-y-8">
              <Card title="Inputs (Campos de Texto)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Nome Completo"
                    placeholder="Digite seu nome..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    hint="Digite o nome completo sem abreviações"
                  />
                  <Input
                    label="E-mail (Com Ícone)"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    icon={<Mail />}
                  />
                  <Input
                    label="Senha (Senha de Acesso)"
                    type="password"
                    placeholder="••••••••"
                    icon={<Lock />}
                    disabled
                    hint="Campo desabilitado temporariamente"
                  />
                  <Input
                    label="Campo com Erro"
                    placeholder="Digite algo incorreto..."
                    error={inputError || 'Este campo contém um erro de validação demonstrativo'}
                  />
                  <Input
                    label="Campo de Busca (Tamanho Pequeno)"
                    size="sm"
                    placeholder="Buscar..."
                    icon={<Search />}
                  />
                  <Input
                    label="Campo Grande (Tamanho Grande)"
                    size="lg"
                    placeholder="Entrada de texto de alta visibilidade..."
                  />
                </div>
              </Card>

              <Card title="Selects (Listas de Seleção)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    label="Perfil de Usuário"
                    placeholder="Selecione um perfil..."
                    options={selectOptions}
                    value={selectValue}
                    onChange={(e) => setSelectValue(e.target.value)}
                    hint="Os perfis definem o nível de acesso do usuário"
                  />
                  <Select
                    label="Perfil (Desabilitado)"
                    disabled
                    options={selectOptions}
                    placeholder="Selecione..."
                  />
                  <Select
                    label="Perfil (Com Erro)"
                    error={selectError || 'Por favor, corrija a seleção.'}
                    options={selectOptions}
                    placeholder="Selecione..."
                  />
                </div>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setInputValue(''); setSelectValue(''); setInputError(''); setSelectError(''); }}>
                  Limpar Campos
                </Button>
                <Button variant="primary" onClick={validateForm}>
                  Validar Formulário
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-8">
              {/* Cards */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${colors.textMuted}`}>Estilos de Cards</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card variant="default" title="Card Padrão (Default)">
                    <p className="text-xs leading-relaxed">
                      Usado para agrupamentos normais, formulários e listagens gerais sem destaque excessivo.
                    </p>
                  </Card>
                  <Card variant="accent" title="Card Destaque (Accent)">
                    <p className="text-xs leading-relaxed">
                      Possui borda acentuada com base no tema selecionado (Ouro para Barbearias, Violeta para Salão de Beleza).
                    </p>
                  </Card>
                  <Card variant="glow" title="Card com Brilho (Glow)">
                    <p className="text-xs leading-relaxed">
                      Usado para cards que necessitam de máxima atenção do usuário, como promoções, alertas de assinatura expirando, etc.
                    </p>
                  </Card>
                </div>
              </div>

              {/* Tabela de Dados */}
              <Card
                title="Tabela de Dados (Table)"
                action={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<RotateCcw />}
                      onClick={() => setUsersData(MOCK_USERS)}
                    >
                      Resetar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 />}
                      onClick={() => setUsersData([])}
                    >
                      Esvaziar
                    </Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary">
                    Tabela com dados genéricos tipados. Suporta clique na linha, renderização customizada para mobile e teclado.
                  </p>

                  <Table
                    columns={columns}
                    data={usersData}
                    rowKey={(user) => user.id}
                    onRowClick={(user) => setSelectedUser(user)}
                    emptyMessage="Nenhum usuário cadastrado neste preview de testes."
                    mobileRender={(user) => (
                      <div className="p-4 border rounded-xl bg-theme-surface space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{user.name}</span>
                          <Badge variant={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role}</Badge>
                        </div>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-xs">Status:</span>
                          <Badge variant={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'danger'}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  />

                  {selectedUser && (
                    <div className="p-4 rounded-xl bg-theme-surface border border-[var(--color-divider)] flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-theme-textSecondary">Linha Selecionada (onClick):</p>
                        <p className="text-sm font-bold">{selectedUser.name} ({selectedUser.email})</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
                        Fechar Feedback
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-8">
              {/* Modal trigger */}
              <Card title="Modais (Diálogos Flutuantes)">
                <div className="space-y-4">
                  <p className="text-xs text-text-secondary">
                    O modal usa portal para renderizar fora do escopo do DOM local, possui armadilha de foco para acessibilidade e suporta fechamento em ESC ou clique externo.
                  </p>
                  <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                    Abrir Modal de Teste
                  </Button>
                </div>
              </Card>

              {/* Skeletons */}
              <Card title="Loading States (Skeletons)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${colors.textMuted}`}>Skeleton de Linhas / Texto</h4>
                    <Skeleton count={3} />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${colors.textMuted}`}>Skeleton de Card Completo</h4>
                    <SkeletonCard />
                  </div>
                </div>
              </Card>

              {/* Empty & Error States */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Estado Vazio (EmptyState)">
                  <EmptyState
                    icon={Search}
                    title="Nenhum resultado encontrado"
                    description="Tente refinar sua busca utilizando termos diferentes ou filtros de data."
                    action={
                      <Button size="sm" variant="outline">
                        Limpar Filtros
                      </Button>
                    }
                  />
                </Card>

                <Card title="Estado de Erro (ErrorState)">
                  <ErrorState
                    title="Falha na conexão"
                    message="Não foi possível sincronizar as alterações com o servidor. Verifique sua conexão de internet."
                    onRetry={() => alert('Simulando nova tentativa de requisição...')}
                  />
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Modal Declarativo de Teste */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Modal de Teste Acessível"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="success" onClick={() => { alert('Ação do Modal Confirmada'); setIsModalOpen(false); }}>
                Confirmar Ação
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm">
              Este modal foi renderizado através de um Portal do React no body.
            </p>
            <div className="p-4 rounded-xl bg-theme-surface border border-[var(--color-divider)] flex items-center gap-3">
              <CheckCircle className="text-emerald-400 w-8 h-8 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-theme-textSecondary">Acessibilidade Garantida</p>
                <p className="text-xs text-text-secondary">Pressione ESC para sair ou clique no fundo de overlay.</p>
              </div>
            </div>
            <Input label="Input dentro do Modal" placeholder="Foco automático e navegação por tab..." />
          </div>
        </Modal>
      </div>
    </SettingsLayout>
  );
};

