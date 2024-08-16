import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import App from './App.jsx'
import store, { persistor } from './redux/store'
import GlobleStyle from '~/components/GlobleStyle'


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <GlobleStyle>
            <App />
          </GlobleStyle>
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>,
)
