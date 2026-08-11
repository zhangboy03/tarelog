const projectContext = `# Tarelog

> Know what you eat. Live a little better.

Tarelog is a private, self-hosted food journal for recording real meals and seeing long-term patterns.

Repository: https://github.com/zhangboy03/tarelog

## Purpose

Help a person:

- record what they actually eat;
- review and correct nutrition facts;
- understand patterns across days and months;
- keep personal food data under their control.

## Product loop

photo or note → review the facts → save the meal → see the pattern

Photo bytes go to the deployer-selected vision provider but are not stored by Tarelog. Results enter D1 only after confirmation. Ingredient matching uses sourced local references and structured USDA FoodData Central data; packaging uses the visible label first.

## Principles

- Human first.
- Facts before guesses.
- Private by default.
- No medical claims or food judgment.
- No secrets or personal data in Git.
- No medical or nutritional-completeness claims.
- Create a new private Sites project for each owner; never reuse the maintainer's project ID.

## Documentation

- Project guide: https://github.com/zhangboy03/tarelog/blob/main/AGENTS.md
- Architecture: https://github.com/zhangboy03/tarelog/blob/main/docs/ARCHITECTURE.md
- Privacy: https://github.com/zhangboy03/tarelog/blob/main/docs/PRIVACY.md
- Deployment: https://github.com/zhangboy03/tarelog/blob/main/docs/DEPLOYMENT.md
`;

export function GET() {
  return new Response(projectContext, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
