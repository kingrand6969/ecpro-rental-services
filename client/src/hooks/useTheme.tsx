import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

/**
 * Appearance is two independent choices:
 *   theme — light or dark ground
 *   skin  — the visual language layered on top
 *
 * "classic" is the original Neon Fleet look, kept so nobody is forced onto a
 * new design. "neon" is that same identity with the legibility problems fixed
 * (no glow on numerals, desaturated accents, real borders). "console" is the
 * restrained treatment described in design_guidelines.md.
 */
export type Skin = "classic" | "neon" | "console";

export const SKINS: { id: Skin; name: string; description: string }[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original look — neon glow, vehicle-coloured timeline bars.",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Same identity, easier to read. Colour marks status, not decoration.",
  },
  {
    id: "console",
    name: "Console",
    description: "Restrained and calm. Plain labels, colour only when something is wrong.",
  },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  skin: Skin;
  setSkin: (s: Skin) => void;
}

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  // Neon Fleet is dark-first, but honor an explicit light system preference so
  // light-mode users aren't surprised on first visit. The toggle still lets
  // anyone switch either way.
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

function resolveInitialSkin(): Skin {
  if (typeof window === "undefined") return "classic";
  const stored = localStorage.getItem("skin") as Skin | null;
  if (stored === "classic" || stored === "neon" || stored === "console") {
    return stored;
  }
  // Default to the look already in use so an update never changes the app
  // under someone mid-shift.
  return "classic";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());
  const [skin, setSkinState] = useState<Skin>(() => resolveInitialSkin());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-skin", skin);
    localStorage.setItem("skin", skin);
  }, [skin]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === "light" ? "dark" : "light")),
    [],
  );
  const setSkin = useCallback((next: Skin) => setSkinState(next), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, skin, setSkin }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a <ThemeProvider>");
  }
  return ctx;
}
