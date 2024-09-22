'use client';
import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onClickFetch = () => {
    setLoading(true);
    setError('');
    
    fetch('http://127.0.0.1:8000/api/flights') // URL of your Laravel backend
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setMessage(data.json);
        console.log(data);
        setLoading(false);
      })
      .catch(error => {
        setError('Error: ' + error.message);
        setLoading(false);
      });
  };

  return (
    <div>
      <button onClick={onClickFetch} disabled={loading}>
        {loading ? 'Loading...' : 'Test Btn'}
      </button>
      <div className='w-[100px] h-[200px] bg-slate-500'>
        {error ? <h1>{error}</h1> : <h1>{message}</h1>}
      </div>
    </div>
  );
}

export default App;
