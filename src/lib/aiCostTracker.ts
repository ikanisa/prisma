export class AICostTracker {
  private totals = new Map<string, number>()

  track(model: string, tokens: number, ratePer1K: number) {
    const cost = (tokens / 1000) * ratePer1K
    this.totals.set(model, (this.totals.get(model) ?? 0) + cost)
    return cost
  }

  total(model?: string) {
    if (model) return this.totals.get(model) ?? 0
    let sum = 0
    for (const v of this.totals.values()) sum += v
    return sum
  }
}
