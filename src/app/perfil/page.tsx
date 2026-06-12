import { AppShell } from '@/components/layout/app-shell'
import { ProfileStats, RecentPredictions } from '@/components/perfil/profile-stats'
import { PushRemindersSettings } from '@/components/perfil/push-reminders-settings'
import { SignOutAction } from '@/components/perfil/sign-out-action'
import { UserInitialAvatar } from '@/components/ui/user-initial-avatar'
import { prisma } from '@/lib/prisma'
import { canUsePushReminders, isPushRemindersAdminOnly } from '@/lib/push/config'
import { ensureDbUser, getUserProfileStats } from '@/lib/queries/users'
import { currentUser } from '@clerk/nextjs/server'

export default async function PerfilPage() {
  const clerkUser = await currentUser()
  const dbUser = await ensureDbUser()

  if (!clerkUser || !dbUser) {
    return (
      <AppShell pathname="/perfil">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-heading text-3xl tracking-wide">PERFIL</h1>
          <p className="mt-3 text-muted-foreground">No se pudo cargar tu perfil.</p>
        </div>
      </AppShell>
    )
  }

  const [stats, pushSubscriptionCount] = await Promise.all([
    getUserProfileStats(dbUser.id),
    prisma.pushSubscription.count({ where: { userId: dbUser.id } }),
  ])
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    dbUser.email

  return (
    <AppShell pathname="/perfil">
      <section className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <UserInitialAvatar name={dbUser.name} size="lg" />
        <div>
          <h1 className="font-heading text-3xl tracking-wide">{dbUser.name}</h1>
          <p className="text-muted-foreground">{email}</p>
          <p className="mt-1 text-sm text-brand-gold">Torneo Global · ProdeBEB</p>
        </div>
      </section>

      {canUsePushReminders(dbUser) ? (
        <section className="mb-8">
          <h2 className="mb-4 font-heading text-xl tracking-wide">NOTIFICACIONES</h2>
          <PushRemindersSettings
            pushRemindersEnabled={dbUser.pushRemindersEnabled}
            pushSubscriptionCount={pushSubscriptionCount}
            adminOnlyMode={isPushRemindersAdminOnly()}
          />
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-4 font-heading text-xl tracking-wide">ESTADÍSTICAS</h2>
        <ProfileStats
          pointsMatchday={stats.pointsMatchday}
          pointsScorers={stats.pointsScorers}
          pointsComplete={stats.pointsComplete}
          pointsTotal={stats.pointsTotal}
          predictionsCount={stats.predictionsCount}
          hitRate={stats.hitRate}
        />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-xl tracking-wide">ÚLTIMAS PREDICCIONES</h2>
        <RecentPredictions predictions={stats.recentPredictions} />
      </section>

      <div className="mt-10 flex justify-center">
        <SignOutAction />
      </div>
    </AppShell>
  )
}
