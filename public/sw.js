self.addEventListener('push', (event) => {
  let payload = {
    title: 'ProdeBEB',
    body: 'Tenés partidos pendientes.',
    url: '/prode/fecha',
  }

  try {
    payload = { ...payload, ...event.data?.json() }
  } catch {
    // Keep default payload when push body is invalid.
  }

  const icon = payload.icon ?? '/icon'

  const options = {
    body: payload.body,
    icon,
    badge: icon,
    tag: payload.tag ?? 'prodebeb-push',
    renotify: true,
    data: { url: payload.url },
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/prode/fecha'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(absoluteUrl)
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl)
      }

      return undefined
    }),
  )
})
