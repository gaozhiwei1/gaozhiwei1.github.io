import { Check, LockKeyhole } from "lucide-react";

interface ProPreviewProps {
  title: string;
  description?: string;
  inclusions?: string[];
  navigate: (path: string) => void;
}

export function ProPreview({
  title,
  description,
  inclusions = [
    "完整数学推导",
    "工程边界与失败模式",
    "PyTorch 实现",
    "面试追问链",
  ],
  navigate,
}: ProPreviewProps) {
  return (
    <section className="pro-preview" aria-label="PRO 内容预览">
      <div className="pro-preview__mark">
        <LockKeyhole />
        <span>PRO</span>
      </div>
      <div>
        <h2>{title}</h2>
        <p>{description ?? "该内容属于 Math2LLM PRO 完整训练体系。"}</p>
      </div>
      <ul>
        {inclusions.map((item) => (
          <li key={item}>
            <Check />
            {item}
          </li>
        ))}
      </ul>
      <button onClick={() => navigate("/pricing")}>解锁 Math2LLM Pro</button>
    </section>
  );
}
