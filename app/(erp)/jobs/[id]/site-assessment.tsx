'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Assessment = {
  id: string
  roof_type: string | null
  roof_condition: string | null
  roof_orientation: string | null
  shading: string | null
  electrical_board_condition: string | null
  existing_solar: string | null
  notes: string | null
}

export default function SiteAssessment({
  jobId,
}: {
  jobId: string
}) {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    roof_type: '',
    roof_condition: '',
    roof_orientation: '',
    shading: '',
    electrical_board_condition: '',
    existing_solar: '',
    notes: '',
  })

  useEffect(() => {
    async function loadAssessment() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('site_assessments')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data) {
        setAssessment(data)

        setFormData({
          roof_type: data.roof_type || '',
          roof_condition: data.roof_condition || '',
          roof_orientation: data.roof_orientation || '',
          shading: data.shading || '',
          electrical_board_condition:
            data.electrical_board_condition || '',
          existing_solar: data.existing_solar || '',
          notes: data.notes || '',
        })
      }

      setLoading(false)
    }

    loadAssessment()
  }, [jobId])

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    setError('')

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const assessmentData = {
      job_id: jobId,
      roof_type: formData.roof_type || null,
      roof_condition: formData.roof_condition || null,
      roof_orientation: formData.roof_orientation || null,
      shading: formData.shading || null,
      electrical_board_condition:
        formData.electrical_board_condition || null,
      existing_solar: formData.existing_solar || null,
      notes: formData.notes || null,
      assessed_by: user?.id || null,
      assessed_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('site_assessments')
      .upsert(assessmentData, {
        onConflict: 'job_id',
      })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setAssessment({
      id: assessment?.id || '',
      roof_type: formData.roof_type || null,
      roof_condition: formData.roof_condition || null,
      roof_orientation: formData.roof_orientation || null,
      shading: formData.shading || null,
      electrical_board_condition:
        formData.electrical_board_condition || null,
      existing_solar: formData.existing_solar || null,
      notes: formData.notes || null,
    })

    setMessage('Assessment saved successfully.')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <p className="text-sm text-gray-500">
          Loading site assessment...
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white p-6">

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Site Assessment
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Record the information gathered during the site assessment.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="space-y-5">

        {/* Roof */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            Roof
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">

            <div>
              <label className="text-sm font-medium text-gray-700">
                Roof Type
              </label>

              <select
                name="roof_type"
                value={formData.roof_type}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
              >
                <option value="">Select roof type</option>
                <option value="tile">Tile</option>
                <option value="ibr">IBR</option>
                <option value="corrugated">Corrugated</option>
                <option value="concrete">Concrete</option>
                <option value="thatch">Thatch</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Roof Condition
              </label>

              <select
                name="roof_condition"
                value={formData.roof_condition}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
              >
                <option value="">Select condition</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="requires_attention">
                  Requires Attention
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Roof Orientation
              </label>

              <select
                name="roof_orientation"
                value={formData.roof_orientation}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
              >
                <option value="">Select orientation</option>
                <option value="north">North</option>
                <option value="north_east">North-East</option>
                <option value="east">East</option>
                <option value="south_east">South-East</option>
                <option value="south">South</option>
                <option value="south_west">South-West</option>
                <option value="west">West</option>
                <option value="north_west">North-West</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Shading
              </label>

              <select
                name="shading"
                value={formData.shading}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
              >
                <option value="">Select shading</option>
                <option value="none">None</option>
                <option value="partial">Partial</option>
                <option value="significant">Significant</option>
              </select>
            </div>

          </div>
        </div>

        {/* Electrical */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-800">
            Electrical
          </h3>

          <label className="text-sm font-medium text-gray-700">
            Electrical Board Condition
          </label>

          <select
            name="electrical_board_condition"
            value={formData.electrical_board_condition}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
          >
            <option value="">Select condition</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="requires_upgrade">
              Requires Upgrade
            </option>
          </select>
        </div>

        {/* Existing Solar */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Existing Solar System
          </label>

          <textarea
            name="existing_solar"
            value={formData.existing_solar}
            onChange={handleChange}
            rows={3}
            placeholder="Describe any existing panels, inverter, batteries, etc."
            className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Assessment Notes
          </label>

          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={5}
            placeholder="Record measurements, customer requirements, access issues, observations, etc."
            className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-500"
          />
        </div>

        {/* Save */}
        <div className="flex justify-end">

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Assessment'}
          </button>

        </div>

      </div>

    </div>
  )
}
