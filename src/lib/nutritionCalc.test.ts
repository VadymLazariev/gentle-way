import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeBmr,
  computeNutritionTargets,
  computeTdee,
  goalFromWeightGoal,
} from './nutritionCalc.js'

describe('nutritionCalc', () => {
  it('computes BMR with Mifflin-St Jeor', () => {
    assert.equal(computeBmr('male', 80, 180, 30), 1780)
    assert.equal(computeBmr('female', 65, 165, 28), 1380)
  })

  it('computes TDEE from activity multiplier', () => {
    const bmr = 1780
    assert.equal(computeTdee(bmr, 'moderate'), 2759)
  })

  it('derives goal direction from weight goals', () => {
    assert.equal(goalFromWeightGoal('decrease', 80, 75), 'cut')
    assert.equal(goalFromWeightGoal('increase', 70, 80), 'bulk')
    assert.equal(goalFromWeightGoal('reach', 78, 80), 'bulk')
    assert.equal(goalFromWeightGoal('reach', 80, 80), 'maintain')
  })

  it('returns macro targets for a cut goal', () => {
    const result = computeNutritionTargets({
      sex: 'male',
      ageYears: 30,
      weightKg: 80,
      heightCm: 180,
      activityLevel: 'moderate',
      goal: 'cut',
    })
    assert.equal(result.bmr, 1780)
    assert.equal(result.tdee, 2759)
    assert.equal(result.calories, 2359)
    assert.equal(result.protein_g, 160)
    assert.equal(result.fat_g, 64)
    assert.ok(result.carbs_g > 0)
    assert.equal(result.water_ml, 2800)
  })
})
