import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCustomers, useSales } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useAuth } from '@/lib/auth'
import { Button, Card, Field, Input, Segmented } from '@/components/ui'
import { currentShift, fmtDate, inr, L, todayIST, addDays } from '@/lib/format'
import { sum, uuid } from '@/lib/utils'
import type { Shift } from '@/lib/types'
import PaymentsPanel from '@/components/PaymentsPanel'
import LedgerPanel from '@/components/LedgerPanel'
import CustomerForm from '@/components/CustomerForm'

type Tab = 'del' | 'pay' | 'ledger'

export default function CustomersPage() {
  const { t } = useTranslation()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState<Tab>((sp.get('tab') as Tab) || 'del')
  return (
    <div className="space-y-3">
      <Segmented<Tab> value={tab} onChange={setTab} options={[{ v: 'del', label: t('cust.deliveries') }, { v: 'pay', label: t('cust.payments') }, { v: 'ledger', label: t('cust.ledger') }]} />
      {tab === 'del' && <Deliveries />}
      {tab === 'pay' && <PaymentsPanel />}
      {tab === 'ledger' && <LedgerPanel />}
    </div>
  )
}

function Deliveries() {
  const { t } = useTranslation()
  const { isAdmin, settings } = useAuth()
  const save = useSave()
  const today = todayIST()
  const [date, setDate] = useState(today)
  const [shift, setShift] = useState<Shift>(currentShift())
  const { data: customers = [] } = useCustomers()
  const { data: sales = [] } = useSales(date, date)
  const active = customers.filter((c) => c.active)
  const [litres, setLitres] = useState<Record<string, string>>({})
  const [rates, setRates] = useState<Record<string, string>>({})
  const [addNew, setAddNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const minDate = isAdmin ? undefined : addDays(today, -(settings?.manager_edit_days ?? 2))

  // Pre-fill: saved sale if it exists, otherwise the customer's default quantity for the shift.
  useEffect(() => {
    const l: Record<string, string> = {}
    const r: Record<string, string> = {}
    for (const c of active) {
      const s = sales.find((x) => x.customer_id === c.id && x.shift === shift)
      const def = shift === 'Morning' ? c.default_morning_litres : c.default_evening_litres
      l[c.id] = s ? String(s.litres) : def ? String(def) : ''
      r[c.id] = String(s ? s.rate : c.default_rate)
    }
    setLitres(l)
    setRates(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, shift, sales.length, customers.length])

  const total = sum(active, (c) => Number(litres[c.id]) || 0)
  const amount = sum(active, (c) => (Number(litres[c.id]) || 0) * (Number(rates[c.id]) || 0))
  const filled = active.filter((c) => litres[c.id] !== '' && litres[c.id] != null)

  const saveAll = async () => {
    setBusy(true)
    const payload = filled.map((c) => ({
      id: sales.find((x) => x.customer_id === c.id && x.shift === shift)?.id ?? uuid(),
      customer_id: c.id, entry_date: date, shift, litres: Number(litres[c.id]) || 0, rate: Number(rates[c.id]) || 0,
    }))
    if (payload.length) await save('milk_sales', 'upsert', payload, { onConflict: 'customer_id,entry_date,shift' })
    setBusy(false)
  }

  return (
    <>
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('date')}><Input big type="date" value={date} min={minDate} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
          <Field label={fmtDate(date)}><Segmented value={shift} onChange={setShift} options={[{ v: 'Morning', label: '☀ ' + t('morning') }, { v: 'Evening', label: '🌙 ' + t('evening') }]} /></Field>
        </div>
      </Card>
      {active.map((c) => {
        const absent = Number(litres[c.id]) === 0 && litres[c.id] !== ''
        return (
          <Card key={c.id} className={`flex items-center gap-2 !p-3 ${absent ? '!bg-gray-100' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-extrabold">{c.name}</div>
              <div className="text-xs text-gray-600">{c.area} · ₹
                <input
                  type="number" inputMode="decimal" className="mx-1 w-14 rounded border border-gray-300 px-1 text-center"
                  value={rates[c.id] ?? ''} onChange={(e) => setRates((s) => ({ ...s, [c.id]: e.target.value }))}
                />/L = {inr((Number(litres[c.id]) || 0) * (Number(rates[c.id]) || 0))}
              </div>
            </div>
            <Button variant="outline" className="!h-14 !w-14 !px-0 text-2xl" onClick={() => setLitres((s) => ({ ...s, [c.id]: '0' }))} aria-label={t('cust.absent')}>✕</Button>
            <Input big type="number" inputMode="decimal" step="0.5" min="0" className="!w-24 text-center" placeholder="0" value={litres[c.id] ?? ''} onChange={(e) => setLitres((s) => ({ ...s, [c.id]: e.target.value }))} />
          </Card>
        )
      })}
      <Button variant="outline" className="w-full" onClick={() => setAddNew(true)}>+ {t('cust.addCustomer')}</Button>
      <div className="sticky bottom-24 z-10">
        <Button size="lg" className="w-full shadow-xl" disabled={busy || !filled.length} onClick={saveAll}>
          {t('milk.saveAll')} · {L(total)} L · {inr(amount)}
        </Button>
      </div>
      {addNew && <CustomerForm defaultRate={settings?.default_rate ?? 55} onClose={() => setAddNew(false)} />}
    </>
  )
}
