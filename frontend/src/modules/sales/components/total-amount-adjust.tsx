import { useEffect, useId, useMemo, useState } from "react";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/modules/sales/constants";
import { resolveFinalTotal } from "@/modules/sales/utils";

export interface TotalAmountAdjustState {
  totalAdjustment: number;
  adjustedTotal: number | null;
  useCustomTotal: boolean;
}

export function useTotalAmountAdjust(
  calculatedTotal: number,
  initial?: Partial<TotalAmountAdjustState>,
) {
  const [totalAdjustment, setTotalAdjustment] = useState(initial?.totalAdjustment ?? 0);
  const [adjustedTotal, setAdjustedTotal] = useState<number | null>(initial?.adjustedTotal ?? null);
  const [useCustomTotal, setUseCustomTotal] = useState(
    initial?.useCustomTotal ?? initial?.adjustedTotal != null,
  );

  useEffect(() => {
    if (initial?.totalAdjustment !== undefined) setTotalAdjustment(initial.totalAdjustment);
    if (initial?.adjustedTotal !== undefined) setAdjustedTotal(initial.adjustedTotal);
    if (initial?.useCustomTotal !== undefined) setUseCustomTotal(initial.useCustomTotal);
    else if (initial?.adjustedTotal != null) setUseCustomTotal(true);
  }, [initial?.totalAdjustment, initial?.adjustedTotal, initial?.useCustomTotal]);

  const finalTotal = useMemo(
    () =>
      resolveFinalTotal(
        calculatedTotal,
        totalAdjustment,
        useCustomTotal ? adjustedTotal : null,
      ),
    [calculatedTotal, totalAdjustment, useCustomTotal, adjustedTotal],
  );

  return {
    totalAdjustment,
    setTotalAdjustment,
    adjustedTotal,
    setAdjustedTotal,
    useCustomTotal,
    setUseCustomTotal,
    finalTotal,
  };
}

export function TotalAmountAdjustFields({
  calculatedTotal,
  totalAdjustment,
  onTotalAdjustmentChange,
  adjustedTotal,
  onAdjustedTotalChange,
  useCustomTotal,
  onUseCustomTotalChange,
  finalTotal,
  compact,
}: {
  calculatedTotal: number;
  totalAdjustment: number;
  onTotalAdjustmentChange: (value: number) => void;
  adjustedTotal: number | null;
  onAdjustedTotalChange: (value: number | null) => void;
  useCustomTotal: boolean;
  onUseCustomTotalChange: (value: boolean) => void;
  finalTotal: number;
  compact?: boolean;
}) {
  const switchId = useId();

  const handleToggleCustom = (checked: boolean) => {
    onUseCustomTotalChange(checked);
    if (checked) {
      onAdjustedTotalChange(
        resolveFinalTotal(calculatedTotal, totalAdjustment, null),
      );
    } else {
      onAdjustedTotalChange(null);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-lg border border-dashed p-3 bg-muted/30"}>
      {!compact && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Calculated total</span>
          <span className="font-medium tabular-nums text-foreground">{formatCurrency(calculatedTotal)}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={switchId} className="text-xs font-normal cursor-pointer">
          Set custom total
        </Label>
        <Switch id={switchId} checked={useCustomTotal} onCheckedChange={handleToggleCustom} />
      </div>

      {useCustomTotal ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Final total (₹)</Label>
          <DecimalInput
            min={0}
            integer
            hideZero
            fallback={Math.round(calculatedTotal)}
            value={adjustedTotal ?? 0}
            onChange={(v) => onAdjustedTotalChange(v)}
            placeholder={String(Math.round(calculatedTotal))}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs">Adjustment (+/− ₹)</Label>
          <DecimalInput
            integer
            hideZero
            value={totalAdjustment}
            onChange={onTotalAdjustmentChange}
            placeholder="0"
          />
        </div>
      )}

      <div className="flex justify-between text-sm font-semibold pt-1 border-t">
        <span>{compact ? "Amount" : "Final total"}</span>
        <span className="tabular-nums text-primary">{formatCurrency(finalTotal)}</span>
      </div>
    </div>
  );
}

export function totalAdjustPayload(
  calculatedTotal: number,
  totalAdjustment: number,
  useCustomTotal: boolean,
  adjustedTotal: number | null,
) {
  const amount = resolveFinalTotal(
    calculatedTotal,
    useCustomTotal ? 0 : totalAdjustment,
    useCustomTotal ? adjustedTotal : null,
  );
  return {
    calculatedAmount: Math.round(calculatedTotal),
    totalAdjustment: useCustomTotal ? 0 : totalAdjustment,
    adjustedTotal: useCustomTotal ? adjustedTotal : null,
    amount,
    dueAmount: amount,
  };
}

export function proposalAdjustPayload(
  totalAdjustment: number,
  useCustomTotal: boolean,
  adjustedTotal: number | null,
) {
  return {
    totalAdjustment: useCustomTotal ? 0 : totalAdjustment,
    adjustedTotal: useCustomTotal ? adjustedTotal : null,
  };
}
