import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile, Settings } from './types'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  settings: Settings | null
  isAdmin: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  const uid = session?.user.id
  const prof = useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid!).maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
  })
  const set = useQuery({
    queryKey: ['settings'],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
      return data as Settings | null
    },
  })

  const profile = prof.data ?? null
  const value: AuthCtx = {
    session,
    profile,
    settings: set.data ?? null,
    isAdmin: profile?.role === 'admin' && profile.active,
    loading: !ready || (!!uid && prof.isLoading),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
