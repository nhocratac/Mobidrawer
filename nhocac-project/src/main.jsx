import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import GlobleStyle from '~/components/GlobleStyle'
import { Provider } from 'react-redux'
import store from './redux/store'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <GlobleStyle>
          <App />
        </GlobleStyle>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
)
