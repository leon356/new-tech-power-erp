
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type InventoryItem = {
  id: string
  name: string
  base_unit: string
  active: boolean
}

type Movement = {
  id: string
  movement_type: string
  quantity_change: number
  reason: string | null
  created_at: string
  inventory_items: {
    name: string
    base_unit: string
  } | null
}

type StockMovement = {
  inventory_item_id: string
  quantity_change: number
}

export default function JobMaterials({ jobId }: { jobId: string }) {
  const supabase = useMemo(() => createClient(), [])

  const [items, setItems] = useState<InventoryItem[]>([])
  const [stock, setStock] = useState<Record<string, number>>({})
  const [movements, setMovements] = useState<Movement[]>([])

  const [itemId, setItemId] = useState('')
  const [movementType, setMovementType] = useState<'issued' | 'returned'>('issued')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [itemsResult, stockResult, movementsResult] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('id, name, base_unit, active')
          .eq('active', true)
          .order('name'),

        supabase
          .from('inventory_movements')
          .select('inventory_item_id, quantity_change'),

        supabase
          .from('inventory_movements')
          .select(`
            id,
            movement_type,
            quantity_change,
            reason,
            created_at,
            inventory_items (
              name,
              base_unit
            )
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (itemsResult.error) throw itemsResult.error
      if (stockResult.error) throw stockResult.error
      if (movementsResult.error) throw movementsResult.error

      const loadedItems = (itemsResult.data ?? []) as InventoryItem[]
      const stockRows = (stockResult.data ?? []) as StockMovement[]
      const loadedMovements = (movementsResult.data ?? []) as unknown as Movement[]

      const totals: Record<string, number> = {}

      for (const row of stockRows) {
        totals[row.inventory_item_id] =
          (totals[row.inventory_item_id] ?? 0) +
          Number(row.quantity_change ?? 0)
      }

      setItems(loadedItems)
      setStock(totals)
      setMovements(loadedMovements)

      setItemId((current) => {
        if (current && loadedItems.some((item) => item.id === current)) {
          return current
        }
        return loadedItems[0]?.id ?? ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load job materials.')
    } finally {
      setLoading(false)
    }
  }, [jobId, supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const selectedItem = items.find((item) => item.id === itemId)
  const availableStock = itemId ? stock[itemId] ?? 0 : 0
  const requestedQuantity = Number(quantity)

  async function saveMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!itemId) {
      setError('Please select an inventory item.')
      return
    }

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      setError('Enter a quantity greater than zero.')
      return
    }

    if (
      movementType === 'issued' &&
      requestedQuantity > availableStock
    ) {
      setError(
        `Not enough stock. Only ${availableStock} ${selectedItem?.base_unit ?? ''} available.`
      )
      return
    }

    setSaving(true)

    try {
      const { error: rpcError } = await supabase.rpc(
        'record_job_stock_movement',
        {
          p_job_id: jobId,
          p_item_id: itemId,
          p_movement_type: movementType,
          p_quantity: requestedQuantity,
          p_reason: reason.trim() || null,
        }
      )

      if (rpcError) throw rpcError

      setSuccess(
        movementType === 'issued'
          ? 'Stock issued to this job.'
          : 'Stock return recorded.'
      )
      setQuantity('')
      setReason('')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save the stock movement.'
      )
    } finally {
      setSaving(false)
    }
  }

  function formatQuantity(value: number) {
    return value.toLocaleString('en-ZA', {
      maximumFractionDigits: 3,
    })
  }

  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Job Materials
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Issue stock to this job or record unused materials returned to stock.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading || saving}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <form onSubmit={saveMovement} className="mt-5 space-y-4 rounded-lg bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Movement
            </label>
            <select
              value={movementType}
              onChange={(event) =>
                setMovementType(event.target.value as 'issued' | 'returned')
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="issued">Issue stock to job</option>
              <option value="returned">Return stock to inventory</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Inventory item
            </label>
            <select
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              required
              disabled={items.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
            >
              {items.length === 0 && <option value="">No active inventory items</option>}
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {selectedItem && (
              <p className="mt-1 text-xs text-gray-500">
                Available: {formatQuantity(availableStock)} {selectedItem.base_unit}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Quantity ({selectedItem?.base_unit || 'units'})
            </label>
            <input
              type="number"
              min="0.001"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
              placeholder="Enter quantity"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Note (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={250}
              placeholder="e.g. Used on installation"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || loading || !itemId}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? 'Saving...'
            : movementType === 'issued'
              ? 'Issue Stock to Job'
              : 'Record Stock Return'}
        </button>
      </form>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">Material movement history</h3>
          <span className="text-xs text-gray-500">
            Showing the latest {movements.length} records
          </span>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-gray-500">Loading materials...</p>
        ) : movements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            No materials have been issued or returned for this job yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Item</th>
                  <th className="px-3 py-3 font-medium">Movement</th>
                  <th className="px-3 py-3 text-right font-medium">Quantity</th>
                  <th className="px-3 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((movement) => {
                  const amount = Number(movement.quantity_change)
                  const isOutgoing =
                    movement.movement_type === 'issued' ||
                    movement.movement_type === 'damaged'

                  return (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                        {new Date(movement.created_at).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {movement.inventory_items?.name ?? 'Unknown item'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            isOutgoing
                              ? 'bg-red-50 text-red-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {movement.movement_type.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 text-right font-medium ${
                          isOutgoing ? 'text-red-700' : 'text-green-700'
                        }`}
                      >
                        {amount > 0 ? '+' : ''}
                        {formatQuantity(amount)}{' '}
                        {movement.inventory_items?.base_unit ?? ''}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-3 text-gray-600">
                        {movement.reason || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
