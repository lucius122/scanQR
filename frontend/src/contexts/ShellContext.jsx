import { createContext, useContext, useState } from 'react'

const ShellContext = createContext(null)

export function ShellProvider({ children }) {
  const [activeTab, setActiveTab] = useState(null)
  return (
    <ShellContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ShellContext.Provider>
  )
}

export function useShellTab() {
  return useContext(ShellContext)
}
