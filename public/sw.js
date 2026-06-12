self.addEventListener('push', (event) => {
  let payload = {
    title: 'ProdeBEB',
    body: 'Recordatorio de partidos del día.',
    url: '/prode/fecha',
  }

  try {
    payload = { ...payload, ...event.data?.json() }
  } catch {
    // Keep default payload when push body is invalid.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon',
      badge: '/icon',
      data: { url: payload.url },
    }),
  )
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
