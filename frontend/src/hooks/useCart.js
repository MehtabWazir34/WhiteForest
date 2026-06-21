import { useContext } from "react";\nimport { CartContext } from "../context/CartContext";\nexport default function useCart() { return useContext(CartContext); }
