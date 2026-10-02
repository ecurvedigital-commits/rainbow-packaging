import { apiRouter } from '../src/routes/index.js';

export function getRegisteredRoutes() {
  const routes = [];

  const routePrefixes = [
    { prefix: '/health', handle: apiRouter.stack[0]?.handle },
    { prefix: '/auth', handle: apiRouter.stack[1]?.handle },
    { prefix: '/users', handle: apiRouter.stack[2]?.handle },
    { prefix: '/reels', handle: apiRouter.stack[3]?.handle },
    { prefix: '/approvals', handle: apiRouter.stack[4]?.handle },
    { prefix: '/notifications', handle: apiRouter.stack[5]?.handle },
    { prefix: '/dashboard', handle: apiRouter.stack[6]?.handle },
    { prefix: '/field-definitions', handle: apiRouter.stack[7]?.handle },
    { prefix: '/audit', handle: apiRouter.stack[8]?.handle },
    { prefix: '/digest', handle: apiRouter.stack[9]?.handle },
    { prefix: '/settings', handle: apiRouter.stack[10]?.handle },
  ];

  for (const { prefix, handle } of routePrefixes) {
    if (handle && handle.stack) {
      for (const layer of handle.stack) {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
          for (const method of methods) {
            const path = (`/api/v1${prefix}${layer.route.path === '/' ? '' : layer.route.path}`).replace(/\/+/g, '/');
            routes.push({ method, path, prefix });
          }
        }
      }
    }
  }

  return routes;
}

if (process.argv[1].endsWith('extractRoutes.js')) {
  const routes = getRegisteredRoutes();
  console.log(`Total Registered Express API Endpoints: ${routes.length}`);
  routes.forEach((r, i) => console.log(`${i + 1}. ${r.method} ${r.path}`));
}
