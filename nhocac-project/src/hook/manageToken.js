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

const manageToken = { saveToken, getToken, removeToken, updateToken }

export default manageToken