import env from "../utils/environment"

const saveToken = (token) => {
  localStorage.setItem(`${env.APP_NAME}-token`, token)
}

const getToken = () => {
  return localStorage.getItem(`${env.APP_NAME}-token`)
}

const removeToken = () => {
    localStorage.removeItem(`${env.APP_NAME}-token`)
}


const updateToken = (token) => {
    removeToken()
    saveToken(token)
}

const isTokenExpired = (token) => {
  const payload = JSON.parse(atob(token.split('.')[1]))
  const exp = payload.exp
  const now = Date.now() / 1000
  return now > exp
}

const manageToken = { saveToken, getToken, removeToken, updateToken,isTokenExpired }

export default manageToken