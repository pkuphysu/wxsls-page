export function getAuth () {
  const token = localStorage.getItem('wxtoken')
  return token
}
