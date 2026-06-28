"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAccessRules = evaluateAccessRules;
const client_1 = require("@prisma/client");
/**
 * Evaluates whether a candidate's attribute values satisfy all access rules of a position.
 * profileValues: map of attributeId -> raw JSON string value
 */
function evaluateAccessRules(rules, profileValues) {
    for (const rule of rules) {
        const rawValue = profileValues.get(rule.attributeId);
        if (rawValue === undefined || rawValue === null)
            return false;
        let profileVal;
        let ruleVal;
        try {
            profileVal = JSON.parse(rawValue);
            ruleVal = JSON.parse(rule.value);
        }
        catch {
            return false;
        }
        if (!applyOperator(profileVal, rule.operator, ruleVal, rule.attribute.type)) {
            return false;
        }
    }
    return true;
}
function applyOperator(profileVal, operator, ruleVal, type) {
    switch (operator) {
        case client_1.FilterOperator.EQ:
            return profileVal === ruleVal;
        case client_1.FilterOperator.NEQ:
            return profileVal !== ruleVal;
        case client_1.FilterOperator.GT:
            return profileVal > ruleVal;
        case client_1.FilterOperator.GTE:
            return profileVal >= ruleVal;
        case client_1.FilterOperator.LT:
            return profileVal < ruleVal;
        case client_1.FilterOperator.LTE:
            return profileVal <= ruleVal;
        case client_1.FilterOperator.CONTAINS:
            return String(profileVal).toLowerCase().includes(String(ruleVal).toLowerCase());
        case client_1.FilterOperator.IN:
            return Array.isArray(ruleVal) && ruleVal.includes(profileVal);
        default:
            return false;
    }
}
//# sourceMappingURL=accessRules.js.map