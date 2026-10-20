
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Template = {
  id: string
  name: string
  system_size_kw: number
  description: string | null
}

type TemplateItem = {
  id: string
  category: string
  component_name: string
  description: string | null
  quantity: number | null
  unit: string | null
  exclude_if_no_pv: boolean
  sort_order: number
}

type BomItem = {
  id?: string
  category: string
  component_name: string
  description: string | null
  quantity: number | null
  unit: string | null
  exclude_if_no_pv: boolean
  ordered: boolean
  received: boolean
  notes: string
  sort_order: number
}

type Job = {
  id: string
  job_number: string
  title: string
}

type SavedBom = {
  id: string
  template_name: string
  system_size_kw: number
  client_name: string | null
  status: string
  created_at: string
  job_id: string | null
}

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900'

const buttonClass =
  'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'

const categories = [
  'Essential Load and Change Over',
  'Battery sundries',
  'Solar Combiner Box',
  'Conduit and Accessories',
  'Electrical Sundries',
  'Additional Items',
]

export default function BomOrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState('')
  const [, setTemplateItems] = useState<TemplateItem[]>([])
  const [items, setItems] = useState<BomItem[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [savedBoms, setSavedBoms] = useState<SavedBom[]>([])
  const [selectedSavedId, setSelectedSavedId] = useState('')
  const [editingBomId, setEditingBomId] = useState<string | null>(null)

  const [jobId, setJobId] = useState('')
  const [clientName, setClientName] = useState('')
  const [address, setAddress] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [inverter, setInverter] = useState('')
  const [battery, setBattery] = useState('')
  const [batteryQuantity, setBatteryQuantity] = useState(1)
  const [panels, setPanels] = useState('')
  const [panelQuantity, setPanelQuantity] = useState<number | ''>('')
  const [pvIncluded, setPvIncluded] = useState(true)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('draft')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const selectedTemplate = templates.find((t) => t.id === templateId)

  const loadSavedBoms = useCallback(async () => {
    const { data, error } = await supabase
      .from('job_boms')
      .select(
        'id, template_name, system_size_kw, client_name, status, created_at, job_id'
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      setError(`Could not load saved BOMs: ${error.message}`)
      return
    }

    setSavedBoms((data ?? []) as SavedBom[])
  }, [supabase])

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      setError('')

      const [templateResult, jobResult] = await Promise.all([
        supabase
          .from('system_bom_templates')
          .select('id, name, system_size_kw, description')
          .eq('active', true)
          .order('system_size_kw'),
        supabase
          .from('jobs')
          .select('id, job_number, title')
          .order('created_at', { ascending: false }),
      ])

      if (templateResult.error) {
        setError(`Could not load templates: ${templateResult.error.message}`)
      } else {
        const rows = (templateResult.data ?? []) as Template[]
        setTemplates(rows)
        const fiveKw = rows.find((t) => Number(t.system_size_kw) === 5)
        if (fiveKw) setTemplateId(fiveKw.id)
      }

      if (jobResult.error) {
        setError((current) =>
          current
            ? `${current}\nCould not load jobs: ${jobResult.error.message}`
            : `Could not load jobs: ${jobResult.error.message}`
        )
      } else {
        setJobs((jobResult.data ?? []) as Job[])
      }

      const { data: bomData, error: bomError } = await supabase
        .from('job_boms')
        .select(
          'id, template_name, system_size_kw, client_name, status, created_at, job_id'
        )
        .order('created_at', { ascending: false })
        .limit(50)

      if (bomError) {
        setError((current) =>
          current
            ? `${current}\nCould not load saved BOMs: ${bomError.message}`
            : `Could not load saved BOMs: ${bomError.message}`
        )
      } else {
        setSavedBoms((bomData ?? []) as SavedBom[])
      }

      setLoading(false)
    }

    void loadInitialData()
  }, [supabase])

  useEffect(() => {
    async function loadTemplateItems() {
      if (!templateId || editingBomId) return

      const { data, error } = await supabase
        .from('system_bom_template_items')
        .select(
          'id, category, component_name, description, quantity, unit, exclude_if_no_pv, sort_order'
        )
        .eq('template_id', templateId)
        .eq('active', true)
        .order('sort_order')

      if (error) {
        setError(`Could not load template items: ${error.message}`)
        return
      }

      const rows = (data ?? []) as TemplateItem[]
      setTemplateItems(rows)
      setItems(
        rows.map((item) => ({
          category: item.category,
          component_name: item.component_name,
          description: item.description,
          quantity: item.quantity === null ? null : Number(item.quantity),
          unit: item.unit,
          exclude_if_no_pv: item.exclude_if_no_pv,
          ordered: false,
          received: false,
          notes: '',
          sort_order: item.sort_order,
        }))
      )
      setStatus('draft')
      setMessage('')
      setError('')
    }

    void loadTemplateItems()
  }, [templateId, supabase, editingBomId])

  function updateItem(index: number, patch: Partial<BomItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        category: 'Additional Items',
        component_name: '',
        description: null,
        quantity: null,
        unit: null,
        exclude_if_no_pv: false,
        ordered: false,
        received: false,
        notes: '',
        sort_order: current.length + 1,
      },
    ])
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index))
  }

  function resetForm() {
    setEditingBomId(null)
    setSelectedSavedId('')
    setJobId('')
    setClientName('')
    setAddress('')
    setContactNumber('')
    setInverter('')
    setBattery('')
    setBatteryQuantity(1)
    setPanels('')
    setPanelQuantity('')
    setPvIncluded(true)
    setNotes('')
    setStatus('draft')
    setMessage('')
    setError('')
    router.refresh()
  }

  async function loadSavedBom(id: string) {
    if (!id) return
    setError('')
    setMessage('')
    setLoading(true)

    const { data: bom, error: bomError } = await supabase
      .from('job_boms')
      .select('*')
      .eq('id', id)
      .single()

    if (bomError || !bom) {
      setError(`Could not open BOM: ${bomError?.message ?? 'Not found'}`)
      setLoading(false)
      return
    }

    const { data: rows, error: itemsError } = await supabase
      .from('job_bom_items')
      .select('*')
      .eq('job_bom_id', id)
      .order('sort_order')

    if (itemsError) {
      setError(`Could not load saved items: ${itemsError.message}`)
      setLoading(false)
      return
    }

    setEditingBomId(id)
    setSelectedSavedId(id)
    setJobId(bom.job_id ?? '')
    setClientName(bom.client_name ?? '')
    setAddress(bom.address ?? '')
    setContactNumber(bom.contact_number ?? '')
    setInverter(bom.inverter ?? '')
    setBattery(bom.battery ?? '')
    setBatteryQuantity(Number(bom.battery_quantity ?? 1))
    setPanels(bom.panels ?? '')
    setPanelQuantity(
      bom.panel_quantity === null ? '' : Number(bom.panel_quantity)
    )
    setPvIncluded(Boolean(bom.pv_included))
    setNotes(bom.notes ?? '')
    setStatus(bom.status ?? 'draft')

    setItems(
      (rows ?? []).map((row) => ({
        id: row.id,
        category: row.category,
        component_name: row.component_name,
        description: row.description,
        quantity: row.quantity === null ? null : Number(row.quantity),
        unit: row.unit,
        exclude_if_no_pv: Boolean(row.exclude_if_no_pv),
        ordered: Boolean(row.ordered),
        received: Boolean(row.received),
        notes: row.notes ?? '',
        sort_order: Number(row.sort_order ?? 0),
      }))
    )

    setTemplateId(bom.template_id ?? '')
    setLoading(false)
  }

  async function saveBom() {
    if (!selectedTemplate && !editingBomId) {
      setError('Please select a system-size template first.')
      return
    }

    if (!clientName.trim()) {
      setError('Please enter the client name.')
      return
    }

    if (items.some((item) => !item.component_name.trim())) {
      setError('Every item needs a component name. Remove any blank rows.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const templateName =
      selectedTemplate?.name ??
      savedBoms.find((b) => b.id === editingBomId)?.template_name ??
      'Saved BOM'

    const systemSize =
      Number(selectedTemplate?.system_size_kw) ||
      Number(savedBoms.find((b) => b.id === editingBomId)?.system_size_kw) ||
      5

    const header = {
      job_id: jobId || null,
      template_id: templateId || null,
      template_name: templateName,
      system_size_kw: systemSize,
      client_name: clientName.trim(),
      address: address.trim() || null,
      contact_number: contactNumber.trim() || null,
      inverter: inverter.trim() || null,
      battery: battery.trim() || null,
      battery_quantity: Math.max(1, Number(batteryQuantity) || 1),
      panels: panels.trim() || null,
      panel_quantity: panelQuantity === '' ? null : Number(panelQuantity),
      pv_included: pvIncluded,
      status,
      notes: notes.trim() || null,
    }

    let bomId = editingBomId

    if (bomId) {
      const { error: updateError } = await supabase
        .from('job_boms')
        .update(header)
        .eq('id', bomId)

      if (updateError) {
        setError(`Could not update BOM: ${updateError.message}`)
        setSaving(false)
        return
      }

      const { error: deleteError } = await supabase
        .from('job_bom_items')
        .delete()
        .eq('job_bom_id', bomId)

      if (deleteError) {
        setError(`Could not update BOM items: ${deleteError.message}`)
        setSaving(false)
        return
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('job_boms')
        .insert(header)
        .select('id')
        .single()

      if (insertError || !data) {
        setError(
          `Could not save BOM: ${insertError?.message ?? 'No ID returned'}`
        )
        setSaving(false)
        return
      }

      bomId = data.id
      setEditingBomId(bomId)
    }

    const visibleItems = items.filter(
      (item) => pvIncluded || !item.exclude_if_no_pv
    )

    const snapshotRows = visibleItems.map((item, index) => ({
      job_bom_id: bomId!,
      category: item.category,
      component_name: item.component_name.trim(),
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      exclude_if_no_pv: item.exclude_if_no_pv,
      ordered: item.ordered,
      received: item.received,
      notes: item.notes.trim() || null,
      sort_order: index + 1,
    }))

    if (snapshotRows.length > 0) {
      const { error: itemsInsertError } = await supabase
        .from('job_bom_items')
        .insert(snapshotRows)

      if (itemsInsertError) {
        setError(
          `BOM header saved, but items failed to save: ${itemsInsertError.message}`
        )
        setSaving(false)
        return
      }
    }

    await loadSavedBoms()
    setSelectedSavedId(bomId!)
    setMessage('BOM saved successfully. Inventory has not been changed.')
    setSaving(false)
  }

  async function updateOrderStatus(nextStatus: string) {
    if (!editingBomId) {
      setStatus(nextStatus)
      return
    }

    setStatus(nextStatus)

    const { error } = await supabase
      .from('job_boms')
      .update({ status: nextStatus })
      .eq('id', editingBomId)

    if (error) {
      setError(`Could not update status: ${error.message}`)
      return
    }

    setMessage('Order status updated.')
    await loadSavedBoms()
  }

  const visibleItems = items.filter(
    (item) => pvIncluded || !item.exclude_if_no_pv
  )

  const groupedItems = categories
    .map((category) => ({
      category,
      items: visibleItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.category === category),
    }))
    .filter((group) => group.items.length > 0)

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Loading BOM Orders…</div>
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 text-gray-900 md:p-8">
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          html,
          body {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 9pt !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden !important;
          }

          #bom-print-area,
          #bom-print-area * {
            visibility: visible !important;
          }

          #bom-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            color: #000 !important;
            background: #fff !important;
          }

          .no-print {
            display: none !important;
          }

          #bom-print-area h1 {
            margin: 0 0 4px !important;
            font-size: 18pt !important;
            line-height: 1.2 !important;
          }

          #bom-print-area h2 {
            margin: 4px 0 !important;
            font-size: 13pt !important;
          }

          #bom-print-area h3 {
            margin: 10px 0 4px !important;
            padding-bottom: 3px !important;
            font-size: 10pt !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          #bom-print-area p {
            margin-top: 2px !important;
            margin-bottom: 2px !important;
          }

          #bom-print-area > div:first-child {
            margin-bottom: 12px !important;
          }

          #bom-print-area > div:first-child > div {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: 12px !important;
            row-gap: 4px !important;
          }

          #bom-print-area .overflow-x-auto {
            overflow: visible !important;
            width: 100% !important;
          }

          #bom-print-area table {
            display: table !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            margin: 0 0 8px !important;
            font-size: 8pt !important;
          }

          #bom-print-area thead {
            display: table-header-group !important;
          }

          #bom-print-area tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #bom-print-area th,
          #bom-print-area td {
            box-sizing: border-box !important;
            border: 1px solid #777 !important;
            padding: 4px 3px !important;
            vertical-align: top !important;
            text-align: left !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: normal !important;
            line-height: 1.25 !important;
          }

          #bom-print-area th {
            background: #eee !important;
            font-weight: bold !important;
          }

          /* The Edit column is hidden for printing, leaving six columns. */
          #bom-print-area th:nth-child(1),
          #bom-print-area td:nth-child(1) {
            width: 31% !important;
          }

          #bom-print-area th:nth-child(2),
          #bom-print-area td:nth-child(2) {
            width: 11% !important;
          }

          #bom-print-area th:nth-child(3),
          #bom-print-area td:nth-child(3) {
            width: 9% !important;
          }

          #bom-print-area th:nth-child(4),
          #bom-print-area td:nth-child(4),
          #bom-print-area th:nth-child(5),
          #bom-print-area td:nth-child(5) {
            width: 10% !important;
            text-align: center !important;
          }

          #bom-print-area th:nth-child(6),
          #bom-print-area td:nth-child(6) {
            width: 29% !important;
          }

          #bom-print-area input:not([type='checkbox']) {
            display: none !important;
          }

          #bom-print-area .hidden {
            display: inline !important;
          }

          #bom-print-area input[type='checkbox'] {
            display: inline-block !important;
            visibility: visible !important;
            width: 12px !important;
            height: 12px !important;
            margin: 0 auto !important;
            appearance: auto !important;
            -webkit-appearance: checkbox !important;
            accent-color: #000 !important;
            vertical-align: middle !important;
          }

          #bom-print-area .text-xs {
            font-size: 7pt !important;
          }

          #bom-print-area .text-sm {
            font-size: 8.5pt !important;
          }

          #bom-print-area .mt-8 {
            margin-top: 18px !important;
          }

          #bom-print-area .gap-8 {
            gap: 12px !important;
          }

          #bom-print-area .border-t {
            border-top: 1px solid #777 !important;
          }

          #bom-print-area .whitespace-pre-wrap {
            white-space: pre-wrap !important;
          }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">BOM Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Prepare, save, track and print job-specific material orders.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} onClick={resetForm}>
            New BOM
          </button>

          <button className={buttonClass} onClick={() => window.print()}>
            Print ordering sheet
          </button>

          <button
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            onClick={saveBom}
            disabled={saving}
          >
            {saving ? 'Saving…' : editingBomId ? 'Update BOM' : 'Save BOM'}
          </button>
        </div>
      </div>

      {error && (
        <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {message}
        </div>
      )}

      <section className="no-print rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <h2 className="mb-4 text-lg font-semibold">Open a saved BOM</h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className={inputClass}
            value={selectedSavedId}
            onChange={(e) => {
              setSelectedSavedId(e.target.value)
              if (e.target.value) void loadSavedBom(e.target.value)
            }}
          >
            <option value="">Select a saved BOM…</option>
            {savedBoms.map((bom) => (
              <option key={bom.id} value={bom.id}>
                {bom.client_name || 'Unnamed client'} — {bom.template_name} —{' '}
                {new Date(bom.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>

          <button
            className={buttonClass}
            disabled={!selectedSavedId}
            onClick={() => void loadSavedBom(selectedSavedId)}
          >
            Open BOM
          </button>
        </div>
      </section>

      <section className="no-print rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <h2 className="mb-4 text-lg font-semibold">System and client details</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            System-size template
            <select
              className={inputClass}
              value={templateId}
              onChange={(e) => {
                setEditingBomId(null)
                setSelectedSavedId('')
                setTemplateId(e.target.value)
              }}
              disabled={Boolean(editingBomId)}
            >
              <option value="">Choose a template…</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.system_size_kw} kW)
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Link to existing job (optional)
            <select
              className={inputClass}
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">Standalone BOM / link later</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.job_number} — {job.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Client name *
            <input
              className={inputClass}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client or company name"
            />
          </label>

          <label className="text-sm font-medium">
            Contact number
            <input
              className={inputClass}
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Client phone number"
            />
          </label>

          <label className="text-sm font-medium md:col-span-2">
            Installation address
            <textarea
              className={inputClass}
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full installation address"
            />
          </label>

          <label className="text-sm font-medium">
            Inverter
            <input
              className={inputClass}
              value={inverter}
              onChange={(e) => setInverter(e.target.value)}
              placeholder="Make, model and size"
            />
          </label>

          <label className="text-sm font-medium">
            Battery make / model
            <input
              className={inputClass}
              value={battery}
              onChange={(e) => setBattery(e.target.value)}
              placeholder="Battery model"
            />
          </label>

          <label className="text-sm font-medium">
            Number of batteries
            <input
              className={inputClass}
              type="number"
              min={1}
              value={batteryQuantity}
              onChange={(e) =>
                setBatteryQuantity(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </label>

          <label className="text-sm font-medium">
            Panels / model
            <input
              className={inputClass}
              value={panels}
              onChange={(e) => setPanels(e.target.value)}
              placeholder="Panel make, model or wattage"
            />
          </label>

          <label className="text-sm font-medium">
            Number of panels
            <input
              className={inputClass}
              type="number"
              min={0}
              value={panelQuantity}
              onChange={(e) =>
                setPanelQuantity(
                  e.target.value === ''
                    ? ''
                    : Math.max(0, Number(e.target.value))
                )
              }
              placeholder="Enter quantity"
            />
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={pvIncluded}
              onChange={(e) => setPvIncluded(e.target.checked)}
              className="h-4 w-4"
            />
            PV panels and solar combiner included
          </label>

          <label className="text-sm font-medium">
            Order status
            <select
              className={inputClass}
              value={status}
              onChange={(e) => void updateOrderStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="ready_to_order">Ready to order</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
            </select>
          </label>

          <label className="text-sm font-medium md:col-span-2">
            General notes
            <textarea
              className={inputClass}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery instructions, supplier details or job notes"
            />
          </label>
        </div>

        {editingBomId && (
          <p className="mt-4 text-xs text-amber-700">
            You are editing a saved BOM snapshot. Updating it replaces its saved
            item list with the current list.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Components and quantities</h2>
            <p className="mt-1 text-sm text-gray-600">
              {visibleItems.length} lines shown. Edit quantities for this order;
              the template itself is not changed.
            </p>
          </div>

          <button className={buttonClass} onClick={addItem}>
            + Add item
          </button>
        </div>

        <div id="bom-print-area">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">NEW TECH POWER</h1>
            <h2 className="mt-1 text-xl font-semibold">Material Ordering Sheet</h2>
            <p className="mt-1 text-sm">
              {selectedTemplate?.name ??
                savedBoms.find((b) => b.id === editingBomId)?.template_name ??
                'System BOM'}
            </p>

            <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <p><strong>Client:</strong> {clientName || 'Not entered'}</p>
              <p><strong>Contact:</strong> {contactNumber || 'Not entered'}</p>
              <p><strong>Address:</strong> {address || 'Not entered'}</p>
              <p><strong>Inverter:</strong> {inverter || 'Not entered'}</p>
              <p><strong>Battery:</strong> {battery || 'Not entered'}</p>
              <p><strong>Battery quantity:</strong> {batteryQuantity}</p>
              <p><strong>Panels:</strong> {panels || 'Not entered'}</p>
              <p>
                <strong>Panel quantity:</strong>{' '}
                {panelQuantity === '' ? 'Not entered' : panelQuantity}
              </p>
              <p><strong>PV included:</strong> {pvIncluded ? 'Yes' : 'No'}</p>
              <p><strong>Status:</strong> {status.replaceAll('_', ' ')}</p>
            </div>
          </div>

          {groupedItems.map((group) => (
            <div key={group.category} className="mb-6">
              <h3 className="mb-2 border-b border-gray-400 pb-1 font-semibold">
                {group.category}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Item</th>
                      <th className="border border-gray-300 p-2 text-left">Quantity</th>
                      <th className="border border-gray-300 p-2 text-left">Unit</th>
                      <th className="border border-gray-300 p-2 text-center">Ordered</th>
                      <th className="border border-gray-300 p-2 text-center">Received</th>
                      <th className="border border-gray-300 p-2 text-left">Notes</th>
                      <th className="no-print border border-gray-300 p-2 text-left">Edit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.items.map(({ item, index }) => (
                      <tr key={`${item.id ?? item.component_name}-${index}`}>
                        <td className="border border-gray-300 p-2">
                          <input
                            aria-label="Component name"
                            className="no-print w-full min-w-36 rounded border border-gray-200 px-2 py-1"
                            value={item.component_name}
                            onChange={(e) =>
                              updateItem(index, { component_name: e.target.value })
                            }
                          />
                          <span className="hidden print:inline">
                            {item.component_name}
                          </span>

                          {item.description && (
                            <p className="mt-1 text-xs text-gray-500">
                              {item.description}
                            </p>
                          )}

                          {item.quantity === null && (
                            <p className="mt-1 text-xs font-medium">
                              Quantity required
                            </p>
                          )}
                        </td>

                        <td className="border border-gray-300 p-2">
                          <input
                            aria-label="Quantity"
                            className="no-print w-24 rounded border border-gray-200 px-2 py-1"
                            type="number"
                            min={0}
                            step="any"
                            value={item.quantity ?? ''}
                            placeholder="Required"
                            onChange={(e) =>
                              updateItem(index, {
                                quantity:
                                  e.target.value === ''
                                    ? null
                                    : Math.max(0, Number(e.target.value)),
                              })
                            }
                          />
                          <span className="hidden print:inline">
                            {item.quantity === null ? 'Required' : item.quantity}
                          </span>
                        </td>

                        <td className="border border-gray-300 p-2">
                          <input
                            aria-label="Unit"
                            className="no-print w-20 rounded border border-gray-200 px-2 py-1"
                            value={item.unit ?? ''}
                            onChange={(e) =>
                              updateItem(index, { unit: e.target.value || null })
                            }
                          />
                          <span className="hidden print:inline">
                            {item.unit || '—'}
                          </span>
                        </td>

                        <td className="border border-gray-300 p-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Ordered ${item.component_name}`}
                            checked={item.ordered}
                            onChange={(e) =>
                              updateItem(index, { ordered: e.target.checked })
                            }
                          />
                        </td>

                        <td className="border border-gray-300 p-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Received ${item.component_name}`}
                            checked={item.received}
                            onChange={(e) =>
                              updateItem(index, { received: e.target.checked })
                            }
                          />
                        </td>

                        <td className="border border-gray-300 p-2">
                          <input
                            aria-label="Item notes"
                            className="no-print w-full min-w-28 rounded border border-gray-200 px-2 py-1"
                            value={item.notes}
                            onChange={(e) =>
                              updateItem(index, { notes: e.target.value })
                            }
                          />
                          <span className="hidden print:inline">
                            {item.notes || '—'}
                          </span>
                        </td>

                        <td className="no-print border border-gray-300 p-2">
                          <button
                            className="text-xs font-medium text-red-700 hover:underline"
                            onClick={() => removeItem(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {notes && (
            <div className="mt-6 border-t border-gray-300 pt-3 text-sm">
              <strong>General notes:</strong>
              <p className="mt-1 whitespace-pre-wrap">{notes}</p>
            </div>
          )}

          <div className="mt-8 grid gap-8 text-sm sm:grid-cols-2">
            <p>Ordered by: ______________________________</p>
            <p>Date: ______________________________</p>
            <p>Checked / received by: ______________________________</p>
            <p>Completion date: ______________________________</p>
          </div>
        </div>
      </section>

      <div className="no-print flex flex-wrap justify-end gap-2">
        <button className={buttonClass} onClick={() => window.print()}>
          Print ordering sheet
        </button>

        <button
          className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={saveBom}
          disabled={saving}
        >
          {saving ? 'Saving…' : editingBomId ? 'Update BOM' : 'Save BOM'}
        </button>
      </div>
    </main>
  )
}
