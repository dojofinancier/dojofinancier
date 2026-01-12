/**
 * Client-side cart utilities using localStorage
 */

export type CartItem = {
  id: string; // course or cohort ID
  type: "course" | "cohort";
  slug: string | null;
  title: string;
  price: number;
  addedAt: string; // ISO date string
};

const CART_STORAGE_KEY = "dojo_financier_cart";

/**
 * Get cart items from localStorage
 */
export function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save cart items to localStorage
 */
export function saveCartItems(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    // Dispatch event for cart counter updates
    window.dispatchEvent(new CustomEvent("cartUpdated"));
  } catch (error) {
    console.error("Failed to save cart:", error);
  }
}

/**
 * Add item to cart
 */
export function addToCart(item: Omit<CartItem, "addedAt">): void {
  const items = getCartItems();
  
  // Check if item already exists
  const exists = items.some((i) => i.id === item.id && i.type === item.type);
  if (exists) {
    return; // Already in cart
  }
  
  items.push({
    ...item,
    addedAt: new Date().toISOString(),
  });
  
  saveCartItems(items);
}

/**
 * Remove item from cart
 */
export function removeFromCart(itemId: string, type: "course" | "cohort"): void {
  const items = getCartItems();
  const filtered = items.filter((i) => !(i.id === itemId && i.type === type));
  saveCartItems(filtered);
}

/**
 * Clear cart
 */
export function clearCart(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("cartUpdated"));
}

/**
 * Get cart item count
 */
export function getCartItemCount(): number {
  return getCartItems().length;
}

/**
 * Check if item is in cart
 */
export function isInCart(itemId: string, type: "course" | "cohort"): boolean {
  const items = getCartItems();
  return items.some((i) => i.id === itemId && i.type === type);
}

