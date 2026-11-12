import type { FoodLog } from '../types/database'

export interface DayFoodTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  count: number
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = startOfDay(d)
  x.setDate(x.getDate() + 1)
  return x
}

export function isSameDay(iso: string, day = new Date()) {
  const t = new Date(iso).getTime()
  return t >= startOfDay(day).getTime() && t < endOfDay(day).getTime()
}

export function sumFoodLogs(logs: FoodLog[]): DayFoodTotals {
  return logs.reduce<DayFoodTotals>(
    (acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      protein_g: acc.protein_g + Number(log.protein_g ?? 0),
      carbs_g: acc.carbs_g + Number(log.carbs_g ?? 0),
      fat_g: acc.fat_g + Number(log.fat_g ?? 0),
      count: acc.count + 1,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 },
  )
}

export function dayRangeIso(day = new Date()) {
  return {
    from: startOfDay(day).toISOString(),
    to: endOfDay(day).toISOString(),
  }
}
