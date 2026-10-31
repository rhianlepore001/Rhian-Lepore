/*
 * Ponte de atualização do Service Worker (carregada via importScripts pelo sw.js).
 *
 * Regra: uma versão nova só fica "esperando" quando existe uma janela do app que
 * sabe mostrar o aviso "Nova versão disponível". Se nenhuma janela responder
 * (app aberto numa versão antiga, que não tem o aviso, ou nenhuma janela aberta),
 * a versão nova assume sozinha — é o comportamento que o app sempre teve, e é o
 * que tira os aparelhos antigos do "travado".
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.active) {
        let promptAware = false;
        try {
          const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          const answers = await Promise.all(
            windows.map(
              (client) =>
                new Promise((resolve) => {
                  const channel = new MessageChannel();
                  const timer = setTimeout(() => resolve(false), 1500);
                  channel.port1.onmessage = (message) => {
                    clearTimeout(timer);
                    resolve(Boolean(message.data && message.data.type === 'UPDATE_UI_READY'));
                  };
                  try {
                    client.postMessage({ type: 'UPDATE_UI_PING' }, [channel.port2]);
                  } catch (error) {
                    clearTimeout(timer);
                    resolve(false);
                  }
                }),
            ),
          );
          promptAware = answers.some(Boolean);
        } catch (error) {
          promptAware = false;
        }
        if (!promptAware) {
          await self.skipWaiting();
        }
      }
    })(),
  );
});
