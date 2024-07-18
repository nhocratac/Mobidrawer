import { Routes,Route } from "react-router-dom"
import  {PublicRoute} from './routeConfig/route'
import  DeFaultLayout from './components/Layout/Defautlayout'

function App() {
  return (
    <>
      <Routes>
        {PublicRoute.map((route, index) => {
          return (
            <Route
              key={index}
              path={route.path}
              element={<DeFaultLayout>
                <route.component />
              </DeFaultLayout>}
            />
          )
        })}
      </Routes>
    </>
  )
}

export default App
