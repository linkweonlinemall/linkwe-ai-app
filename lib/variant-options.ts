export const COLOUR_OPTIONS = [
  { value: "black", label: "Black", hex: "#000000" },
  { value: "white", label: "White", hex: "#FFFFFF" },
  { value: "red", label: "Red", hex: "#EF4444" },
  { value: "orange", label: "Orange", hex: "#F97316" },
  { value: "yellow", label: "Yellow", hex: "#EAB308" },
  { value: "green", label: "Green", hex: "#22C55E" },
  { value: "blue", label: "Blue", hex: "#3B82F6" },
  { value: "navy", label: "Navy", hex: "#1E3A5F" },
  { value: "purple", label: "Purple", hex: "#A855F7" },
  { value: "pink", label: "Pink", hex: "#EC4899" },
  { value: "brown", label: "Brown", hex: "#92400E" },
  { value: "grey", label: "Grey", hex: "#6B7280" },
  { value: "silver", label: "Silver", hex: "#C0C0C0" },
  { value: "gold", label: "Gold", hex: "#D4AF37" },
  { value: "beige", label: "Beige", hex: "#F5F5DC" },
  { value: "cream", label: "Cream", hex: "#FFFDD0" },
  { value: "maroon", label: "Maroon", hex: "#800000" },
  { value: "teal", label: "Teal", hex: "#14B8A6" },
  { value: "coral", label: "Coral", hex: "#FF6B6B" },
  { value: "mint", label: "Mint", hex: "#98FF98" },
  { value: "lavender", label: "Lavender", hex: "#E6E6FA" },
  { value: "turquoise", label: "Turquoise", hex: "#40E0D0" },
  {
    value: "multicolour",
    label: "Multicolour",
    hex: "linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #0000ff)",
  },
];

export const SIZE_OPTIONS = {
  clothing: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  shoes: ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13"],
  kids_clothing: ["0-3M", "3-6M", "6-12M", "1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "10Y", "12Y"],
  ring: ["5", "6", "7", "8", "9", "10", "11", "12"],
  general: ["XS", "S", "M", "L", "XL", "XXL"],
} as const;

export const MATERIAL_OPTIONS = [
  "Cotton",
  "Polyester",
  "Linen",
  "Silk",
  "Wool",
  "Denim",
  "Leather",
  "Suede",
  "Velvet",
  "Nylon",
  "Spandex",
  "Rayon",
  "Bamboo",
  "Canvas",
  "Mesh",
  "Fleece",
  "Cashmere",
  "Satin",
  "Chiffon",
  "Tweed",
  "Stainless Steel",
  "Gold Plated",
  "Silver",
  "Brass",
  "Titanium",
  "Wood",
  "Plastic",
  "Rubber",
  "Glass",
  "Ceramic",
  "Acrylic",
];

export const STYLE_OPTIONS = [
  "Casual",
  "Formal",
  "Smart Casual",
  "Streetwear",
  "Vintage",
  "Bohemian",
  "Minimalist",
  "Athletic",
  "Business",
  "Party",
  "Beach",
  "Traditional",
  "Modern",
  "Classic",
  "Slim Fit",
  "Regular Fit",
  "Oversized",
  "Cropped",
];

export const PATTERN_OPTIONS = [
  "Solid",
  "Striped",
  "Plaid",
  "Floral",
  "Abstract",
  "Geometric",
  "Animal Print",
  "Camouflage",
  "Tie Dye",
  "Polka Dot",
  "Checkered",
  "Paisley",
  "Graphic Print",
  "Logo",
  "Plain",
];

export const FIT_OPTIONS = [
  "Slim Fit",
  "Regular Fit",
  "Relaxed Fit",
  "Oversized",
  "Fitted",
  "Loose",
  "Skinny",
  "Straight",
  "Wide Leg",
  "Tapered",
];

export const LENGTH_OPTIONS = [
  "Mini",
  "Knee Length",
  "Midi",
  "Maxi",
  "Full Length",
  "Cropped",
  "Short",
  "Medium",
  "Long",
  "Extra Long",
];

export const GENDER_OPTIONS = ["Men", "Women", "Unisex", "Boys", "Girls", "Kids"];

export const AGE_GROUP_OPTIONS = [
  "Baby (0-2)",
  "Toddler (2-4)",
  "Kids (4-8)",
  "Tweens (8-12)",
  "Teens (12-16)",
  "Adults",
  "Seniors",
];

export const SCENT_OPTIONS = [
  "Unscented",
  "Floral",
  "Fruity",
  "Woody",
  "Musky",
  "Fresh",
  "Citrus",
  "Vanilla",
  "Ocean",
  "Lavender",
  "Rose",
  "Jasmine",
  "Sandalwood",
  "Mint",
  "Spicy",
];

export const FLAVOUR_OPTIONS = [
  "Original",
  "Chocolate",
  "Vanilla",
  "Strawberry",
  "Mango",
  "Pineapple",
  "Coconut",
  "Lime",
  "Orange",
  "Grape",
  "Watermelon",
  "Mixed Berry",
  "Passion Fruit",
  "Unflavoured",
  "Spicy",
  "Salty",
  "Sweet",
  "Sour",
  "Bitter",
];

export const VOLUME_OPTIONS = [
  "50ml",
  "100ml",
  "150ml",
  "200ml",
  "250ml",
  "300ml",
  "500ml",
  "750ml",
  "1L",
  "1.5L",
  "2L",
  "5L",
];

export const WEIGHT_AMOUNT_OPTIONS = ["100g", "200g", "250g", "500g", "750g", "1kg", "2kg", "5kg", "10kg", "25kg", "50kg"];

export const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"];

export const RAM_OPTIONS = ["4GB", "8GB", "16GB", "32GB", "64GB"];

export const WATTAGE_OPTIONS = ["500W", "750W", "1000W", "1500W", "2000W", "2500W", "3000W"];

export const PACK_SIZE_OPTIONS = [
  "Single",
  "Pack of 2",
  "Pack of 3",
  "Pack of 4",
  "Pack of 5",
  "Pack of 6",
  "Pack of 10",
  "Pack of 12",
  "Pack of 24",
  "Bulk",
];

export const CONNECTIVITY_OPTIONS = [
  "Wired",
  "Wireless",
  "Bluetooth",
  "WiFi",
  "USB-C",
  "USB-A",
  "Lightning",
  "HDMI",
  "3.5mm",
];

// Master attribute registry
export const ATTRIBUTE_REGISTRY = [
  { key: "colour", label: "Colour", type: "colour" as const },
  { key: "size", label: "Size", type: "size" as const },
  { key: "material", label: "Material", type: "list" as const, options: MATERIAL_OPTIONS },
  { key: "style", label: "Style", type: "list" as const, options: STYLE_OPTIONS },
  { key: "pattern", label: "Pattern", type: "list" as const, options: PATTERN_OPTIONS },
  { key: "fit", label: "Fit", type: "list" as const, options: FIT_OPTIONS },
  { key: "length", label: "Length", type: "list" as const, options: LENGTH_OPTIONS },
  { key: "gender", label: "Gender", type: "list" as const, options: GENDER_OPTIONS },
  { key: "age_group", label: "Age Group", type: "list" as const, options: AGE_GROUP_OPTIONS },
  { key: "scent", label: "Scent", type: "list" as const, options: SCENT_OPTIONS },
  { key: "flavour", label: "Flavour", type: "list" as const, options: FLAVOUR_OPTIONS },
  { key: "volume", label: "Volume", type: "list" as const, options: VOLUME_OPTIONS },
  { key: "weight_amount", label: "Weight", type: "list" as const, options: WEIGHT_AMOUNT_OPTIONS },
  { key: "storage", label: "Storage", type: "list" as const, options: STORAGE_OPTIONS },
  { key: "ram", label: "RAM", type: "list" as const, options: RAM_OPTIONS },
  { key: "wattage", label: "Wattage", type: "list" as const, options: WATTAGE_OPTIONS },
  { key: "pack_size", label: "Pack Size", type: "list" as const, options: PACK_SIZE_OPTIONS },
  { key: "connectivity", label: "Connectivity", type: "list" as const, options: CONNECTIVITY_OPTIONS },
  { key: "custom", label: "Custom", type: "custom" as const },
];

export type AttributeType = "colour" | "size" | "list" | "custom";

export type VariantAttribute = {
  name: string;
  value: string;
  hex?: string;
};

export type VariantInput = {
  attributes: VariantAttribute[];
  price?: number;
  stock?: number;
  sku?: string;
  images?: string[];
};

export type ColourOption = (typeof COLOUR_OPTIONS)[number];
export type SizeType = keyof typeof SIZE_OPTIONS;
