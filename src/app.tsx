import { useEffect, PropsWithChildren } from 'react'
import './app.scss'
import { recordAppVersion } from '@/utils/app-version'

function App({ children }: PropsWithChildren) {
  useEffect(() => {
    recordAppVersion()
  }, [])

  return <>{children}</>
}

export default App
