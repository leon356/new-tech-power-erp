
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const calculationMethods = [
  { value: "manual", label: "Manual quantity" },
  { value: "fixed", label: "Fixed quantity" },
  { value: "per_panel", label: "Per panel" },
  { value: "per_mounting_point", label: "Per mounting point" },
  { value: "per_rail", label: "Per rail" },
  { value: "per_rail_length", label: "Per metre of rail" },
  { value: "per_string", label: "Per string" },
  { value: "per_array", label: "Per array" },
];

const roundingMethods = [
  { value: "none", label: "No rounding" },
  { value: "up", label: "Round up" },
  { value: "down", label: "Round down" },
  { value: "nearest", label: "Round to nearest" },
];

type MountingTemplate = {
  id: string;
  name: string;
  description: string | null;
  roof_type: string | null;
  mounting_method: string | null;
  default_panel_orientation: string | null;
  active: boolean;
};

type BomItem = {
  id: string;
  mounting_template_id: string;
  component_name: string;
  description: string | null;
  calculation_method: string;
  quantity_value: number | null;
  quantity_unit: string | null;
  calculation_multiplier: number;
  rounding_method: string;
  rounding_value: number | null;
  active: boolean;
};

type ItemForm = {
  component_name: string;
  description: string;
  calculation_method: string;
  quantity_value: string;
  quantity_unit: string;
  calculation_multiplier: string;
  rounding_method: string;
  rounding_value: string;
  active: boolean;
};

const emptyItemForm: ItemForm = {
  component_name: "",
  description: "",
  calculation_method: "per_panel",
  quantity_value: "",
  quantity_unit: "pcs",
  calculation_multiplier: "1",
  rounding_method: "up",
  rounding_value: "1",
  active: true,
};

export default function BomPage() {
  const [templates, setTemplates] = useState<MountingTemplate[]>([]);
  const [items, setItems] = useState<BomItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [roofType, setRoofType] = useState("");
  const [mountingMethod, setMountingMethod] = useState("");
  const [panelOrientation, setPanelOrientation] = useState("portrait");
  const [templateActive, setTemplateActive] = useState(true);

  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  );

  const selectedItems = items.filter(
    (item) => item.mounting_template_id === selectedTemplateId
  );

  async function loadData(preferredTemplateId?: string) {
    setLoading(true);
    setErrorMessage("");

    const [templateResult, itemResult] = await Promise.all([
      supabase
        .from("mounting_templates")
        .select(
          "id, name, description, roof_type, mounting_method, default_panel_orientation, active"
        )
        .order("name"),
      supabase
        .from("bom_template_items")
        .select(
          "id, mounting_template_id, component_name, description, calculation_method, quantity_value, quantity_unit, calculation_multiplier, rounding_method, rounding_value, active"
        )
        .order("component_name"),
    ]);

    if (templateResult.error) {
      setErrorMessage(
        `Could not load mounting templates: ${templateResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (itemResult.error) {
      setErrorMessage(
        `Could not load BOM components: ${itemResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const loadedTemplates = (templateResult.data ?? []) as MountingTemplate[];
    setTemplates(loadedTemplates);
    setItems((itemResult.data ?? []) as BomItem[]);

    const nextId =
      preferredTemplateId &&
      loadedTemplates.some((template) => template.id === preferredTemplateId)
        ? preferredTemplateId
        : selectedTemplateId &&
            loadedTemplates.some(
              (template) => template.id === selectedTemplateId
            )
          ? selectedTemplateId
          : loadedTemplates[0]?.id ?? "";

    setSelectedTemplateId(nextId);

    const selected = loadedTemplates.find((template) => template.id === nextId);
    if (selected) {
      setTemplateName(selected.name);
      setTemplateDescription(selected.description ?? "");
      setRoofType(selected.roof_type ?? "");
      setMountingMethod(selected.mounting_method ?? "");
      setPanelOrientation(selected.default_panel_orientation ?? "portrait");
      setTemplateActive(selected.active);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // Load the existing database records when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseTemplate(id: string) {
    setSelectedTemplateId(id);
    const template = templates.find((entry) => entry.id === id);

    setTemplateName(template?.name ?? "");
    setTemplateDescription(template?.description ?? "");
    setRoofType(template?.roof_type ?? "");
    setMountingMethod(template?.mounting_method ?? "");
    setPanelOrientation(template?.default_panel_orientation ?? "portrait");
    setTemplateActive(template?.active ?? true);

    cancelItemEdit();
    setErrorMessage("");
    setSuccessMessage("");
  }

  function cancelItemEdit() {
    setEditingItemId(null);
    setItemForm({ ...emptyItemForm });
  }

  async function createTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!templateName.trim()) {
      setErrorMessage("Enter a template name.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("mounting_templates")
      .insert({
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        roof_type: roofType.trim() || null,
        mounting_method: mountingMethod.trim() || null,
        default_panel_orientation: panelOrientation,
        active: true,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(`Could not create template: ${error.message}`);
      return;
    }

    setSuccessMessage("Mounting template created.");
    await loadData(data.id);
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTemplateId || !templateName.trim()) {
      setErrorMessage("Choose a template and enter its name.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("mounting_templates")
      .update({
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        roof_type: roofType.trim() || null,
        mounting_method: mountingMethod.trim() || null,
        default_panel_orientation: panelOrientation,
        active: templateActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTemplateId);

    setSaving(false);

    if (error) {
      setErrorMessage(`Could not save template: ${error.message}`);
      return;
    }

    setSuccessMessage("Template details saved.");
    await loadData(selectedTemplateId);
  }

  function editItem(item: BomItem) {
    setEditingItemId(item.id);
    setItemForm({
      component_name: item.component_name,
      description: item.description ?? "",
      calculation_method: item.calculation_method,
      quantity_value:
        item.quantity_value === null ? "" : String(item.quantity_value),
      quantity_unit: item.quantity_unit ?? "",
      calculation_multiplier: String(item.calculation_multiplier ?? 1),
      rounding_method: item.rounding_method,
      rounding_value:
        item.rounding_value === null ? "" : String(item.rounding_value),
      active: item.active,
    });

    setErrorMessage("");
    setSuccessMessage("");
    document.getElementById("bom-item-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedTemplateId) {
      setErrorMessage("Create or select a mounting template first.");
      return;
    }

    if (!itemForm.component_name.trim()) {
      setErrorMessage("Enter a component name.");
      return;
    }

    const multiplier = Number(itemForm.calculation_multiplier);
    const quantityValue =
      itemForm.quantity_value.trim() === ""
        ? null
        : Number(itemForm.quantity_value);
    const roundingValue =
      itemForm.rounding_value.trim() === ""
        ? null
        : Number(itemForm.rounding_value);

    if (!Number.isFinite(multiplier) || multiplier < 0) {
      setErrorMessage("The calculation multiplier must be zero or greater.");
      return;
    }

    if (quantityValue !== null && !Number.isFinite(quantityValue)) {
      setErrorMessage("Enter a valid quantity.");
      return;
    }

    if (roundingValue !== null && (!Number.isFinite(roundingValue) || roundingValue <= 0)) {
      setErrorMessage("The rounding increment must be greater than zero.");
      return;
    }

    if (
      ["manual", "fixed"].includes(itemForm.calculation_method) &&
      quantityValue === null
    ) {
      setErrorMessage("Enter a quantity for manual or fixed calculations.");
      return;
    }

    const payload = {
      mounting_template_id: selectedTemplateId,
      component_name: itemForm.component_name.trim(),
      description: itemForm.description.trim() || null,
      calculation_method: itemForm.calculation_method,
      quantity_value: quantityValue,
      quantity_unit: itemForm.quantity_unit.trim() || null,
      calculation_multiplier: multiplier,
      rounding_method: itemForm.rounding_method,
      rounding_value: roundingValue,
      active: itemForm.active,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    const result = editingItemId
      ? await supabase
          .from("bom_template_items")
          .update(payload)
          .eq("id", editingItemId)
      : await supabase.from("bom_template_items").insert(payload);

    setSaving(false);

    if (result.error) {
      setErrorMessage(`Could not save component: ${result.error.message}`);
      return;
    }

    setSuccessMessage(
      editingItemId ? "Component updated." : "Component added."
    );
    cancelItemEdit();
    await loadData(selectedTemplateId);
  }

  async function toggleItem(item: BomItem) {
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("bom_template_items")
      .update({
        active: !item.active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setErrorMessage(`Could not update component: ${error.message}`);
      return;
    }

    setSuccessMessage(
      item.active ? "Component deactivated." : "Component activated."
    );
    await loadData(selectedTemplateId);
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bill of Materials
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage mounting templates and the components used by System Designer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData(selectedTemplateId)}
          disabled={loading || saving}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {errorMessage && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {loading ? (
        <p className="rounded-xl border bg-white p-6 text-gray-600">
          Loading BOM data...
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Mounting templates
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Each template has its own reusable component list.
            </p>

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="template-select">
                  Select template
                </label>
                <select
                  id="template-select"
                  value={selectedTemplateId}
                  onChange={(event) => chooseTemplate(event.target.value)}
                  className={inputClass}
                >
                  {templates.length === 0 && (
                    <option value="">No templates yet</option>
                  )}
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}{template.active ? "" : " (Inactive)"}
                    </option>
                  ))}
                </select>

                {selectedTemplate && (
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedItems.length} component(s),{" "}
                    {selectedItems.filter((item) => item.active).length} active
                  </p>
                )}
              </div>

              <form onSubmit={createTemplate} className="space-y-3 rounded-lg bg-gray-50 p-4">
                <h3 className="font-medium text-gray-900">Create a new template</h3>
                <label className={labelClass}>
                  Template name *
                  <input
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    placeholder="e.g. Tiled roof - rail mounting"
                    className={inputClass}
                    required
                  />
                </label>
                <label className={labelClass}>
                  Description
                  <input
                    value={templateDescription}
                    onChange={(event) => setTemplateDescription(event.target.value)}
                    placeholder="Optional description"
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create template"}
                </button>
                <p className="text-xs text-gray-500">
                  After creating it, use the selected-template form to set its roof and mounting details.
                </p>
              </form>
            </div>

            {selectedTemplate && (
              <form onSubmit={saveTemplate} className="mt-5 border-t border-gray-200 pt-5">
                <h3 className="mb-3 font-medium text-gray-900">
                  Edit selected template
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    Name *
                    <input
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      className={inputClass}
                      required
                    />
                  </label>
                  <label className={labelClass}>
                    Roof type
                    <input
                      value={roofType}
                      onChange={(event) => setRoofType(event.target.value)}
                      placeholder="e.g. Tile, IBR, Klip-Lok"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Mounting method
                    <input
                      value={mountingMethod}
                      onChange={(event) => setMountingMethod(event.target.value)}
                      placeholder="e.g. Rail and roof hook"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Default panel orientation
                    <select
                      value={panelOrientation}
                      onChange={(event) => setPanelOrientation(event.target.value)}
                      className={inputClass}
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>
                    Description
                    <textarea
                      value={templateDescription}
                      onChange={(event) => setTemplateDescription(event.target.value)}
                      rows={2}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={templateActive}
                      onChange={(event) => setTemplateActive(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Template active
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save template"}
                  </button>
                </div>
                {!templateActive && (
                  <p className="mt-2 text-sm text-amber-700">
                    Inactive templates won't appear in the System Designer's active-template list.
                  </p>
                )}
              </form>
            )}
          </section>

          {selectedTemplateId ? (
            <>
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 p-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Components
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    These rules determine the quantities calculated for each roof section.
                  </p>
                </div>

                {selectedItems.length === 0 ? (
                  <p className="p-5 text-sm text-gray-600">
                    No components have been added to this template yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Component</th>
                          <th className="px-4 py-3">Calculation</th>
                          <th className="px-4 py-3">Multiplier</th>
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedItems.map((item) => (
                          <tr key={item.id} className={!item.active ? "bg-gray-50 text-gray-500" : ""}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{item.component_name}</p>
                              {item.description && (
                                <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                              )}
                              {["manual", "fixed"].includes(item.calculation_method) && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Quantity: {item.quantity_value ?? "Not set"}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {calculationMethods.find((method) => method.value === item.calculation_method)?.label ?? item.calculation_method}
                              <p className="mt-1 text-xs text-gray-500">
                                Rounding: {roundingMethods.find((method) => method.value === item.rounding_method)?.label ?? item.rounding_method}
                                {item.rounding_value ? ` (${item.rounding_value})` : ""}
                              </p>
                            </td>
                            <td className="px-4 py-3">{item.calculation_multiplier}</td>
                            <td className="px-4 py-3">{item.quantity_unit || "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-xs ${item.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                                {item.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => editItem(item)}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void toggleItem(item)}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                >
                                  {item.active ? "Deactivate" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section id="bom-item-form" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingItemId ? "Edit component" : "Add component"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Template: {selectedTemplate?.name ?? "Selected template"}
                </p>

                <form onSubmit={saveItem} className="mt-5 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={labelClass}>
                      Component name *
                      <input
                        value={itemForm.component_name}
                        onChange={(event) => setItemForm({ ...itemForm, component_name: event.target.value })}
                        placeholder="e.g. Roof hooks"
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Unit
                      <input
                        value={itemForm.quantity_unit}
                        onChange={(event) => setItemForm({ ...itemForm, quantity_unit: event.target.value })}
                        placeholder="pcs, m, box"
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      Calculation method
                      <select
                        value={itemForm.calculation_method}
                        onChange={(event) => setItemForm({ ...itemForm, calculation_method: event.target.value })}
                        className={inputClass}
                      >
                        {calculationMethods.map((method) => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Quantity value
                      <input
                        type="number"
                        step="any"
                        value={itemForm.quantity_value}
                        onChange={(event) => setItemForm({ ...itemForm, quantity_value: event.target.value })}
                        placeholder={["manual", "fixed"].includes(itemForm.calculation_method) ? "Required for this method" : "Optional"}
                        className={inputClass}
                      />
                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        Used as the quantity for manual/fixed methods.
                      </span>
                    </label>
                    <label className={labelClass}>
                      Calculation multiplier
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={itemForm.calculation_multiplier}
                        onChange={(event) => setItemForm({ ...itemForm, calculation_multiplier: event.target.value })}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Rounding method
                      <select
                        value={itemForm.rounding_method}
                        onChange={(event) => setItemForm({ ...itemForm, rounding_method: event.target.value })}
                        className={inputClass}
                      >
                        {roundingMethods.map((method) => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Rounding increment
                      <input
                        type="number"
                        min="0.000001"
                        step="any"
                        value={itemForm.rounding_value}
                        onChange={(event) => setItemForm({ ...itemForm, rounding_value: event.target.value })}
                        placeholder="1"
                        className={inputClass}
                      />
                      <span className="mt-1 block text-xs font-normal text-gray-500">
                        For example, 1 rounds to whole items; 0.5 rounds in half-unit increments.
                      </span>
                    </label>
                    <label className={`${labelClass} md:col-span-2`}>
                      Description
                      <textarea
                        value={itemForm.description}
                        onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })}
                        rows={2}
                        placeholder="Optional component details"
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={itemForm.active}
                      onChange={(event) => setItemForm({ ...itemForm, active: event.target.checked })}
                      className="h-4 w-4"
                    />
                    Component active
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : editingItemId ? "Save component" : "Add component"}
                    </button>
                    {editingItemId && (
                      <button
                        type="button"
                        onClick={cancelItemEdit}
                        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </section>
            </>
          ) : (
            <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <h2 className="font-semibold text-gray-900">No mounting templates yet</h2>
              <p className="mt-2 text-sm text-gray-600">
                Create your first template above. You can then add its BOM components.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
