import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import {BrowserRouter} from 'react-router-dom'
import GlobleStyle from '~/components/GlobleStyle'
import CssBaseline from '@mui/material/CssBaseline'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
   <BrowserRouter>
      <CssBaseline />
      <GlobleStyle>
        <App />
      </GlobleStyle>
    </BrowserRouter>
  </React.StrictMode>,
)
