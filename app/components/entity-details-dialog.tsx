"use client";

import { Pencil, X } from "lucide-react";

export type DetailField = { label: string; value?: string | number | null };

export function EntityDetailsDialog({
  eyebrow = "CouncilOS",
  title,
  fields,
  onClose,
  onEdit,
}: {
  eyebrow?: string;
  title: string;
  fields: DetailField[];
  onClose: () => void;
  onEdit: () => void;
}) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="dialog details-dialog" role="dialog" aria-modal="true" aria-label={`${title} details`} onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-header">
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
        <button className="icon-button" type="button" aria-label="Close details" onClick={onClose}><X size={19} /></button>
      </div>
      <dl className="details-list">
        {fields.filter((field) => field.value !== undefined && field.value !== null && String(field.value).trim()).map((field) => <div key={field.label}>
          <dt>{field.label}</dt><dd>{field.value}</dd>
        </div>)}
      </dl>
      <div className="dialog-footer">
        <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        <button className="primary-button" type="button" onClick={onEdit}><Pencil size={16} /> Edit</button>
      </div>
    </section>
  </div>;
}
