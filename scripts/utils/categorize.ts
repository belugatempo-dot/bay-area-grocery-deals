// Category keyword map — covers all common supermarket deal categories
const CATEGORY_MAP: Record<string, string[]> = {
  produce: ['fruit', 'vegetable', 'organic produce', 'berries', 'avocado', 'lettuce', 'salad', 'apple', 'banana', 'grape', 'tomato', 'pepper', 'onion', 'potato', 'mushroom', 'broccoli', 'spinach', 'kale', 'mango', 'melon', 'watermelon', 'pineapple', 'strawberr', 'blueberr', 'raspberr', 'citrus', 'lemon', 'lime', 'orange', 'peach', 'pear', 'cherry', 'corn', 'celery', 'carrot', 'cucumber', 'zucchini', 'squash', 'asparagus'],
  meat: ['beef', 'chicken', 'pork', 'salmon', 'shrimp', 'steak', 'seafood', 'fish', 'turkey', 'lamb', 'crab', 'lobster', 'tuna', 'tilapia', 'sausage', 'bacon', 'ham', 'ribs', 'brisket', 'ground beef', 'ribeye', 'sirloin', 'tenderloin', 'filet', 'meatball', 'hot dog', 'deli meat'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'sour cream', 'cottage', 'mozzarella', 'cheddar', 'parmesan', 'creamer', 'half and half'],
  bakery: ['bread', 'croissant', 'muffin', 'cake', 'bagel', 'cookie', 'brownie', 'donut', 'pastry', 'roll', 'baguette', 'tortilla', 'pita', 'pie', 'cupcake'],
  snacks: ['chips', 'crackers', 'nuts', 'almond', 'snack', 'granola', 'popcorn', 'pretzel', 'trail mix', 'cashew', 'pistachio', 'walnut', 'peanut', 'candy', 'chocolate', 'gummy', 'protein bar', 'energy bar'],
  beverages: ['water', 'coffee', 'tea', 'juice', 'soda', 'drink', 'wine', 'beer', 'kombucha', 'sparkling', 'lemonade', 'smoothie', 'espresso', 'cold brew', 'energy drink', 'gatorade', 'mineral water', 'coconut water'],
  frozen: ['frozen', 'ice cream', 'pizza', 'popsicle', 'gelato', 'sorbet', 'frozen meal', 'frozen vegetable', 'frozen fruit'],
  pantry: ['rice', 'pasta', 'sauce', 'oil', 'flour', 'sugar', 'cereal', 'soup', 'canned', 'olive oil', 'vinegar', 'spice', 'seasoning', 'honey', 'jam', 'peanut butter', 'maple syrup', 'ketchup', 'mustard', 'mayo', 'noodle', 'broth'],
  household: ['paper towel', 'detergent', 'trash bag', 'tissue', 'cleaning', 'battery', 'towel', 'napkin', 'aluminum foil', 'plastic wrap', 'sponge', 'dish soap', 'laundry', 'air freshener', 'light bulb', 'candle', 'storage', 'container', 'ziplock', 'glad'],
  personal: ['shampoo', 'toothpaste', 'soap', 'lotion', 'moisturizer', 'sunscreen', 'deodorant', 'razor', 'dental', 'floss', 'body wash', 'conditioner', 'hair', 'skin care', 'makeup', 'cosmetic', 'face wash', 'perfume', 'cologne'],
  electronics: ['tv', 'television', 'laptop', 'computer', 'tablet', 'ipad', 'phone', 'iphone', 'samsung', 'airpod', 'headphone', 'speaker', 'bluetooth', 'usb', 'charger', 'cable', 'monitor', 'printer', 'camera', 'gopro', 'drone', 'smart watch', 'fitbit', 'garmin', 'router', 'wifi', 'hard drive', 'ssd', 'flash drive', 'keyboard', 'mouse', 'gaming', 'playstation', 'xbox', 'nintendo', 'ring doorbell', 'nest', 'sonos', 'roku', 'apple watch', 'macbook'],
  clothing: ['shirt', 'pants', 'jacket', 'coat', 'dress', 'shorts', 'sock', 'underwear', 'jeans', 'sweater', 'hoodie', 'polo', 'shoe', 'sneaker', 'boot', 'sandal', 'slipper', 'backpack', 'luggage', 'suitcase', 'handbag', 'wallet', 'belt', 'hat', 'cap', 'glove', 'scarf', 'legging', 'activewear', 'athletic wear', 'puma', 'adidas', 'nike', 'kirkland signature boxer'],
  health: ['vitamin', 'supplement', 'medicine', 'allergy', 'tylenol', 'advil', 'ibuprofen', 'acetaminophen', 'probiotic', 'melatonin', 'fish oil', 'omega', 'calcium', 'magnesium', 'zinc', 'multivitamin', 'first aid', 'bandage', 'thermometer', 'blood pressure', 'glucosamine', 'collagen', 'turmeric', 'elderberry', 'emergen-c', 'flonase', 'claritin', 'zyrtec', 'pharmacy'],
  baby: ['baby', 'diaper', 'wipe', 'formula', 'infant', 'toddler', 'stroller', 'car seat', 'pacifier', 'bottle', 'sippy cup', 'huggies', 'pampers', 'kids'],
  pet: ['dog food', 'cat food', 'pet food', 'dog treat', 'cat treat', 'cat litter', 'pet bed', 'dog toy', 'cat toy', 'pet shampoo', 'flea', 'tick', 'kibble', 'purina', 'pedigree', 'blue buffalo', 'iams'],
  outdoor: ['tent', 'camping', 'hiking', 'bicycle', 'bike', 'kayak', 'fishing', 'grill', 'bbq', 'patio', 'lawn', 'garden', 'mower', 'hose', 'sprinkler', 'outdoor furniture', 'cooler', 'sleeping bag', 'golf', 'yoga mat', 'dumbbell', 'weight', 'treadmill', 'exercise', 'fitness', 'basketball', 'football', 'soccer', 'baseball', 'trampoline', 'pool', 'swim'],
  auto: ['motor oil', 'tire', 'wiper', 'car wash', 'car cover', 'floor mat', 'jump starter', 'dash cam', 'car charger', 'gas can', 'garage', 'tool set', 'drill', 'wrench', 'socket', 'craftsman', 'dewalt', 'milwaukee', 'power tool'],
  office: ['printer paper', 'ink', 'toner', 'pen', 'pencil', 'notebook', 'binder', 'folder', 'stapler', 'tape', 'scissors', 'desk', 'chair', 'shredder', 'laminator', 'calculator', 'planner', 'calendar', 'envelope', 'label'],
};

export function assignCategory(title: string, categoryHints?: string[]): string {
  const searchText = [title, ...(categoryHints ?? [])].join(' ').toLowerCase();

  for (const [categoryId, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => searchText.includes(kw))) {
      return categoryId;
    }
  }

  return 'other'; // default fallback
}
