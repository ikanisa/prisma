import Bottleneck from "bottleneck"

export const aiRateLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 200
})
