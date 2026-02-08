import packageJson from 'package.json'
import { redis } from 'bun'

export const buildChallengeCodeRedisKey = (email: string) => {
  return `${packageJson.name}:challengeCode:${email}`
}

export const buildAccessTokenRedisKey = (token: string) => {
  return `${packageJson.name}:accessToken:${token}`
}
export const getUserIdByAccessToken = async (token: string): Promise<string | null> => {
  return await redis.get(buildAccessTokenRedisKey(token))
}
