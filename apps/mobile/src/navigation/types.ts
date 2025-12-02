export type RootStackParamList = {
  Login: undefined;
  UserTypeSelect: undefined;
  ContractorRegister: undefined;
  MainTabs: undefined;
  ContractorTabs: undefined;
  PortfolioDetail: { id: string };
  PortfolioCreate: undefined;
  PortfolioEdit: { id: string };
  ContractorDetail: { id: string };
  ContractorProfileEdit: undefined;
  QuoteRequest: { contractorId: string; portfolioId?: string };
  ChatRoom: { roomId: string; recipientName: string };
  ProfileSettings: undefined;
};

export type TabParamList = {
  Feed: undefined;
  Saved: undefined;
  Simulation: undefined;
  AIChat: undefined;
  MyQuotes: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type ContractorTabParamList = {
  MyPortfolios: undefined;
  QuoteRequests: undefined;
  Chat: undefined;
  Profile: undefined;
};
