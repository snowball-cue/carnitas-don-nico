import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Brand palette (from logo — forest green + gold)
        nopal: {
          DEFAULT: "#3A4A2F",
          dark: "#1F2818",
        },
        mole: {
          DEFAULT: "#1F2818",
          60: "#4A4033",
        },
        oro: {
          DEFAULT: "#C8A04A",
          light: "#E0BE73",
        },
        papel: {
          DEFAULT: "#F5EFE0",
          warm: "#EDE3CE",
        },
        chile: {
          DEFAULT: "#9A2E2A",
        },
        jamaica: {
          DEFAULT: "#B13A5E",
        },
        talavera: {
          DEFAULT: "#2B5D8F",
        },
        agave: {
          DEFAULT: "#7A8D5C",
          sage: "#7A8D5C",
        },

        // shadcn/ui tokens → mapped to CSS variables
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "ui-serif", "cursive"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "cazo-1":
          "0 1px 2px rgba(31,40,24,0.08), 0 2px 6px rgba(31,40,24,0.06)",
        "cazo-2":
          "0 4px 12px rgba(31,40,24,0.14), 0 8px 24px rgba(31,40,24,0.08)",
      },
      keyframes: {
        stir: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "confetti-petals": {
          "0%": {
            transform: "translate3d(0,-10vh,0) rotate(0deg)",
            opacity: "0",
          },
          "10%": { opacity: "1" },
          "100%": {
            transform:
              "translate3d(var(--drift,0),110vh,0) rotate(540deg)",
            opacity: "0",
          },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        stir: "stir 2s linear infinite",
        "confetti-petals": "confetti-petals 2s ease-in forwards",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        warm: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
