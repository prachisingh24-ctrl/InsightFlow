type Row = [string, string, string, number, string, number, string, string, string, number];
// source, content, customer, rating, sentiment, score, category, topics, complaint, urgency
const raw: Row[] = [
  ['Review', 'Delivery took 12 days instead of the promised 3. Nobody told me about the delay.', 'Priya S.', 1, 'Negative', -0.8, 'Shipping & Delivery', 'late delivery, communication', 'late delivery without notice', 4],
  ['Support', 'My package shows delivered but I never received it. Second time this month!', 'Marcus L.', 1, 'Negative', -0.9, 'Shipping & Delivery', 'missing package, tracking', 'package marked delivered but missing', 5],
  ['Review', 'Love the product quality, the fabric feels premium and it fits perfectly.', 'Ana G.', 5, 'Positive', 0.9, 'Product Quality', 'fabric, fit', '', 1],
  ['Survey', 'The checkout keeps failing when I use my credit card. Had to try 4 times.', 'Tom R.', 2, 'Negative', -0.7, 'Checkout & Payments', 'card payment, checkout', 'card payment failures at checkout', 4],
  ['Social', 'App crashes every time I open the order history on Android. Please fix!', 'Kenji W.', 1, 'Negative', -0.8, 'App Performance', 'crash, android', 'app crashes on order history', 4],
  ['Review', 'Customer support resolved my refund in under an hour. Impressed!', 'Lena M.', 5, 'Positive', 0.9, 'Customer Support', 'refund, fast response', '', 1],
  ['Support', 'I was charged twice for the same order and still waiting for a refund after 10 days.', 'David K.', 1, 'Negative', -0.9, 'Checkout & Payments', 'double charge, refund', 'double charged and slow refund', 5],
  ['Survey', 'Prices went up 20% since last year. Starting to look at alternatives.', 'Sofia P.', 2, 'Negative', -0.6, 'Pricing', 'price increase, churn', 'prices too high', 4],
  ['Review', 'Shipping was fast and packaging was eco-friendly. Great job.', 'Omar H.', 5, 'Positive', 0.85, 'Shipping & Delivery', 'fast shipping, packaging', '', 1],
  ['Social', 'Waited 45 minutes on the support chat before anyone answered.', 'Grace T.', 2, 'Negative', -0.6, 'Customer Support', 'wait time, chat', 'long support wait times', 3],
  ['Survey', 'The new search feature is great, I find things much faster now.', 'Ravi N.', 4, 'Positive', 0.7, 'App Performance', 'search, usability', '', 1],
  ['Review', 'Product arrived damaged, box was crushed. Replacement took two weeks.', 'Emily C.', 2, 'Negative', -0.7, 'Shipping & Delivery', 'damaged, replacement', 'damaged on arrival', 3],
  ['Support', 'Cannot reset my password, the email link never arrives.', 'Lucas B.', 1, 'Negative', -0.6, 'Account & Login', 'password reset, email', 'password reset email not arriving', 4],
  ['Review', 'Decent product but the sizing chart is way off. Had to return.', 'Chloe D.', 3, 'Mixed', -0.1, 'Product Quality', 'sizing, returns', 'inaccurate sizing chart', 2],
  ['Survey', 'App is slow to load product images on mobile data.', 'Ahmed F.', 3, 'Negative', -0.3, 'App Performance', 'slow, images', 'slow image loading', 2],
  ['Social', 'Best customer service I have ever had from an online store!', 'Mia J.', 5, 'Positive', 0.95, 'Customer Support', 'service', '', 1],
  ['Review', 'Tracking info was not updated for a week. Very stressful.', 'Noah V.', 2, 'Negative', -0.6, 'Shipping & Delivery', 'tracking', 'tracking not updated', 3],
  ['Support', 'Promo code SAVE20 did not apply at checkout even though it is valid.', 'Isabella R.', 2, 'Negative', -0.5, 'Checkout & Payments', 'promo code', 'promo code not applying', 3],
  ['Survey', 'Quality is good but honestly too expensive compared to competitors.', 'Ethan Y.', 3, 'Mixed', -0.1, 'Pricing', 'value, competitors', 'prices too high', 3],
  ['Review', 'The app redesign is beautiful and intuitive.', 'Zara Q.', 5, 'Positive', 0.9, 'App Performance', 'design, usability', '', 1],
  ['Social', 'Courier left my parcel in the rain. Everything was soaked.', 'Felix O.', 1, 'Negative', -0.8, 'Shipping & Delivery', 'courier, damage', 'parcel left in rain', 3],
  ['Support', 'Agent was polite but could not answer my question about warranty.', 'Hannah E.', 3, 'Mixed', 0, 'Customer Support', 'warranty, knowledge', 'agent lacked warranty info', 2],
  ['Review', 'Payment page froze and I am not sure if the order went through.', 'Jacob A.', 1, 'Negative', -0.7, 'Checkout & Payments', 'payment, freeze', 'payment page freezes', 4],
  ['Survey', 'Would love more color options for the hoodies.', 'Aria Z.', 4, 'Neutral', 0.2, 'Product Quality', 'colors, variety', '', 1],
  ['Review', 'Third late delivery in a row. I am cancelling my membership.', 'Samuel I.', 1, 'Negative', -0.95, 'Shipping & Delivery', 'late delivery, churn', 'repeated late deliveries', 5],
  ['Support', 'App logs me out every few minutes on iOS.', 'Olivia U.', 2, 'Negative', -0.6, 'Account & Login', 'logout, ios', 'frequent forced logouts', 3],
  ['Review', 'Stitching came apart after two washes. Disappointing quality.', 'Daniel X.', 2, 'Negative', -0.7, 'Product Quality', 'durability', 'poor stitching durability', 3],
  ['Survey', 'Overall happy, delivery is usually on time and products are nice.', 'Nora K.', 4, 'Positive', 0.6, 'Shipping & Delivery', 'on time', '', 1],
  ['Social', 'Subscription price increase with no notice is not cool.', 'Leo S.', 2, 'Negative', -0.6, 'Pricing', 'subscription, notice', 'price increase without notice', 3],
  ['Review', 'Returns process was simple and refund came quickly.', 'Ivy P.', 5, 'Positive', 0.85, 'Customer Support', 'returns, refund', '', 1],
  ['Support', 'Order stuck in "processing" for 9 days. No response to emails.', 'Max T.', 1, 'Negative', -0.85, 'Shipping & Delivery', 'processing delay', 'order stuck in processing', 4],
  ['Survey', 'Checkout with Apple Pay errors out every time.', 'Ruby L.', 2, 'Negative', -0.6, 'Checkout & Payments', 'apple pay', 'apple pay errors', 4],
  ['Review', 'Super comfy joggers, already ordered a second pair.', 'Aiden M.', 5, 'Positive', 0.9, 'Product Quality', 'comfort, repeat purchase', '', 1],
  ['Survey', 'Support was okay, nothing special.', 'Layla B.', 3, 'Neutral', 0, 'Customer Support', 'average', '', 1],
  ['Social', 'Love the weekend flash sales, great value!', 'Mateo R.', 5, 'Positive', 0.8, 'Pricing', 'sale, value', '', 1],
  ['Review', 'App is fine but notifications are too frequent.', 'Elena V.', 3, 'Mixed', -0.2, 'App Performance', 'notifications', 'too many notifications', 2],
  ['Survey', 'Delivery partner was rude at the doorstep.', 'Yusuf A.', 2, 'Negative', -0.6, 'Shipping & Delivery', 'courier behavior', 'rude delivery partner', 3],
  ['Review', 'Exactly as pictured, arrived a day early.', 'Grace H.', 5, 'Positive', 0.9, 'Shipping & Delivery', 'accurate, early', '', 1],
  ['Support', 'Two-factor code SMS takes forever to arrive.', 'Kai N.', 2, 'Negative', -0.5, 'Account & Login', '2fa, sms', 'slow 2fa sms', 3],
  ['Survey', 'Good selection, fair prices, easy app. Would recommend.', 'Sara D.', 5, 'Positive', 0.85, 'Pricing', 'value, recommend', '', 1],
];

export function buildSampleData() {
  const now = Date.now();
  const span = 56; // spread across ~8 weeks
  return raw.map(([source, content, customerName, rating, sentiment, sentimentScore, category, topics, complaint, urgency], i) => ({
    source, content, customerName, rating,
    sentiment: sentiment as 'Positive' | 'Neutral' | 'Negative' | 'Mixed', sentimentScore, category, topics, complaint, urgency,
    submittedAt: new Date(now - (span - (i / raw.length) * span + Math.random()) * 86400000).toISOString(),
  }));
}
