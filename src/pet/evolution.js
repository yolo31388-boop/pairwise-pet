
function getField(pet, key) {
  if (typeof pet[`get${key[0].toUpperCase()}${key.slice(1)}`] === 'function') {
    return pet[`get${key[0].toUpperCase()}${key.slice(1)}`]();
  }
  return pet[key];
}

function verifyCondition(pet, condition, now = new Date()) {
  if (typeof condition === 'function') {
    return !!condition(pet);
  }
  if (condition.level !== undefined && pet.stats.level < condition.level) {
    return false;
  }
  if (condition.intimacy !== undefined && pet.stats.intimacy < condition.intimacy) {
    return false;
  }
  if (condition.item) {
    const id = typeof condition.item === 'string' ? condition.item : condition.item.id;
    const count = typeof condition.item === 'object' && condition.item.count
      ? condition.item.count
      : 1;
    if (typeof pet.hasItem !== 'function' || !pet.hasItem(id, count)) {
      return false;
    }
  }
  if (condition.location !== undefined) {
    const loc = typeof pet.getLocation === 'function' ? pet.getLocation() : pet.location;
    const expected = condition.location;
    if (typeof expected === 'function') {
      if (!expected(loc)) return false;
    } else if (Array.isArray(expected)) {
      if (!expected.includes(loc)) return false;
    } else if (loc !== expected) {
      return false;
    }
  }
  if (condition.time) {
    const t = condition.time;
    if (typeof t === 'function') {
      if (!t(now)) return false;
    } else if (t.hourFrom !== undefined && t.hourTo !== undefined) {
      const hour = now.getHours();
      if (t.hourFrom <= t.hourTo) {
        if (hour < t.hourFrom || hour >= t.hourTo) return false;
      } else if (hour < t.hourFrom && hour >= t.hourTo) {
        // hourFrom > hourTo: 窗口跨越午夜(如 22-05),区间内通过
      } else if (t.hourFrom > t.hourTo) {
        return false;
      }
    }
  }
  if (typeof condition.custom === 'function' && !condition.custom(pet)) {
    return false;
  }
  return true;
}

function describeCondition(condition) {
  if (typeof condition === 'function') return { custom: 'function' };
  return JSON.parse(JSON.stringify(condition));
}

class Evolution {
  constructor(pet) {
    this.pet = pet;
    this.conditions = [];
    this.log = [];
    this.evolvedStages = new Set();
  }

  addCondition(stage, condition, transform) {
    this.conditions.push({ stage, cond: condition, transform });
  }

  configureChain(chain) {
    for (const link of chain) {
      this.addCondition(link.stage, link.condition, link.transform);
    }
  }

  findNextCondition() {
    const nextStage = this.pet.stats.evolutionStage + 1;
    return this.conditions.find((c) => c.stage === nextStage);
  }

  check() {
    return this.checkEvolution();
  }

  checkEvolution(now = new Date()) {
    const next = this.findNextCondition();
    if (!next) return false;
    if (this.evolvedStages.has(next.stage)) return false;
    if (!verifyCondition(this.pet, next.cond, now)) return false;
    this.evolve(next.stage);
    return true;
  }

  evolve(stage) {
    const link = this.conditions.find((c) => c.stage === stage);
    if (!link) {
      throw new Error(`未知进化阶段: ${stage}`);
    }
    if (this.evolvedStages.has(stage)) {
      throw new Error('该阶段已经进化过，不能重复触发');
    }
    if (stage !== this.pet.stats.evolutionStage + 1) {
      throw new Error('不能跳过中间进化阶段');
    }

    const snapshot = this.pet.snapshot();
    try {
      if (link.cond.item) {
        const id = typeof link.cond.item === 'string'
          ? link.cond.item
          : link.cond.item.id;
        const count = typeof link.cond.item === 'object' && link.cond.item.count
          ? link.cond.item.count
          : 1;
        this.pet.consumeItem(id, count);
      }

      const beforeForm = this.pet.form || null;
      this.pet.stats.evolutionStage = stage;
      this.applyTransform(link.transform, stage);

      const afterForm = this.pet.form || null;
      this.log.push({
        time: Date.now(),
        type: 'evolution',
        fromStage: stage - 1,
        toStage: stage,
        fromForm: beforeForm,
        toForm: afterForm,
        conditions: describeCondition(link.cond),
      });
      this.evolvedStages.add(stage);
      return true;
    } catch (err) {
      this.pet.restore(snapshot);
      throw err;
    }
  }

  applyTransform(transform, stage) {
    if (!transform) return;
    const resolved = typeof transform === 'function'
      ? transform(this.pet, stage)
      : transform;
    if (!resolved) return;
    if (resolved.name !== undefined) {
      this.pet.name = resolved.name;
    }
    if (resolved.form !== undefined) {
      this.pet.form = resolved.form;
    }
    if (resolved.appearance !== undefined) {
      this.pet.appearance = resolved.appearance;
    }
    if (resolved.baseStats) {
      this.pet.stats.applyBaseStats(resolved.baseStats);
    }
    if (resolved.skills) {
      for (const skill of resolved.skills) {
        if (!this.pet.skills.includes(skill)) {
          this.pet.skills.push(skill);
        }
      }
    }
    if (resolved.intimacy !== undefined) {
      this.pet.stats.intimacy = resolved.intimacy;
    }
    if (resolved.expRule) {
      this.pet.stats.convertExp(resolved.expRule);
    }
  }
}

class Devolution {
  constructor(pet) {
    this.pet = pet;
    this.conditions = [];
    this.log = [];
  }

  addCondition(fromStage, condition, transform) {
    this.conditions.push({ stage: fromStage, cond: condition, transform });
  }

  findCondition() {
    return this.conditions.find((c) => c.stage === this.pet.stats.evolutionStage);
  }

  check(now = new Date()) {
    const link = this.findCondition();
    if (!link) return false;
    if (!verifyCondition(this.pet, link.cond, now)) return false;
    this.devolve(link.stage);
    return true;
  }

  devolve(stage) {
    const link = this.conditions.find((c) => c.stage === stage);
    if (!link) {
      throw new Error(`未知退化阶段: ${stage}`);
    }
    if (stage !== this.pet.stats.evolutionStage) {
      throw new Error('退化只能从当前阶段退到上一阶段');
    }
    const snapshot = this.pet.snapshot();
    try {
      const beforeForm = this.pet.form || null;
      this.pet.stats.evolutionStage = stage - 1;
      if (link.transform) {
        const resolved = typeof link.transform === 'function'
          ? link.transform(this.pet, stage - 1)
          : link.transform;
        if (resolved) {
          if (resolved.name !== undefined) this.pet.name = resolved.name;
          if (resolved.form !== undefined) this.pet.form = resolved.form;
          if (resolved.appearance !== undefined) {
            this.pet.appearance = resolved.appearance;
          }
          if (resolved.baseStats) this.pet.stats.applyBaseStats(resolved.baseStats);
          if (resolved.removeSkills) {
            this.pet.skills = this.pet.skills.filter(
              (skill) => !resolved.removeSkills.includes(skill),
            );
          }
        }
      }
      const afterForm = this.pet.form || null;
      this.log.push({
        time: Date.now(),
        type: 'devolution',
        fromStage: stage,
        toStage: stage - 1,
        fromForm: beforeForm,
        toForm: afterForm,
        conditions: describeCondition(link.cond),
      });
      if (this.pet.evolution && this.pet.evolution.evolvedStages) {
        this.pet.evolution.evolvedStages.delete(stage);
      }
      return true;
    } catch (err) {
      this.pet.restore(snapshot);
      throw err;
    }
  }
}

module.exports = { Evolution, Devolution, verifyCondition };
