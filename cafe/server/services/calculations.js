// All money is integer centavos. Ingredient quantities use integer base units.
export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
export function ingredientNeeds(items) {
  const needs = new Map();
  for (const item of items)
    for (const recipe of item.recipe) {
      const key = String(recipe.ingredient);
      const existing = needs.get(key) || {
        ingredient: key,
        name: recipe.name,
        unit: recipe.unit,
        quantity: 0,
      };
      existing.quantity += recipe.quantity * item.quantity;
      needs.set(key, existing);
    }
  return needs;
}
export function availableServings(product) {
  if (!product.active || !product.recipe.length) return 0;
  return Math.min(
    ...product.recipe.map((r) =>
      r.ingredient?.active ? Math.floor(r.ingredient.stock / r.quantity) : 0,
    ),
  );
}
export function nextStatus(status) {
  return { Queued: 'Preparing', Preparing: 'Ready', Ready: 'Completed' }[status] || null;
}
