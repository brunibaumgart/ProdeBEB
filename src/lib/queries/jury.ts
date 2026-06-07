import { prisma } from '@/lib/prisma'

export async function getUserJuryPredictionsMap(userId: string) {
  const predictions = await prisma.juryPrediction.findMany({
    where: { userId },
    include: {
      player: {
        select: { id: true, name: true, position: true, teamId: true },
      },
      team: {
        select: { id: true, nameEs: true, iso2: true, flagEmoji: true },
      },
    },
  })

  return new Map(predictions.map((prediction) => [prediction.categoryId, prediction]))
}
