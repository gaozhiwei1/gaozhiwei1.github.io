import { ArrowDown } from "lucide-react";

interface TensorShapeProps {
  title?: string;
  items: { label: string; shape: string; note?: string }[];
}

export function TensorShape({ title = "Tensor Shape", items }: TensorShapeProps) {
  return (
    <figure className="tensor-shape">
      <figcaption><span>TENSOR SHAPE</span><strong>{title}</strong></figcaption>
      <div className="tensor-shape__flow">
        {items.map((item, index) => (
          <div className="tensor-shape__stage" key={`${item.label}-${item.shape}`}>
            <div><span>{item.label}</span><code>{item.shape}</code>{item.note && <small>{item.note}</small>}</div>
            {index < items.length - 1 && <ArrowDown aria-hidden="true" />}
          </div>
        ))}
      </div>
    </figure>
  );
}
