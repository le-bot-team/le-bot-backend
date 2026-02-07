import packageJson from 'package.json'

export const buildChallengeCodeRedisKey = (email: string) => {
  return `${packageJson.name}:challengeCode:${email}`
}
