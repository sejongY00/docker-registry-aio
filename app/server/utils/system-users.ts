export const EVERYONE_USERNAME = 'everyone'

export function isEveryoneUsername(username: string): boolean {
  return username.toLowerCase() === EVERYONE_USERNAME
}
