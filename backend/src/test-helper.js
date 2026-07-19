let app;

export async function getApp() {
  if (!app) {
    const { buildApp } = await import('./server.js');
    app = await buildApp();
    await app.ready();
  }
  return app;
}

export async function closeApp() {
  if (app) {
    await app.close();
    app = null;
  }
}
