/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
		colors: {
			gray: {
				100: 'var(--color-gray-100)',
				200: 'var(--color-gray-200)',
			},
			black: 'var(--color-black)',
			white: 'var(--color-white)',
		},
	},
	plugins: [],
}
