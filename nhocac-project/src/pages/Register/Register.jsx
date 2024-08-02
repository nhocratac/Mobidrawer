import React from 'react'
import classNames from 'classnames/bind'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import GoogleIcon from '@mui/icons-material/Google'
import PersonIcon from '@mui/icons-material/Person'
import { useNavigate, } from 'react-router-dom'

import authentic from '../../services/authentic'
import styles from './Register.module.scss'
import { manageToken } from '../../hook'

const cx = classNames.bind(styles)
const Register = () => {
  const navigate = useNavigate()
  const handleSubmit = (e) => {
    e.preventDefault()
    document.querySelector('#form-message-error').innerHTML = ''
    if( e.target.password.value !== e.target.RePassword.value) {
      document.querySelector('#form-message-error').innerHTML = 'Password and RePassword not match'
      return
    } 
    const data = {
      email: e.target.email.value,
      password: e.target.password.value,
      name: e.target.name.value,
    }
    authentic.register(data)
      .then(res => {
        alert('thành công')
        navigate('/login')
      })
      .catch(err => {
        if(err.status === 409) {
          document.querySelector('#form-message-error').innerHTML = 'Email already exists'
        }
        if(err.status === 401) {
          alert('Invalid email or password')
          document.querySelector('#form-message-error').innerHTML = 'Invalid email or password'
        }
      })
  }
  return (
    <div className={cx('wrapper')}>
      <h1 className={cx('login-title')}>Register</h1>
      <p className={cx('login-sub-title')}>Register to use more service </p>
      <form className={cx('form-container')} onSubmit={handleSubmit}>
        <div className={cx('form-controll')}>
          {/* <label htmlFor='email' className={cx('form-label')}>Email</label> */}
          <input type='text' placeholder='name' name='name' className={cx('form-input')} />
          <PersonIcon className={cx('form-icon')}></PersonIcon>
        </div>
        <div className={cx('form-controll')}>
          {/* <label htmlFor='email' className={cx('form-label')}>Email</label> */}
          <input type='email' placeholder='Email' name='email' className={cx('form-input')} />
          <EmailIcon className={cx('form-icon')}></EmailIcon>
        </div>
        <div className={cx('form-controll')}>
          {/* <label htmlFor='password' className={cx('form-label')}>Password</label> */}
          <input placeholder='Password' type='password' name='password' className={cx('form-input')} />
          <LockIcon className={cx('form-icon')}></LockIcon>
        </div>
        <div className={cx('form-controll')}>
          {/* <label htmlFor='password' className={cx('form-label')}>Password</label> */}
          <input placeholder='RePassword' type='password' name='RePassword' className={cx('form-input')} />
          <LockIcon className={cx('form-icon')}></LockIcon>
        </div>
        <div style={{color:'red', fontSize:'1.4rem'}} id='form-message-error'></div>
        <div>
          <button type='submit' className={cx('form-button')}>Register</button>
        </div>
        <div className={cx('login-footer')}>
          <p>You have account? <a href='/Login'>Login</a> | 
            <a href='/forgot-password'> Forgot Password</a></p>
        </div>
        <div className={cx('login-google')}>
          <GoogleIcon className={cx('login-google__icon')}></GoogleIcon>
          <div className={cx('login-google__button')}>Login with Google</div>
        </div>
      </form>
    </div>
  )
}

export default Register
