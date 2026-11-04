/**
 * Multi-Language Dictionary for Thermal Printed Bills, Invoices, and KOT Slips.
 * Provides translated terms for English, Tamil, Hindi, Telugu, Kannada, Malayalam,
 * Marathi, Gujarati, Bengali, Punjabi, Arabic, Spanish, and French.
 */

export interface BillTranslation {
  taxInvoice: string;
  taxInvoiceNew: string;
  billNo: string;
  date: string;
  time: string;
  customer: string;
  mobile: string;
  type: string;
  dineIn: string;
  takeaway: string;
  delivery: string;
  table: string;
  item: string;
  qty: string;
  rate: string;
  amount: string;
  subtotal: string;
  discount: string;
  tax: string;
  deliveryFee: string;
  roundOff: string;
  netPayable: string;
  payment: string;
  cash: string;
  upi: string;
  card: string;
  other: string;
  split: string;
  paid: string;
  due: string;
  saved: string;
  thankYou: string;
  visitAgain: string;
  returnPolicy: string;
}

export const BILL_LANGUAGES = [
  { id: 'store', name: 'Store Default Language' },
  { id: 'en', name: 'English (Default)' },
  { id: 'ta', name: 'Tamil (தமிழ்)' },
  { id: 'hi', name: 'Hindi (हिन्दी)' },
  { id: 'te', name: 'Telugu (తెలుగు)' },
  { id: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { id: 'ml', name: 'Malayalam (മലയാളം)' },
  { id: 'mr', name: 'Marathi (मराठी)' },
  { id: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { id: 'bn', name: 'Bengali (বাংলা)' },
  { id: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { id: 'ar', name: 'Arabic (العربية)' },
  { id: 'es', name: 'Spanish (Español)' },
  { id: 'fr', name: 'French (Français)' },
];

export const BILL_TRANSLATIONS: Record<string, BillTranslation> = {
  en: {
    taxInvoice: 'TAX INVOICE',
    taxInvoiceNew: 'TAX INVOICE (NEW ITEMS)',
    billNo: 'Bill No:',
    date: 'Date:',
    time: 'Time:',
    customer: 'Customer:',
    mobile: 'Mobile:',
    type: 'Type:',
    dineIn: 'Dine-In',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    table: 'Table',
    item: 'ITEM',
    qty: 'QTY',
    rate: 'RATE',
    amount: 'AMOUNT',
    subtotal: 'Sub Total:',
    discount: 'Discount:',
    tax: 'GST / Tax:',
    deliveryFee: 'Delivery Fee:',
    roundOff: 'Round Off:',
    netPayable: 'NET PAYABLE:',
    payment: 'Payment:',
    cash: 'CASH',
    upi: 'UPI / QR',
    card: 'CARD',
    other: 'OTHER',
    split: 'SPLIT',
    paid: 'PAID',
    due: 'DUE',
    saved: 'SAVED ON THIS BILL',
    thankYou: 'Thank you for ordering with us!',
    visitAgain: '*** Visit again ***',
    returnPolicy: 'Goods once sold are not returnable without this receipt.',
  },
  ta: {
    taxInvoice: 'வரி விலைப்பட்டியல் (TAX INVOICE)',
    taxInvoiceNew: 'விலைப்பட்டியல் (புதிய பொருட்கள்)',
    billNo: 'ரசீது எண்:',
    date: 'தேதி:',
    time: 'நேரம்:',
    customer: 'வாடிக்கையாளர்:',
    mobile: 'அலைபேசி:',
    type: 'வகை:',
    dineIn: 'உணவுக்கூடம் (Dine-In)',
    takeaway: 'பார்சல் (Takeaway)',
    delivery: 'டெலிவரி (Delivery)',
    table: 'மேசை',
    item: 'பொருள் (ITEM)',
    qty: 'அளவு (QTY)',
    rate: 'விலை (RATE)',
    amount: 'தொகை (AMOUNT)',
    subtotal: 'மொத்தத் தொகை:',
    discount: 'தள்ளுபடி:',
    tax: 'வரி (GST):',
    deliveryFee: 'டெலிவரி கட்டணம்:',
    roundOff: 'சரிசெய்தல்:',
    netPayable: 'செலுத்த வேண்டிய தொகை:',
    payment: 'பணம் செலுத்துதல்:',
    cash: 'ரொக்கம் (CASH)',
    upi: 'யுபிஐ (UPI)',
    card: 'அட்டை (CARD)',
    other: 'இதர',
    split: 'பகிர்வு (SPLIT)',
    paid: 'செலுத்தப்பட்டது (PAID)',
    due: 'நிலுவை (DUE)',
    saved: 'இந்த ரசீதில் உங்களின் சேமிப்பு',
    thankYou: 'எங்களுடன் ஆர்டர் செய்ததற்கு நன்றி!',
    visitAgain: '*** மீண்டும் வருக! ***',
    returnPolicy: 'விற்கப்பட்ட பொருட்கள் ரசீது இன்றி திரும்பப் பெறப்பட மாட்டாது.',
  },
  hi: {
    taxInvoice: 'कर चालान (TAX INVOICE)',
    taxInvoiceNew: 'कर चालान (नए आइटम)',
    billNo: 'बिल संख्या:',
    date: 'दिनांक:',
    time: 'समय:',
    customer: 'ग्राहक:',
    mobile: 'मोबाइल:',
    type: 'प्रकार:',
    dineIn: 'डाइन-इन',
    takeaway: 'टेकअवे (पार्सल)',
    delivery: 'डिलीवरी',
    table: 'टेबल',
    item: 'वस्तु (ITEM)',
    qty: 'मात्रा (QTY)',
    rate: 'दर (RATE)',
    amount: 'राशि (AMOUNT)',
    subtotal: 'उप कुल:',
    discount: 'छूट (Discount):',
    tax: 'जीएसटी / कर:',
    deliveryFee: 'डिलीवरी शुल्क:',
    roundOff: 'राउंड ऑफ:',
    netPayable: 'कुल देय राशि:',
    payment: 'भुगतान माध्यम:',
    cash: 'नकद (CASH)',
    upi: 'यूपीआई (UPI)',
    card: 'कार्ड (CARD)',
    other: 'अन्य',
    split: 'विभाजित (SPLIT)',
    paid: 'भुगतान किया गया (PAID)',
    due: 'बाकी (DUE)',
    saved: 'इस बिल पर बचत',
    thankYou: 'हमारे साथ खरीदारी के लिए धन्यवाद!',
    visitAgain: '*** फिर पधारें ***',
    returnPolicy: 'रसीद के बिना बिका हुआ सामान वापस नहीं होगा।',
  },
  te: {
    taxInvoice: 'పన్ను ఇన్వాయిస్ (TAX INVOICE)',
    taxInvoiceNew: 'ఇన్వాయిస్ (కొత్త వస్తువులు)',
    billNo: 'బిల్ సంఖ్య:',
    date: 'తేదీ:',
    time: 'సమయం:',
    customer: 'కస్టమర్:',
    mobile: 'మొబైల్:',
    type: 'రకం:',
    dineIn: 'డైన్-ఇన్',
    takeaway: 'టేక్అవే (పార్శిల్)',
    delivery: 'డెలివరీ',
    table: 'టేబుల్',
    item: 'వస్తువు (ITEM)',
    qty: 'పరిమాణం (QTY)',
    rate: 'ధర (RATE)',
    amount: 'మొత్తం (AMOUNT)',
    subtotal: 'ఉప మొత్తం:',
    discount: 'రాయితీ (Discount):',
    tax: 'జీఎస్టీ / పన్ను:',
    deliveryFee: 'డెలివరీ ఛార్జీ:',
    roundOff: 'రౌండ్ ఆఫ్:',
    netPayable: 'చెల్లించవలసిన మొత్తం:',
    payment: 'చెల్లింపు విధానం:',
    cash: 'నగదు (CASH)',
    upi: 'యూపీఐ (UPI)',
    card: 'కార్డ్ (CARD)',
    other: 'ఇతర',
    split: 'స్ప్లిట్ (SPLIT)',
    paid: 'చెల్లించబడింది (PAID)',
    due: 'బాకీ (DUE)',
    saved: 'ఈ బిల్లుపై ఆదా',
    thankYou: 'మా వద్ద కొనుగోలు చేసినందుకు ధన్యవాదాలు!',
    visitAgain: '*** మళ్లీ రండి ***',
    returnPolicy: 'రసీదు లేకుండా సరుకులు తిరిగి తీసుకోబడవు.',
  },
  kn: {
    taxInvoice: 'ತೆರಿಗೆ ಸರಕುಪಟ್ಟಿ (TAX INVOICE)',
    taxInvoiceNew: 'ಸರಕುಪಟ್ಟಿ (ಹೊಸ ಐಟಂ)',
    billNo: 'ಬಿಲ್ ಸಂಖ್ಯೆ:',
    date: 'ದಿನಾಂಕ:',
    time: 'ಸಮಯ:',
    customer: 'ಗ್ರಾಹಕರು:',
    mobile: 'ಮೊಬೈಲ್:',
    type: 'ರೀತಿ:',
    dineIn: 'ಡೈನ್-ಇನ್',
    takeaway: 'ಪಾರ್ಸಲ್ (Takeaway)',
    delivery: 'ಡೆಲಿವರಿ',
    table: 'ಟೇಬಲ್',
    item: 'ವಸ್ತು (ITEM)',
    qty: 'ಪ್ರಮಾಣ (QTY)',
    rate: 'ದರ (RATE)',
    amount: 'ಮೊತ್ತ (AMOUNT)',
    subtotal: 'ಉಪ ಮೊತ್ತ:',
    discount: 'ರಿಯಾಯಿತಿ:',
    tax: 'ಜಿಎಸ್‌ಟಿ / ತೆರಿಗೆ:',
    deliveryFee: 'ಡೆಲಿವರಿ ಶುಲ್ಕ:',
    roundOff: 'ರೌಂಡ್ ಆಫ್:',
    netPayable: 'ಪಾವತಿಸಬೇಕಾದ ಒಟ್ಟು ಮೊತ್ತ:',
    payment: 'ಪಾವತಿ ವಿಧಾನ:',
    cash: 'ನಗದು (CASH)',
    upi: 'ಯುಪಿಐ (UPI)',
    card: 'ಕಾರ್ಡ್ (CARD)',
    other: 'ಇತರೆ',
    split: 'ವಿಭಜನೆ (SPLIT)',
    paid: 'ಪಾವತಿಸಲಾಗಿದೆ (PAID)',
    due: 'ಬಾಕಿ (DUE)',
    saved: 'ಈ ಬಿಲ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಉಳಿತಾಯ',
    thankYou: 'ನಮ್ಮಲ್ಲಿ ಆರ್ಡರ್ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು!',
    visitAgain: '*** ಪುನಃ ಭೇಟಿ ನೀಡಿ ***',
    returnPolicy: 'ರಸೀದಿ ಇಲ್ಲದೆ ಮಾರಾಟವಾದ ವಸ್ತುಗಳನ್ನು ಹಿಂಪಡೆಯಲಾಗುವುದಿಲ್ಲ.',
  },
  ml: {
    taxInvoice: 'ടാക്സ് ഇൻവോയ്സ് (TAX INVOICE)',
    taxInvoiceNew: 'ഇൻവോയ്സ് (പുതിയ ഇനങ്ങൾ)',
    billNo: 'ബിൽ നമ്പർ:',
    date: 'തീയതി:',
    time: 'സമയം:',
    customer: 'ഉപഭോക്താവ്:',
    mobile: 'മൊബൈൽ:',
    type: 'തരം:',
    dineIn: 'ഡൈൻ-ഇൻ',
    takeaway: 'പാർസൽ',
    delivery: 'ഡെലിവറി',
    table: 'ടേബിൾ',
    item: 'ഇനം (ITEM)',
    qty: 'എണ്ണം (QTY)',
    rate: 'നിരക്ക് (RATE)',
    amount: 'തുക (AMOUNT)',
    subtotal: 'ആകെ തുക:',
    discount: 'കിഴിവ് (Discount):',
    tax: 'ജിഎസ്ടി / നികുതി:',
    deliveryFee: 'ഡെലിവറി ചാർജ്ജ്:',
    roundOff: 'റൗണ്ട് ഓഫ്:',
    netPayable: 'അടയ്‌ക്കേണ്ട ആകെ തുക:',
    payment: 'പേയ്‌മെന്റ് രീതി:',
    cash: 'പണം (CASH)',
    upi: 'യുപിഐ (UPI)',
    card: 'കാർഡ് (CARD)',
    other: 'മറ്റുള്ളവ',
    split: 'സ്പ്ലിറ്റ് (SPLIT)',
    paid: 'അടച്ചു (PAID)',
    due: 'ബാക്കി (DUE)',
    saved: 'ഈ ബില്ലിലെ നിങ്ങളുടെ ലാഭം',
    thankYou: 'ഞങ്ങളുമായി സഹകരിച്ചതിന് നന്ദി!',
    visitAgain: '*** വീണ്ടും വരിക ***',
    returnPolicy: 'രസീത് ഇല്ലാതെ സാധനങ്ങൾ തിരികെ എടുക്കുന്നതല്ല.',
  },
  mr: {
    taxInvoice: 'कर बीजक (TAX INVOICE)',
    taxInvoiceNew: 'कर बीजक (नवीन आयटम)',
    billNo: 'बिल क्र.:',
    date: 'दिनांक:',
    time: 'वेळ:',
    customer: 'ग्राहक:',
    mobile: 'मोबाईल:',
    type: 'प्रकार:',
    dineIn: 'डाइन-इन',
    takeaway: 'पार्सल (Takeaway)',
    delivery: 'डिलिव्हरी',
    table: 'टेबल',
    item: 'वस्तू (ITEM)',
    qty: 'प्रमाण (QTY)',
    rate: 'दर (RATE)',
    amount: 'रक्कम (AMOUNT)',
    subtotal: 'उप एकूण:',
    discount: 'सूट (Discount):',
    tax: 'जीएसटी / कर:',
    deliveryFee: 'डिलिव्हरी शुल्क:',
    roundOff: 'राउंड ऑफ:',
    netPayable: 'एकूण देय रक्कम:',
    payment: 'पेमेंट माध्यम:',
    cash: 'रोख (CASH)',
    upi: 'यूपीआय (UPI)',
    card: 'कार्ड (CARD)',
    other: 'इतर',
    split: 'स्प्लिट (SPLIT)',
    paid: 'भरले (PAID)',
    due: 'बाकी (DUE)',
    saved: 'या बिलावर बचत',
    thankYou: 'आमच्याकडे भेट दिल्याबद्दल धन्यवाद!',
    visitAgain: '*** पुन्हा या ***',
    returnPolicy: 'पावतीशिवाय माल परत घेतला जाणार नाही.',
  },
  gu: {
    taxInvoice: 'ટેક્સ ઇનવોઇસ (TAX INVOICE)',
    taxInvoiceNew: 'ટેક્સ ઇનવોઇસ (નવી વસ્તુઓ)',
    billNo: 'બિલ નંબર:',
    date: 'તારીખ:',
    time: 'સમય:',
    customer: 'ગ્રાહક:',
    mobile: 'મોબાઇલ:',
    type: 'પ્રકાર:',
    dineIn: 'ડાઇન-ઇન',
    takeaway: 'ટેકઅવે (પાર્સલ)',
    delivery: 'ડિલિવરી',
    table: 'ટેબલ',
    item: 'વસ્તુ (ITEM)',
    qty: 'જથ્થો (QTY)',
    rate: 'ભાવ (RATE)',
    amount: 'રકમ (AMOUNT)',
    subtotal: 'પેટા કુલ:',
    discount: 'ડિસ્કાઉન્ટ:',
    tax: 'જીએસટી / ટેક્સ:',
    deliveryFee: 'ડિલિવરી ચાર્જ:',
    roundOff: 'રાઉન્ડ ઓફ:',
    netPayable: 'ચૂકવવાપાત્ર કુલ રકમ:',
    payment: 'ચુકવણી પદ્ધતિ:',
    cash: 'રોકડ (CASH)',
    upi: 'યુપીઆઈ (UPI)',
    card: 'કાર્ડ (CARD)',
    other: 'અન્ય',
    split: 'સ્પ્લિટ (SPLIT)',
    paid: 'ચૂકવેલ (PAID)',
    due: 'બાકી (DUE)',
    saved: 'આ બિલ પર બચત',
    thankYou: 'અમારી મુલાકાત લેવા બદલ આભાર!',
    visitAgain: '*** ફરી પધારો ***',
    returnPolicy: 'રસીદ વગર વેચેલો માલ પરત લેવામાં આવશે નહીં.',
  },
  bn: {
    taxInvoice: 'ট্যাক্স ইনভয়েস (TAX INVOICE)',
    taxInvoiceNew: 'ইনভয়েস (নতুন আইটেম)',
    billNo: 'বিল নং:',
    date: 'তারিখ:',
    time: 'সময়:',
    customer: 'গ্রাহক:',
    mobile: 'মোবাইল:',
    type: 'ধরন:',
    dineIn: 'ডাইন-ইন',
    takeaway: 'পার্সেল (Takeaway)',
    delivery: 'ডেলিভারি',
    table: 'টেবিল',
    item: 'পণ্য (ITEM)',
    qty: 'পরিমাণ (QTY)',
    rate: 'দর (RATE)',
    amount: 'টাকা (AMOUNT)',
    subtotal: 'মোট টাকা:',
    discount: 'ছাড় (Discount):',
    tax: 'জিএসটি / কর:',
    deliveryFee: 'ডেলিভারি চার্জ:',
    roundOff: 'রাউন্ড অফ:',
    netPayable: 'সর্বমোট প্রদেয়:',
    payment: 'পেমেন্ট মাধ্যম:',
    cash: 'নগদ (CASH)',
    upi: 'ইউপিআই (UPI)',
    card: 'কার্ড (CARD)',
    other: 'অন্যান্য',
    split: 'বিভক্ত (SPLIT)',
    paid: 'পরিশোধিত (PAID)',
    due: 'বাকি (DUE)',
    saved: 'এই বিলে মোট সাশ্রয়',
    thankYou: 'আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!',
    visitAgain: '*** আবার আসবেন ***',
    returnPolicy: 'রসিদ ছাড়া বিক্রিত পণ্য ফেরত নেওয়া হবে না।',
  },
  pa: {
    taxInvoice: 'ਟੈਕਸ ਇਨਵੌਇਸ (TAX INVOICE)',
    taxInvoiceNew: 'ਇਨਵੌਇਸ (ਨਵੇਂ ਆਈਟਮ)',
    billNo: 'ਬਿੱਲ ਨੰਬਰ:',
    date: 'ਮਿਤੀ:',
    time: 'ਸਮਾਂ:',
    customer: 'ਗਾਹਕ:',
    mobile: 'ਮੋਬਾਈਲ:',
    type: 'ਕਿਸਮ:',
    dineIn: 'ਡਾਈਨ-ਇਨ',
    takeaway: 'ਪਾਰਸਲ (Takeaway)',
    delivery: 'ਡਿਲਿਵਰੀ',
    table: 'ਟੇਬਲ',
    item: 'ਆਈਟਮ (ITEM)',
    qty: 'ਮਾਤਰਾ (QTY)',
    rate: 'ਰੇਟ (RATE)',
    amount: 'ਰਕਮ (AMOUNT)',
    subtotal: 'ਕੁੱਲ ਰਕਮ:',
    discount: 'ਛੋਟ (Discount):',
    tax: 'ਜੀਐਸਟੀ / ਟੈਕਸ:',
    deliveryFee: 'ਡਿਲਿਵਰੀ ਫੀਸ:',
    roundOff: 'ਰਾਊਂਡ ਆਫ:',
    netPayable: 'ਕੁੱਲ ਭੁਗਤਾਨਯੋਗ:',
    payment: 'ਭੁਗਤਾਨ ਦਾ ਤਰੀਕਾ:',
    cash: 'ਨਕਦ (CASH)',
    upi: 'ਯੂਪੀਆਈ (UPI)',
    card: 'ਕਾਰਡ (CARD)',
    other: 'ਹੋਰ',
    split: 'ਸਪਲਿਟ (SPLIT)',
    paid: 'ਭੁਗਤਾਨ ਕੀਤਾ (PAID)',
    due: 'ਬਾਕੀ (DUE)',
    saved: 'ਇਸ ਬਿੱਲ ਤੇ ਬੱਚਤ',
    thankYou: 'ਸਾਡੇ ਕੋਲ ਆਉਣ ਲਈ ਧੰਨਵਾਦ!',
    visitAgain: '*** ਫਿਰ ਆਓ ਜੀ ***',
    returnPolicy: 'ਰਸੀਦ ਤੋਂ ਬਿਨਾਂ ਵੇਚਿਆ ਸਮਾਨ ਵਾਪਸ ਨਹੀਂ ਹੋਵੇਗਾ।',
  },
  ar: {
    taxInvoice: 'فاتورة ضريبية (TAX INVOICE)',
    taxInvoiceNew: 'فاتورة ضريبية (عناصر جديدة)',
    billNo: 'رقم الفاتورة:',
    date: 'التاريخ:',
    time: 'الوقت:',
    customer: 'العميل:',
    mobile: 'الجوال:',
    type: 'النوع:',
    dineIn: 'محلي (Dine-In)',
    takeaway: 'سفري (Takeaway)',
    delivery: 'توصيل (Delivery)',
    table: 'طاولة',
    item: 'الصنف',
    qty: 'الكمية',
    rate: 'السعر',
    amount: 'المجموع',
    subtotal: 'المجموع الفرعي:',
    discount: 'الخصم:',
    tax: 'ضريبة القيمة المضافة:',
    deliveryFee: 'رسوم التوصيل:',
    roundOff: 'التقريب:',
    netPayable: 'المبلغ الإجمالي المستحق:',
    payment: 'طريقة الدفع:',
    cash: 'نقداً (CASH)',
    upi: 'إلكتروني',
    card: 'بطاقة (CARD)',
    other: 'أخرى',
    split: 'مجزأ (SPLIT)',
    paid: 'مدفوع (PAID)',
    due: 'مستحق (DUE)',
    saved: 'لقد وفرت في هذه الفاتورة',
    thankYou: 'شكراً لتعاملكم معنا!',
    visitAgain: '*** نسعد بزيارتكم مجدداً ***',
    returnPolicy: 'البضاعة المباعة لا ترد ولا تستبدل بدون هذه الفاتورة.',
  },
  es: {
    taxInvoice: 'FACTURA FISCAL (TAX INVOICE)',
    taxInvoiceNew: 'FACTURA FISCAL (NUEVOS ARTÍCULOS)',
    billNo: 'Nº Factura:',
    date: 'Fecha:',
    time: 'Hora:',
    customer: 'Cliente:',
    mobile: 'Móvil:',
    type: 'Tipo:',
    dineIn: 'Comer aquí',
    takeaway: 'Para llevar',
    delivery: 'A domicilio',
    table: 'Mesa',
    item: 'ARTÍCULO',
    qty: 'CANT',
    rate: 'PRECIO',
    amount: 'TOTAL',
    subtotal: 'Subtotal:',
    discount: 'Descuento:',
    tax: 'IVA / Impuesto:',
    deliveryFee: 'Envío:',
    roundOff: 'Redondeo:',
    netPayable: 'TOTAL A PAGAR:',
    payment: 'Método de pago:',
    cash: 'EFECTIVO',
    upi: 'TRANSFERENCIA',
    card: 'TARJETA',
    other: 'OTRO',
    split: 'DIVIDIDO',
    paid: 'PAGADO',
    due: 'PENDIENTE',
    saved: 'AHORRADO EN ESTA FACTURA',
    thankYou: '¡Gracias por su compra!',
    visitAgain: '*** Vuelva pronto ***',
    returnPolicy: 'No se admiten devoluciones sin este comprobante.',
  },
  fr: {
    taxInvoice: 'FACTURE FISCALE (TAX INVOICE)',
    taxInvoiceNew: 'FACTURE (NOUVEAUX ARTICLES)',
    billNo: 'N° Facture:',
    date: 'Date:',
    time: 'Heure:',
    customer: 'Client:',
    mobile: 'Mobile:',
    type: 'Type:',
    dineIn: 'Sur place',
    takeaway: 'À emporter',
    delivery: 'Livraison',
    table: 'Table',
    item: 'ARTICLE',
    qty: 'QTÉ',
    rate: 'PRIX',
    amount: 'MONTANT',
    subtotal: 'Sous-total:',
    discount: 'Remise:',
    tax: 'TVA / Taxe:',
    deliveryFee: 'Frais de livraison:',
    roundOff: 'Arrondi:',
    netPayable: 'TOTAL À PAYER:',
    payment: 'Mode de règlement:',
    cash: 'ESPÈCES',
    upi: 'VIREMENT',
    card: 'CARTE',
    other: 'AUTRE',
    split: 'DIVISÉ',
    paid: 'PAYÉ',
    due: 'DÛ',
    saved: 'ÉCONOMISÉ SUR CETTE FACTURE',
    thankYou: 'Merci pour votre commande !',
    visitAgain: '*** À bientôt ***',
    returnPolicy: 'Les articles vendus ne sont ni repris ni échangés sans ticket.',
  },
};

/**
 * Resolves the translation for a requested language code with automatic English fallback.
 */
export function getBillTranslation(langCode?: string): BillTranslation {
  const code = (langCode && langCode.toLowerCase().trim()) || 'en';
  return BILL_TRANSLATIONS[code] || BILL_TRANSLATIONS.en;
}

// In-memory cache for dynamic text translations
const dynamicTranslationCache = new Map<string, string>();

/**
 * Translates dynamic merchant text (such as shop description or address) into the bill language.
 * Uses Google Translate free client API with caching in memory and localStorage.
 * Falls back to original text immediately on error or when offline.
 */
export async function translateDynamicText(text: string, targetLang?: string): Promise<string> {
  const trimmed = (text || '').trim();
  const lang = (targetLang || 'en').toLowerCase().trim();
  if (!trimmed || lang === 'en' || lang === 'store') {
    return text || '';
  }

  const cacheKey = `${lang}:${trimmed}`;
  if (dynamicTranslationCache.has(cacheKey)) {
    return dynamicTranslationCache.get(cacheKey)!;
  }

  try {
    const local = localStorage.getItem(`mk_btr_${cacheKey}`);
    if (local) {
      dynamicTranslationCache.set(cacheKey, local);
      return local;
    }
  } catch {}

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((part: any) => part[0]).filter(Boolean).join('');
      if (translated && translated.trim()) {
        dynamicTranslationCache.set(cacheKey, translated);
        try {
          localStorage.setItem(`mk_btr_${cacheKey}`, translated);
        } catch {}
        return translated;
      }
    }
    return text;
  } catch {
    return text;
  }
}

/**
 * Translates shop description and multi-line address for printed and previewed bills.
 */
export async function getTranslatedShopInfo(shop: any, targetLang?: string): Promise<{ description: string; address: string; addressLines: string[] }> {
  const originalDesc = shop?.description || '';
  const originalAddr = shop?.address || '';
  const lang = (targetLang || 'en').toLowerCase().trim();

  if (!shop || lang === 'en' || lang === 'store') {
    const lines = originalAddr.split('\n').map((l: string) => l.trim()).filter(Boolean);
    return {
      description: originalDesc,
      address: originalAddr,
      addressLines: lines,
    };
  }

  const [desc, addr] = await Promise.all([
    originalDesc ? translateDynamicText(originalDesc, lang) : Promise.resolve(''),
    originalAddr ? translateDynamicText(originalAddr, lang) : Promise.resolve(''),
  ]);

  const finalAddr = addr || originalAddr;
  const lines = finalAddr.split('\n').map((l: string) => l.trim()).filter(Boolean);

  return {
    description: desc || originalDesc,
    address: finalAddr,
    addressLines: lines,
  };
}

/**
 * Helper to translate payment methods (cash, upi, card, split, etc.) using the bill translation dictionary.
 */
export function formatPaymentMethod(method: string | undefined | null, t: BillTranslation): string {
  if (!method) return t.cash;
  const m = String(method).toLowerCase().trim();
  if (m === 'cash') return t.cash;
  if (m.includes('upi') || m.includes('qr') || m === 'online' || m === 'gpay' || m === 'phonepe' || m === 'paytm') return t.upi;
  if (m === 'card' || m === 'credit' || m === 'debit') return t.card;
  if (m === 'split') return t.split;
  if (m === 'other') return t.other;
  return method.toUpperCase();
}

