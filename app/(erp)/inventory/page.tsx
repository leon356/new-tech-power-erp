
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    Boxes,
    History,
    LoaderCircle,
    Plus,
    RefreshCw,
    Search,
    X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type InventoryItem = {
    inventory_item_id: string
    name: string
    category: string
    sku: string | null
    base_unit: string
    minimum_stock: number
    storage_location: string | null
    active: boolean
    quantity_on_hand: number
}

type Packaging = {
    id: string
    inventory_item_id: string
    package_name: string
    units_per_package: number
}

type Job = {
    id: string
    job_number: string
    title: string
    status: string
}

type Movement = {
    id: string
    inventory_item_id: string
    movement_type: string
    quantity_change: number
    reason: string | null
    job_id: string | null
    created_at: string
}

const emptyItem = {
    name: '',
    category: 'Consumables',
    sku: '',
    base_unit: 'unit',
    minimum_stock: '0',
    storage_location: '',
    package_name: '',
    units_per_package: '1',
    opening_stock: '0',
}

const movementLabels: Record<string, string> = {
    opening_stock: 'Opening stock',
    received: 'Stock received',
    issued: 'Stock issued',
    returned: 'Stock returned',
    damaged: 'Damaged stock',
    adjustment: 'Stock adjustment',
}

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [packaging, setPackaging] = useState<Packaging[]>([])
    const [movements, setMovements] = useState<Movement[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [showMovement, setShowMovement] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [selectedItem, setSelectedItem] = useState('')
    const [selectedJobId, setSelectedJobId] = useState('')
    const [itemForm, setItemForm] = useState(emptyItem)
    const [movementType, setMovementType] = useState('received')
    const [packageId, setPackageId] = useState('')
    const [packageCount, setPackageCount] = useState('1')
    const [movementReason, setMovementReason] = useState('')

    const supabase = createClient()

    const loadData = useCallback(async () => {
        setLoading(true)
        setError('')

        const [
            stockResult,
            packagingResult,
            movementResult,
            jobsResult,
        ] = await Promise.all([
            supabase
                .from('inventory_stock')
                .select('*')
                .order('name'),
            supabase
                .from('inventory_packaging')
                .select('*')
                .eq('active', true)
                .order('package_name'),
            supabase
                .from('inventory_movements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(30),
            supabase
                .from('jobs')
                .select('id, job_number, title, status')
                .order('created_at', { ascending: false }),
        ])

        if (stockResult.error) {
            setError(stockResult.error.message)
            setLoading(false)
            return
        }

        setItems((stockResult.data || []) as InventoryItem[])
        setPackaging((packagingResult.data || []) as Packaging[])
        setMovements((movementResult.data || []) as Movement[])
        setJobs((jobsResult.data || []) as Job[])

        if (packagingResult.error) {
            setError(packagingResult.error.message)
        }

        if (movementResult.error) {
            setError(movementResult.error.message)
        }

        if (jobsResult.error) {
            setError(`Could not load jobs: ${jobsResult.error.message}`)
        }

        setLoading(false)
    }, [supabase])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const activeItems = items.filter((item) => item.active)

    const filteredItems = activeItems.filter((item) => {
        const term = search.toLowerCase()

        return (
            item.name.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term) ||
            (item.sku || '').toLowerCase().includes(term) ||
            (item.storage_location || '').toLowerCase().includes(term)
        )
    })

    const lowStockItems = activeItems.filter(
        (item) => Number(item.quantity_on_hand) <= Number(item.minimum_stock)
    )

    const totalUnits = activeItems.reduce(
        (sum, item) => sum + Number(item.quantity_on_hand),
        0
    )

    const availableJobs = jobs.filter(
        (job) =>
            job.status !== 'cancelled' &&
            job.status !== 'completed'
    )

    function openMovement(itemId = '', initialType = 'received') {
        setSelectedItem(itemId)
        setMovementType(initialType)
        setPackageId('')
        setPackageCount('1')
        setSelectedJobId('')
        setMovementReason('')
        setError('')
        setNotice('')
        setShowMovement(true)
    }

    async function addItem(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSaving(true)
        setError('')
        setNotice('')

        const minimum = Number(itemForm.minimum_stock)
        const opening = Number(itemForm.opening_stock)
        const unitsPerPackage = Number(itemForm.units_per_package)

        if (
            !itemForm.name.trim() ||
            !itemForm.base_unit.trim() ||
            !Number.isFinite(minimum) ||
            minimum < 0 ||
            !Number.isFinite(opening) ||
            opening < 0 ||
            !Number.isFinite(unitsPerPackage) ||
            unitsPerPackage <= 0
        ) {
            setError(
                'Check the item name, stock quantities and package conversion.'
            )
            setSaving(false)
            return
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            setError('You must be signed in to manage inventory.')
            setSaving(false)
            return
        }

        const { data: newItem, error: itemError } = await supabase
            .from('inventory_items')
            .insert({
                name: itemForm.name.trim(),
                category: itemForm.category.trim() || 'General',
                sku: itemForm.sku.trim() || null,
                base_unit: itemForm.base_unit.trim(),
                minimum_stock: minimum,
                storage_location:
                    itemForm.storage_location.trim() || null,
                created_by: user.id,
            })
            .select('id')
            .single()

        if (itemError || !newItem) {
            setError(itemError?.message || 'Could not create the item.')
            setSaving(false)
            return
        }

        const packageName = itemForm.package_name.trim()

        if (packageName) {
            const { error: packageError } = await supabase
                .from('inventory_packaging')
                .insert({
                    inventory_item_id: newItem.id,
                    package_name: packageName,
                    units_per_package: unitsPerPackage,
                })

            if (packageError) {
                setError(
                    `Item created, but its package conversion could not be saved: ${packageError.message}. Reopen the item setup before adding stock.`
                )
                setSaving(false)
                await loadData()
                return
            }
        }

        if (opening > 0) {
            const { error: stockError } = await supabase
                .from('inventory_movements')
                .insert({
                    inventory_item_id: newItem.id,
                    movement_type: 'opening_stock',
                    quantity_change: opening,
                    reason: 'Initial physical stocktake',
                    created_by: user.id,
                })

            if (stockError) {
                setError(
                    `Item created, but opening stock was not saved: ${stockError.message}. Add the opening stock using Stock In.`
                )
                setSaving(false)
                await loadData()
                return
            }
        }

        setShowAdd(false)
        setItemForm(emptyItem)
        setNotice('Inventory item added successfully.')
        await loadData()
        setSaving(false)
    }

    async function saveMovement(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSaving(true)
        setError('')
        setNotice('')

        const quantity = Number(packageCount)

        const item = activeItems.find(
            (entry) => entry.inventory_item_id === selectedItem
        )

        if (
            !item ||
            !Number.isFinite(quantity) ||
            (movementType === 'adjustment'
                ? quantity === 0
                : quantity <= 0)
        ) {
            setError(
                movementType === 'adjustment'
                    ? 'Select an item and enter a non-zero adjustment.'
                    : 'Select an item and enter a quantity greater than zero.'
            )
            setSaving(false)
            return
        }

        if (movementType === 'issued' && !selectedJobId) {
            setError('Please select the job this stock is being issued to.')
            setSaving(false)
            return
        }

        const selectedPackage = packaging.find(
            (entry) =>
                entry.id === packageId &&
                entry.inventory_item_id === selectedItem
        )

        const currentStock = Number(item.quantity_on_hand)

        // Adjustments are always entered in base units.
        // Other movements can use the selected package conversion.
        const multiplier =
            movementType !== 'adjustment' && selectedPackage
                ? Number(selectedPackage.units_per_package)
                : 1

        const units = quantity * multiplier

        const isOutgoing =
            movementType === 'issued' ||
            movementType === 'damaged'

        if (isOutgoing && units > currentStock) {
            setError(
                `Only ${currentStock} ${item.base_unit} currently available.`
            )
            setSaving(false)
            return
        }

        if (
            movementType === 'adjustment' &&
            currentStock + quantity < 0
        ) {
            setError(
                `This adjustment would make stock negative. Current stock: ${currentStock} ${item.base_unit}.`
            )
            setSaving(false)
            return
        }

        const quantityChange =
            movementType === 'issued' || movementType === 'damaged'
                ? -units
                : movementType === 'adjustment'
                    ? quantity
                    : units

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
            setError('You must be signed in to manage inventory.')
            setSaving(false)
            return
        }

        const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert({
                inventory_item_id: selectedItem,
                movement_type: movementType,
                quantity_change: quantityChange,
                reason: movementReason.trim() || null,
                packaging_id:
                    movementType === 'adjustment'
                        ? null
                        : selectedPackage?.id || null,
                created_by: user.id,
                job_id:
                    movementType === 'issued'
                        ? selectedJobId
                        : null,
            })

        if (movementError) {
            setError(movementError.message)
            setSaving(false)
            return
        }

        setShowMovement(false)
        setSelectedJobId('')
        setNotice('Stock movement saved.')
        await loadData()
        setSaving(false)
    }

    function itemName(id: string) {
        return (
            items.find((item) => item.inventory_item_id === id)?.name ||
            'Unknown item'
        )
    }

    function jobName(id: string | null) {
        if (!id) return '—'

        const job = jobs.find((entry) => entry.id === id)

        return job
            ? `${job.job_number} — ${job.title}`
            : 'Job unavailable'
    }

    return (
        <div className="space-y-6 text-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Inventory</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Track consumables, stock levels and stock movements.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => void loadData()}
                        className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm hover:bg-gray-50"
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>

                    <button
                        onClick={() => {
                            setError('')
                            setNotice('')
                            setItemForm(emptyItem)
                            setShowAdd(true)
                        }}
                        className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                    >
                        <Plus size={17} /> Add Item / Stocktake
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {notice && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    {notice}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-gray-500">Active items</p>
                    <p className="mt-2 text-3xl font-bold">
                        {activeItems.length}
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-gray-500">Units on hand</p>
                    <p className="mt-2 text-3xl font-bold">
                        {totalUnits.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Sum of base units across all items
                    </p>
                </div>

                <div className="rounded-xl border bg-white p-5">
                    <p className="text-sm text-gray-500">Low-stock items</p>
                    <p className="mt-2 text-3xl font-bold text-amber-600">
                        {lowStockItems.length}
                    </p>
                </div>

                <button
                    onClick={() => {
                        setShowHistory(true)
                        setError('')
                        setNotice('')
                    }}
                    className="rounded-xl border bg-white p-5 text-left hover:bg-gray-50"
                >
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                        <History size={16} /> Recent movements
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                        {movements.length}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        View the latest 30
                    </p>
                </button>
            </div>

            {lowStockItems.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h2 className="flex items-center gap-2 font-semibold text-amber-900">
                        <AlertTriangle size={18} />
                        Items at or below minimum stock
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-2">
                        {lowStockItems.map((item) => (
                            <span
                                key={item.inventory_item_id}
                                className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm text-amber-900"
                            >
                                {item.name}: {Number(item.quantity_on_hand)}{' '}
                                {item.base_unit}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-xl border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                    <h2 className="font-semibold">Stock catalogue</h2>

                    <div className="relative w-full sm:w-80">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search items, SKU or location..."
                            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-400"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 p-12 text-sm text-gray-500">
                        <LoaderCircle size={18} className="animate-spin" />
                        Loading inventory...
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-12 text-center">
                        <Boxes
                            className="mx-auto text-gray-400"
                            size={34}
                        />
                        <h3 className="mt-3 font-semibold">
                            No inventory items found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Add your first consumable while doing a physical stocktake.
                        </p>
                        <button
                            onClick={() => {
                                setError('')
                                setItemForm(emptyItem)
                                setShowAdd(true)
                            }}
                            className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white"
                        >
                            Add first item
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Item</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3">On hand</th>
                                    <th className="px-4 py-3">Minimum</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {filteredItems.map((item) => {
                                    const quantity = Number(item.quantity_on_hand)
                                    const low =
                                        quantity <= Number(item.minimum_stock)

                                    return (
                                        <tr
                                            key={item.inventory_item_id}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-4">
                                                <p className="font-medium">
                                                    {item.name}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {item.sku || 'No SKU'} · per{' '}
                                                    {item.base_unit}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4">
                                                {item.category}
                                            </td>

                                            <td className="px-4 py-4">
                                                {item.storage_location || '—'}
                                            </td>

                                            <td className="px-4 py-4 font-semibold">
                                                {quantity.toLocaleString()}
                                            </td>

                                            <td className="px-4 py-4">
                                                {Number(item.minimum_stock).toLocaleString()}
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        low
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}
                                                >
                                                    {low ? 'Low stock' : 'In stock'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        title="Stock in"
                                                        onClick={() =>
                                                            openMovement(
                                                                item.inventory_item_id,
                                                                'received'
                                                            )
                                                        }
                                                        className="rounded-md border p-2 hover:bg-gray-100"
                                                    >
                                                        <ArrowDownToLine size={16} />
                                                    </button>

                                                    <button
                                                        title="Stock out / issue to job"
                                                        onClick={() =>
                                                            openMovement(
                                                                item.inventory_item_id,
                                                                'issued'
                                                            )
                                                        }
                                                        className="rounded-md border p-2 hover:bg-gray-100"
                                                    >
                                                        <ArrowUpFromLine size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b p-5">
                            <div>
                                <h2 className="text-lg font-bold">
                                    Add item / opening stocktake
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Count the physical stock and record it here.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowAdd(false)}
                                className="rounded p-2 hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={addItem} className="space-y-4 p-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-sm font-medium">
                                    Item name *
                                    <input
                                        required
                                        value={itemForm.name}
                                        onChange={(e) =>
                                            setItemForm({
                                                ...itemForm,
                                                name: e.target.value,
                                            })
                                        }
                                        placeholder="Cable ties"
                                        className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                    />
                                </label>

                                <label className="text-sm font-medium">
                                    Category
                                    <input
                                        value={itemForm.category}
                                        onChange={(e) =>
                                            setItemForm({
                                                ...itemForm,
                                                category: e.target.value,
                                            })
                                        }
                                        placeholder="Consumables"
                                        className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                    />
                                </label>

                                <label className="text-sm font-medium">
                                    SKU / item code
                                    <input
                                        value={itemForm.sku}
                                        onChange={(e) =>
                                            setItemForm({
                                                ...itemForm,
                                                sku: e.target.value,
                                            })
                                        }
                                        placeholder="Optional"
                                        className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                    />
                                </label>

                                <label className="text-sm font-medium">
                                    Base unit *
                                    <input
                                        required
                                        value={itemForm.base_unit}
                                        onChange={(e) =>
                                            setItemForm({
                                                ...itemForm,
                                                base_unit: e.target.value,
                                            })
                                        }
                                        placeholder="unit, metre, roll..."
                                        className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                    />
                                </label>

                                <label className="text-sm font-medium">
                                    Minimum stock alert
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={itemForm.minimum_stock}
                                        onChange={(e) =>
                                            setItemForm({
                                                ...itemForm,
                                                minimum_stock: e.target.value,
                                            })
                                        }
                                        className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                    />
                                </label>

                                <label className="text-sm font-medium">
                                    Shelf / storage location
                                    <input
                                        value={itemForm.storage_location}
                                        onChange={(e) =>
                                            setItemForm({
                                                ...itemForm,
                                                storage_location: e.target.value,
                                            })
                                        }
                                        placeholder="Workshop shelf A"
                                        className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                    />
                                </label>
                            </div>

                            <div className="rounded-lg border bg-gray-50 p-4">
                                <h3 className="font-semibold">
                                    Packaging conversion (optional)
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Example: 1 box = 100 cable ties. Stock is stored as individual ties.
                                </p>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <label className="text-sm font-medium">
                                        Package name
                                        <input
                                            value={itemForm.package_name}
                                            onChange={(e) =>
                                                setItemForm({
                                                    ...itemForm,
                                                    package_name: e.target.value,
                                                })
                                            }
                                            placeholder="Box of 100"
                                            className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal"
                                        />
                                    </label>

                                    <label className="text-sm font-medium">
                                        Base units per package
                                        <input
                                            type="number"
                                            min="0.001"
                                            step="any"
                                            value={itemForm.units_per_package}
                                            onChange={(e) =>
                                                setItemForm({
                                                    ...itemForm,
                                                    units_per_package: e.target.value,
                                                })
                                            }
                                            className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal"
                                        />
                                    </label>
                                </div>
                            </div>

                            <label className="block text-sm font-medium">
                                Opening stock counted *
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={itemForm.opening_stock}
                                    onChange={(e) =>
                                        setItemForm({
                                            ...itemForm,
                                            opening_stock: e.target.value,
                                        })
                                    }
                                    className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                />
                                <span className="mt-1 block text-xs font-normal text-gray-500">
                                    Enter the total in base units. For 2 boxes of 100 plus 35 loose ties, enter 235.
                                </span>
                            </label>

                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAdd(false)}
                                    className="rounded-lg border px-4 py-2.5 text-sm"
                                >
                                    Cancel
                                </button>

                                <button
                                    disabled={saving}
                                    type="submit"
                                    className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm text-white disabled:opacity-50"
                                >
                                    {saving && (
                                        <LoaderCircle
                                            size={16}
                                            className="animate-spin"
                                        />
                                    )}
                                    Save item and stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showMovement && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b p-5">
                            <div>
                                <h2 className="text-lg font-bold">
                                    Record stock movement
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {itemName(selectedItem)}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowMovement(false)}
                                className="rounded p-2 hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={saveMovement} className="space-y-4 p-5">
                            <label className="block text-sm font-medium">
                                Movement type
                                <select
                                    value={movementType}
                                    onChange={(e) => {
                                        setMovementType(e.target.value)
                                        setPackageId('')
                                        setSelectedJobId('')
                                    }}
                                    className="mt-1 w-full rounded-lg border bg-white p-2.5"
                                >
                                    <option value="received">
                                        Stock received / purchased
                                    </option>
                                    <option value="issued">
                                        Issued / used
                                    </option>
                                    <option value="returned">
                                        Returned to store
                                    </option>
                                    <option value="damaged">
                                        Damaged / written off
                                    </option>
                                    <option value="adjustment">
                                        Stock adjustment (+ or −)
                                    </option>
                                </select>
                            </label>

                            {movementType === 'issued' && (
                                <label className="block text-sm font-medium">
                                    Issue to job *
                                    <select
                                        required
                                        value={selectedJobId}
                                        onChange={(e) =>
                                            setSelectedJobId(e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border bg-white p-2.5"
                                    >
                                        <option value="">
                                            Select a job...
                                        </option>

                                        {availableJobs.map((job) => (
                                            <option
                                                key={job.id}
                                                value={job.id}
                                            >
                                                {job.job_number} — {job.title}
                                            </option>
                                        ))}
                                    </select>

                                    <span className="mt-1 block text-xs font-normal text-gray-500">
                                        Stock issued will be linked to this installation.
                                    </span>

                                    {availableJobs.length === 0 && (
                                        <span className="mt-1 block text-xs font-normal text-amber-700">
                                            No active jobs found. Create or reopen a job before issuing stock.
                                        </span>
                                    )}
                                </label>
                            )}

                            <label className="block text-sm font-medium">
                                Package / unit
                                <select
                                    value={packageId}
                                    onChange={(e) =>
                                        setPackageId(e.target.value)
                                    }
                                    disabled={movementType === 'adjustment'}
                                    className="mt-1 w-full rounded-lg border bg-white p-2.5 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Base units (
                                        {activeItems.find(
                                            (i) =>
                                                i.inventory_item_id === selectedItem
                                        )?.base_unit || 'unit'}
                                        )
                                    </option>

                                    {packaging
                                        .filter(
                                            (p) =>
                                                p.inventory_item_id === selectedItem
                                        )
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.package_name} (
                                                {p.units_per_package} base units)
                                            </option>
                                        ))}
                                </select>

                                {movementType === 'adjustment' && (
                                    <span className="mt-1 block text-xs font-normal text-gray-500">
                                        Adjustments are entered directly in base units.
                                    </span>
                                )}
                            </label>

                            <label className="block text-sm font-medium">
                                {movementType === 'adjustment'
                                    ? 'Adjustment amount (+ or −)'
                                    : 'Quantity'}

                                <input
                                    required
                                    type="number"
                                    min={
                                        movementType === 'adjustment'
                                            ? undefined
                                            : '0.001'
                                    }
                                    step="any"
                                    value={packageCount}
                                    onChange={(e) =>
                                        setPackageCount(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border p-2.5"
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Reason / notes
                                <input
                                    value={movementReason}
                                    onChange={(e) =>
                                        setMovementReason(e.target.value)
                                    }
                                    placeholder="Supplier delivery, job use, stocktake..."
                                    className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                                />
                            </label>

                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowMovement(false)}
                                    className="rounded-lg border px-4 py-2.5 text-sm"
                                >
                                    Cancel
                                </button>

                                <button
                                    disabled={
                                        saving ||
                                        (movementType === 'issued' &&
                                            availableJobs.length === 0)
                                    }
                                    type="submit"
                                    className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm text-white disabled:opacity-50"
                                >
                                    {saving && (
                                        <LoaderCircle
                                            size={16}
                                            className="animate-spin"
                                        />
                                    )}
                                    Save movement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
                    <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b p-5">
                            <div>
                                <h2 className="text-lg font-bold">
                                    Recent stock movements
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Includes the job linked to each stock issue.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowHistory(false)}
                                className="rounded p-2 hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[65vh] overflow-auto">
                            {movements.length === 0 ? (
                                <p className="p-8 text-center text-sm text-gray-500">
                                    No movements recorded yet.
                                </p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Item</th>
                                            <th className="p-3">Movement</th>
                                            <th className="p-3">Change</th>
                                            <th className="p-3">Job</th>
                                            <th className="p-3">Reason</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {movements.map((movement) => (
                                            <tr key={movement.id}>
                                                <td className="whitespace-nowrap p-3">
                                                    {new Date(
                                                        movement.created_at
                                                    ).toLocaleDateString('en-ZA')}
                                                </td>

                                                <td className="p-3">
                                                    {itemName(
                                                        movement.inventory_item_id
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    {movementLabels[
                                                        movement.movement_type
                                                    ] || movement.movement_type}
                                                </td>

                                                <td
                                                    className={`whitespace-nowrap p-3 font-semibold ${
                                                        Number(
                                                            movement.quantity_change
                                                        ) < 0
                                                            ? 'text-red-600'
                                                            : 'text-green-700'
                                                    }`}
                                                >
                                                    {Number(
                                                        movement.quantity_change
                                                    ) > 0
                                                        ? '+'
                                                        : ''}
                                                    {Number(
                                                        movement.quantity_change
                                                    )}
                                                </td>

                                                <td className="min-w-48 p-3">
                                                    {jobName(movement.job_id)}
                                                </td>

                                                <td className="p-3">
                                                    {movement.reason || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
