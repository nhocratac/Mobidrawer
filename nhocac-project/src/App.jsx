import { Routes,Route } from "react-router-dom"
import  {PublicRoute} from './routeConfig/route'
import  DeFaultLayout from './components/Layout/Defautlayout'

function App() {
  return (
    <>
      <Routes>
        {PublicRoute.map((route, index) => {
          const Layout = route.layout || DeFaultLayout
          return (
            <Route
              key={index}
              path={route.path}
              element={<Layout>
                <route.component />
              </Layout>}
            />
          )
        })}
      </Routes>
    </>
  )
}

export default App
