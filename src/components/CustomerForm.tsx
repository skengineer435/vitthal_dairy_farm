import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCustomers } from '@/lib/data'
import { useSave } from '@/lib/useSave'
import { useToast } from '@/components/Toast'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { uuid } from '@/lib/utils'
import { toNum } from '@/lib/format'
import { CUSTOMER_TYPES, type Customer } from '@/lib/types'

export default function CustomerForm({ customer, defaultRate, onClose }: { customer?: Customer | null; defaultRate: number; onClose: () => void }) {
  const { t } = useTranslation()
  const save = useSave()
  const toast = useToast()
  useCustomers()
  const [f, setF] = useState({
    name: customer?.name ?? '', phone: customer?.phone ?? '', area: customer?.area ?? '', type: customer?.type ?? 'Home delivery',
    default_rate: String(customer?.default_rate ?? defaultRate), default_morning_litres: String(customer?.default_morning_litres ?? 0),
    default_evening_litres: String(customer?.default_evening_litres ?? 0), opening_balance: String(customer?.opening_balance ?? 0), active: customer?.active ?? true,
  })
  const set = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }))

  const submit = async () => {
    if (!f.name.trim()) return toast('Name required', 'err')
    const ok = await save('customers', 'upsert', {
      id: customer?.id ?? uuid(), name: f.name.trim(), phone: f.phone || null, area: f.area || null, type: f.type,
      default_rate: toNum(f.default_rate) ?? 0, default_morning_litres: toNum(f.default_morning_litres) ?? 0,
      default_evening_litres: toNum(f.default_evening_litres) ?? 0, opening_balance: toNum(f.opening_balance) ?? 0, active: f.active,
    })
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={customer ? t('edit') : t('cust.addCustomer')}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('name')} className="col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label={t('phone')}><Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label={t('area')}><Input value={f.area} onChange={(e) => set('area', e.target.value)} /></Field>
        <Field label={t('type')} className="col-span-2"><Select value={f.type} onChange={(e) => set('type', e.target.value)}>{CUSTOMER_TYPES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label={t('cust.defaultRate')}><Input type="number" inputMode="decimal" value={f.default_rate} onChange={(e) => set('default_rate', e.target.value)} /></Field>
        <Field label={t('cust.opening')}><Input type="number" inputMode="decimal" value={f.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} /></Field>
        <Field label={t('cust.morningL')}><Input type="number" inputMode="decimal" value={f.default_morning_litres} onChange={(e) => set('default_morning_litres', e.target.value)} /></Field>
        <Field label={t('cust.eveningL')}><Input type="number" inputMode="decimal" value={f.default_evening_litres} onChange={(e) => set('default_evening_litres', e.target.value)} /></Field>
        <label className="col-span-2 flex items-center gap-2 text-base font-bold"><input type="checkbox" className="h-6 w-6" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> {t('cust.active')}</label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>{t('cancel')}</Button>
        <Button className="flex-1" onClick={submit}>{t('save')}</Button>
      </div>
    </Modal>
  )
}

export { Textarea }
