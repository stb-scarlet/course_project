import { AccessRule, Attribute, FilterOperator, AttributeType } from '@prisma/client';

type RuleWithAttr = AccessRule & { attribute: Attribute };

/**
 * Evaluates whether a candidate's attribute values satisfy all access rules of a position.
 * profileValues: map of attributeId -> raw JSON string value
 */
export function evaluateAccessRules(
  rules: RuleWithAttr[],
  profileValues: Map<string, string | null>
): boolean {
  for (const rule of rules) {
    const rawValue = profileValues.get(rule.attributeId);
    if (rawValue === undefined || rawValue === null) return false;

    let profileVal: unknown;
    let ruleVal: unknown;

    try {
      profileVal = JSON.parse(rawValue);
      ruleVal = JSON.parse(rule.value);
    } catch {
      return false;
    }

    if (!applyOperator(profileVal, rule.operator, ruleVal, rule.attribute.type)) {
      return false;
    }
  }
  return true;
}

function applyOperator(
  profileVal: unknown,
  operator: FilterOperator,
  ruleVal: unknown,
  type: AttributeType
): boolean {
  switch (operator) {
    case FilterOperator.EQ:
      return profileVal === ruleVal;
    case FilterOperator.NEQ:
      return profileVal !== ruleVal;
    case FilterOperator.GT:
      return (profileVal as number) > (ruleVal as number);
    case FilterOperator.GTE:
      return (profileVal as number) >= (ruleVal as number);
    case FilterOperator.LT:
      return (profileVal as number) < (ruleVal as number);
    case FilterOperator.LTE:
      return (profileVal as number) <= (ruleVal as number);
    case FilterOperator.CONTAINS:
      return String(profileVal).toLowerCase().includes(String(ruleVal).toLowerCase());
    case FilterOperator.IN:
      return Array.isArray(ruleVal) && (ruleVal as unknown[]).includes(profileVal);
    default:
      return false;
  }
}
