"use client"

import { cn } from "@/lib/utils"

export type AddOnOption = {
  id: string
  name: string
  price: number
}

export type AddOnGroup = {
  id: string
  name: string
  min_selections: number
  max_selections: number
  allow_quantity: boolean
  options: AddOnOption[]
}

export type SelectedAddOn = {
  option_id: string
  quantity: number
}

interface Props {
  groups: AddOnGroup[]
  selected: SelectedAddOn[]
  onChange: (selected: SelectedAddOn[]) => void
}

export function AddOnSelector({ groups, selected, onChange }: Props) {
  function getQty(optionId: string) {
    return selected.find(s => s.option_id === optionId)?.quantity ?? 0
  }

  function toggle(group: AddOnGroup, optionId: string) {
    const qty = getQty(optionId)
    if (qty > 0) {
      // Deselect
      onChange(selected.filter(s => s.option_id !== optionId))
    } else {
      // Select — enforce max_selections
      const groupSelected = selected.filter(s =>
        group.options.some(o => o.id === s.option_id)
      )
      if (groupSelected.length >= group.max_selections) {
        // Replace oldest if max reached and max === 1 (radio behaviour)
        if (group.max_selections === 1) {
          onChange([
            ...selected.filter(s => !group.options.some(o => o.id === s.option_id)),
            { option_id: optionId, quantity: 1 },
          ])
        }
        return
      }
      onChange([...selected, { option_id: optionId, quantity: 1 }])
    }
  }

  function setQty(group: AddOnGroup, optionId: string, delta: number) {
    const qty = getQty(optionId)
    const next = qty + delta
    if (next <= 0) {
      onChange(selected.filter(s => s.option_id !== optionId))
    } else {
      onChange(selected.map(s => s.option_id === optionId ? { ...s, quantity: next } : s))
    }
  }

  if (groups.length === 0) return null

  return (
    <div className="space-y-4">
      {groups.map(group => {
        const groupSelected = selected.filter(s => group.options.some(o => o.id === s.option_id))
        const isRadio = group.max_selections === 1
        return (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium">{group.name}</p>
              <span className="text-xs text-muted-foreground">
                {group.min_selections > 0 ? `Required · ` : ""}
                {isRadio ? "Choose 1" : `Up to ${group.max_selections}`}
              </span>
            </div>
            <div className="space-y-1.5">
              {group.options.map(opt => {
                const qty = getQty(opt.id)
                const checked = qty > 0
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors",
                      checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    )}
                    onClick={() => toggle(group, opt.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "flex items-center justify-center shrink-0 transition-colors",
                        isRadio
                          ? "size-4 rounded-full border-2 " + (checked ? "border-primary bg-primary" : "border-muted-foreground")
                          : "size-4 rounded border-2 " + (checked ? "border-primary bg-primary" : "border-muted-foreground")
                      )}>
                        {checked && <span className="block size-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm">{opt.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {opt.price > 0 && (
                        <span className="text-xs text-muted-foreground">+₱{opt.price.toLocaleString()}</span>
                      )}
                      {group.allow_quantity && checked && (
                        <div
                          className="flex items-center gap-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setQty(group, opt.id, -1)}
                            className="size-5 rounded border border-border flex items-center justify-center text-xs hover:bg-muted transition-colors"
                          >−</button>
                          <span className="text-xs w-4 text-center">{qty}</span>
                          <button
                            onClick={() => setQty(group, opt.id, 1)}
                            className="size-5 rounded border border-border flex items-center justify-center text-xs hover:bg-muted transition-colors"
                          >+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
