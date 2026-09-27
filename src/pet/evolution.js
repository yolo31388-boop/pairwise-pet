class Evolution {
  constructor(pet) {
    this.pet = pet;
    this.conditions = [];
    this.devolutionConditions = [];
    this.log = [];
    this.devolutionLog = [];
  }

  addCondition(stage, cond, result = {}) {
    this.conditions.push({ stage, cond, result });
    this.conditions.sort((a, b) => a.stage - b.stage);
  }

  addDevolutionCondition(fromStage, cond, result = {}) {
    this.devolutionConditions.push({ fromStage, cond, result });
  }

  _conditionMet(cond) {
    const pet = this.pet;
    return Object.entries(cond).every(([key, expected]) => {
      if (typeof expected === 'function') return !!expected(pet);
      switch (key) {
        case 'level': return pet.stats.level >= expected;
        case 'intimacy': return pet.stats.intimacy >= expected;
        case 'item': return pet.items.includes(expected);
        case 'time': return pet.environment.time === expected;
        case 'location': return pet.environment.location === expected;
        default: return false;
      }
    });
  }

  _devolutionConditionMet(cond) {
    const pet = this.pet;
    return Object.entries(cond).every(([key, expected]) => {
      if (typeof expected === 'function') return !!expected(pet);
      switch (key) {
        case 'levelBelow': return pet.stats.level < expected;
        case 'intimacyBelow': return pet.stats.intimacy < expected;
        case 'lostItem': return !pet.items.includes(expected);
        default: return false;
      }
    });
  }

  checkEvolution() {
    const next = this.conditions.find(
      (c) => c.stage === this.pet.stats.evolutionStage + 1
    );
    if (!next) return false;
    if (!this._conditionMet(next.cond)) return false;
    this.evolve(next.stage);
    return true;
  }

  check() {
    return this.checkEvolution();
  }

  checkDevolution() {
    const current = this.pet.stats.evolutionStage;
    if (current <= 0) return false;
    const entry = this.devolutionConditions.find((c) => c.fromStage === current);
    if (!entry) return false;
    if (!this._devolutionConditionMet(entry.cond)) return false;
    this.devolve();
    return true;
  }

  _snapshot() {
    return {
      stage: this.pet.stats.evolutionStage,
      exp: this.pet.stats.exp,
      level: this.pet.stats.level,
      form: this.pet.stats.form,
      stats: {
        attack: this.pet.stats.attack,
        defense: this.pet.stats.defense,
        hp: this.pet.stats.hp,
      },
      skills: [...this.pet.skills],
    };
  }

  _restore(snapshot) {
    this.pet.stats.evolutionStage = snapshot.stage;
    this.pet.stats.exp = snapshot.exp;
    this.pet.stats.level = snapshot.level;
    this.pet.stats.form = snapshot.form;
    Object.assign(this.pet.stats, snapshot.stats);
    this.pet.skills = [...snapshot.skills];
  }

  _applyResult(result) {
    const stats = this.pet.stats;
    if (result.form !== undefined) {
      if (typeof result.form !== 'string' || result.form.length === 0) {
        throw new Error('进化形态必须是非空字符串');
      }
      stats.form = result.form;
    }
    if (result.stats !== undefined) {
      for (const [key, value] of Object.entries(result.stats)) {
        if (typeof value === 'number') {
          stats[key] = (stats[key] || 0) + value;
        } else if (value && typeof value.multiply === 'number') {
          stats[key] = (stats[key] || 0) * value.multiply;
        } else if (value && typeof value.set === 'number') {
          stats[key] = value.set;
        } else {
          throw new Error(`非法的属性转换规则: ${key}`);
        }
      }
    }
    if (Array.isArray(result.skills)) {
      for (const skill of result.skills) {
        if (!this.pet.skills.includes(skill)) this.pet.skills.push(skill);
      }
    }
    if (Array.isArray(result.replaceSkills)) {
      this.pet.skills = [...result.replaceSkills];
    }
  }

  _convertExp(result) {
    const stats = this.pet.stats;
    const mode = result.expMode === undefined ? 'keep' : result.expMode;
    if (mode === 'reset') {
      stats.exp = 0;
    } else if (typeof mode === 'number') {
      if (mode < 0 || mode > 1) throw new Error('expMode 比例必须在 0 到 1 之间');
      stats.exp = Math.floor(stats.exp * mode);
    } else if (mode !== 'keep') {
      throw new Error(`未知的 expMode: ${mode}`);
    }
    while (stats.exp >= stats.expToNext()) {
      stats.exp -= stats.expToNext();
      stats.level++;
    }
    if (stats.exp < 0) stats.exp = 0;
  }

  evolve(stage) {
    const entry = this.conditions.find((c) => c.stage === stage);
    if (!entry) throw new Error(`未配置的进化阶段: ${stage}`);
    const current = this.pet.stats.evolutionStage;
    if (stage !== current + 1) {
      throw new Error(`进化必须按顺序进行: 当前阶段 ${current}, 目标阶段 ${stage}`);
    }
    const before = this._snapshot();
    try {
      this._applyResult(entry.result);
      this._convertExp(entry.result);
      this.pet.stats.evolutionStage = stage;
    } catch (err) {
      this._restore(before);
      throw err;
    }
    this.log.push({
      time: Date.now(),
      type: 'evolution',
      stage,
      from: before.form,
      to: this.pet.stats.form,
      conditions: entry.cond,
      before: { level: before.level, exp: before.exp, stats: before.stats },
      after: {
        level: this.pet.stats.level,
        exp: this.pet.stats.exp,
        stats: {
          attack: this.pet.stats.attack,
          defense: this.pet.stats.defense,
          hp: this.pet.stats.hp,
        },
      },
    });
    return true;
  }

  devolve() {
    const current = this.pet.stats.evolutionStage;
    const entry = this.devolutionConditions.find((c) => c.fromStage === current);
    if (!entry) throw new Error(`未配置从阶段 ${current} 退化的条件`);
    if (current <= 0) throw new Error('初始形态无法退化');
    const before = this._snapshot();
    try {
      this._applyResult(entry.result);
      this.pet.stats.evolutionStage = current - 1;
    } catch (err) {
      this._restore(before);
      throw err;
    }
    this.devolutionLog.push({
      time: Date.now(),
      type: 'devolution',
      fromStage: current,
      toStage: current - 1,
      from: before.form,
      to: this.pet.stats.form,
      conditions: entry.cond,
    });
    return true;
  }
}

module.exports = { Evolution };
