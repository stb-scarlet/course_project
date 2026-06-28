import { AccessRule, Attribute } from '@prisma/client';
type RuleWithAttr = AccessRule & {
    attribute: Attribute;
};
/**
 * Evaluates whether a candidate's attribute values satisfy all access rules of a position.
 * profileValues: map of attributeId -> raw JSON string value
 */
export declare function evaluateAccessRules(rules: RuleWithAttr[], profileValues: Map<string, string | null>): boolean;
export {};
//# sourceMappingURL=accessRules.d.ts.map