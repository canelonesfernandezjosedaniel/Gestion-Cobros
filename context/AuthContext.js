'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/supabase/client'

const AuthContext = createContext({}) 

export const AuthProvider = ({ children }) => {
const [user, setUser] = useState()
const [loading, setLoading] = useState(true)
const supabase = createClient() 

useEffect(() => {
// 1. Verificar si hay una sesión activa al cargar la app
const getSession = async () => {
const { data: { session } } = await supabase.auth.getSession()
setUser(session?.user ?? null)
setLoading(false)
} 

getSession()

// 2. Escuchar cambios en el estado de autenticación (login/logout)
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
setUser(session?.user ?? null)
setLoading(false)
})

return () => subscription.unsubscribe()

}, []) 

// Función de Login Real
const login = async (email, password) => {
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (error) throw error
return data
} 

// Función de Logout Real
const logout = async () => {
const { error } = await supabase.auth.signOut()
if (error) throw error
} 

const loginEmail = login

const loginGoogle = async () => {
const redirectTo = `${window.location.origin}/auth/callback`
const { data, error } = await supabase.auth.signInWithOAuth({
provider: 'google',
options: {
redirectTo,
queryParams: {
access_type: 'offline',
prompt: 'consent',
},
},
})
if (error) throw error
return data
}

return (
<AuthContext.Provider value={{ user, loading, loginEmail, loginGoogle, logout }}>
{children}
</AuthContext.Provider>
)
} 

export const useAuth = () => useContext(AuthContext)