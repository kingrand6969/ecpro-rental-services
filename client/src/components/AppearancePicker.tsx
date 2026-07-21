import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, SKINS, type Skin } from "@/hooks/useTheme";

/** Tiny non-interactive preview of what each skin does to a card. */
function SkinSwatch({ skin }: { skin: Skin }) {
  const palette: Record<Skin, { panel: string; edge: string; accent: string; bars: string[] }> = {
    classic: {
      panel: "linear-gradient(135deg, hsl(220 30% 12% / .95), hsl(220 30% 12% / .75))",
      edge: "hsl(220 30% 20%)",
      accent: "hsl(190 95% 60%)",
      bars: ["hsl(190 95% 60%)", "hsl(320 90% 65%)", "hsl(262 70% 65%)"],
    },
    neon: {
      panel: "linear-gradient(135deg, hsl(220 30% 12% / .95), hsl(220 30% 12% / .75))",
      edge: "hsl(220 22% 34%)",
      accent: "hsl(190 72% 58%)",
      bars: ["hsl(214 72% 64%)", "hsl(160 55% 52%)", "hsl(350 82% 66%)"],
    },
    console: {
      panel: "hsl(220 12% 13%)",
      edge: "hsl(220 10% 30%)",
      accent: "hsl(214 78% 70%)",
      bars: ["hsl(214 72% 64%)", "hsl(160 55% 52%)", "hsl(350 82% 66%)"],
    },
  };
  const p = palette[skin];
  return (
    <div
      aria-hidden="true"
      className="rounded-md p-2 flex flex-col gap-1.5"
      style={{ background: p.panel, border: `1px solid ${p.edge}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            color: "hsl(220 10% 65%)",
            fontSize: 7,
            letterSpacing: skin === "console" ? ".01em" : ".1em",
            textTransform: skin === "console" ? "none" : "uppercase",
            fontFamily: skin === "console" ? "var(--font-sans)" : "var(--font-mono)",
          }}
        >
          {skin === "console" ? "This month" : "This Month"}
        </span>
        <span
          style={{
            color: skin === "console" ? "hsl(220 10% 95%)" : p.accent,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: skin === "console" ? "var(--font-sans)" : "var(--font-mono)",
            textShadow: skin === "classic" ? `0 0 10px ${p.accent}` : "none",
          }}
        >
          ₱347,810
        </span>
      </div>
      <div className="flex flex-col gap-1">
        {p.bars.map((c, i) => (
          <div
            key={i}
            style={{
              height: 5,
              borderRadius: 2,
              background: c,
              width: `${[85, 60, 45][i]}%`,
              boxShadow: skin === "classic" ? `0 0 8px ${c}59` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function AppearancePicker() {
  const { theme, setTheme, skin, setSkin } = useTheme();

  return (
    <div className="glass-panel rounded-md">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-neon-cyan" />
          <h2 className="ui-label">Appearance</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how the app looks. This is saved on this device only, so
          everyone can pick what suits them.
        </p>
      </div>

      <div className="p-4 flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="ui-label mb-2">Design</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {SKINS.map((s) => {
              const active = skin === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSkin(s.id)}
                  aria-pressed={active}
                  data-testid={`button-skin-${s.id}`}
                  className={`text-left rounded-md border p-3 flex flex-col gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    active
                      ? "border-neon-cyan bg-neon-cyan/10"
                      : "border-border hover:border-neon-cyan/50"
                  }`}
                >
                  <SkinSwatch skin={s.id} />
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{s.name}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5 text-neon-cyan" aria-hidden="true" />
                    )}
                    {active && <span className="sr-only">(selected)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground leading-snug">
                    {s.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="ui-label mb-2">Brightness</legend>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              data-testid="button-theme-dark"
              className="gap-2"
            >
              <Moon className="h-4 w-4" aria-hidden="true" />
              Dark
            </Button>
            <Button
              type="button"
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              data-testid="button-theme-light"
              className="gap-2"
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
              Light
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Light is easier on the eyes in daylight — useful for handovers
            outdoors.
          </p>
        </fieldset>
      </div>
    </div>
  );
}
