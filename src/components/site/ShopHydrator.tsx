"use client";

import { useEffect } from "react";
import { useShop } from "@/store/shop";

/** Restores the cart and saved looks from localStorage after hydration. */
export function ShopHydrator() {
  useEffect(() => {
    void useShop.persist.rehydrate();
  }, []);
  return null;
}
