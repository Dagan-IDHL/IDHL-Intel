import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = { kit: { adapter: adapter(), files: { routes: 'src/app_routes' } } };

export default config;
