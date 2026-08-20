/**
 * Seed portfolio — invented but plausible Swedish builder projects, 2026.
 * Designed so the synergy engine lights up on first load.
 */

export const SEED_PROJECTS = [
  {
    id: 'lindangen',
    namn: 'Kvarteret Lindängen',
    typ: 'bostäder',
    plats: 'Malmö',
    status: 'produktion',
    yta_m2: 12400,
    budget_sek: 186_000_000,
    kostnad_sek: 192_400_000,
    start: '2026-02-01',
    slut: '2027-06-30',
    besättning: 42,
    kompetens: ['stomme', 'el', 'VS', 'plattsättning', 'mark'],
    leverantörer: ['Peab Material', 'Heidelberg Materials', 'NCC Industry'],
    material: ['betong', 'armering', 'tegel', 'fönster'],
    anteckningar:
      'Hyresrätter i tre lameller mot Lindängelund. Stomme i platsgjuten betong, fasad i tegel. Produktion igång; armeringspriserna har dragit upp kostnaden mot budget. Etablering delas inte med andra uppdrag i Skåne just nu.',
  },
  {
    id: 'jarntorget',
    namn: 'Kontor Järntorget',
    typ: 'kontor',
    plats: 'Göteborg',
    status: 'kalkyl',
    yta_m2: 6800,
    budget_sek: 142_000_000,
    kostnad_sek: 138_500_000,
    start: '2026-04-15',
    slut: '2027-03-31',
    besättning: 28,
    kompetens: ['stomme', 'el', 'VS', 'ventilation'],
    leverantörer: ['Ahlsell', 'Beijer Byggmaterial', 'Skanska Prefab'],
    material: ['stål', 'glas', 'gips', 'kabel'],
    anteckningar:
      'Om- och tillbyggnad av kontor mot Järntorget. Stålstomme med glasfasad mot gatan. Kalkylen ligger något under budget tack vare prefab-avtal. El, VS och ventilation kan samordnas med ROT-uppdraget på Föreningsgatan.',
  },
  {
    id: 'sparvag-norra',
    namn: 'Spårväg Norra',
    typ: 'infrastruktur',
    plats: 'Solna',
    status: 'produktion',
    yta_m2: 18500,
    budget_sek: 890_000_000,
    kostnad_sek: 974_000_000,
    start: '2026-01-15',
    slut: '2027-12-15',
    besättning: 86,
    kompetens: ['mark', 'spår', 'el', 'VA'],
    leverantörer: ['NCC Industry', 'Heidelberg Materials', 'Siemens Mobility'],
    material: ['betong', 'räls', 'ballast', 'kabel'],
    anteckningar:
      'Spårvägsutbyggnad genom Solna mot Stockholmsgränsen. Mark- och VA-arbeten i produktion. Kostnadsavvikelsen överstiger 8 % — främst bergschakt och rälsleverans. Sträckan förbättrar tillgängligheten för ny bostadsbebyggelse i Hammarby och kringliggande noder.',
  },
  {
    id: 'hammarby-kaj',
    namn: 'BRF Hammarby Kaj',
    typ: 'bostäder',
    plats: 'Stockholm',
    status: 'utredning',
    yta_m2: 9200,
    budget_sek: 248_000_000,
    kostnad_sek: 251_200_000,
    start: '2026-06-01',
    slut: '2028-02-28',
    besättning: 36,
    kompetens: ['stomme', 'el', 'VS', 'plattsättning', 'mark'],
    leverantörer: ['Peab Material', 'Ahlsell', 'S:t Eriks'],
    material: ['betong', 'tegel', 'fönster', 'kabel'],
    anteckningar:
      'Bostadsrättskvarter mot Hammarby sjö. Utredningsskede: detaljplan och stomval. Markarbeten kan samordnas med dagvattenparken i Årsta. Nyttan av spårvägsutbyggnaden i Solna bör räknas in i lägesvärdet.',
  },
  {
    id: 'rot-foreningsgatan',
    namn: 'ROT Föreningsgatan',
    typ: 'ROT',
    plats: 'Göteborg',
    status: 'produktion',
    yta_m2: 3100,
    budget_sek: 28_400_000,
    kostnad_sek: 26_100_000,
    start: '2026-03-01',
    slut: '2026-11-30',
    besättning: 14,
    kompetens: ['el', 'VS', 'plattsättning', 'ventilation'],
    leverantörer: ['Ahlsell', 'Beijer Byggmaterial'],
    material: ['gips', 'kabel', 'kakel', 'rör'],
    anteckningar:
      'Stambyte och badrumsrenovering i tre trapphus på Föreningsgatan. Ligger under budget. Samma el- och VS-grossist som kontorsprojektet vid Järntorget — samordnat inköp och delad besättning är realistiskt under 2026.',
  },
  {
    id: 'dagvattenpark-arsta',
    namn: 'Dagvattenpark Årsta',
    typ: 'anläggning',
    plats: 'Stockholm',
    status: 'kalkyl',
    yta_m2: 22000,
    budget_sek: 47_500_000,
    kostnad_sek: 49_200_000,
    start: '2026-05-01',
    slut: '2026-12-20',
    besättning: 18,
    kompetens: ['mark', 'VA', 'plantering'],
    leverantörer: ['S:t Eriks', 'NCC Industry'],
    material: ['betong', 'makadam', 'jord', 'växter'],
    anteckningar:
      'Fördröjnings- och reningspark i Årsta, gångavstånd till Hammarby. Mark- och VA-kompetens överlappar spårvägsprojektet i Solna. Betong och marksten från S:t Eriks kan samordnas med BRF Hammarby Kaj.',
  },
];

export const TYP_LABEL = {
  bostäder: 'Bostäder',
  kontor: 'Kontor',
  infrastruktur: 'Infrastruktur',
  ROT: 'ROT',
  anläggning: 'Anläggning',
};

export const STATUS_LABEL = {
  utredning: 'Utredning',
  kalkyl: 'Kalkyl',
  produktion: 'Produktion',
  klart: 'Klart',
};

export const TYP_OPTIONS = ['bostäder', 'kontor', 'infrastruktur', 'ROT', 'anläggning'];
export const STATUS_OPTIONS = ['utredning', 'kalkyl', 'produktion', 'klart'];

export const KOMPETENS_SUGGESTIONS = [
  'mark',
  'stomme',
  'el',
  'VS',
  'VA',
  'plattsättning',
  'ventilation',
  'spår',
  'plantering',
];
