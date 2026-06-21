import { useContext } from "react";\nimport { GuestSessionContext } from "../context/GuestSessionContext";\nexport default function useGuestSession() { return useContext(GuestSessionContext); }
