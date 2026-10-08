// The form, Admin Studio and Rex all use these customer expectation fields.
export const SERVICE_OFFER_FIELDS = [
  { name: "serviceInclusions", label: "What’s included", placeholder: "The work covered, number of people, materials and any exclusions." },
  { name: "serviceRequirements", label: "Before we begin", placeholder: "What the customer should prepare, bring, measure or tell you in their request." },
  { name: "serviceDeliverables", label: "What the customer receives", placeholder: "The finished result, files, follow-up support or work included in each subscription period." },
] as const;
export const SERVICE_OFFER_MAX_LENGTH = 1500;
export const SERVICE_OFFER_FIELD_NAMES = SERVICE_OFFER_FIELDS.map(field => field.name);
