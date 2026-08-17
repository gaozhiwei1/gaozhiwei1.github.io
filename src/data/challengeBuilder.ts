import type { CodeChallenge } from "../types";

export type ChallengeInput = Omit<CodeChallenge, "description" | "constraints" | "parameters"> & {
  description?: string[];
  constraints?: string[];
  parameters?: CodeChallenge["parameters"];
};

export function challenge(input: ChallengeInput): CodeChallenge {
  return {
    ...input,
    description: input.description ?? [
      "只使用 Python 标准库。",
      "返回值必须符合函数签名。",
      "处理样例之外的边界输入。",
    ],
    constraints: input.constraints ?? ["输入均为有限数值", "误差容忍 1e-6"],
    parameters: input.parameters ?? [],
    commonFailures: input.commonFailures ?? [
      "归约轴或符号错误",
      "忽略空输入或极端数值",
      "返回类型与函数签名不一致",
    ],
  };
}
