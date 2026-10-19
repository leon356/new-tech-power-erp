export type BomCalculationMethod =
  | "manual"
  | "fixed"
  | "per_panel"
  | "per_mounting_point"
  | "per_rail"
  | "per_rail_length"
  | "per_string"
  | "per_array";

export type BomRoundingMethod =
  | "none"
  | "up"
  | "down"
  | "nearest";

export type BomTemplateItem = {
  id: string;
  mounting_template_id: string;
  component_name: string;
  description: string | null;
  calculation_method: BomCalculationMethod;
  quantity_value: number | null;
  quantity_unit: string | null;
  calculation_multiplier: number;
  rounding_method: BomRoundingMethod;
  rounding_value: number | null;
  active: boolean;
};

export type BomCalculationInput = {
  panelCount: number;
  stringCount: number;
  arrayCount: number;
  mountingPointCount: number;
  railCount: number;
  railLength: number;
};

export type CalculatedBomItem = {
  component_name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  calculation_method: BomCalculationMethod;
  calculation_basis: number;
  calculation_multiplier: number;
  rounding_method: BomRoundingMethod;
  source_template_item_id: string;
};

function roundQuantity(
  value: number,
  method: BomRoundingMethod,
  roundingValue: number | null
) {
  if (method === "none") {
    return value;
  }

  const increment =
    roundingValue && roundingValue > 0 ? roundingValue : 1;

  if (method === "up") {
    return Math.ceil(value / increment) * increment;
  }

  if (method === "down") {
    return Math.floor(value / increment) * increment;
  }

  if (method === "nearest") {
    return Math.round(value / increment) * increment;
  }

  return value;
}

function getBasis(
  method: BomCalculationMethod,
  input: BomCalculationInput,
  quantityValue: number | null
) {
  switch (method) {
    case "manual":
      return quantityValue ?? 0;

    case "fixed":
      return quantityValue ?? 0;

    case "per_panel":
      return input.panelCount;

    case "per_mounting_point":
      return input.mountingPointCount;

    case "per_rail":
      return input.railCount;

    case "per_rail_length":
      return input.railLength;

    case "per_string":
      return input.stringCount;

    case "per_array":
      return input.arrayCount;

    default:
      return 0;
  }
}

export function calculateBom(
  items: BomTemplateItem[],
  input: BomCalculationInput
): CalculatedBomItem[] {
  return items
    .filter((item) => item.active)
    .map((item) => {
      const basis = getBasis(
        item.calculation_method,
        input,
        item.quantity_value
      );

      let quantity = basis * item.calculation_multiplier;

      quantity = roundQuantity(
        quantity,
        item.rounding_method,
        item.rounding_value
      );

      return {
        component_name: item.component_name,
        description: item.description,
        quantity,
        unit: item.quantity_unit,
        calculation_method: item.calculation_method,
        calculation_basis: basis,
        calculation_multiplier: item.calculation_multiplier,
        rounding_method: item.rounding_method,
        source_template_item_id: item.id,
      };
    });
}