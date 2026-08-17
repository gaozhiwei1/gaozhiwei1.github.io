import type { CodeChallenge } from "../types";
import { foundationChallenges } from "./challengeGroups/foundations";
import { transformerChallenges } from "./challengeGroups/transformer";
import { trainingChallenges } from "./challengeGroups/training";

export const additionalCodeChallenges: CodeChallenge[] = [
  ...foundationChallenges,
  ...transformerChallenges,
  ...trainingChallenges,
];
