import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTECTED_FINANCIAL_COLLECTIONS,
  PROTECTED_SENSITIVE_COLLECTIONS,
  HUMAN_MANAGEMENT_ROLES,
  validateAIOperation,
  executeZeroLatencySafeFallback
} from '../src/services/aiGovernanceSecuritySandbox.js';

describe('AIGovernanceSecuritySandbox', () => {
  it('identifies protected collections and management roles', () => {
    assert.ok(PROTECTED_FINANCIAL_COLLECTIONS.includes('liquidaciones_pagos'));
    assert.ok(PROTECTED_FINANCIAL_COLLECTIONS.includes('cfo-dashboard'));
    assert.ok(PROTECTED_SENSITIVE_COLLECTIONS.includes('px_legal_signatures'));
    assert.ok(HUMAN_MANAGEMENT_ROLES.includes('gerente'));
    assert.ok(HUMAN_MANAGEMENT_ROLES.includes('cfo'));
  });

  it('allows read operations for AI analysis without friction', async () => {
    const res = await validateAIOperation({
      agentName: 'AICopilot-Gemini',
      targetCollection: 'liquidaciones_pagos',
      action: 'read'
    });
    assert.equal(res.allowed, true);
    assert.equal(res.requiresHITL, false);
  });

  it('strictly contains autonomous AI writes on financial collections without human manager', async () => {
    const res = await validateAIOperation({
      agentName: 'AICopilot-Autonomous',
      targetCollection: 'liquidaciones_pagos',
      action: 'create',
      payload: { amount: 400, trainer: 'Test' },
      authenticatedUser: null // No human manager
    });
    assert.equal(res.allowed, false);
    assert.equal(res.requiresHITL, true);
    assert.match(res.reason, /Human-in-the-loop/);
  });

  it('allows financial modification when approved by verified human manager', async () => {
    const res = await validateAIOperation({
      agentName: 'Accounting-Assistant',
      targetCollection: 'liquidaciones_pagos',
      action: 'create',
      payload: { amount: 400 },
      authenticatedUser: { uid: 'user_123', role: 'gerente', email: 'gerente@crearpsl.net' }
    });
    assert.equal(res.allowed, true);
    assert.equal(res.requiresHITL, false);
  });

  it('guarantees business continuity SLA <2s with safe fallback when primary operation fails', async () => {
    const failingSlowOp = async () => {
      await new Promise(r => setTimeout(r, 2500));
      return 'slow_data';
    };

    const fallbackFn = async () => {
      return { status: 'OFFLINE_REVENUE_ACCEPTED', ticket: 'TX_EMERGENCY_001' };
    };

    const res = await executeZeroLatencySafeFallback(failingSlowOp, {
      operationName: 'DomingoDeCosecha_Checkout',
      timeoutMs: 100, // Short timeout for unit test
      fallbackOperation: fallbackFn
    });

    assert.equal(res.success, true);
    assert.equal(res.fallbackUsed, true);
    assert.equal(res.data.status, 'OFFLINE_REVENUE_ACCEPTED');
    assert.ok(res.durationMs < 500); // Executed instantly via fallback
  });
});
