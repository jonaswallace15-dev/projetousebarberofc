export interface TourStep {
  id: string;
  page: string;
  selector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  pulse?: boolean; // blink ring on element
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'settings-name',
    page: '/settings',
    selector: '[data-tour="settings-name"]',
    title: 'Nome da Barbearia',
    description: 'Comece digitando o nome do seu estabelecimento aqui. Ele vai aparecer para os clientes na página de agendamento.',
    position: 'bottom',
    pulse: true,
  },
  {
    id: 'settings-slug',
    page: '/settings',
    selector: '[data-tour="settings-slug"]',
    title: 'Seu Link Público',
    description: 'Este é o endereço que seus clientes vão acessar para agendar. Ex: usebarber.site/minha-barbearia. Escolha algo simples e fácil de lembrar.',
    position: 'bottom',
    pulse: true,
  },
  {
    id: 'settings-save',
    page: '/settings',
    selector: '[data-tour="settings-save"]',
    title: 'Salvar Configurações',
    description: 'Clique aqui para salvar tudo que você preencheu. Faça isso sempre que alterar qualquer informação.',
    position: 'bottom',
    pulse: true,
  },
  {
    id: 'services-add',
    page: '/services',
    selector: '[data-tour="services-add"]',
    title: 'Adicionar Serviços',
    description: 'Clique aqui para cadastrar seus serviços — corte, barba, sobrancelha etc. Você precisa ter pelo menos 1 serviço para que os clientes consigam agendar.',
    position: 'bottom',
    pulse: true,
  },
  {
    id: 'team-add',
    page: '/team',
    selector: '[data-tour="team-add"]',
    title: 'Cadastrar Profissionais',
    description: 'Clique aqui para adicionar os barbeiros. Cada profissional tem seus próprios horários — sem barbeiro cadastrado, nenhum horário vai aparecer no agendamento.',
    position: 'bottom',
    pulse: true,
  },
];

export const TOUR_STORAGE_KEY = 'ub_tour_step';
export const TOUR_DONE_KEY = 'ub_tour_done';
