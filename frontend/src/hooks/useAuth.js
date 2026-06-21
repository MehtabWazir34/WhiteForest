import { useContext } from "react";\nimport { AuthContext } from "../context/AuthContext";\nexport default function useAuth() { return useContext(AuthContext); }
