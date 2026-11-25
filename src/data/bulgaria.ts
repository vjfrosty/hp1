import { HumorousRoleId, SeasonalThemeId, VenueType } from '../types/app';

export interface CityInfo {
  name: string;
  coords: [number, number];
  neighborhoods: { name: string; coords: [number, number] }[];
}

export const BULGARIAN_CITIES: CityInfo[] = [
  {
    name: 'София',
    coords: [42.6977, 23.3219],
    neighborhoods: [
      { name: 'Лозенец', coords: [42.6776, 23.3248] },
      { name: 'Оборище', coords: [42.6968, 23.3461] },
      { name: 'Иван Вазов', coords: [42.6772, 23.3071] },
      { name: 'Младост 1', coords: [42.6525, 23.3742] },
      { name: 'Драгалевци', coords: [42.6285, 23.3105] },
      { name: 'Редута', coords: [42.6914, 23.3592] },
      { name: 'Люлин', coords: [42.7165, 23.2571] },
    ],
  },
  {
    name: 'Пловдив',
    coords: [42.1354, 24.7453],
    neighborhoods: [
      { name: 'Капана', coords: [42.1489, 24.7484] },
      { name: 'Кършияка', coords: [42.1592, 24.7418] },
      { name: 'Тракия', coords: [42.1341, 24.7834] },
      { name: 'Смирненски', coords: [42.1397, 24.7162] },
    ],
  },
  {
    name: 'Варна',
    coords: [43.2141, 27.9147],
    neighborhoods: [
      { name: 'Център', coords: [43.2047, 27.9147] },
      { name: 'Чайка', coords: [43.2216, 27.9344] },
      { name: 'Левски', coords: [43.2248, 27.9212] },
      { name: 'Бриз', coords: [43.2232, 27.9518] },
    ],
  },
  {
    name: 'Бургас',
    coords: [42.5048, 27.4626],
    neighborhoods: [
      { name: 'Лазур', coords: [42.5082, 27.4754] },
      { name: 'Възраждане', coords: [42.4979, 27.4651] },
      { name: 'Сарафово', coords: [42.5594, 27.5236] },
    ],
  },
  {
    name: 'Велико Търново',
    coords: [43.0757, 25.6172],
    neighborhoods: [
      { name: 'Варуша', coords: [43.0815, 25.6305] },
      { name: 'Картала', coords: [43.0868, 25.6164] },
      { name: 'Център', coords: [43.0782, 25.6295] },
    ],
  },
  {
    name: 'Стара Загора',
    coords: [42.4258, 25.6345],
    neighborhoods: [
      { name: 'Център', coords: [42.4264, 25.6251] },
      { name: 'Казански', coords: [42.4212, 25.6054] },
      { name: 'Три чучура', coords: [42.4165, 25.6022] },
    ],
  },
];

export interface RoleDefinition {
  id: HumorousRoleId;
  title: string;
  description: string;
  shortTag: string;
}

export const HUMOROUS_ROLES: Record<HumorousRoleId, RoleDefinition> = {
  grill_master: {
    id: 'grill_master',
    title: 'Майсторът на скарата',
    description: 'Идва с щипки и собствено мнение за температурата.',
    shortTag: 'Скара и жар',
  },
  chief_taster: {
    id: 'chief_taster',
    title: 'Главният дегустатор',
    description: 'Разбира от всичко, включително от ракия, която още не е опитал.',
    shortTag: 'Дегустатор',
  },
  philosopher: {
    id: 'philosopher',
    title: 'Философът',
    description: 'След 20 минути обсъжда смисъла на живота.',
    shortTag: 'Философ',
  },
  political_analyst: {
    id: 'political_analyst',
    title: 'Политическият анализатор',
    description: 'Знае как трябва да се управлява държавата.',
    shortTag: 'Анализатор',
  },
  meze_guardian: {
    id: 'meze_guardian',
    title: 'Мезеджията',
    description: 'Държи на качеството на храната и точното количество сирене.',
    shortTag: 'Мезеджия',
  },
  designated_driver: {
    id: 'designated_driver',
    title: 'Шофьорът на дружината',
    description: 'Избира безалкохолно и прибира компанията безопасно.',
    shortTag: 'Безалкохолно и транспорт',
  },
};

export const VENUE_TYPES: VenueType[] = [
  'механа',
  'кръчма',
  'двор',
  'вила',
  'домашна маса',
];

export const INTEREST_OPTIONS: string[] = [
  'Футбол',
  'Политика',
  'Автомобили',
  'Технологии',
  'Риболов',
  'Философия',
  'Планина',
  'История',
  'Домашно готвене',
  'Музика на живо',
];

export const MEZE_PREFERENCES: string[] = [
  'Шопска салата',
  'Овче сирене',
  'Домашна туршия',
  'Луканка и суджук',
  'Печени чушки с чесън',
  'Скара на дървени въглища',
  'Кьопоолу',
  'Кашкавал на плоча',
];

export const SAMPLE_EVENT_TITLES: string[] = [
  'Извънредно заседание на Съвета',
  'Петъчна комисия по важните въпроси',
  'Дегустация с непредвиден дневен ред',
  'Шопската салата няма да се изяде сама',
  'Събираме се да оправим държавата',
  'Оперативка край скарата (без презентации)',
];

export const HUMOROUS_EXCUSES: string[] = [
  'Жената има други планове.',
  'Детето има домашно. Аз също.',
  'В служебна командировка до дивана.',
  'Утре ставам рано, за съжаление.',
  'Ще обясня на следващото заседание.',
];

export const DAILY_TOASTS: string[] = [
  'За приятелите, които идват навреме, и за останалите, които поне носят мезе!',
  'Да сме живи и здрави, че проблемите и утре ще ни чакат!',
  'Наздраве за хубавата компания и за кратките служебни срещи!',
  'Не е важно колко е пълна чашата, важно е около масата да няма празни приказки!',
  'За майстора на салатата — без него държавата щеше да остане неоправена!',
  'За шофьора на дружината — най-ценният човек след 23:00 ч.!',
  'Да ни върви разговорът гладко, а скарата — точно на жар!',
];

export const SECRET_AGENDA_TOPICS: string[] = [
  'Кой български футболен отбор е най-велик и защо спорът никога не приключва?',
  'Може ли човек да построи къща само с клипове от YouTube?',
  'Защо всеки познава най-добрия майстор, който никога няма време?',
  'Кой е най-добрият начин за печене на кебапче — обръщане веднъж или постоянно?',
  'Наистина ли всичко беше по-качествено преди 20 години или просто паметта ни е любезна?',
  'Колко точно сирене прави една шопска салата достойна за уважение?',
  'Ако дружината управляваше общината за една седмица, какво щяхме да оправим първо?',
];

export const CHAT_STICKERS: { id: string; label: string; symbol: string }[] = [
  { id: 'clink', label: 'Наздраве!', symbol: '🥂' },
  { id: 'salad', label: 'Салатата е готова', symbol: '🥗' },
  { id: 'grill', label: 'Жарта тръгна', symbol: '🔥' },
  { id: 'stamp', label: 'КВОРУМ!', symbol: '✅' },
  { id: 'late', label: 'На 15 мин съм', symbol: '🏃' },
  { id: 'driver', label: 'На безалкохолно', symbol: '🚗' },
];

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  metricLabel: string;
}

export const HONOR_BADGES: BadgeDef[] = [
  {
    id: 'organizer_5',
    title: 'Почетен свиквач',
    description: 'Организирал 5 или повече приятелски сбирки без провал.',
    metricLabel: '5+ сбирки',
  },
  {
    id: 'meze_promise',
    title: 'Почетен мезеджия',
    description: 'Донесъл обещаното мезе точно както е записано в списъка.',
    metricLabel: '100% изпълнени задачи',
  },
  {
    id: 'punctual_rsvp',
    title: 'Желязна дума',
    description: 'Винаги потвърждава навреме и не изчезва в петък следобед.',
    metricLabel: 'Без тихо отказване',
  },
  {
    id: 'cleanup_hero',
    title: 'Боец по разтребването',
    description: 'Помогнал за почистването след сбирката на вилата или у дома.',
    metricLabel: 'Чиста маса',
  },
  {
    id: 'welcomer',
    title: 'Добър домакин',
    description: 'Посрещнал нов участник в дружината и го включил в разговора.',
    metricLabel: 'Нови приятелства',
  },
];

export interface SeasonalThemeDef {
  id: SeasonalThemeId;
  name: string;
  subtitle: string;
  accentHex: string;
}

export const SEASONAL_THEMES: Record<SeasonalThemeId, SeasonalThemeDef> = {
  classic: {
    id: 'classic',
    name: 'Класическа вечер',
    subtitle: 'Шопска, добра дума и спокойна маса',
    accentHex: '#1C4532',
  },
  trifon: {
    id: 'trifon',
    name: 'Трифон Зарезан',
    subtitle: 'Лозя, червено вино, мезе и старозаветни наздравици',
    accentHex: '#7C232B',
  },
  winter_turshiya: {
    id: 'winter_turshiya',
    name: 'Зимна туршия и камина',
    subtitle: 'Царска туршия, домашен суджук и дълги вечери край огъня',
    accentHex: '#8A4F1E',
  },
  summer_garden: {
    id: 'summer_garden',
    name: 'Лятна асма и скара',
    subtitle: 'Двор, студена вода, домати от градината и жар на открито',
    accentHex: '#2B5B3B',
  },
};

export const DEFAULT_MEZE_TASKS: { item: string; category: 'салата' | 'мезе' | 'скара' | 'напитки' | 'логистика' }[] = [
  { item: 'Шопска салата', category: 'салата' },
  { item: 'Овче сирене', category: 'мезе' },
  { item: 'Домашна туршия', category: 'мезе' },
  { item: 'Скара и месо', category: 'скара' },
  { item: 'Топъл хляб', category: 'мезе' },
  { item: 'Вода и безалкохолни напитки', category: 'напитки' },
  { item: 'Чинии, чаши, салфетки', category: 'логистика' },
  { item: 'Музика и плейлист', category: 'логистика' },
];
