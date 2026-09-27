import { catalogueCategories } from "@/lib/catalog/categories";
type CategoryItem = { value: string; label: string; emoji: string };
type CategoryGroup = { group: string; items: CategoryItem[] };
const groups = [
  {group:"Food & Hospitality",emoji:"🍽️",match:/food|bakery|bar_|restaurant|cafe|catering|grocery|hotel|hospitality|fishery/},
  {group:"Retail & Products",emoji:"🛍️",match:/retail|fashion|jewellery_accessories|electronics_tech|books|toys|furniture|supplies|pharmacy|hardware/},
  {group:"Events, Culture & Community",emoji:"🎭",match:/event|music|entertainment|arts|carnival|church|religious|ngo/},
  {group:"Services & Professional",emoji:"✨",match:/.*/},
];
export const STORE_CATEGORY_GROUPS: CategoryGroup[] = groups.map((group,index)=>({group:group.group,items:catalogueCategories("stores").filter(item=>groups.findIndex(g=>g.match.test(item.value))===index).map(item=>({...item,emoji:group.emoji}))}));
