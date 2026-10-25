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

  // Reviews & Item Labels
  aboutItemLabel: string;
  reviewItemLabel: string;
  reviewHeaderPrompt: string;
  reviewSubtextPrompt: string;
  reviewCommentPlaceholder: string;
  noReviewsText: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryConfig[] = [
  {
    id: 'restaurants_cafes_hotels',
    label: 'Restaurants, Cafes & Hotels',
    shortLabel: 'Food & Hospitality',
    description: 'Dine-in restaurants, cafes, cloud kitchens, hotels, food trucks, and bistros.',
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

    aboutItemLabel: 'About this dish',
    reviewItemLabel: 'dish',
    reviewHeaderPrompt: 'How was your meal?',
    reviewSubtextPrompt: 'Share your experience to help others',
    reviewCommentPlaceholder: 'What did you think of this dish? (optional)',
    noReviewsText: 'Be the first to review this dish!',
  },
  {
    id: 'fashion_apparel',
    label: 'Fashion, Apparel & Boutiques',
    shortLabel: 'Fashion & Clothing',
    description: 'Clothing stores, boutiques, footwear, tailoring, fashion accessories, and jewelry.',
    badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Fashion Catalog & Collection',
    itemLabel: 'Apparel & Products',
    itemSingular: 'Product / Style',
    itemPlaceholder: 'e.g. Cotton Embroidered Kurti, Slim Fit Denim, Silk Saree',
    categorySelectPlaceholder: 'Select collection (e.g. Menswear, Womenswear, Ethnic, Footwear)',
    descriptionPlaceholder: 'Material, size options, color variants, fabric care instructions...',
    featuredBadgeLabel: 'Trending / Best Seller',
    addonLabel: 'Customizations & Add-ons (Optional)',
    addonDesc: 'Optional customizations or accessories (e.g. Alteration +50, Luxury Gift Box +99, Matching Dupatta +199)',
    addonNamePlaceholder: 'e.g. Express Alteration, Gift Box Packaging',
    
    kotLabel: 'Order Fulfillment & Pick Slip',
    kotShort: 'Pick Slip',
    kotSlipTitle: 'ORDER PICKING & DISPATCH SLIP',
    kotTabLabel: 'Pick Slips',
    productionStationLabel: 'Inventory & Dispatch Stations',
    productionPrinterDesc: 'Route orders to store sections or warehouse packing desks (e.g., Trial Desk, Stockroom).',
    productionStationPlaceholder: 'e.g. Main Stockroom Printer',
    routingDesc: 'All Categories (Universal - Prints All Fashion Items)',
    settingsPrintersTabLabel: 'Fulfillment & Printers',
    testKotButtonLabel: 'Test Sample Pick Slip',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Fulfillment Stations Configured',
    autoPrintKotLabel: 'Auto-Print Slip on Order Acceptance',
    autoPrintKotDesc: 'Print pick slips automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Invoice Printers',
    billingHeaderDesc: 'Configure thermal printers for customer tax bills, GST invoices, and POS counters.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Checkout & Billing Desks',
    billingPrinterDesc: 'Configure one or multiple bill printers (e.g., Main POS Counter, Floor 1 Billing).',
    billingStationPlaceholder: 'e.g., Main POS Counter, Cash Desk',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print receipt automatically when order is completed or paid',
    
    dineInChannelLabel: 'Enable In-Store / Trial Room QR',
    dineInChannelDesc: 'Allow walk-in customers to browse styles and scan QR codes in store or trial rooms.',
    takeawayChannelLabel: 'Enable Store Pickup (Click & Collect)',
    takeawayChannelDesc: 'Allow customers to browse catalog online and pick up ready garments in store.',
    deliveryChannelLabel: 'Enable Courier / Home Delivery',
    deliveryChannelDesc: 'Allow customers to place orders for home delivery or courier shipping.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow in-store shoppers to pay online directly from the digital catalog.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their order at the boutique.',
    deliveryOnlinePaymentTitle: 'Delivery / Courier Online Payment',
    deliveryOnlinePaymentDesc: 'Allow delivery customers to pay online through the payment gateway.',
    
    orderTypeDineInTitle: 'In-Store Browse & Buy',
    orderTypeDineInSubtitle: 'Browse and order directly inside the shop',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Reserve online and collect at store',
    orderTypeDeliveryTitle: 'Courier / Home Delivery',
    orderTypeDeliverySubtitle: 'Shipped directly to your doorstep',
    tableOrStallLabel: 'Section / Floor / Token',
    tableOrStallPlaceholder: 'e.g. Floor 1, Men Section, or Token #',
    searchPlaceholder: 'Search dresses, shirts, sarees, kurtis, footwear...',
    welcomePrompt: 'Explore our latest collections and style catalog.',
    
    prepStatusLabel: 'Packing & Preparing Order',
    prepStatusTitle: 'Preparing Items',
    prepStatusDesc: 'Staff is checking sizes and packaging your items.',
    readyStatusLabel: 'Ready for Pickup / Dispatch',
    orderCompletedDesc: 'Your order is ready / delivered! Thank you for shopping with us!',

    aboutItemLabel: 'Product details & specs',
    reviewItemLabel: 'product',
    reviewHeaderPrompt: 'How did you like this item?',
    reviewSubtextPrompt: 'Share your feedback on fit, fabric and design',
    reviewCommentPlaceholder: 'Write a review on quality, fit, and style... (optional)',
    noReviewsText: 'Be the first to review this product!',
  },
  {
    id: 'bakeries_sweets',
    label: 'Bakeries & Confectionery',
    shortLabel: 'Bakery & Sweets',
    description: 'Bakeries, cake shops, patisseries, sweet stalls, and confectioneries.',
    badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    isFood: true,
    dietaryEnabled: true,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Bakery & Cake Menu',
    itemLabel: 'Bakery Items',
    itemSingular: 'Bakery Item / Cake',
    itemPlaceholder: 'e.g. Black Forest Cake 1kg, Chocolate Truffle, Plum Cake',
    categorySelectPlaceholder: 'Select category (e.g. Birthday Cakes, Pastries, Breads, Cookies)',
    descriptionPlaceholder: 'Flavors, egg/eggless, weight, ingredients, shelf life...',
    featuredBadgeLabel: "Baker's Special",
    addonLabel: 'Customizations & Extras (Optional)',
    addonDesc: 'Optional extras (e.g. Birthday Candle +20, Knife & Plates +15, Gift Box +50)',
    addonNamePlaceholder: 'e.g. Birthday Candle, Gift Box, Sparkle Candle',
    
    kotLabel: 'Bakery Production Slip (BOT)',
    kotShort: 'BOT',
    kotSlipTitle: 'BAKERY ORDER TICKET (BOT)',
    kotTabLabel: 'Bakery BOT',
    productionStationLabel: 'Baking & Production Printer Stations',
    productionPrinterDesc: 'Route cake and pastry orders to baking counters (e.g., Cake Decorating Desk, Oven Section).',
    productionStationPlaceholder: 'e.g. Cake Decorating Desk',
    routingDesc: 'All Categories (Universal - Prints All Bakery Items)',
    settingsPrintersTabLabel: 'Baking & Printers',
    testKotButtonLabel: 'Test Sample BOT',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Printer Stations Configured',
    autoPrintKotLabel: 'Auto-Print BOT on Acceptance',
    autoPrintKotDesc: 'Print bakery production tickets automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Receipt Printers',
    billingHeaderDesc: 'Configure thermal printers for customer tax bills, invoices, and multiple billing counters.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Cashier Billing Printers & Counters',
    billingPrinterDesc: 'Configure one or multiple bill printers (e.g., Main Bakery Counter, Sweet Counter).',
    billingStationPlaceholder: 'e.g., Main Bakery Counter, Front Desk',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print bill automatically when order is paid or completed',
    
    dineInChannelLabel: 'Enable In-Store / Cafe Seating',
    dineInChannelDesc: 'Allow customers to order cakes and bakes directly from store tables.',
    takeawayChannelLabel: 'Enable Pre-Order & Pickup',
    takeawayChannelDesc: 'Allow customers to pre-order custom cakes & bakes for pickup at the store.',
    deliveryChannelLabel: 'Enable Cake / Home Delivery',
    deliveryChannelDesc: 'Allow customers to place orders for safe doorstep cake delivery.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow table and counter customers to pay online directly from the QR menu.',
    takeawayOnlinePaymentTitle: 'Pre-Order Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their cakes and sweets.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow cake delivery customers to pay online through the gateway.',
    
    orderTypeDineInTitle: 'In-Store',
    orderTypeDineInSubtitle: 'Order and enjoy at the bakery cafe',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Pre-order cakes & pick up at the shop',
    orderTypeDeliveryTitle: 'Doorstep Delivery',
    orderTypeDeliverySubtitle: 'Carefully delivered to your doorstep',
    tableOrStallLabel: 'Table / Token Number',
    tableOrStallPlaceholder: 'e.g. Table 3 or Token #',
    searchPlaceholder: 'Search cakes, pastries, breads, sweets...',
    welcomePrompt: 'Browse our fresh bakery catalog and order cakes or treats.',
    
    prepStatusLabel: 'Baking / Preparing Order',
    prepStatusTitle: 'Preparing Your Order',
    prepStatusDesc: 'Our bakers are baking and packaging your order freshly.',
    readyStatusLabel: 'Ready for Pickup / Dispatch',
    orderCompletedDesc: 'Your fresh bakes are ready! Enjoy every bite!',

    aboutItemLabel: 'About this bake / cake',
    reviewItemLabel: 'item',
    reviewHeaderPrompt: 'How were the treats?',
    reviewSubtextPrompt: 'Share your sweet experience to help others',
    reviewCommentPlaceholder: 'What did you think of the taste and freshness? (optional)',
    noReviewsText: 'Be the first to review this treat!',
  },
  {
    id: 'grocery_supermarkets',
    label: 'Grocery, Supermarkets & Provisions',
    shortLabel: 'Grocery & Mart',
    description: 'Supermarkets, provision stores, organic marts, daily essentials, and vegetable shops.',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-200 dark:border-green-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Grocery & Essentials Catalog',
    itemLabel: 'Products & Groceries',
    itemSingular: 'Product / Item',
    itemPlaceholder: 'e.g. Basmati Rice 5kg, Cold Pressed Oil 1L, Almonds 500g',
    categorySelectPlaceholder: 'Select section (e.g. Grains, Dairy & Eggs, Snacks, Beverages)',
    descriptionPlaceholder: 'Weight, brand, packaging, origin, expiration details...',
    featuredBadgeLabel: 'Value Pack / Deal',
    addonLabel: 'Packaging & Bags (Optional)',
    addonDesc: 'Optional bags or packaging (e.g. Eco Cloth Bag +15, Insulated Bag +30)',
    addonNamePlaceholder: 'e.g. Eco Cloth Bag, Bubble Wrap',
    
    kotLabel: 'Order Picking List',
    kotShort: 'Pick List',
    kotSlipTitle: 'GROCERY PICKING SLIP',
    kotTabLabel: 'Pick Lists',
    productionStationLabel: 'Packing Stations & Aisles',
    productionPrinterDesc: 'Route grocery orders to packing desks or warehouse counters.',
    productionStationPlaceholder: 'e.g. Packing Desk 1',
    routingDesc: 'All Categories (Universal - Prints All Grocery Items)',
    settingsPrintersTabLabel: 'Fulfillment & Printers',
    testKotButtonLabel: 'Test Sample Pick List',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Fulfillment Stations Configured',
    autoPrintKotLabel: 'Auto-Print Slip on Order Acceptance',
    autoPrintKotDesc: 'Print pick list automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Receipt Printers',
    billingHeaderDesc: 'Configure thermal printers for POS cashier counters and receipts.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Cashier & POS Counters',
    billingPrinterDesc: 'Configure one or multiple bill printers (e.g., Counter 1, Counter 2).',
    billingStationPlaceholder: 'e.g., POS Counter 1, Express Billing',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print receipt automatically when order is completed or paid',
    
    dineInChannelLabel: 'Enable Scan & Go (In-Store)',
    dineInChannelDesc: 'Allow customers inside the store to scan items and view pricing.',
    takeawayChannelLabel: 'Enable Store Pickup',
    takeawayChannelDesc: 'Allow customers to order provisions online and collect packed bags.',
    deliveryChannelLabel: 'Enable Home Delivery',
    deliveryChannelDesc: 'Allow customers to order groceries directly to their home address.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow customers to pay digitally at checkout counters.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their groceries.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow delivery customers to pay online through the gateway.',
    
    orderTypeDineInTitle: 'In-Store',
    orderTypeDineInSubtitle: 'Browse and check prices in store',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Order ahead and collect packed items',
    orderTypeDeliveryTitle: 'Doorstep Delivery',
    orderTypeDeliverySubtitle: 'Convenient delivery to your home',
    tableOrStallLabel: 'Counter / Basket #',
    tableOrStallPlaceholder: 'e.g. Basket 4 or Counter 2',
    searchPlaceholder: 'Search rice, dal, oils, spices, snacks, drinks...',
    welcomePrompt: 'Browse our grocery catalog and order daily essentials.',
    
    prepStatusLabel: 'Packing Items',
    prepStatusTitle: 'Packing Your Groceries',
    prepStatusDesc: 'Staff is gathering and packing your items securely.',
    readyStatusLabel: 'Ready for Pickup / Out for Delivery',
    orderCompletedDesc: 'Your grocery order has been completed! Thank you for ordering!',

    aboutItemLabel: 'Product details',
    reviewItemLabel: 'product',
    reviewHeaderPrompt: 'How was the quality?',
    reviewSubtextPrompt: 'Share feedback on product freshness and packaging',
    reviewCommentPlaceholder: 'Write a review on freshness and quality... (optional)',
    noReviewsText: 'Be the first to review this product!',
  },
  {
    id: 'electronics_mobiles',
    label: 'Electronics, Mobiles & Gadgets',
    shortLabel: 'Electronics & Mobiles',
    description: 'Smartphone stores, computer hardware, electronics, home appliances, and accessories.',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Gadgets & Electronics Catalog',
    itemLabel: 'Products & Gadgets',
    itemSingular: 'Product / Device',
    itemPlaceholder: 'e.g. Wireless Noise-Cancelling Earbuds, 65W Fast Charger',
    categorySelectPlaceholder: 'Select department (e.g. Smartphones, Audio, Accessories, Computing)',
    descriptionPlaceholder: 'Specifications, warranty period, model number, compatibility...',
    featuredBadgeLabel: 'Top Rated / Flagship',
    addonLabel: 'Warranty & Add-ons (Optional)',
    addonDesc: 'Optional warranties, tempered glass, or cables (e.g. 1-Year Extended Warranty +499, Screen Protector +149)',
    addonNamePlaceholder: 'e.g. Screen Protector, Extended Warranty',
    
    kotLabel: 'Order Picking & Dispatch Slip',
    kotShort: 'Dispatch Slip',
    kotSlipTitle: 'ELECTRONICS DISPATCH SLIP',
    kotTabLabel: 'Dispatch Slips',
    productionStationLabel: 'Inventory & Dispatch Stations',
    productionPrinterDesc: 'Route device orders to inventory verification and packing desks.',
    productionStationPlaceholder: 'e.g. Inventory Desk Printer',
    routingDesc: 'All Categories (Universal - Prints All Electronics)',
    settingsPrintersTabLabel: 'Dispatch & Printers',
    testKotButtonLabel: 'Test Sample Slip',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Dispatch Stations Configured',
    autoPrintKotLabel: 'Auto-Print Slip on Acceptance',
    autoPrintKotDesc: 'Print dispatch slip automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'GST Invoices & Bill Printers',
    billingHeaderDesc: 'Configure thermal printers for tax bills, GST invoices with serial numbers.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Billing Desks & Counters',
    billingPrinterDesc: 'Configure bill printers for POS invoice generation.',
    billingStationPlaceholder: 'e.g., Main POS Counter, Service Desk',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print receipt automatically when order is completed or paid',
    
    dineInChannelLabel: 'Enable In-Store Digital Catalog',
    dineInChannelDesc: 'Allow in-store shoppers to scan QR codes for full tech specs and comparisons.',
    takeawayChannelLabel: 'Enable Store Pickup',
    takeawayChannelDesc: 'Allow customers to reserve gadgets online and collect from the shop.',
    deliveryChannelLabel: 'Enable Courier / Home Delivery',
    deliveryChannelDesc: 'Allow customers to order gadgets for insured home delivery.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow customers to pay online at the demo counter or desk.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their device.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow customers to pay online via gateway for dispatched orders.',
    
    orderTypeDineInTitle: 'In-Store Demo & Buy',
    orderTypeDineInSubtitle: 'Browse specs & purchase at store',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Reserve online & collect in store',
    orderTypeDeliveryTitle: 'Doorstep Delivery',
    orderTypeDeliverySubtitle: 'Safe, insured shipping to your home',
    tableOrStallLabel: 'Demo Desk / Counter #',
    tableOrStallPlaceholder: 'e.g. Counter 1, Demo Bay A',
    searchPlaceholder: 'Search phones, chargers, earphones, laptops, cables...',
    welcomePrompt: 'Browse specs and order gadgets & electronics.',
    
    prepStatusLabel: 'Testing & Packaging',
    prepStatusTitle: 'Verifying & Packaging Device',
    prepStatusDesc: 'Staff is checking serial numbers and boxing your device safely.',
    readyStatusLabel: 'Ready for Collection / Shipping',
    orderCompletedDesc: 'Your device order is complete! Thank you for choosing us!',

    aboutItemLabel: 'Specifications & Warranty',
    reviewItemLabel: 'device',
    reviewHeaderPrompt: 'How is the gadget performing?',
    reviewSubtextPrompt: 'Share your review on build quality and battery life',
    reviewCommentPlaceholder: 'Write a review on performance, design, and usability... (optional)',
    noReviewsText: 'Be the first to review this product!',
  },
  {
    id: 'beauty_cosmetics_salon',
    label: 'Beauty, Cosmetics & Salons',
    shortLabel: 'Beauty & Cosmetics',
    description: 'Skincare, makeup, perfume shops, beauty salons, spas, and wellness outlets.',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Beauty & Wellness Catalog',
    itemLabel: 'Products & Treatments',
    itemSingular: 'Product / Treatment',
    itemPlaceholder: 'e.g. Vitamin C Face Serum 30ml, Matte Lipstick Ruby Red',
    categorySelectPlaceholder: 'Select category (e.g. Skincare, Haircare, Fragrance, Makeup)',
    descriptionPlaceholder: 'Ingredients, skin type, shade name, usage instructions...',
    featuredBadgeLabel: 'Staff Pick / Trending',
    addonLabel: 'Samples & Gift Packs (Optional)',
    addonDesc: 'Optional samples or gift wrapping (e.g. Premium Gift Wrap +49, Trial Sachet +20)',
    addonNamePlaceholder: 'e.g. Gift Wrap, Mini Sample Kit',
    
    kotLabel: 'Order Pick Slip',
    kotShort: 'Pick Slip',
    kotSlipTitle: 'BEAUTY ORDER PICK SLIP',
    kotTabLabel: 'Pick Slips',
    productionStationLabel: 'Dispensing & Packing Desks',
    productionPrinterDesc: 'Route beauty orders to packaging and consultation desks.',
    productionStationPlaceholder: 'e.g. Makeup Counter Printer',
    routingDesc: 'All Categories (Universal - Prints All Beauty Products)',
    settingsPrintersTabLabel: 'Fulfillment & Printers',
    testKotButtonLabel: 'Test Sample Slip',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Fulfillment Stations Configured',
    autoPrintKotLabel: 'Auto-Print Slip on Order Acceptance',
    autoPrintKotDesc: 'Print pick slip automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Receipt Printers',
    billingHeaderDesc: 'Configure thermal printers for salon and boutique checkout counters.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Cashier & POS Counters',
    billingPrinterDesc: 'Configure bill printers for POS counter billing.',
    billingStationPlaceholder: 'e.g., Front Desk Billing',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print receipt automatically when order is completed or paid',
    
    dineInChannelLabel: 'Enable In-Store / Salon QR',
    dineInChannelDesc: 'Allow clients to scan catalog from salon chairs or consultation counters.',
    takeawayChannelLabel: 'Enable Store Pickup',
    takeawayChannelDesc: 'Allow customers to order skincare and makeup online and collect at salon.',
    deliveryChannelLabel: 'Enable Doorstep Delivery',
    deliveryChannelDesc: 'Allow customers to order cosmetics delivered to their doorstep.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow clients to pay for products directly from digital menu.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their order.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow delivery customers to pay online through the gateway.',
    
    orderTypeDineInTitle: 'In-Store Browse',
    orderTypeDineInSubtitle: 'Browse shades & order at the counter',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Order online & collect at store',
    orderTypeDeliveryTitle: 'Doorstep Delivery',
    orderTypeDeliverySubtitle: 'Shipped safely to your home',
    tableOrStallLabel: 'Seat / Counter #',
    tableOrStallPlaceholder: 'e.g. Chair 2, Counter 1',
    searchPlaceholder: 'Search lipstick, sunscreen, serums, perfumes, shampoos...',
    welcomePrompt: 'Browse our curated beauty products and wellness essentials.',
    
    prepStatusLabel: 'Packing Beauty Items',
    prepStatusTitle: 'Packaging Cosmetics',
    prepStatusDesc: 'Staff is carefully packaging your beauty items.',
    readyStatusLabel: 'Ready for Collection / Shipping',
    orderCompletedDesc: 'Your order is ready / delivered! Thank you for shopping with us!',

    aboutItemLabel: 'Ingredients & Details',
    reviewItemLabel: 'product',
    reviewHeaderPrompt: 'How did this product work for you?',
    reviewSubtextPrompt: 'Share your thoughts on texture, fragrance, and results',
    reviewCommentPlaceholder: 'Write a review on scent, feel, and quality... (optional)',
    noReviewsText: 'Be the first to review this product!',
  },
  {
    id: 'pharmacy_healthcare',
    label: 'Pharmacy, Medical & Healthcare',
    shortLabel: 'Pharmacy & Health',
    description: 'Pharmacies, medical stores, wellness clinics, health supplements, and baby care.',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Pharmacy & Wellness Catalog',
    itemLabel: 'Medicines & Health Products',
    itemSingular: 'Product / Medicine',
    itemPlaceholder: 'e.g. Multivitamin Capsules 60s, Digital Thermometer, Bandages',
    categorySelectPlaceholder: 'Select section (e.g. OTC Medicines, Supplements, Baby Care, First Aid)',
    descriptionPlaceholder: 'Dosage form, manufacturer, precautions, pack size...',
    featuredBadgeLabel: 'Doctor Recommended',
    addonLabel: 'Health Add-ons (Optional)',
    addonDesc: 'Optional sanitizers, wipes, or pill organizers',
    addonNamePlaceholder: 'e.g. Alcohol Wipes, Pill Organizer',
    
    kotLabel: 'Prescription & Dispense Slip',
    kotShort: 'Dispense Slip',
    kotSlipTitle: 'PHARMACY DISPENSING SLIP',
    kotTabLabel: 'Dispense Slips',
    productionStationLabel: 'Dispensing & Pharmacist Desks',
    productionPrinterDesc: 'Route medicine orders to pharmacist verification desks.',
    productionStationPlaceholder: 'e.g. Pharmacist Station Printer',
    routingDesc: 'All Categories (Universal - Prints All Medical Items)',
    settingsPrintersTabLabel: 'Dispensing & Printers',
    testKotButtonLabel: 'Test Sample Slip',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Dispensing Stations Configured',
    autoPrintKotLabel: 'Auto-Print Slip on Order Acceptance',
    autoPrintKotDesc: 'Print dispensing slip automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Pharmacy Invoices & Bill Printers',
    billingHeaderDesc: 'Configure thermal printers for medicine receipts and GST invoices.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Pharmacy Cashier Desks',
    billingPrinterDesc: 'Configure bill printers for pharmacy checkout.',
    billingStationPlaceholder: 'e.g., Pharmacy Front Desk',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print receipt automatically when order is completed or paid',
    
    dineInChannelLabel: 'Enable In-Store Token / Counter QR',
    dineInChannelDesc: 'Allow walk-in patients to browse OTC health items and view prices.',
    takeawayChannelLabel: 'Enable Store Pickup',
    takeawayChannelDesc: 'Allow patients to pre-order wellness items and collect packed orders.',
    deliveryChannelLabel: 'Enable Home Delivery',
    deliveryChannelDesc: 'Allow local delivery of healthcare essentials directly to homes.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow walk-in customers to pay directly from digital catalog.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their medications.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow delivery customers to pay online through the gateway.',
    
    orderTypeDineInTitle: 'In-Store Counter',
    orderTypeDineInSubtitle: 'Browse and order at the pharmacy counter',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Order ahead and pick up at the counter',
    orderTypeDeliveryTitle: 'Home Delivery',
    orderTypeDeliverySubtitle: 'Delivered directly to your door',
    tableOrStallLabel: 'Token / Counter #',
    tableOrStallPlaceholder: 'e.g. Token # 12, Counter 1',
    searchPlaceholder: 'Search vitamins, thermometers, baby food, bandages...',
    welcomePrompt: 'Browse our healthcare essentials and OTC wellness products.',
    
    prepStatusLabel: 'Checking & Dispensing',
    prepStatusTitle: 'Dispensing Medicine & Healthcare Items',
    prepStatusDesc: 'Pharmacist is assembling and packing your items.',
    readyStatusLabel: 'Ready for Pickup / Out for Delivery',
    orderCompletedDesc: 'Your order is ready / delivered! Stay healthy and safe!',

    aboutItemLabel: 'Usage & Details',
    reviewItemLabel: 'product',
    reviewHeaderPrompt: 'How was the product?',
    reviewSubtextPrompt: 'Share your feedback on packaging and effectiveness',
    reviewCommentPlaceholder: 'Write a review on packaging and quality... (optional)',
    noReviewsText: 'Be the first to review this item!',
  },
  {
    id: 'home_hardware',
    label: 'Home Decor, Furniture & Hardware',
    shortLabel: 'Home & Hardware',
    description: 'Hardware stores, home decor, furniture, electricals, sanitaryware, and paint shops.',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Home & Hardware Catalog',
    itemLabel: 'Products & Tools',
    itemSingular: 'Product / Item',
    itemPlaceholder: 'e.g. Cordless Power Drill 12V, Ceramic Table Lamp, Brass Door Handle',
    categorySelectPlaceholder: 'Select department (e.g. Lighting, Hand Tools, Plumbing, Decor)',
    descriptionPlaceholder: 'Dimensions, materials, weight capacity, warranty...',
    featuredBadgeLabel: 'Top Quality',
    addonLabel: 'Installation & Accessories (Optional)',
    addonDesc: 'Optional installation, extra screws, or protective wraps',
    addonNamePlaceholder: 'e.g. Standard Installation, Heavy Duty Fasteners',
    
    kotLabel: 'Godown Pick Slip',
    kotShort: 'Pick Slip',
    kotSlipTitle: 'GODOWN PICKING SLIP',
    kotTabLabel: 'Pick Slips',
    productionStationLabel: 'Godown & Dispatch Printer Stations',
    productionPrinterDesc: 'Route hardware orders to godown packing desks.',
    productionStationPlaceholder: 'e.g. Godown Desk Printer',
    routingDesc: 'All Categories (Universal - Prints All Hardware Items)',
    settingsPrintersTabLabel: 'Dispatch & Printers',
    testKotButtonLabel: 'Test Sample Slip',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Dispatch Stations Configured',
    autoPrintKotLabel: 'Auto-Print Slip on Order Acceptance',
    autoPrintKotDesc: 'Print pick slip automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Invoice Printers',
    billingHeaderDesc: 'Configure thermal printers for tax invoices and billing counters.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Cashier Billing Printers',
    billingPrinterDesc: 'Configure bill printers for counter sales.',
    billingStationPlaceholder: 'e.g., Main Cashier Desk',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print receipt automatically when order is completed or paid',
    
    dineInChannelLabel: 'Enable In-Store / Showroom QR',
    dineInChannelDesc: 'Allow showroom visitors to scan QR codes on displays for specs and pricing.',
    takeawayChannelLabel: 'Enable Store Pickup',
    takeawayChannelDesc: 'Allow customers to order tools & hardware and collect at the store.',
    deliveryChannelLabel: 'Enable Van / Home Delivery',
    deliveryChannelDesc: 'Allow delivery of goods and hardware to construction sites or homes.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow showroom customers to pay online directly from digital catalog.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their order.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow delivery customers to pay online through the gateway.',
    
    orderTypeDineInTitle: 'In-Store Showroom',
    orderTypeDineInSubtitle: 'Browse items and order in the shop',
    orderTypeTakeawayTitle: 'Store Pickup',
    orderTypeTakeawaySubtitle: 'Order online & collect at godown',
    orderTypeDeliveryTitle: 'Van / Home Delivery',
    orderTypeDeliverySubtitle: 'Delivered directly to your site or address',
    tableOrStallLabel: 'Section / Floor #',
    tableOrStallPlaceholder: 'e.g. Aisle 3, Floor 2',
    searchPlaceholder: 'Search drills, paints, lamps, sanitary, fittings, tools...',
    welcomePrompt: 'Browse our hardware, tools & home decor catalog.',
    
    prepStatusLabel: 'Picking from Godown',
    prepStatusTitle: 'Gathering Items in Godown',
    prepStatusDesc: 'Staff is loading and checking your items.',
    readyStatusLabel: 'Ready for Collection / Dispatch',
    orderCompletedDesc: 'Your order is ready / delivered! Thank you for your business!',

    aboutItemLabel: 'Specifications & Materials',
    reviewItemLabel: 'product',
    reviewHeaderPrompt: 'How is the item quality?',
    reviewSubtextPrompt: 'Share your review on durability and ease of installation',
    reviewCommentPlaceholder: 'Write a review on durability and build... (optional)',
    noReviewsText: 'Be the first to review this item!',
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

    aboutItemLabel: 'About this product',
    reviewItemLabel: 'product',
    reviewHeaderPrompt: 'How was your experience?',
    reviewSubtextPrompt: 'Share your experience to help others',
    reviewCommentPlaceholder: 'What did you think of this product / cracker? (optional)',
    noReviewsText: 'Be the first to review this product!',
  },
  {
    id: 'others_general',
    label: 'Others (General Digital Catalog & Retail)',
    shortLabel: 'General Catalog & Retail',
    description: 'Any retail business, service provider, or merchant wanting to share a digital QR catalog and sell items online.',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    isFood: false,
    dietaryEnabled: false,
    icePreferenceEnabled: false,
    
    catalogLabel: 'Digital Product Catalog',
    itemLabel: 'Products & Items',
    itemSingular: 'Product / Item',
    itemPlaceholder: 'e.g. Premium Item, Service Package, Custom Product',
    categorySelectPlaceholder: 'Select category (e.g. Main Products, Featured, Accessories)',
    descriptionPlaceholder: 'Describe your product or service specifications, features, and details...',
    featuredBadgeLabel: 'Featured / Popular',
    addonLabel: 'Add-ons & Options (Optional)',
    addonDesc: 'Optional extras, add-on accessories, or custom options',
    addonNamePlaceholder: 'e.g. Gift Wrapping, Priority Handling',
    
    kotLabel: 'Order Fulfillment Slip',
    kotShort: 'Order Slip',
    kotSlipTitle: 'ORDER FULFILLMENT SLIP',
    kotTabLabel: 'Order Slips',
    productionStationLabel: 'Fulfillment & Dispatch Stations',
    productionPrinterDesc: 'Route customer orders to fulfillment, packing, or dispatch desks.',
    productionStationPlaceholder: 'e.g. Dispatch Desk Printer',
    routingDesc: 'All Categories (Universal - Prints All Items)',
    settingsPrintersTabLabel: 'Fulfillment & Printers',
    testKotButtonLabel: 'Test Sample Slip',
    addKotStationButtonLabel: 'Add Station',
    noKotStationsTitle: 'No Fulfillment Stations Configured',
    autoPrintKotLabel: 'Auto-Print Slip on Order Acceptance',
    autoPrintKotDesc: 'Print order slip automatically when orders are accepted',

    billingTabLabel: 'Cashier Billing',
    billingHeaderTitle: 'Customer Bill & Receipt Printers',
    billingHeaderDesc: 'Configure thermal printers for receipts, customer invoices, and counters.',
    billingStationBadge: 'Cashier Counter',
    billingStationLabel: 'Billing Desks & Counters',
    billingPrinterDesc: 'Configure one or multiple bill printers for customer invoicing.',
    billingStationPlaceholder: 'e.g., Main Billing Counter',
    testBillButtonLabel: 'Test Print Bill',
    addBillingPrinterButtonLabel: 'Add Cashier Printer',
    noBillingPrintersTitle: 'No Cashier Printers Added',
    autoPrintBillLabel: 'Auto-Print on Completion',
    autoPrintBillDesc: 'Print receipt automatically when order is completed or paid',
    
    dineInChannelLabel: 'Enable In-Store / Walk-In QR',
    dineInChannelDesc: 'Allow walk-in customers or guests to scan QR code and view your digital catalog.',
    takeawayChannelLabel: 'Enable Store / Desk Pickup',
    takeawayChannelDesc: 'Allow customers to order online and collect in person at your store or desk.',
    deliveryChannelLabel: 'Enable Shipping / Home Delivery',
    deliveryChannelDesc: 'Allow customers to place orders for courier delivery to their address.',
    
    dineInOnlinePaymentTitle: 'In-Store Online Payment',
    dineInOnlinePaymentDesc: 'Allow in-store customers to pay online directly from the digital catalog.',
    takeawayOnlinePaymentTitle: 'Store Pickup Online Payment',
    takeawayOnlinePaymentDesc: 'Allow customers to pay online before collecting their order.',
    deliveryOnlinePaymentTitle: 'Delivery Online Payment',
    deliveryOnlinePaymentDesc: 'Allow delivery customers to pay online through the payment gateway.',
    
    orderTypeDineInTitle: 'In-Store / Direct',
    orderTypeDineInSubtitle: 'Browse and order directly at our location',
    orderTypeTakeawayTitle: 'Direct Pickup',
    orderTypeTakeawaySubtitle: 'Order online & collect in person',
    orderTypeDeliveryTitle: 'Courier / Home Delivery',
    orderTypeDeliverySubtitle: 'Dispatched directly to your address',
    tableOrStallLabel: 'Counter / Reference #',
    tableOrStallPlaceholder: 'e.g. Counter 1, Desk A, or Reference #',
    searchPlaceholder: 'Search products, items, services...',
    welcomePrompt: 'Browse our digital catalog and place an order.',
    
    prepStatusLabel: 'Processing Order',
    prepStatusTitle: 'Processing Your Order',
    prepStatusDesc: 'Our team is processing and packing your items.',
    readyStatusLabel: 'Ready for Pickup / Dispatch',
    orderCompletedDesc: 'Your order is ready / delivered! Thank you for ordering with us!',

    aboutItemLabel: 'About this item',
    reviewItemLabel: 'product',
    reviewHeaderPrompt: 'How was your experience?',
    reviewSubtextPrompt: 'Share your feedback to help others',
    reviewCommentPlaceholder: 'What did you think of this product or service? (optional)',
    noReviewsText: 'Be the first to review this item!',
  },
];

export const DEFAULT_BUSINESS_CATEGORY = BUSINESS_CATEGORIES[0];

export function getBusinessCategory(categoryValue?: string | null): BusinessCategoryConfig {
  if (!categoryValue) return DEFAULT_BUSINESS_CATEGORY;
  
  const val = categoryValue.toLowerCase().trim();
  
  // 1. Direct match by ID
  const directMatch = BUSINESS_CATEGORIES.find(c => c.id.toLowerCase() === val);
  if (directMatch) return directMatch;

  // 2. Fireworks check
  if (
    val.includes('firework') || 
    val.includes('cracker') ||
    val.includes('pyro')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'fireworks_crackers') || BUSINESS_CATEGORIES[0];
  }

  // 3. Bakery check
  if (
    val.includes('bakery') ||
    val.includes('bakeries') ||
    val.includes('sweet') ||
    val.includes('confectionery') ||
    val.includes('cake')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'bakeries_sweets') || BUSINESS_CATEGORIES[0];
  }

  // 4. Fashion check
  if (
    val.includes('fashion') ||
    val.includes('apparel') ||
    val.includes('cloth') ||
    val.includes('boutique') ||
    val.includes('garment') ||
    val.includes('textile') ||
    val.includes('footwear') ||
    val.includes('jewelry')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'fashion_apparel') || BUSINESS_CATEGORIES[0];
  }

  // 5. Grocery check
  if (
    val.includes('grocery') ||
    val.includes('supermarket') ||
    val.includes('provision') ||
    val.includes('mart')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'grocery_supermarkets') || BUSINESS_CATEGORIES[0];
  }

  // 6. Electronics check
  if (
    val.includes('electronic') ||
    val.includes('mobile') ||
    val.includes('gadget') ||
    val.includes('phone') ||
    val.includes('computer')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'electronics_mobiles') || BUSINESS_CATEGORIES[0];
  }

  // 7. Beauty check
  if (
    val.includes('beauty') ||
    val.includes('cosmetic') ||
    val.includes('salon') ||
    val.includes('spa')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'beauty_cosmetics_salon') || BUSINESS_CATEGORIES[0];
  }

  // 8. Pharmacy check
  if (
    val.includes('pharmacy') ||
    val.includes('medical') ||
    val.includes('health') ||
    val.includes('chemist') ||
    val.includes('clinic')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'pharmacy_healthcare') || BUSINESS_CATEGORIES[0];
  }

  // 9. Hardware / Home check
  if (
    val.includes('hardware') ||
    val.includes('furniture') ||
    val.includes('decor') ||
    val.includes('paint') ||
    val.includes('sanitary')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'home_hardware') || BUSINESS_CATEGORIES[0];
  }

  // 10. Others / General check
  if (
    val.includes('other') ||
    val.includes('general') ||
    val.includes('retail') ||
    val.includes('catalog')
  ) {
    return BUSINESS_CATEGORIES.find(c => c.id === 'others_general') || BUSINESS_CATEGORIES[0];
  }

  // 11. Restaurant / Cafe / Food check
  if (
    val.includes('restaurant') ||
    val.includes('cafe') ||
    val.includes('hotel') ||
    val.includes('food') ||
    val.includes('dine') ||
    val.includes('kitchen')
  ) {
    return BUSINESS_CATEGORIES[0];
  }
  
  // Default to others_general if not known, or restaurants if ambiguous
  return BUSINESS_CATEGORIES.find(c => c.id === 'others_general') || BUSINESS_CATEGORIES[0];
}

export function isFoodBusiness(categoryValue?: string | null): boolean {
  return getBusinessCategory(categoryValue).isFood;
}

export function isFireworksBusiness(categoryValue?: string | null): boolean {
  if (!categoryValue) return false;
  const val = categoryValue.toLowerCase().trim();
  return val === 'fireworks_crackers' || val.includes('firework') || val.includes('cracker') || val.includes('pyro');
}

export function isBakeryBusiness(categoryValue?: string | null): boolean {
  if (!categoryValue) return false;
  const val = categoryValue.toLowerCase().trim();
  return val === 'bakeries_sweets' || val === 'bakeries_confectionery' || val.includes('bakery') || val.includes('bakeries') || val.includes('sweet') || val.includes('confectionery') || val.includes('cake');
}

export function isFashionBusiness(categoryValue?: string | null): boolean {
  if (!categoryValue) return false;
  const val = categoryValue.toLowerCase().trim();
  return val === 'fashion_apparel' || val.includes('fashion') || val.includes('apparel') || val.includes('boutique') || val.includes('cloth');
}

export function isGeneralRetailBusiness(categoryValue?: string | null): boolean {
  if (!categoryValue) return false;
  const val = categoryValue.toLowerCase().trim();
  return val === 'others_general' || val.includes('other') || !isFoodBusiness(categoryValue);
}

/**
 * Returns true if the shop is eligible for Savings Schemes (formerly called Pandu).
 */
export function isSchemeEnabledShop(categoryValue?: string | null): boolean {
  return isFireworksBusiness(categoryValue) || isBakeryBusiness(categoryValue);
}
