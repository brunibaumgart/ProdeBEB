import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isJoinLinkRoute = createRouteMatcher(['/torneos/unirse/:code'])

const isProtectedRoute = createRouteMatcher([
  '/prode(.*)',
  '/torneos(.*)',
  '/perfil(.*)',
  '/admin(.*)',
  '/elegir-usuario',
])

export default clerkMiddleware(async (auth, req) => {
  if (isJoinLinkRoute(req)) return
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
