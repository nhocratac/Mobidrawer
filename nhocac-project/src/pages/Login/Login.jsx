import React from 'react'
import authentic from '../../services/authentic'

const Login = () => {
  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      email: e.target.email.value,
      password: e.target.password.value}
    authentic.login(data)
    .then(res => {
    })
    .catch(err => {
    })
  }
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor='email'>Email</label>
          <input type='email' id='email' name='email' />
        </div>
        <div>
          <label htmlFor='password'>Password</label>
          <input type='password' id='password' name='password' />
        </div>
        <button type='submit'>Login</button>
      </form>
    </div>
  )
}

export default Login
