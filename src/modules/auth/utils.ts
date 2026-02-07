import packageJson from 'package.json'

export const buildChallengeCodeRedisKey = (email: string) => {
  return `${packageJson.name}:challengeCode:${email}`
}

export const buildAccessTokenRedisKey = (token: string) => {
  return `${packageJson.name}:accessToken:${token}`
}
