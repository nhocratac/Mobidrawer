import { useState, useEffect } from 'react'
import styles from './Profile.module.scss'
import classNames from 'classnames/bind'
import { Link } from 'react-router-dom'
import routePath from '../../routeConfig/path'

const cx = classNames.bind(styles)
const Profile = () => {
  const [user, setUser] = useState({
    username: 'admin',
    email: 'thang@gmail.com',
    avatar: 'https://th.bing.com/th/id/OIP.bO1GemP8D-9OGP6SRZrNLQHaJQ?w=160&h=200&c=7&r=0&o=5&dpr=1.3&pid=1.7',
    role: 'admin',
    name: 'nhoc ac',
    post: [
      {
        id: 1,
        title: 'title 1',
        content: 'content 1',
      },
      {
        id: 2,
        title: 'title 2',
        content: 'content 2',
      },
      {
        id: 3,
        title: 'title 3',
        content: 'content 3',
      },
    ],
    follower: 10,
    following: 5,
  })
  if (user == {})
    return <div>loading...</div>
  return (
    <div className={cx('wrapper')}>
      <div className={cx('container')}>
        <div className={cx('own-content')}>
          <div className={cx('avatar-img')}>
            <img src={user.avatar} alt="avatar" />
          </div>
          <div className={cx('own-info')}>
            <div className={cx('own-info--top')}>
              <div className={cx('own-info--top__name')}>
                <h3>{user.name}</h3>
              </div>
              <div className={cx('own-info--top__buttons')}>
                <button>Chỉnh sửa</button>
                <Link to= {routePath.login}><button>Đăng xuất</button></Link>
              </div>
            </div>
            <div className={cx('own-info--bottom')}>
              <div className={cx('own-info--bottom__post')}>
                <b>{user.post.length}</b>
                <span> Posts</span>
              </div>
              <div className={cx('own-info--bottom__follower')}>
                <b>{user.follower}</b>
                <span> Followers</span>
              </div>
              <div className={cx('own-info--bottom__following')}>
                <b>{user.following}</b>
                <span> Following</span>
              </div>
            </div>
          </div>
        </div>
        <div className={cx('own-story')}>
          this is story
        </div>
        <div className={cx('own-photo')}>

        </div>
      </div>
    </div>

  )
}

export default Profile
