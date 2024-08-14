import React from 'react'
import userServices from '../../services/userServices'

export default function Home() {
  const handleSearch = () => {
    const search = document.getElementById('search-oke').value
    userServices.seachUser(search)
    .then (res => console.log(res))
    .catch(err => console.log(err))
  }
  return (
    <div>
      <input type='text' id='search-oke'></input>
      <button onClick={handleSearch}>oke</button>
    </div>
  )
}
