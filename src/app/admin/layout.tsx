import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    redirect('/')
  }

  return children
}
