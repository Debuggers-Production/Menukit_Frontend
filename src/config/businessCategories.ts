export interface BusinessCategoryConfig {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
  isFood: boolean;
  dietaryEnabled: boolean;
  icePreferenceEnabled: boolean;
  
  // Naming & Terminology
  catalogLabel: string;
  itemLabel: string;
  itemSingular: string;
  itemPlaceholder: string;
  categorySelectPlaceholder: string;
  descriptionPlaceholder: string;
  featuredBadgeLabel: string;
  addonLabel: string;
  addonDesc: string;
  addonNamePlaceholder: string;
  
  // Printer & Order Slips
  kotLabel: string;
  kotShort: string;
  kotSlipTitle: string;
  kotTabLabel: string;
  productionStationLabel: string;
  productionPrinterDesc: string;
  productionStationPlaceholder: string;
  routingDesc: string;
  settingsPrintersTabLabel: string;
  testKotButtonLabel: string;
  addKotStationButtonLabel: string;
  noKotStationsTitle: string;
  autoPrintKotLabel: string;
  autoPrintKotDesc: string;

  // Billing & Invoice Slips
  billingTabLabel: string;
  billingHeaderTitle: string;
  billingHeaderDesc: string;
  billingStationBadge: string;
  billingStationLabel: string;
  billingPrinterDesc: string;
  billingStationPlaceholder: string;
  testBillButtonLabel: string;
  addBillingPrinterButtonLabel: string;
  noBillingPrintersTitle: string;
  autoPrintBillLabel: string;
  autoPrintBillDesc: string;
  
  // Fulfillment Channels (Settings)
  dineInChannelLabel: string;
  dineInChannelDesc: string;
  takeawayChannelLabel: string;
  takeawayChannelDesc: string;
  deliveryChannelLabel: string;
  deliveryChannelDesc: string;
  
  // Channel Online Payments (Settings)
  dineInOnlinePaymentTitle: string;
  dineInOnlinePaymentDesc: string;
  takeawayOnlinePaymentTitle: string;
  takeawayOnlinePaymentDesc: string;
  deliveryOnlinePaymentTitle: string;
  deliveryOnlinePaymentDesc: string;
  
  // Public Menu & Ordering
  orderTypeDineInTitle: string;
  orderTypeDineInSubtitle: string;
  orderTypeTakeawayTitle: string;
  orderTypeTakeawaySubtitle: string;
  orderTypeDeliveryTitle: string;
  orderTypeDeliverySubtitle: string;
  tableOrStallLabel: string;
  tableOrStallPlaceholder: string;
  searchPlaceholder: string;
  welcomePrompt: string;
  
  // Order Status Terms
  prepStatusLabel: string;
  prepStatusTitle: string;
  prepStatusDesc: string;
  readyStatusLabel: string;
  orderCompletedDesc: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryConfig[] = [
  {
    id: 'restaurants_cafes_hotels',
    label: 'Restaurants, Cafes & Hotels',
    shortLabel: 'Food & Hospitality',
    description: 'Dine-in restaurants, cafes, cloud kitchens, hotels, food trucks, and bakeries.',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    isFood: true,
    dietaryEnabled: true,
    icePreferenceEnabled: true,
    
    catalogLabel: 'Food & Drinks Menu',
    itemLabel: 'Menu Items',
    itemSingular: 'Dish / Menu Item',
    itemPlaceholder: 'e.g. Chicken Biryani, Paneer Butter Masala',
    categorySelectPlaceholder: 'Select food category (e.g. Main Course, Starters)',
    descriptionPlaceholder: 'Short description of ingredients, taste or portion...',
    featuredBadgeLabel: "Chef's Special",
    addonLabel: 'Add-ons (Optional)',
    addonDesc: 'Optional extras that increase the price (e.g. Extra Cheese +20, Mayo +10)',
    addonNamePlaceholder: 'e.g. Extra Cheese, With Ice',
    
    kotLabel: 'Kitchen Order Ticket (KOT)',
    kotShort: 'KOT',
    kotSlipTitle: 'KITCHEN ORDER TICKET (KOT)',
    kotTabLabel: 'Kitchen KOT',
    productionStationLabel: 'Kitchen Printer Stations & Routing',
    productionPrinterDesc: 'Route food orders to kitchen printers (e.g., Main Kitchen, Bar, Grill, Tandoor).',
    productionStationPlaceholder: 'e.g. Main Kitchen Printer',
    routingDesc: 'All Categories (Universal - Prints All Food)',
    settingsPrintersTabLabel: 'Kitchen & Printers',
    testKotButtonLabel: 'Test Sample KOT',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Printer Stations Configured',
    autoPrintKotLabel: 'Auto-Print KOT on Acceptance',
    autoPrintKotDesc: 'Print kitchen tickets automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Tax Receipt Printers',
    billingHeaderDesc: 'Configure thermal printers for customer tax bills, invoices, and multiple billing counters.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Cashier Billing Printers & Counters',
    billingPrinterDesc: 'Configure one or multiple bill printers (e.g., Main Cashier Counter, Bar Billing, Takeaway Desk).',
    billingStationPlaceholder: 'e.g., Main Cashier Desk, Counter 2, Bar Cashier',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print bill automatically when order is paid or completed',
    
    dineInChannelLabel: 'Enable Dine-In Channel',
    dineInChannelDesc: 'Allow customers to order directly from table QR codes.',
    takeawayChannelLabel: 'Enable Takeaway Channel',
    takeawayChannelDesc: 'Allow customers to pre-order food and pick up in store.',
    deliveryChannelLabel: 'Enable Delivery Channel',
    deliveryChannelDesc: 'Allow customers to place orders for doorstep home delivery.',
    
    dineInOnlinePaymentTitle: 'Dine-In Online Payment',
    dineInOnlinePaymentDesc: 'Allow table customers to pay online directly from the QR digital menu.',
    takeawayOnlinePaymentTitle: 'Takeaway Online Payment',
    takeawayOnlinePaymentDesc: 'Allow takeaway customers to pay online before pickup.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow doorstep delivery customers to pay online through the gateway.',
    
    orderTypeDineInTitle: 'Dine-In',
    orderTypeDineInSubtitle: 'Order and eat at the restaurant table',
    orderTypeTakeawayTitle: 'Takeaway',
    orderTypeTakeawaySubtitle: 'Pick up food yourself at the counter',
    orderTypeDeliveryTitle: 'Home Delivery',
    orderTypeDeliverySubtitle: 'Delivered directly to your doorstep',
    tableOrStallLabel: 'Table Number',
    tableOrStallPlaceholder: 'e.g. Table 5',
    searchPlaceholder: 'Search dishes, drinks, desserts...',
    welcomePrompt: 'Browse our menu and order to your table or home.',
    
    prepStatusLabel: 'Preparing in Kitchen',
    prepStatusTitle: 'Preparing Food',
    prepStatusDesc: 'Chef is preparing your order in the kitchen.',
    readyStatusLabel: 'Ready for Serving / Pickup',
    orderCompletedDesc: 'Your food is ready / delivered! Enjoy your meal!',
  },
  {
    id: 'fireworks_crackers',
    label: 'Fireworks & Crackers',
    shortLabel: 'Fireworks & Retail',
    description: 'Crackers, sparklers, aerial shots, gift boxes, retail stalls, and seasonal shops.',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Products & Crackers Catalog',
    itemLabel: 'Products & Items',
    itemSingular: 'Product / Item',
    itemPlaceholder: 'e.g. 1000 Wala Garland, Electric Sparklers 15cm',
    categorySelectPlaceholder: 'Select product category (e.g. Sparklers, Aerial Shots, Gift Boxes)',
    descriptionPlaceholder: 'Product details, pieces per pack, sound rating or safety instructions...',
    featuredBadgeLabel: 'Featured / Top Brand',
    addonLabel: 'Add-ons & Accessories (Optional)',
    addonDesc: 'Optional extras or accessories (e.g. Sparkler Stand +30, Safety Matchbox +10, Gift Packing +50)',
    addonNamePlaceholder: 'e.g. Sparkler Stand, Safety Matchbox, Gift Wrap',
    
    kotLabel: 'Packing & Dispatch Slip (POT)',
    kotShort: 'Packing Slip',
    kotSlipTitle: 'PACKING & DISPATCH SLIP (POT)',
    kotTabLabel: 'Packing Slips',
    productionStationLabel: 'Packing & Godown Printer Stations',
    productionPrinterDesc: 'Route item orders to packing and dispatch desks (e.g., Main Godown, Counter 1, Dispatch Desk).',
    productionStationPlaceholder: 'e.g. Godown Packing Printer',
    routingDesc: 'All Categories (Universal - Prints All Products)',
    settingsPrintersTabLabel: 'Dispatch & Printers',
    testKotButtonLabel: 'Test Sample Slip',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Printer Stations Configured',
    autoPrintKotLabel: 'Auto-Print Packing Slip on Acceptance',
    autoPrintKotDesc: 'Print dispatch tickets automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Tax Receipt Printers',
    billingHeaderDesc: 'Configure thermal printers for customer tax bills, invoices, and multiple billing counters.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Cashier & Billing Desks',
    billingPrinterDesc: 'Configure one or multiple bill printers (e.g., Main Cashier Counter, Retail Billing Desk).',
    billingStationPlaceholder: 'e.g., Main Cashier Desk, Stall Counter 1, Dispatch Desk',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print bill automatically when order is paid or completed',
    
    dineInChannelLabel: 'Enable In-Store / Stall Channel',
    dineInChannelDesc: 'Allow walk-in customers to order directly from store or counter QR codes.',
    takeawayChannelLabel: 'Enable Store Pickup / Click & Collect',
    takeawayChannelDesc: 'Allow customers to pre-book items and collect at the shop.',
    deliveryChannelLabel: 'Enable Parcel / Home Delivery',
    deliveryChannelDesc: 'Allow customers to place orders for parcel dispatch or home delivery.',
    
    dineInOnlinePaymentTitle: 'In-Store / Counter Online Payment',
    dineInOnlinePaymentDesc: 'Allow in-store and counter customers to pay online directly via digital menu.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting pre-booked items at the shop.',
    deliveryOnlinePaymentTitle: 'Parcel / Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow parcel & delivery customers to pay online through the gateway.',
    
    orderTypeDineInTitle: 'In-Store / Counter',
    orderTypeDineInSubtitle: 'Browse and order directly at counter or stall',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Pre-book items & pick up at the shop',
    orderTypeDeliveryTitle: 'Parcel / Courier Delivery',
    orderTypeDeliverySubtitle: 'Dispatched directly to your address',
    tableOrStallLabel: 'Counter / Stall / Token #',
    tableOrStallPlaceholder: 'e.g. Counter 1, Stall A, or Token',
    searchPlaceholder: 'Search sparklers, 1000 wala, gift boxes, aerial shots...',
    welcomePrompt: 'Browse our cracker catalog and place your order.',
    
    prepStatusLabel: 'Packing Items in Progress',
    prepStatusTitle: 'Packing Items',
    prepStatusDesc: 'Staff is packing your items in the godown / dispatch desk.',
    readyStatusLabel: 'Ready for Dispatch / Pickup',
    orderCompletedDesc: 'Your items are ready / delivered! Enjoy your celebrations!',
  },
];

export const DEFAULT_BUSINESS_CATEGORY = BUSINESS_CATEGORIES[0];

export function getBusinessCategory(categoryValue?: string | null): BusinessCategoryConfig {
  if (!categoryValue) return DEFAULT_BUSINESS_CATEGORY;
  
  const val = categoryValue.toLowerCase().trim();
  
  // Fireworks check
  if (
    val === 'fireworks_crackers' || 
    val.includes('firework') || 
    val.includes('cracker') ||
    val.includes('pyro')
  ) {
    return BUSINESS_CATEGORIES[1];
  }
  
  // Default to Restaurants / Cafes / Hotels
  return BUSINESS_CATEGORIES[0];
}

export function isFoodBusiness(categoryValue?: string | null): boolean {
  return getBusinessCategory(categoryValue).isFood;
}

export function isFireworksBusiness(categoryValue?: string | null): boolean {
  return !isFoodBusiness(categoryValue);
}
