export const EVENT_CATEGORY_GROUPS = [
  {
    group: "Fetes & Parties",
    options: [
      { label: "All-inclusive fete", value: "all_inclusive_fete" },
      { label: "Cooler fete", value: "cooler_fete" },
      { label: "Breakfast fete", value: "breakfast_fete" },
      { label: "J'Ouvert", value: "jouvert" },
      { label: "Beach party", value: "beach_party" },
      { label: "Pool party", value: "pool_party" },
      { label: "Birthday party", value: "birthday_party" },
      { label: "Private event", value: "private_event" },
    ],
  },
  {
    group: "Concerts & Music",
    options: [
      { label: "Soca/Carnival", value: "soca_carnival" },
      { label: "Reggae/Dancehall", value: "reggae_dancehall" },
      { label: "Jazz", value: "jazz" },
      { label: "Gospel", value: "gospel" },
      { label: "Steelpan", value: "steelpan" },
      { label: "Live band night", value: "live_band_night" },
      { label: "Open mic", value: "open_mic" },
    ],
  },
  {
    group: "Food & Drink",
    options: [
      { label: "Food fair", value: "food_fair" },
      { label: "Rum tasting", value: "rum_tasting" },
      { label: "Food festival", value: "food_festival" },
      { label: "Pop-up dining", value: "popup_dining" },
      { label: "Cooking class", value: "cooking_class" },
      { label: "Wine tasting", value: "wine_tasting" },
    ],
  },
  {
    group: "Cultural & Community",
    options: [
      { label: "Mas band launch", value: "mas_band_launch" },
      { label: "Cultural festival", value: "cultural_festival" },
      { label: "Art exhibition", value: "art_exhibition" },
      { label: "Fashion show", value: "fashion_show" },
      { label: "Heritage event", value: "heritage_event" },
      { label: "Religious/church", value: "religious_church" },
    ],
  },
  {
    group: "Sports & Fitness",
    options: [
      { label: "Sports tournament", value: "sports_tournament" },
      { label: "Marathon", value: "marathon" },
      { label: "Fitness event", value: "fitness_event" },
      { label: "Water sports", value: "water_sports" },
      { label: "Cricket/football", value: "cricket_football" },
    ],
  },
  {
    group: "Business & Professional",
    options: [
      { label: "Networking event", value: "networking_event" },
      { label: "Conference", value: "conference" },
      { label: "Workshop/training", value: "workshop_training" },
      { label: "Awards ceremony", value: "awards_ceremony" },
      { label: "Product launch", value: "product_launch" },
    ],
  },
  {
    group: "Kids & Family",
    options: [
      { label: "Children's party", value: "childrens_party" },
      { label: "Family fun day", value: "family_fun_day" },
      { label: "School event", value: "school_event" },
      { label: "Story time", value: "story_time" },
    ],
  },
  {
    group: "Other",
    options: [
      { label: "Fundraiser/charity", value: "fundraiser_charity" },
      { label: "Comedy show", value: "comedy_show" },
      { label: "Theatre/performance", value: "theatre_performance" },
      { label: "Market/fair", value: "market_fair" },
    ],
  },
];

export function eventCategoryLabel(value: string | null) {
  if (!value) return "Local event";
  return EVENT_CATEGORY_GROUPS.flatMap(group => group.options).find(option => option.value === value)?.label ?? value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
