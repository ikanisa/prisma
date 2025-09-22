
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '1rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			screens: {
				'xs': '475px',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				}
			},
			backgroundImage: {
				'electric-ocean': 'linear-gradient(135deg, #396afc 0%, #2948ff 100%)',
				'sunset-dream': 'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)',
				'royal-pulse': 'linear-gradient(135deg, #6A00F4 0%, #AD00FF 100%)',
				'glass-panel': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
				'glass-dark': 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 100%)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'3xl': '2rem',
				'4xl': '3rem'
			},
			fontSize: {
				'xxl': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
				'xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
				'lg': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
				'base': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500' }],
				'button': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }]
			},
			backdropBlur: {
				'4xl': '72px'
			},
			keyframes: {
				'fade-slide': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'glow-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 20px rgba(57, 106, 252, 0.3)'
					},
					'50%': {
						boxShadow: '0 0 40px rgba(57, 106, 252, 0.6)'
					}
				},
				'ripple': {
					'0%': {
						transform: 'scale(0)',
						opacity: '1'
					},
					'100%': {
						transform: 'scale(4)',
						opacity: '0'
					}
				}
			},
			animation: {
				'fade-slide': 'fade-slide 0.6s ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'ripple': 'ripple 0.6s linear'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
