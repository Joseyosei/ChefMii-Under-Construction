// ChefMii prototype catalogue. ALL CHEFS ARE DEMO PROFILES (not real people or bookings).
export const FEE = 0.15;

export const AREAS = {
  'East London': ['E', 'IG', 'RM'],
  'South London': ['SE', 'SW', 'CR', 'BR'],
  'North London': ['N', 'NW', 'EN', 'HA'],
  'West London': ['W', 'UB', 'TW'],
  'Central London': ['EC', 'WC']
};

// Neighbourhood names mapped to areas (used when no postcode is typed)
export const PLACES = {
  'East London': ['stratford', 'ilford', 'barking', 'dagenham', 'east ham', 'west ham', 'plaistow', 'leyton', 'walthamstow', 'hackney', 'bow', 'romford', 'canning town', 'beckton', 'forest gate', 'newham'],
  'South London': ['peckham', 'lewisham', 'croydon', 'brixton', 'woolwich', 'thamesmead', 'catford', 'camberwell', 'deptford', 'greenwich', 'sydenham', 'thornton heath', 'streatham', 'elephant', 'southwark', 'old kent road', 'bromley', 'eltham', 'abbey wood', 'plumstead', 'erith'],
  'North London': ['tottenham', 'edmonton', 'enfield', 'wood green', 'finsbury park', 'holloway', 'harlesden', 'wembley', 'kilburn', 'hendon', 'colindale', 'islington', 'camden', 'harrow'],
  'West London': ['hammersmith', 'shepherd', 'ealing', 'acton', 'southall', 'hounslow', 'hayes', 'uxbridge', 'notting hill', 'white city'],
  'Central London': ['city', 'holborn', 'soho', 'westminster', 'mayfair']
};

export const CHEFS = [
  {
    id: 'aisha', name: 'Chef Aisha', cuisine: ['Nigerian'], area: 'East London', rating: 4.9, reviews: 27, min: 10,
    photo: 'assets/chefs/aisha.jpg', video: 'assets/video/aisha.mp4', poster: 'assets/video/aisha_poster.jpg', cooking: 'assets/chefs/aisha_cooking.jpg', tone: '#B9481E',
    tags: ['halal on request', 'vegetarian options'],
    bio: 'Yoruba home cooking made for big tables. Known for smoky party jollof, peppered chicken and asun at birthdays and naming ceremonies across East London.',
    dishes: ['Party jollof', 'Asun', 'Moi moi', 'Puff-puff'],
    occasions: ['Birthday', 'Naming ceremony', 'Graduation'],
    menus: [
      { img: 'assets/menus/aisha_0.jpg', n: 'Naming Ceremony Feast', p: 34, items: ['Small chops: puff-puff, spring rolls, peppered wings', 'Smoky party jollof with grilled chicken', 'Moi moi and fried plantain', 'Zobo to drink'] },
      { img: 'assets/menus/aisha_1.jpg', n: 'Owambe Birthday Party', p: 38, items: ['Live asun and suya station', 'Jollof and fried rice', 'Peppered turkey', 'Chin chin and fruit'] }
    ]
  },
  {
    id: 'james', name: 'Chef James', cuisine: ['Ghanaian'], area: 'South London', rating: 4.8, reviews: 31, min: 12,
    photo: 'assets/chefs/james.jpg', video: 'assets/video/james.mp4', poster: 'assets/video/james_poster.jpg', cooking: 'assets/chefs/james_cooking.jpg', clip: 'assets/video/james_cooking.mp4', clipPoster: 'assets/video/james_cooking_poster.jpg', clipCaption: 'Shaping banku, with grilled tilapia', tone: '#7A3B1F',
    tags: ['vegetarian options'],
    bio: 'Trained in hotel kitchens, cooks the Ghana he grew up with in Accra: waakye, banku and tilapia, kelewele and proper shito, for parties of 12 to 40.',
    dishes: ['Waakye', 'Banku and tilapia', 'Kelewele', 'Ghana jollof'],
    occasions: ['Birthday', 'Engagement', 'Christmas or New Year'],
    menus: [
      { img: 'assets/menus/james_0.jpg', n: 'Accra Sunday Spread', p: 30, items: ['Waakye with gari, spaghetti and egg', 'Beef and fish stew', 'Kelewele', 'Homemade shito'] },
      { img: 'assets/menus/james_1.jpg', n: 'Engagement Celebration', p: 42, items: ['Ghana jollof with grilled chicken', 'Banku with grilled tilapia', 'Kelewele and plantain chips', 'Sobolo to drink'] }
    ]
  },
  {
    id: 'fatmata', name: 'Chef Fatmata', cuisine: ['Sierra Leonean'], area: 'East London', rating: 5.0, reviews: 9, min: 8,
    photo: 'assets/chefs/fatmata.jpg', video: 'assets/video/fatmata.mp4', poster: 'assets/video/fatmata_poster.jpg', cooking: 'assets/chefs/fatmata_cooking.jpg', clip: 'assets/video/fatmata_cooking.mp4', clipPoster: 'assets/video/fatmata_cooking_poster.jpg', clipCaption: 'Stirring cassava leaf stew', tone: '#3E6B3A',
    tags: ['halal on request', 'nut-free menu available'],
    bio: 'Salone home cooking with a modern touch: cassava leaf, groundnut soup and fry-fry for smaller family celebrations.',
    dishes: ['Cassava leaf', 'Groundnut soup', 'Salone jollof', 'Ginger beer'],
    occasions: ['Birthday', 'Naming ceremony', 'Other'],
    menus: [
      { img: 'assets/menus/fatmata_0.jpg', n: 'Salone Family Table', p: 30, items: ['Cassava leaf with rice', 'Groundnut soup with chicken (nut-free version available)', 'Fried plantain and fish', 'Homemade ginger beer'] }
    ]
  },
  {
    id: 'kofi', name: 'Chef Kofi', cuisine: ['Ghanaian', 'Nigerian'], area: 'North London', rating: 4.7, reviews: 14, min: 15,
    photo: 'assets/chefs/kofi.jpg', video: 'assets/video/kofi.mp4', poster: 'assets/video/kofi_poster.jpg', cooking: 'assets/chefs/kofi_cooking.jpg', clip: 'assets/video/kofi_cooking.mp4', clipPoster: 'assets/video/kofi_cooking_poster.jpg', clipCaption: 'Glazing suya-spiced chicken wings', tone: '#8C5A1E',
    tags: ['vegetarian options'],
    bio: 'Mixes Ghanaian and Nigerian classics, so both families feel at home. Popular for engagements and graduations.',
    dishes: ['Jollof both ways', 'Suya wings', 'Banku', 'Meat pies'],
    occasions: ['Engagement', 'Graduation', 'Birthday'],
    menus: [
      { img: 'assets/menus/kofi_0.jpg', n: 'Two Families Engagement Menu', p: 42, items: ['Ghanaian and Nigerian jollof side by side', 'Banku with grilled tilapia', 'Suya chicken wings', 'Chin chin and fruit platter'] },
      { img: 'assets/menus/kofi_1.jpg', n: 'Graduation Buffet', p: 29, items: ['Fried rice and jollof', 'Peppered chicken', 'Coleslaw and plantain', 'Meat pies'] }
    ]
  },
  {
    id: 'adaeze', name: 'Chef Adaeze', cuisine: ['Nigerian'], area: 'West London', rating: 4.9, reviews: 18, min: 10,
    photo: 'assets/chefs/adaeze.jpg', video: 'assets/video/adaeze.mp4', poster: 'assets/video/adaeze_poster.jpg', cooking: 'assets/chefs/adaeze_cooking.jpg', tone: '#5B2A6B',
    tags: ['vegetarian options', 'vegan options'],
    bio: 'Igbo kitchen specialist: nkwobi, ofe onugbu and abacha for Christmas and family celebrations, with vegetarian and vegan versions.',
    dishes: ['Nkwobi', 'Ofe onugbu', 'Abacha', 'Vegetable stew'],
    occasions: ['Christmas or New Year', 'Birthday', 'Naming ceremony'],
    menus: [
      { img: 'assets/menus/adaeze_0.jpg', n: 'Igbo Christmas Feast', p: 40, items: ['Nkwobi starter', 'Ofe onugbu with fufu', 'Jollof with turkey', 'Abacha salad'] },
      { img: 'assets/menus/adaeze_1.jpg', n: 'Plant-based Naija Table', p: 32, items: ['Vegetable jollof', 'Efo riro with tofu', 'Moi moi', 'Fried plantain'] }
    ]
  },
  {
    id: 'tunde', name: 'Chef Tunde', cuisine: ['Nigerian'], area: 'South London', rating: 4.8, reviews: 22, min: 15,
    photo: 'assets/chefs/tunde.jpg', video: 'assets/video/tunde.mp4', poster: 'assets/video/tunde_poster.jpg', cooking: 'assets/chefs/tunde_cooking.jpg', tone: '#9A2F1A',
    tags: ['halal on request'],
    bio: 'Former Lagos restaurant chef. Brings the full owambe: suya station, pounded yam and rich soups, served hot at your home.',
    dishes: ['Suya', 'Pounded yam and egusi', 'Ofada rice', 'Asun'],
    occasions: ['Birthday', 'Graduation', 'Engagement'],
    menus: [
      { img: 'assets/menus/tunde_0.jpg', n: 'Swallow and Soup Night', p: 34, items: ['Pounded yam and amala', 'Egusi and efo riro', 'Assorted meat and fish', 'Zobo to drink'] },
      { img: 'assets/menus/tunde_1.jpg', n: 'Suya Party', p: 36, items: ['Live suya station with yaji and onions', 'Ofada rice with ayamase', 'Dodo', 'Puff-puff'] }
    ]
  }
];

export const OCCASIONS = ['Birthday', 'Naming ceremony', 'Engagement', 'Graduation', 'Christmas or New Year', 'Other'];
export const CUISINES = ['Nigerian', 'Ghanaian', 'Sierra Leonean'];

// What to eat: cuisine guidance used by the agent to recommend dishes
export const DISH_GUIDE = {
  'Naming ceremony': ['small chops', 'party jollof', 'moi moi', 'puff-puff'],
  'Birthday': ['jollof', 'suya or asun', 'fried plantain', 'chin chin'],
  'Engagement': ['jollof both ways', 'grilled tilapia', 'banku or pounded yam', 'small chops'],
  'Graduation': ['fried rice and jollof', 'peppered chicken', 'meat pies'],
  'Christmas or New Year': ['jollof with turkey', 'nkwobi or asun', 'ofe onugbu or egusi'],
  'Other': ['jollof', 'plantain', 'a soup and swallow']
};
