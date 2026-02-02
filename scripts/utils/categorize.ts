// Category keyword map — extracted from the original Costco scraper
const CATEGORY_MAP: Record<string, string[]> = {
  produce: ['fruit', 'vegetable', 'organic produce', 'berries', 'avocado', 'lettuce', 'salad', 'apple', 'banana', 'grape', 'tomato', 'pepper', 'onion', 'potato', 'mushroom', 'broccoli', 'spinach', 'kale', 'mango', 'melon', 'watermelon', 'pineapple', 'strawberr', 'blueberr', 'raspberr', 'citrus', 'lemon', 'lime', 'orange', 'peach', 'pear', 'cherry', 'corn'],
  meat: ['beef', 'chicken', 'pork', 'salmon', 'shrimp', 'steak', 'seafood', 'fish', 'turkey', 'lamb', 'crab', 'lobster', 'tuna', 'tilapia', 'sausage', 'bacon', 'ham', 'ribs', 'brisket', 'ground beef', 'ribeye', 'sirloin', 'tenderloin', 'filet'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'sour cream', 'cottage', 'mozzarella', 'cheddar', 'parmesan'],
  bakery: ['bread', 'croissant', 'muffin', 'cake', 'bagel', 'cookie', 'brownie', 'donut', 'pastry', 'roll', 'baguette', 'tortilla', 'pita'],
  snacks: ['chips', 'crackers', 'nuts', 'almond', 'snack', 'granola', 'popcorn', 'pretzel', 'trail mix', 'cashew', 'pistachio', 'walnut', 'peanut', 'candy', 'chocolate'],
  beverages: ['water', 'coffee', 'tea', 'juice', 'soda', 'drink', 'wine', 'beer', 'kombucha', 'sparkling', 'lemonade', 'smoothie', 'espresso', 'cold brew'],
  frozen: ['frozen', 'ice cream', 'pizza', 'popsicle', 'gelato', 'sorbet'],
  pantry: ['rice', 'pasta', 'sauce', 'oil', 'flour', 'sugar', 'cereal', 'soup', 'canned', 'olive oil', 'vinegar', 'spice', 'seasoning', 'honey', 'jam', 'peanut butter', 'maple syrup', 'ketchup', 'mustard', 'mayo'],
  household: ['paper towel', 'detergent', 'trash bag', 'tissue', 'cleaning', 'battery', 'towel', 'napkin', 'aluminum foil', 'plastic wrap', 'sponge', 'dish soap', 'laundry'],
  personal: ['shampoo', 'toothpaste', 'soap', 'lotion', 'vitamin', 'supplement', 'moisturizer', 'sunscreen', 'deodorant', 'razor', 'dental', 'floss', 'body wash'],
};

export function assignCategory(title: string, categoryHints?: string[]): string {
  const searchText = [title, ...(categoryHints ?? [])].join(' ').toLowerCase();

  for (const [categoryId, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => searchText.includes(kw))) {
      return categoryId;
    }
  }

  return 'pantry'; // default fallback
}
